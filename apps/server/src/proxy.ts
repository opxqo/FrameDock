// Adapted from infinite-canvas canvas-proxy (MIT, Copyright (c) 2026 basketikun):
// https://github.com/basketikun/infinite-canvas/blob/3a6b64b/canvas-proxy/index.js
// Forwards /proxy/<full-target-url> so the browser can reach providers and media hosts without CORS limits.
import { Readable } from "node:stream";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { Agent, fetch, type Response } from "undici";
import packageJson from "../package.json" with { type: "json" };

// Image edits and video tasks on relays such as AutoDL can take well over Node fetch's default
// 5-minute headers timeout; keep the upstream connection open for up to 20 minutes.
const UPSTREAM_TIMEOUT_MS = 20 * 60 * 1000;
const dispatcher = new Agent({
  headersTimeout: UPSTREAM_TIMEOUT_MS,
  bodyTimeout: UPSTREAM_TIMEOUT_MS,
  connectTimeout: 30_000,
});

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
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
    if (SKIP_REQUEST_HEADERS.has(key) || value === undefined) continue;
    headers[key] = Array.isArray(value) ? value.join(", ") : value;
  }
  return headers;
}

function responseHeaders(upstream: Response) {
  const headers: Record<string, string> = { ...CORS_HEADERS };
  upstream.headers.forEach((value, key) => {
    if (SKIP_RESPONSE_HEADERS.has(key) || key.startsWith("access-control-"))
      return;
    headers[key] = value;
  });
  return headers;
}

async function forward(
  request: FastifyRequest,
  reply: FastifyReply,
  target: string,
) {
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const upstream = await fetch(target, {
    dispatcher,
    method: request.method,
    headers: requestHeaders(request),
    body: hasBody ? (request.body as Buffer | undefined) : undefined,
    redirect: "follow",
  });
  reply.hijack();
  const res = reply.raw;
  res.writeHead(upstream.status, responseHeaders(upstream));
  if (!upstream.body) {
    res.end();
    return upstream.status;
  }
  // Streamed so that SSE responses (text generation) reach the browser chunk by chunk.
  const stream = Readable.fromWeb(
    upstream.body as import("node:stream/web").ReadableStream,
  );
  res.on("close", () => stream.destroy());
  stream.pipe(res);
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
        return reply.code(204).headers(CORS_HEADERS).send();
      }
      const rawPath = request.url.replace(/^\/proxy\/?/, "");
      const target = readTarget(rawPath);
      if (!target) return reply.headers(CORS_HEADERS).send(info);
      const startedAt = Date.now();
      try {
        const status = await forward(request, reply, target);
        request.log.info(
          { target, status, ms: Date.now() - startedAt },
          "Proxy forward",
        );
      } catch (error) {
        // undici reports "fetch failed" and keeps the real reason (timeout, reset, DNS) in `cause`.
        const cause =
          error instanceof Error && error.cause instanceof Error
            ? `: ${error.cause.message}`
            : "";
        const reason = `${error instanceof Error ? error.message : String(error)}${cause}`;
        request.log.warn({ target, reason }, "Proxy forward failed");
        if (reply.raw.headersSent) {
          reply.raw.destroy();
          return;
        }
        if (reply.sent) return;
        return reply.code(502).headers(CORS_HEADERS).send({ error: reason });
      }
    },
  });
};

export default proxy;
