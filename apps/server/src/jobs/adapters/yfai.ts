import sharp from "sharp";
import {
  AdapterError,
  type FetchedResult,
  type JobAdapter,
  type JobKind,
} from "../types";
import { bodyMessage, download, errorMessage, readBody, send } from "./http";

// Server-side port of apps/web/src/services/api/yfai.ts (submit, poll, result urls). The browser still
// uploads reference media and builds the invoke envelope (prepareYfaiParams / submitYfaiTask); the job only
// carries the finished payload so nothing about model parameters is duplicated here.
//   request:     { invoke: <body for POST /api/v1/model-runtime/invoke> }
//   credentials: { baseUrl: "https://yf.token6688.com/v1", apiKey }
// Protocol notes: docs/research/yfai-integration.md. 503/429 while polling mean "ask again", 410 means the
// task expired, `needs_review` is not final, and submits are never retried.

type YfaiTask = {
  task_id?: string;
  id?: string;
  status?: string;
  is_final?: boolean;
  output_url?: string;
  result_url?: string;
  url?: string;
  result?: Record<string, unknown>;
  data?: unknown;
  error?: unknown;
  code?: unknown;
  [key: string]: unknown;
};

const SUCCESS_CODES = [0, 200, 201, 202, "0", "200", "201", "202"];
const URL_KEYS: Partial<Record<JobKind, "images" | "videos" | "audios">> = {
  image: "images",
  video: "videos",
  audio: "audios",
};
const FALLBACK_MIME: Partial<Record<JobKind, string>> = {
  image: "image/png",
  video: "video/mp4",
  audio: "audio/mpeg",
};

/** A task can return several files (image batches, MJ grids); a job stores at most this many. */
const MAX_OUTPUTS = 9;

const origin = (baseUrl: string) =>
  baseUrl.trim().replace(/\/+$/, "").replace(/\/v1$/i, "");

/** Accepts both `{code, data}` envelopes and bare task objects, like the web client. */
function unwrap(payload: unknown): YfaiTask {
  if (!payload || typeof payload !== "object") {
    throw new AdapterError("Provider returned an unreadable response", "fatal");
  }
  const data = payload as YfaiTask;
  const badCode =
    data.code !== undefined &&
    !SUCCESS_CODES.includes(data.code as number | string);
  if ((data.error && !data.is_final) || badCode) {
    throw new AdapterError(
      errorMessage(data) || "Provider rejected the request",
      "fatal",
    );
  }
  return data.code !== undefined &&
    data.data &&
    !Array.isArray(data.data) &&
    typeof data.data === "object"
    ? (data.data as YfaiTask)
    : data;
}

export function yfaiTaskUrls(
  task: YfaiTask,
  key: "images" | "videos" | "audios",
) {
  const result = task.result || {};
  const items = Array.isArray(result[key])
    ? (result[key] as unknown[])
    : Array.isArray(task.data)
      ? task.data
      : [];
  const urls = items.flatMap((item: unknown) => {
    if (typeof item === "string") return [item];
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    return [record.original_url || record.url].filter(
      (url): url is string => typeof url === "string",
    );
  });
  if (!urls.length) {
    const url = task.output_url || task.result_url || task.url;
    if (url) urls.push(url);
  }
  return [...new Set(urls)].filter((url) => /^https?:\/\//.test(url));
}

const auth = (apiKey: string) => ({ Authorization: `Bearer ${apiKey}` });

// Images take 1–3 minutes (up to an hour at peak) and videos up to ~75 minutes, so a job keeps asking for
// 80 minutes. Stopping early does not stop the task, it only loses the result.
export const yfaiAdapter: JobAdapter = {
  id: "yfai",
  concurrency: 3,
  // `client_request_id` is the job id, so repeating an unclear submit returns the same task, never a second one.
  idempotentSubmit: true,
  pollIntervalMs: 4000,
  maxPolls: 1200,

  async submit({ jobId, request, credentials, signal }) {
    const invoke = (request as { invoke?: unknown } | null)?.invoke;
    if (!invoke || typeof invoke !== "object") {
      throw new AdapterError(
        "Job request is missing the invoke payload",
        "fatal",
      );
    }
    const response = await send(
      `${origin(credentials.baseUrl)}/api/v1/model-runtime/invoke`,
      {
        method: "POST",
        headers: {
          ...auth(credentials.apiKey),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...invoke, client_request_id: jobId }),
      },
      signal,
      "unknown",
    );
    const body = await readBody(response);
    // A 5xx may come after the provider already accepted (and billed) the task: unknown, not failed.
    if (response.status >= 500 || response.status === 429) {
      throw new AdapterError(
        `Provider error (${response.status}): ${bodyMessage(body, response.status)}`,
        "unknown",
      );
    }
    if (!response.ok) {
      const message = bodyMessage(body, response.status);
      throw new AdapterError(
        response.status === 402
          ? `Not enough available balance: ${message}`
          : message,
        "fatal",
      );
    }
    const task = unwrap(body.json);
    const id = task.task_id || task.id;
    if (!id)
      throw new AdapterError(
        "Provider accepted the request but returned no task id",
        "unknown",
      );
    return {
      remoteTaskId: id,
      requestId: response.headers.get("x-request-id") ?? undefined,
    };
  },

  async poll({ credentials, signal }, remoteTaskId) {
    const response = await send(
      `${origin(credentials.baseUrl)}/v1/tasks/${encodeURIComponent(remoteTaskId)}`,
      { headers: auth(credentials.apiKey) },
      signal,
      "retryable",
    );
    if (response.status === 503 || response.status === 429)
      return { status: "running" };
    const body = await readBody(response);
    if (response.status === 410) {
      throw new AdapterError(
        `Task expired at the provider (id ${remoteTaskId})`,
        "fatal",
      );
    }
    if (!response.ok) {
      const fatal = [400, 401, 403, 404].includes(response.status);
      throw new AdapterError(
        bodyMessage(body, response.status),
        fatal ? "fatal" : "retryable",
      );
    }
    const task = unwrap(body.json);
    if (!task.is_final) return { status: "running" };
    if (task.status !== "completed" || task.error) {
      const reason = errorMessage(task) || "Task failed";
      return { status: "failed", error: `${reason}\nTask id: ${remoteTaskId}` };
    }
    return { status: "succeeded", payload: task };
  },

  async fetchResult({ kind, signal }, _remoteTaskId, payload) {
    const key = URL_KEYS[kind];
    const urls = (key ? yfaiTaskUrls(payload as YfaiTask, key) : []).slice(
      0,
      MAX_OUTPUTS,
    );
    if (!urls.length)
      throw new AdapterError("Task finished without a result url", "fatal");
    const fallback = FALLBACK_MIME[kind] ?? "application/octet-stream";
    const outputs: FetchedResult[] = [];
    for (const url of urls) {
      const file: FetchedResult = await download(url, {}, signal, fallback);
      if (kind === "image") {
        // Pixel size lets the canvas lay the image out without decoding it first.
        const meta = await sharp(file.bytes)
          .metadata()
          .catch(() => undefined);
        if (meta?.width && meta.height) {
          file.width = meta.width;
          file.height = meta.height;
        }
      }
      outputs.push(file);
    }
    return outputs;
  },
};
