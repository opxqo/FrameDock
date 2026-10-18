import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { FormData } from "undici";
import { config } from "../../config";
import { AdapterError, type JobAdapter } from "../types";
import { bodyMessage, download, errorMessage, readBody, send } from "./http";

// Server-side port of createOpenAIVideoTask / pollOpenAIVideoTask in apps/web/src/services/api/video.ts
// (POST /videos, GET /videos/{id}, GET /videos/{id}/content). The browser builds the form fields; reference
// files are referenced by their kv blob (already on the server) or sent inline as a data URL.
//   request: { fields: Record<string, string | string[]>,
//              files?: Array<{ field, filename, store?, key?, dataUrl?, mime? }> }
//   credentials: { baseUrl, apiKey }  (baseUrl with or without /v1)

type FileRef = {
  field: string;
  filename: string;
  store?: string;
  key?: string;
  dataUrl?: string;
  mime?: string;
};
type VideoRequest = {
  fields?: Record<string, string | string[]>;
  files?: FileRef[];
};
type VideoResponse = {
  id?: string;
  status?: string;
  video_url?: string;
  result_url?: string;
  url?: string;
  content?: { video_url?: string; url?: string };
  error?: unknown;
  code?: unknown;
  data?: unknown;
};

/** Same normalisation as the web client's buildApiUrl, minus its local-proxy rewrite. */
function apiBase(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  return trimmed.toLowerCase().endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}

function unwrap(payload: unknown): VideoResponse {
  if (!payload || typeof payload !== "object") {
    throw new AdapterError("Provider returned an unreadable response", "fatal");
  }
  const body = payload as VideoResponse;
  if (body.code !== undefined) {
    if (body.code !== 0 && body.code !== "0") {
      throw new AdapterError(
        errorMessage(body) || "Provider rejected the request",
        "fatal",
      );
    }
    if (!body.data || typeof body.data !== "object") {
      throw new AdapterError("Provider returned no task", "fatal");
    }
    return body.data as VideoResponse;
  }
  return body;
}

const isHttp = (value: unknown): value is string =>
  typeof value === "string" && /^https?:\/\//i.test(value);

function resultUrl(video: VideoResponse) {
  return [
    video.video_url,
    video.result_url,
    video.url,
    video.content?.video_url,
    video.content?.url,
  ].find(
    (url) =>
      isHttp(url) || (typeof url === "string" && /\.mp4(\?|#|$)/i.test(url)),
  );
}

async function loadFile(
  ref: FileRef,
): Promise<{ bytes: Buffer; mime: string }> {
  if (ref.dataUrl) {
    const match = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(ref.dataUrl);
    if (!match)
      throw new AdapterError(
        `File ${ref.filename} is not a valid data url`,
        "fatal",
      );
    const bytes = match[2]
      ? Buffer.from(match[3] ?? "", "base64")
      : Buffer.from(decodeURIComponent(match[3] ?? ""), "utf8");
    return { bytes, mime: ref.mime || match[1] || "application/octet-stream" };
  }
  // Only kv stores written through /api/kv, with the same name rule it enforces.
  if (!ref.store || !ref.key || !/^[a-z0-9_]+$/.test(ref.store)) {
    throw new AdapterError(
      `File ${ref.filename} has no readable source`,
      "fatal",
    );
  }
  try {
    const bytes = await readFile(
      join(config.dataDir, "blobs", ref.store, encodeURIComponent(ref.key)),
    );
    return { bytes, mime: ref.mime || "application/octet-stream" };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new AdapterError(
        `Reference file ${ref.filename} is missing on the server`,
        "fatal",
      );
    }
    throw error;
  }
}

const auth = (apiKey: string) => ({ Authorization: `Bearer ${apiKey}` });

export const openaiVideoAdapter: JobAdapter = {
  id: "openai-video",
  concurrency: 3,
  // The web client polls generic OpenAI-style relays for 5 minutes; nobody is blocked waiting here,
  // so allow 30 before parking the job as unknown.
  pollIntervalMs: 3000,
  maxPolls: 600,

  async submit({ request, credentials, signal }) {
    const { fields = {}, files = [] } = (request ?? {}) as VideoRequest;
    const form = new FormData();
    for (const [name, value] of Object.entries(fields)) {
      for (const item of Array.isArray(value) ? value : [value])
        form.append(name, String(item));
    }
    for (const ref of files) {
      const { bytes, mime } = await loadFile(ref);
      form.append(
        ref.field,
        new Blob([new Uint8Array(bytes)], { type: mime }),
        ref.filename,
      );
    }
    const response = await send(
      `${apiBase(credentials.baseUrl)}/videos`,
      { method: "POST", headers: auth(credentials.apiKey), body: form },
      signal,
      "unknown",
    );
    const body = await readBody(response);
    if (response.status >= 500) {
      throw new AdapterError(
        `Provider error (${response.status}): ${bodyMessage(body, response.status)}`,
        "unknown",
      );
    }
    if (!response.ok)
      throw new AdapterError(bodyMessage(body, response.status), "fatal");
    const created = unwrap(body.json);
    if (!created.id)
      throw new AdapterError(
        "Provider accepted the request but returned no task id",
        "unknown",
      );
    return { remoteTaskId: created.id };
  },

  async poll({ credentials, signal }, remoteTaskId) {
    const response = await send(
      `${apiBase(credentials.baseUrl)}/videos/${encodeURIComponent(remoteTaskId)}`,
      { headers: auth(credentials.apiKey) },
      signal,
      "retryable",
    );
    const body = await readBody(response);
    if (!response.ok) {
      const fatal = [400, 401, 403, 404].includes(response.status);
      throw new AdapterError(
        bodyMessage(body, response.status),
        fatal ? "fatal" : "retryable",
      );
    }
    const video = unwrap(body.json);
    const url = resultUrl(video);
    if (url) return { status: "succeeded", payload: { url } };
    if (video.status === "completed")
      return { status: "succeeded", payload: {} };
    if (video.status === "failed" || video.status === "cancelled") {
      return {
        status: "failed",
        error: errorMessage(video.error) || "Video generation failed",
      };
    }
    return { status: "running" };
  },

  async fetchResult({ credentials, signal }, remoteTaskId, payload) {
    const url = (payload as { url?: string } | undefined)?.url;
    // Result links are public; the provider's own content endpoint needs the key.
    if (isHttp(url)) return download(url, {}, signal, "video/mp4");
    return download(
      `${apiBase(credentials.baseUrl)}/videos/${encodeURIComponent(remoteTaskId)}/content`,
      { headers: auth(credentials.apiKey) },
      signal,
      "video/mp4",
    );
  },
};
