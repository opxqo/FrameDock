import type Database from "better-sqlite3";
import {
  type BodyLimits,
  type CapturedBody,
  captureBody,
  DEFAULT_LIMITS,
  hashUrl,
  inferProvider,
  redactHeaders,
  redactUrl,
} from "./redact";

// FrameDock API call log: writes one row per call into `api_logs`. Logging must never break a call:
// every entry point swallows its own errors (reported through the Fastify logger instead).

export type LogSource = "proxy" | "browser" | "codex" | "moke";

/** What the browser tells us about a call (sent in the x-framedock-ctx header or the ingest body). */
export type CallContext = {
  projectId?: string;
  nodeId?: string;
  mode?: string;
  model?: string;
  runId?: string;
  page?: string;
  label?: string;
};

export type LogSettings = {
  retentionDays: number;
  maxRows: number;
  maxDbMb: number;
  /** Characters stored per body after redaction. */
  bodyLimit: number;
  logResponseBody: boolean;
};

export const DEFAULT_SETTINGS: LogSettings = {
  retentionDays: 30,
  maxRows: 20000,
  maxDbMb: 500,
  bodyLimit: DEFAULT_LIMITS.maxStore,
  logResponseBody: true,
};

const SETTINGS_STORE = "log_settings";
const SETTINGS_KEY = "settings";
const POLL_WINDOW_MS = 30 * 60 * 1000;

type Warn = (error: unknown, message: string) => void;

let sqlite: Database.Database | null = null;
let warn: Warn = () => undefined;
let cachedSettings: { at: number; value: LogSettings } | null = null;

export function initCallLog(database: Database.Database, onWarn: Warn) {
  sqlite = database;
  warn = onWarn;
  try {
    // Calls that were in flight when the server stopped will never finish.
    sqlite
      .prepare(
        "UPDATE api_logs SET state = 'interrupted', error = COALESCE(error, '服务重启，调用被中断') WHERE state = 'pending'",
      )
      .run();
  } catch (error) {
    warn(error, "api log init failed");
  }
}

function clampSettings(input: Partial<LogSettings>): LogSettings {
  const merged = { ...DEFAULT_SETTINGS, ...input };
  const int = (value: unknown, fallback: number, min: number, max: number) => {
    const number = Number(value);
    return Number.isFinite(number)
      ? Math.min(max, Math.max(min, Math.round(number)))
      : fallback;
  };
  return {
    retentionDays: int(merged.retentionDays, 30, 0, 3650),
    maxRows: int(merged.maxRows, 20000, 100, 1_000_000),
    maxDbMb: int(merged.maxDbMb, 500, 10, 20_000),
    bodyLimit: int(
      merged.bodyLimit,
      DEFAULT_SETTINGS.bodyLimit,
      1024,
      256 * 1024,
    ),
    logResponseBody: merged.logResponseBody !== false,
  };
}

export function getSettings(): LogSettings {
  if (cachedSettings && Date.now() - cachedSettings.at < 5000)
    return cachedSettings.value;
  let value = DEFAULT_SETTINGS;
  try {
    const row = sqlite
      ?.prepare("SELECT value FROM kv WHERE store = ? AND key = ?")
      .get(SETTINGS_STORE, SETTINGS_KEY) as
      | { value: string | null }
      | undefined;
    if (row?.value)
      value = clampSettings(JSON.parse(row.value) as Partial<LogSettings>);
  } catch (error) {
    warn(error, "api log settings unreadable, using defaults");
  }
  cachedSettings = { at: Date.now(), value };
  return value;
}

export function saveSettings(input: Partial<LogSettings>) {
  const value = clampSettings({ ...getSettings(), ...input });
  sqlite
    ?.prepare(
      "INSERT INTO kv (store, key, kind, value, mime, size, updated_at) VALUES (?, ?, 'json', ?, NULL, NULL, ?) ON CONFLICT(store, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
    )
    .run(SETTINGS_STORE, SETTINGS_KEY, JSON.stringify(value), Date.now());
  cachedSettings = { at: Date.now(), value };
  pruneLogs();
  return value;
}

export function bodyLimits(): BodyLimits {
  return {
    maxStore: getSettings().bodyLimit,
    maxParse: DEFAULT_LIMITS.maxParse,
  };
}

export type CallStart = {
  source: LogSource;
  method: string;
  /** Full target URL (or a descriptive pseudo-URL such as `codex exec`). */
  url: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: Buffer | string;
  contentType?: string;
  context?: CallContext;
  reqUid?: string;
  extra?: Record<string, unknown>;
  /** Used when the call has no URL (Codex): provider label to store. */
  provider?: string;
  /** Epoch ms of the real start when it is not "now" (browser-reported calls). */
  startedAt?: number;
};

export type CallHandle = {
  id: number;
  startedAt: number;
  context?: CallContext;
};

function splitUrl(url: string) {
  try {
    const parsed = new URL(url);
    return { host: parsed.host, path: parsed.pathname };
  } catch {
    return { host: "", path: url };
  }
}

function modelFrom(body: CapturedBody | null) {
  if (!body?.text) return undefined;
  const match = /"model"\s*:\s*"([^"]{1,200})"/.exec(body.text);
  return match?.[1];
}

export function startCall(start: CallStart): CallHandle | null {
  if (!sqlite) return null;
  try {
    const startedAt = start.startedAt ?? Date.now();
    const redactedUrl = redactUrl(start.url);
    const { host, path } = splitUrl(redactedUrl);
    const urlHash = hashUrl(redactedUrl.split("?")[0] ?? redactedUrl);
    const request = captureBody(start.body, start.contentType, bodyLimits());
    const context = start.context;
    let poll = 0;
    if (start.method === "GET") {
      const seen = sqlite
        .prepare(
          "SELECT 1 FROM api_logs WHERE method = 'GET' AND url_hash = ? AND ts > ? LIMIT 1",
        )
        .get(urlHash, startedAt - POLL_WINDOW_MS);
      poll = seen ? 1 : 0;
    }
    const result = sqlite
      .prepare(
        `INSERT INTO api_logs (ts, state, source, method, url, url_hash, host, path, provider, model, req_headers, req_body, req_size, req_truncated, project_id, node_id, mode, run_id, page, req_uid, poll, extra)
         VALUES (@ts, 'pending', @source, @method, @url, @urlHash, @host, @path, @provider, @model, @reqHeaders, @reqBody, @reqSize, @reqTruncated, @projectId, @nodeId, @mode, @runId, @page, @reqUid, @poll, @extra)`,
      )
      .run({
        ts: startedAt,
        source: start.source,
        method: start.method,
        url: redactedUrl,
        urlHash,
        host,
        path,
        provider: start.provider ?? inferProvider(host, path),
        model: context?.model ?? modelFrom(request) ?? null,
        reqHeaders: start.headers
          ? JSON.stringify(redactHeaders(start.headers))
          : null,
        reqBody: request?.text ?? null,
        reqSize:
          request?.size ?? (start.body ? Buffer.byteLength(start.body) : null),
        reqTruncated: request?.truncated ? 1 : 0,
        projectId: context?.projectId ?? null,
        nodeId: context?.nodeId ?? null,
        mode: context?.mode ?? null,
        runId: context?.runId ?? null,
        page: context?.page ?? null,
        reqUid: start.reqUid ?? null,
        poll,
        extra: start.extra ? JSON.stringify(start.extra) : null,
      });
    return { id: Number(result.lastInsertRowid), startedAt, context };
  } catch (error) {
    warn(error, "api log write failed");
    return null;
  }
}

export type CallEnd = {
  state?: "done" | "error";
  status?: number;
  error?: string;
  /** Milliseconds until the response headers arrived. */
  headersMs?: number;
  /** Total duration when it is not "now minus start" (browser-reported calls). */
  totalMs?: number;
  headers?: Record<string, string | string[] | undefined>;
  body?: CapturedBody | null;
  resType?: string;
  size?: number;
  extra?: Record<string, unknown>;
};

export function finishCall(handle: CallHandle | null, end: CallEnd) {
  if (!sqlite || !handle) return;
  try {
    const settings = getSettings();
    const body = settings.logResponseBody
      ? end.body
      : end.body
        ? { ...end.body, text: "[响应体记录已关闭]" }
        : null;
    sqlite
      .prepare(
        `UPDATE api_logs SET state = @state, status = @status, error = @error, duration_ms = @headersMs, total_ms = @totalMs,
           res_headers = @resHeaders, res_body = @resBody, res_size = @resSize, res_truncated = @resTruncated, res_type = @resType,
           model = COALESCE(model, @model), extra = COALESCE(@extra, extra)
         WHERE id = @id`,
      )
      .run({
        id: handle.id,
        state: end.state ?? (end.error ? "error" : "done"),
        status: end.status ?? null,
        error: end.error ?? null,
        headersMs: end.headersMs ?? null,
        totalMs: end.totalMs ?? Date.now() - handle.startedAt,
        resHeaders: end.headers
          ? JSON.stringify(redactHeaders(end.headers))
          : null,
        resBody: body?.text ?? null,
        resSize: end.size ?? body?.size ?? null,
        resTruncated: body?.truncated ? 1 : 0,
        resType: end.resType ?? null,
        model: modelFrom(body ?? null) ?? null,
        extra: end.extra ? JSON.stringify(end.extra) : null,
      });
  } catch (error) {
    warn(error, "api log update failed");
  }
}

/** Removes old rows: by age, then by count, then by stored size. */
export function pruneLogs() {
  if (!sqlite) return;
  try {
    const settings = getSettings();
    if (settings.retentionDays > 0) {
      sqlite
        .prepare("DELETE FROM api_logs WHERE ts < ? AND state != 'pending'")
        .run(Date.now() - settings.retentionDays * 86_400_000);
    }
    const cutoff = sqlite
      .prepare("SELECT id FROM api_logs ORDER BY id DESC LIMIT 1 OFFSET ?")
      .get(settings.maxRows) as { id: number } | undefined;
    if (cutoff)
      sqlite
        .prepare("DELETE FROM api_logs WHERE id <= ? AND state != 'pending'")
        .run(cutoff.id);
    for (let round = 0; round < 5; round += 1) {
      const used = logBytes();
      if (used <= settings.maxDbMb * 1024 * 1024) break;
      // Over the size budget: drop the oldest tenth and check again.
      const count = (
        sqlite.prepare("SELECT COUNT(*) AS n FROM api_logs").get() as {
          n: number;
        }
      ).n;
      const drop = sqlite
        .prepare("SELECT id FROM api_logs ORDER BY id ASC LIMIT 1 OFFSET ?")
        .get(Math.max(1, Math.floor(count / 10))) as { id: number } | undefined;
      if (!drop) break;
      sqlite
        .prepare("DELETE FROM api_logs WHERE id <= ? AND state != 'pending'")
        .run(drop.id);
    }
  } catch (error) {
    warn(error, "api log pruning failed");
  }
}

export function logBytes() {
  const row = sqlite
    ?.prepare(
      "SELECT COALESCE(SUM(LENGTH(url) + LENGTH(COALESCE(req_headers,'')) + LENGTH(COALESCE(req_body,'')) + LENGTH(COALESCE(res_headers,'')) + LENGTH(COALESCE(res_body,'')) + LENGTH(COALESCE(error,'')) + LENGTH(COALESCE(extra,''))), 0) AS bytes FROM api_logs",
    )
    .get() as { bytes: number } | undefined;
  return row?.bytes ?? 0;
}

export function startRetentionJob() {
  pruneLogs();
  const timer = setInterval(pruneLogs, 6 * 60 * 60 * 1000);
  timer.unref();
  return () => clearInterval(timer);
}

/** Parses the x-framedock-ctx header (URI-encoded JSON). Unknown or malformed input yields undefined. */
export function parseContext(
  raw: string | string[] | undefined,
): CallContext | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Record<
      string,
      unknown
    >;
    const pick = (key: string) =>
      typeof parsed[key] === "string"
        ? (parsed[key] as string).slice(0, 200)
        : undefined;
    return {
      projectId: pick("projectId"),
      nodeId: pick("nodeId"),
      mode: pick("mode"),
      model: pick("model"),
      runId: pick("runId"),
      page: pick("page"),
      label: pick("label"),
    };
  } catch {
    return undefined;
  }
}
