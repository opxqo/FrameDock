// Adapted from infinite-canvas canvas-proxy (MIT, Copyright (c) 2026 basketikun):
// https://github.com/basketikun/infinite-canvas/blob/3a6b64b/canvas-proxy/index.js
// Forwards /proxy/<full-target-url> so the browser can reach providers and media hosts without CORS limits.
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { Agent, fetch, type Response } from "undici";
import packageJson from "../package.json" with { type: "json" };
import {
  bodyLimits,
  type CallEnd,
  finishCall,
  parseContext,
  startCall,
} from "./logging/logger";
import { captureBody, isCapturableType } from "./logging/redact";

// Image edits and video tasks on relays such as AutoDL can take well over Node fetch's default
// 5-minute headers timeout; keep the upstream connection open for up to 20 minutes.
const UPSTREAM_TIMEOUT_MS = 20 * 60 * 1000;
const dispatcher = new Agent({
  headersTimeout: UPSTREAM_TIMEOUT_MS,
  bodyTimeout: UPSTREAM_TIMEOUT_MS,
  connectTimeout: 30_000,
});

// FrameDock: the proxy can reach any URL, so only pages served from this machine may read its responses
// (a website the user happens to visit must not be able to use it to reach the local network).
const LOCAL_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|[a-z0-9-]+\.localhost)(:\d+)?$/i;

function corsHeaders(request: FastifyRequest) {
  const origin = request.headers.origin;
  return {
    ...CORS_BASE,
    ...(typeof origin === "string" && LOCAL_ORIGIN.test(origin)
      ? { "access-control-allow-origin": origin, vary: "Origin" }
      : {}),
  };
}

/** Logged targets drop query strings, which often carry API keys (`?key=…`). */
function redact(target: string) {
  const index = target.indexOf("?");
  return index === -1 ? target : `${target.slice(0, index)}?…`;
}

const CORS_BASE = {
  "access-control-allow-methods": "*",
  "access-control-allow-headers": "*",
  "access-control-expose-headers": "*",
  "access-control-max-age": "86400",
};

/** Headers that describe the hop to this proxy rather than the upstream request. */
const SKIP_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "content-length",
  "accept-encoding",
  "origin",
  "referer",
  "sec-fetch-dest",
  "sec-fetch-mode",
  "sec-fetch-site",
]);
/** fetch() already decoded and re-framed the body, so the upstream framing headers no longer apply. */
const SKIP_RESPONSE_HEADERS = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
  "keep-alive",
]);

function readTarget(rawPath: string) {
  let target = rawPath;
  try {
    // decodeURI undoes the escaping browsers apply to the path while keeping intentional encodeURIComponent escapes.
    target = decodeURI(rawPath);
  } catch {
    // Malformed escape sequence: forward the raw form instead of failing.
  }
  // Some clients collapse the "//" in the embedded target URL, so restore it before parsing.
  target = target.replace(/^(https?:)\/*/i, "$1//");
  return /^https?:\/\/[^/]/i.test(target) ? target : "";
}

function requestHeaders(request: FastifyRequest) {
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(request.headers)) {
    // x-framedock-* carries logging context for this server only; the provider must not see it.
    if (
      SKIP_REQUEST_HEADERS.has(key) ||
      key.startsWith("x-framedock-") ||
      value === undefined
    )
      continue;
    headers[key] = Array.isArray(value) ? value.join(", ") : value;
  }
  return headers;
}

function responseHeaders(request: FastifyRequest, upstream: Response) {
  const headers: Record<string, string> = { ...corsHeaders(request) };
  upstream.headers.forEach((value, key) => {
    if (SKIP_RESPONSE_HEADERS.has(key) || key.startsWith("access-control-"))
      return;
    headers[key] = value;
  });
  return headers;
}

/** undici reports "fetch failed" and keeps the real reason (timeout, reset, DNS) in `cause`. */
function describeError(error: unknown) {
  const cause =
    error instanceof Error && error.cause instanceof Error
      ? `: ${error.cause.message}`
      : "";
  return `${error instanceof Error ? error.message : String(error)}${cause}`;
}

async function forward(
  request: FastifyRequest,
  reply: FastifyReply,
  target: string,
) {
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const startedAt = Date.now();
  const requestBody = hasBody
    ? (request.body as Buffer | undefined)
    : undefined;
  const reqUid = request.headers["x-framedock-req"];
  // Every call is recorded: a pending row now, completed (or failed) below. Logging never throws.
  const handle = startCall({
    source: "proxy",
    method: request.method,
    url: target,
    headers: request.headers,
    body: requestBody,
    contentType: request.headers["content-type"],
    context: parseContext(request.headers["x-framedock-ctx"]),
    reqUid: Array.isArray(reqUid) ? reqUid[0] : reqUid,
  });
  let finished = false;
  const end = (result: CallEnd) => {
    if (finished) return;
    finished = true;
    finishCall(handle, result);
  };

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      dispatcher,
      method: request.method,
      headers: requestHeaders(request),
      body: requestBody,
      redirect: "follow",
    });
  } catch (error) {
    end({ state: "error", error: describeError(error) });
    throw error;
  }
  const headersMs = Date.now() - startedAt;
  const resType = upstream.headers.get("content-type") ?? undefined;
  const resHeaders = Object.fromEntries(upstream.headers.entries());
  reply.hijack();
  const res = reply.raw;
  res.writeHead(upstream.status, responseHeaders(request, upstream));
  if (!upstream.body) {
    res.end();
    end({
      state: "done",
      status: upstream.status,
      headersMs,
      headers: resHeaders,
      resType,
      size: 0,
    });
    return upstream.status;
  }
  // Streamed so that SSE responses (text generation) reach the browser chunk by chunk.
  const stream = Readable.fromWeb(
    upstream.body as import("node:stream/web").ReadableStream,
  );
  // The log tap counts every byte but only buffers JSON/text/SSE (media is never kept), up to maxParse.
  const limits = bodyLimits();
  const capture = isCapturableType(resType);
  const chunks: Buffer[] = [];
  let size = 0;
  let buffered = 0;
  let overflow = false;
  const tap = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      size += chunk.length;
      if (capture && !overflow) {
        if (buffered + chunk.length <= limits.maxParse) {
          chunks.push(chunk);
          buffered += chunk.length;
        } else {
          overflow = true;
          chunks.length = 0;
        }
      }
      callback(null, chunk);
    },
  });
  const snapshot = () =>
    overflow
      ? {
          text: `[body too large to capture: ${size}+ bytes]`,
          size,
          truncated: true,
        }
      : captureBody(Buffer.concat(chunks), resType, limits);
  // pipeline() propagates upstream resets/timeouts as a rejection instead of an uncaught stream error
  // (which would crash the server); the caller logs it and drops the half-sent response.
  try {
    await pipeline(stream, tap, res);
  } catch (error) {
    end({
      state: "error",
      status: upstream.status,
      error: res.writableFinished
        ? describeError(error)
        : `客户端中断或上游断流：${describeError(error)}`,
      headersMs,
      headers: resHeaders,
      resType,
      size,
      body: capture ? snapshot() : null,
    });
    throw error;
  }
  end({
    state: "done",
    status: upstream.status,
    headersMs,
    headers: resHeaders,
    resType,
    size,
    body: capture
      ? snapshot()
      : {
          text: `<binary ${resType ?? "data"} ${size} bytes>`,
          size,
          truncated: false,
        },
  });
  return upstream.status;
}

const proxy: FastifyPluginAsync = async (app) => {
  // Forward request bodies byte for byte (JSON, multipart, anything else).
  app.removeAllContentTypeParsers();
  app.addContentTypeParser(
    "*",
    { parseAs: "buffer", bodyLimit: 200 * 1024 * 1024 },
    (_request, body, done) => done(null, body),
  );

  const info = {
    proxy: "framedock-proxy",
    version: packageJson.version,
    usage: "/proxy/<full-target-url>",
  };
  app.get("/", async () => info);

  app.route({
    method: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    url: "/*",
    handler: async (request, reply) => {
      if (request.method === "OPTIONS") {
        return reply.code(204).headers(corsHeaders(request)).send();
      }
      const rawPath = request.url.replace(/^\/proxy\/?/, "");
      const target = readTarget(rawPath);
      if (!target) return reply.headers(corsHeaders(request)).send(info);
      const startedAt = Date.now();
      try {
        const status = await forward(request, reply, target);
        request.log.info(
          { target: redact(target), status, ms: Date.now() - startedAt },
          "Proxy forward",
        );
      } catch (error) {
        // undici reports "fetch failed" and keeps the real reason (timeout, reset, DNS) in `cause`.
        const reason = describeError(error);
        request.log.warn(
          { target: redact(target), reason },
          "Proxy forward failed",
        );
        if (reply.raw.headersSent) {
          reply.raw.destroy();
          return;
        }
        if (reply.sent) return;
        return reply
          .code(502)
          .headers(corsHeaders(request))
          .send({ error: reason });
      }
    },
  });
};

export default proxy;
