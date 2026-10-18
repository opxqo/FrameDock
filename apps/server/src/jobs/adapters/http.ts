import { upstreamFetch } from "../../upstream";
import { AdapterError } from "../types";

type Init = NonNullable<Parameters<typeof upstreamFetch>[1]>;

/**
 * Network-level failures say nothing about whether the provider saw the request, so the caller picks the
 * outcome: `unknown` when submitting (never resend), `retryable` when polling or downloading.
 */
export async function send(
  url: string,
  init: Init,
  signal: AbortSignal,
  onNetworkError: "unknown" | "retryable",
) {
  try {
    return await upstreamFetch(url, { ...init, signal });
  } catch (error) {
    const cause = (error as { cause?: { code?: string } }).cause;
    const reason =
      error instanceof Error
        ? `${error.message}${cause?.code ? ` (${cause.code})` : ""}`
        : String(error);
    throw new AdapterError(`Request failed: ${reason}`, onNetworkError);
  }
}

/** Parses a JSON body; an HTML error page from a gateway becomes a short readable message instead. */
export async function readBody(response: { text(): Promise<string> }) {
  const text = await response.text();
  try {
    return { text, json: JSON.parse(text) as unknown };
  } catch {
    return { text, json: undefined };
  }
}

/** Best-effort human message from the many error shapes providers use. */
export function errorMessage(value: unknown, depth = 0): string {
  if (!value || depth > 4) return "";
  if (typeof value === "string") {
    if (/<[a-z][\s\S]*>/i.test(value))
      return `HTML error page: ${value.slice(0, 80)}...`;
    try {
      const inner = errorMessage(JSON.parse(value), depth + 1);
      return inner || value;
    } catch {
      return value;
    }
  }
  if (typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  return (
    errorMessage(record.error, depth + 1) ||
    errorMessage(record.message, depth + 1) ||
    errorMessage(record.msg, depth + 1) ||
    errorMessage(record.detail, depth + 1)
  );
}

export function bodyMessage(
  body: { text: string; json: unknown },
  status: number,
) {
  return (
    errorMessage(body.json) ||
    errorMessage(body.text.slice(0, 300)) ||
    `HTTP ${status}`
  );
}

/** Downloads a result file. A JSON/HTML body here is an error response, not media. */
export async function download(
  url: string,
  init: Init,
  signal: AbortSignal,
  fallbackMime: string,
) {
  const response = await send(url, init, signal, "retryable");
  if (!response.ok) {
    throw new AdapterError(
      `Download failed (${response.status})`,
      response.status === 404 || response.status === 403
        ? "fatal"
        : "retryable",
    );
  }
  const type =
    (response.headers.get("content-type") ?? "").split(";")[0]?.trim() ?? "";
  const bytes = Buffer.from(await response.arrayBuffer());
  if (/json|html|text\/plain/.test(type)) {
    let message = "";
    try {
      message = errorMessage(JSON.parse(bytes.toString("utf8")));
    } catch {
      // not JSON: fall through to the generic message
    }
    throw new AdapterError(
      message || `Download returned ${type}, not media`,
      "retryable",
    );
  }
  if (!bytes.length) throw new AdapterError("Download was empty", "retryable");
  return {
    bytes,
    mime: type && type !== "application/octet-stream" ? type : fallbackMime,
  };
}
