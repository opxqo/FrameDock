import { createHash } from "node:crypto";

// FrameDock API logs: everything that reaches the database passes through here first.
// Rules: secrets never survive, media bytes are never stored, base64 payloads become short summaries,
// and every stored body is capped. All functions are pure so they can be tested without a server.

export type BodyLimits = {
  /** Max characters stored per body after redaction. */
  maxStore: number;
  /** Largest body (bytes) that is parsed for redaction; bigger ones are recorded by size only. */
  maxParse: number;
};

export const DEFAULT_LIMITS: BodyLimits = {
  maxStore: 128 * 1024,
  maxParse: 16 * 1024 * 1024,
};

export type CapturedBody = {
  text: string;
  /** Original size in bytes. */
  size: number;
  truncated: boolean;
};

const SENSITIVE_HEADER =
  /^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|api-key|x-goog-api-key)$|key|token|secret|auth|signature/i;
const SENSITIVE_PARAM =
  /^(key|api[-_]?key|token|access[-_]?token|secret|signature|sig|auth|authorization|x-goog-api-key)$|key$|token$|secret$/i;
const SENSITIVE_FIELD =
  /api[-_]?key|authorization|access[-_]?token|refresh[-_]?token|^token$|secret|password|passwd|cookie|bearer/i;

const DATA_URL = /data:[a-z0-9.+-]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=_-]+/gi;
const BASE64_RUN = /[A-Za-z0-9+/_-]{2000,}={0,2}/g;
const BASE64_ONLY = /^[A-Za-z0-9+/_-]+={0,2}$/;
const BEARER = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi;
const QUERY_SECRET =
  /\b(api[-_]?key|access[-_]?token|token|secret|password)=([^&\s"'<>]+)/gi;

/** `[redacted …a1b2]`: the last 4 characters stay so you can tell which key was used. */
export function maskSecret(value: string) {
  const trimmed = value.trim();
  if (trimmed.length <= 8) return "[redacted]";
  return `[redacted …${trimmed.slice(-4)}]`;
}

function maskAuthorization(value: string) {
  const match = /^(Bearer|Basic|Token)\s+(.+)$/i.exec(value.trim());
  return match
    ? `${match[1]} ${maskSecret(match[2] ?? "")}`
    : maskSecret(value);
}

export function redactHeaders(
  headers: Record<string, string | string[] | undefined> | undefined,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [name, raw] of Object.entries(headers ?? {})) {
    if (raw === undefined) continue;
    const lower = name.toLowerCase();
    // Our own context headers are bookkeeping, not part of the call.
    if (lower.startsWith("x-framedock-")) continue;
    const value = Array.isArray(raw) ? raw.join(", ") : raw;
    result[lower] = SENSITIVE_HEADER.test(lower)
      ? lower.endsWith("authorization")
        ? maskAuthorization(value)
        : maskSecret(value)
      : value;
  }
  return result;
}

/** Keeps the URL readable but blanks secret query parameters (`?key=…`). */
export function redactUrl(raw: string) {
  const hashAt = raw.indexOf("#");
  const base = hashAt === -1 ? raw : raw.slice(0, hashAt);
  const fragment = hashAt === -1 ? "" : raw.slice(hashAt);
  const queryAt = base.indexOf("?");
  if (queryAt === -1) return raw;
  const query = base
    .slice(queryAt + 1)
    .split("&")
    .map((pair) => {
      const eq = pair.indexOf("=");
      if (eq === -1) return pair;
      let name = pair.slice(0, eq);
      try {
        name = decodeURIComponent(name);
      } catch {
        // keep the raw name
      }
      return SENSITIVE_PARAM.test(name)
        ? `${pair.slice(0, eq)}=${encodeURIComponent(maskSecret(pair.slice(eq + 1)))}`
        : pair;
    })
    .join("&");
  return `${base.slice(0, queryAt)}?${query}${fragment}`;
}

function base64Summary(value: string, mime?: string) {
  const payload = value.replace(/^data:[^,]*,/, "");
  const bytes = Math.floor((payload.length * 3) / 4);
  const hash = createHash("sha256").update(payload).digest("hex").slice(0, 8);
  return `<base64${mime ? ` ${mime}` : ""} ${bytes} bytes sha256:${hash}>`;
}

function redactString(value: string): string {
  const data = /^data:([a-z0-9.+/-]+);base64,/i.exec(value);
  if (data) return base64Summary(value, data[1]);
  if (value.length > 1024 && BASE64_ONLY.test(value.replace(/\s+/g, "")))
    return base64Summary(value.replace(/\s+/g, ""));
  return value.replace(DATA_URL, (match) => {
    const mime = /^data:([^;]+);/i.exec(match)?.[1];
    return base64Summary(match, mime);
  });
}

/** Recursively redacts a parsed JSON value. */
export function redactJson(value: unknown, depth = 0): unknown {
  if (depth > 40) return "[nested too deeply]";
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value))
    return value.map((item) => redactJson(item, depth + 1));
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] =
        SENSITIVE_FIELD.test(key) && typeof item === "string"
          ? maskSecret(item)
          : redactJson(item, depth + 1);
    }
    return result;
  }
  return value;
}

/** Redaction for non-JSON text (SSE streams, form bodies, error pages). */
export function redactText(text: string) {
  return text
    .replace(DATA_URL, (match) => {
      const mime = /^data:([^;]+);/i.exec(match)?.[1];
      return base64Summary(match, mime);
    })
    .replace(BASE64_RUN, (match) => base64Summary(match))
    .replace(BEARER, (_match, scheme: string) => `${scheme} [redacted]`)
    .replace(QUERY_SECRET, (_match, name: string) => `${name}=[redacted]`);
}

const BINARY_TYPE =
  /^(image|video|audio)\/|application\/(octet-stream|zip|pdf|gzip|x-protobuf)/i;

export function isBinaryType(contentType: string | undefined) {
  return Boolean(contentType && BINARY_TYPE.test(contentType));
}

/** Content types whose response bodies are worth buffering for the log (JSON, text, SSE). */
export function isCapturableType(contentType: string | undefined) {
  if (!contentType) return true;
  if (isBinaryType(contentType)) return false;
  return /json|text|xml|event-stream|x-www-form-urlencoded|javascript/i.test(
    contentType,
  );
}

function truncate(text: string, max: number) {
  return text.length > max
    ? {
        text: `${text.slice(0, max)}\n…[truncated, ${text.length - max} more characters]`,
        truncated: true,
      }
    : { text, truncated: false };
}

function looksBinary(buffer: Buffer) {
  const sample = buffer.subarray(0, 512);
  return sample.includes(0);
}

function summarizeMultipart(buffer: Buffer, contentType: string) {
  const boundary = /boundary=("?)([^";]+)\1/i.exec(contentType)?.[2];
  if (!boundary) return "[multipart body, boundary missing]";
  const delimiter = Buffer.from(`--${boundary}`);
  const parts: Array<Record<string, unknown>> = [];
  let position = buffer.indexOf(delimiter);
  while (position !== -1 && parts.length < 50) {
    const start = position + delimiter.length;
    if (buffer.subarray(start, start + 2).toString() === "--") break;
    const next = buffer.indexOf(delimiter, start);
    const end = next === -1 ? buffer.length : next;
    const section = buffer.subarray(start + 2, end);
    const headerEnd = section.indexOf("\r\n\r\n");
    if (headerEnd !== -1) {
      const head = section
        .subarray(0, Math.min(headerEnd, 2048))
        .toString("latin1");
      const name = /name="([^"]*)"/i.exec(head)?.[1];
      const filename = /filename="([^"]*)"/i.exec(head)?.[1];
      const type = /content-type:\s*([^\r\n]+)/i.exec(head)?.[1]?.trim();
      const size = Math.max(0, section.length - headerEnd - 4 - 2);
      const part: Record<string, unknown> = {
        name,
        ...(filename ? { filename } : {}),
        ...(type ? { type } : {}),
        size,
      };
      if (!filename && !isBinaryType(type) && size <= 2048) {
        part.value = redactText(
          section
            .subarray(headerEnd + 4, headerEnd + 4 + size)
            .toString("utf8"),
        );
      }
      parts.push(part);
    }
    position = next;
  }
  return JSON.stringify({ multipart: parts }, null, 2);
}

/**
 * Turns a request/response body into the redacted, capped text that is stored.
 * Returns null for an empty body.
 */
export function captureBody(
  body: Buffer | string | undefined,
  contentType: string | undefined,
  limits: BodyLimits = DEFAULT_LIMITS,
): CapturedBody | null {
  if (body === undefined) return null;
  const buffer = typeof body === "string" ? Buffer.from(body) : body;
  const size = buffer.length;
  if (!size) return null;
  const type = contentType ?? "";
  if (/multipart\//i.test(type)) {
    const summary = truncate(summarizeMultipart(buffer, type), limits.maxStore);
    return { size, ...summary };
  }
  if (isBinaryType(type) || (!type && looksBinary(buffer))) {
    return {
      text: `<binary ${type || "data"} ${size} bytes>`,
      size,
      truncated: false,
    };
  }
  if (size > limits.maxParse) {
    return {
      text: `[body too large to capture: ${size} bytes]`,
      size,
      truncated: true,
    };
  }
  const raw = buffer.toString("utf8");
  const trimmed = raw.trimStart();
  let text: string;
  if (
    /json/i.test(type) ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("[")
  ) {
    try {
      text = JSON.stringify(redactJson(JSON.parse(raw)), null, 1);
    } catch {
      text = redactText(raw);
    }
  } else {
    text = redactText(raw);
  }
  return { size, ...truncate(text, limits.maxStore) };
}

/** Best-effort provider label from the target host and path. */
export function inferProvider(host: string, path: string) {
  const h = host.toLowerCase();
  const p = path.toLowerCase();
  if (h.includes("autodl.art")) {
    if (p.includes("/kling")) return "kling";
    if (p.includes("/ark")) return "ark";
    if (p.includes("/ali") || p.includes("dashscope")) return "wan";
    if (p.includes("/minimax")) return "minimax";
    return "autodl";
  }
  if (
    h.includes("generativelanguage.googleapis.com") ||
    h.includes("googleapis")
  )
    return "gemini";
  if (h.includes("openai.com")) return "openai";
  if (h.includes("minimax")) return "minimax";
  if (h.includes("dashscope")) return "wan";
  if (h.includes("volces.com") || h.includes("volcengine")) return "ark";
  if (h.includes("klingai") || h.includes("kuaishou")) return "kling";
  if (
    h.includes("token6688") ||
    h.includes("yfai") ||
    /model-runtime\/invoke|\/v1\/logical-models/.test(p)
  )
    return "yfai";
  if (
    (h.startsWith("127.0.0.1") || h.startsWith("localhost")) &&
    p.startsWith("/v1")
  )
    return "mock";
  if (h.includes("mokeaigc")) return "moke";
  return "other";
}

export function hashUrl(url: string) {
  return createHash("sha1").update(url).digest("hex").slice(0, 12);
}
