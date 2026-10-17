// FrameDock: read-only proxy for the MOKE AIGC material library (https://www.mokeaigc.ai/mcp, MCP over
// JSON-RPC). Only the anonymous Skill tools are used. Everything returned is untrusted reference text:
// it is cached and handed to the web app as data, never executed.
import { and, eq } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { EnvHttpProxyAgent, fetch } from "undici";
import type { openDatabase } from "./db";
import { kv } from "./schema";

const MOKE_MCP_URL = process.env.MOKE_MCP_URL || "https://www.mokeaigc.ai/mcp";
const REQUEST_TIMEOUT_MS = 20_000;
const SEARCH_TTL_MS = 10 * 60 * 1000;
const DETAIL_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_STORE = "moke_cache";
const READABLE_FILE = /\.(md|markdown|txt|ya?ml)$/i;

class MokeError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

let requestId = 0;
// Honour HTTPS_PROXY / NO_PROXY when set (corporate networks); undici's fetch ignores them by default.
const dispatcher =
  process.env.HTTPS_PROXY || process.env.https_proxy
    ? new EnvHttpProxyAgent()
    : undefined;

/** Calls one MCP tool and returns its JSON payload (the server puts it in content[0].text). */
async function callTool(name: string, args: Record<string, unknown>) {
  let response: Awaited<ReturnType<typeof fetch>>;
  try {
    response = await fetch(MOKE_MCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // The endpoint rejects clients that do not accept both.
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: ++requestId,
        method: "tools/call",
        params: { name, arguments: args },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      dispatcher,
    });
  } catch (error) {
    throw new MokeError(
      `无法连接 MOKE：${error instanceof Error ? error.message : String(error)}`,
      502,
      true,
    );
  }
  if (!response.ok)
    throw new MokeError(
      `MOKE 返回 ${response.status}`,
      502,
      response.status >= 500,
    );
  const body = await response.text();
  // Responses are plain JSON today; accept a single SSE "data:" frame too.
  const json = body.trimStart().startsWith("{")
    ? body
    : body
        .split("\n")
        .find((line) => line.startsWith("data:"))
        ?.slice(5);
  let envelope: {
    result?: { content?: Array<{ text?: string }>; isError?: boolean };
    error?: { message?: string };
  };
  try {
    envelope = JSON.parse(json || "");
  } catch {
    throw new MokeError("MOKE 返回了无法解析的内容", 502, true);
  }
  if (envelope.error)
    throw new MokeError(envelope.error.message || "MOKE 请求失败", 502, false);
  const text = envelope.result?.content?.[0]?.text || "{}";
  const payload = JSON.parse(text) as { error?: string };
  if (envelope.result?.isError || payload.error)
    throw new MokeError(
      payload.error === "authentication_required"
        ? "该资料需要登录 MOKE 才能读取"
        : payload.error || "MOKE 请求失败",
      payload.error === "authentication_required" ? 403 : 502,
      false,
    );
  return payload;
}

const mokeApi: FastifyPluginAsync<{
  db: ReturnType<typeof openDatabase>["db"];
}> = async (app, { db }) => {
  const searchCache = new Map<string, { at: number; value: unknown }>();

  /** Details and files are versioned, so they live in the kv table for a week. */
  async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const where = and(eq(kv.store, CACHE_STORE), eq(kv.key, key));
    const row = db.select().from(kv).where(where).get();
    if (row?.value && Date.now() - row.updated_at < DETAIL_TTL_MS)
      return JSON.parse(row.value) as T;
    const value = await load();
    const record = {
      store: CACHE_STORE,
      key,
      kind: "json" as const,
      value: JSON.stringify(value),
      mime: null,
      size: null,
      updated_at: Date.now(),
    };
    db.insert(kv)
      .values(record)
      .onConflictDoUpdate({ target: [kv.store, kv.key], set: record })
      .run();
    return value;
  }

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof MokeError)
      return reply
        .code(error.status)
        .send({ error: error.message, retryable: error.retryable });
    app.log.error(error);
    return reply.code(500).send({ error: "MOKE 代理出错", retryable: true });
  });

  app.get<{
    Querystring: {
      query?: string;
      category?: string;
      cursor?: string;
      limit?: string;
      language?: string;
    };
  }>("/skills", async ({ query }) => {
    const args = {
      query: (query.query || "").slice(0, 200),
      type: "skill",
      language: query.language === "en" ? "en" : "zh",
      limit: Math.min(Math.max(Number(query.limit) || 20, 1), 50),
      ...(query.category ? { category: query.category.slice(0, 100) } : {}),
      ...(query.cursor ? { cursor: query.cursor } : {}),
    };
    const key = JSON.stringify(args);
    const hit = searchCache.get(key);
    if (hit && Date.now() - hit.at < SEARCH_TTL_MS) return hit.value;
    const value = await callTool("search_materials", args);
    searchCache.set(key, { at: Date.now(), value });
    return value;
  });

  app.get<{ Querystring: { id?: string; version?: string } }>(
    "/skill",
    async ({ query }, reply) => {
      if (!query.id?.startsWith("skill/"))
        return reply.code(400).send({ error: "缺少 Skill id" });
      const args = {
        id: query.id,
        ...(query.version ? { version: query.version } : {}),
      };
      // Without a version the latest may change, so only pinned reads are cached.
      return query.version
        ? cached(`${query.id}@${query.version}`, () =>
            callTool("get_material", args),
          )
        : callTool("get_material", args);
    },
  );

  app.get<{ Querystring: { id?: string; version?: string; path?: string } }>(
    "/skill/file",
    async ({ query }, reply) => {
      const { id, version, path } = query;
      if (!id?.startsWith("skill/") || !version || !path)
        return reply.code(400).send({ error: "缺少 id、version 或 path" });
      if (
        path.includes("..") ||
        path.startsWith("/") ||
        !READABLE_FILE.test(path)
      )
        return reply.code(400).send({ error: "只能读取 Skill 里的文本文件" });
      return cached(`${id}@${version}/${path}`, () =>
        callTool("read_skill_file", { id, version, path }),
      );
    },
  );
};

export default mokeApi;
