import {
  type CallContext,
  finishCall,
  type LogSettings,
  startCall,
} from "./logger";
import { type BodyLimits, captureBody } from "./redact";

// Browser-side record of a call that never reached /proxy. The browser sends what it saw; redaction and
// truncation happen here, with the same rules as for proxied calls.

export type BrowserCall = {
  method?: string;
  url?: string;
  status?: number;
  error?: string;
  /** Epoch ms when the browser started the call. */
  startedAt?: number;
  durationMs?: number;
  reqHeaders?: Record<string, string>;
  reqBody?: string;
  reqContentType?: string;
  resHeaders?: Record<string, string>;
  resBody?: string;
  resContentType?: string;
  resSize?: number;
  context?: CallContext;
  reqUid?: string;
};

export function bodyLimitsFrom(settings: LogSettings): BodyLimits {
  return { maxStore: settings.bodyLimit, maxParse: 16 * 1024 * 1024 };
}

export function ingestBrowserCall(call: BrowserCall, limits: BodyLimits) {
  if (!call || typeof call.url !== "string" || !call.url) return;
  const handle = startCall({
    source: "browser",
    method: (call.method || "GET").toUpperCase(),
    url: call.url,
    headers: call.reqHeaders,
    body: call.reqBody,
    contentType: call.reqContentType,
    context: call.context,
    reqUid: call.reqUid,
    startedAt: typeof call.startedAt === "number" ? call.startedAt : undefined,
  });
  if (!handle) return;
  // Keep the browser's own clock for the start so rows sort the way the user experienced them.
  const resBody = captureBody(call.resBody, call.resContentType, limits);
  finishCall(handle, {
    state: call.error || (call.status ?? 0) === 0 ? "error" : "done",
    status: call.status || undefined,
    error: call.error,
    headersMs: call.durationMs,
    totalMs: call.durationMs,
    headers: call.resHeaders,
    body: resBody,
    resType: call.resContentType,
    size: call.resSize ?? resBody?.size,
  });
}
