import type Database from "better-sqlite3";
import type { FastifyPluginAsync } from "fastify";
import {
  type BrowserCall,
  bodyLimitsFrom,
  ingestBrowserCall,
} from "./logging/ingest";
import {
  type CallContext,
  getSettings,
  type LogSettings,
  logBytes,
  pruneLogs,
  saveSettings,
} from "./logging/logger";

// FrameDock: read/manage the API call log (`api_logs`). Bodies are already redacted when stored.

type Query = Record<string, string | undefined>;

const LIST_COLUMNS =
  "id, ts, state, source, method, url, host, path, provider, model, status, error, duration_ms, total_ms, req_size, res_size, res_type, project_id, node_id, mode, run_id, page, poll";

function like(value: string) {
  return `%${value.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

/** WHERE clause shared by list, count, export and delete. */
function buildFilter(query: Query) {
  const where: string[] = [];
  const params: Record<string, string | number> = {};
  const status = query.status;
  if (status === "ok")
    where.push("state = 'done' AND status BETWEEN 200 AND 399");
  else if (status === "failed")
    where.push("(state IN ('error','interrupted') OR status >= 400)");
  else if (status === "4xx") where.push("status BETWEEN 400 AND 499");
  else if (status === "5xx") where.push("status >= 500");
  else if (status === "error") where.push("state IN ('error','interrupted')");
  else if (status === "pending") where.push("state = 'pending'");
  for (const [field, column] of [
    ["source", "source"],
    ["provider", "provider"],
    ["node", "node_id"],
    ["project", "project_id"],
    ["run", "run_id"],
    ["mode", "mode"],
    ["method", "method"],
  ] as const) {
    if (query[field]) {
      where.push(`${column} = @${field}`);
      params[field] = query[field] as string;
    }
  }
  if (query.since && Number(query.since) > 0) {
    where.push("ts >= @since");
    params.since = Number(query.since);
  }
  if (query.until && Number(query.until) > 0) {
    where.push("ts <= @until");
    params.until = Number(query.until);
  }
  if (query.hidePoll === "1") where.push("poll = 0");
  if (query.q?.trim()) {
    where.push(
      "(url LIKE @q ESCAPE '\\' OR error LIKE @q ESCAPE '\\' OR model LIKE @q ESCAPE '\\' OR req_body LIKE @q ESCAPE '\\' OR res_body LIKE @q ESCAPE '\\')",
    );
    params.q = like(query.q.trim());
  }
  return {
    sql: where.length ? ` WHERE ${where.join(" AND ")}` : "",
    params,
  };
}

const logsApi: FastifyPluginAsync<{ sqlite: Database.Database }> = async (
  app,
  { sqlite },
) => {
  app.addHook("onRequest", async (_request, reply) => {
    reply.header("Cache-Control", "no-store");
  });

  app.get<{ Querystring: Query }>("/", async (request) => {
    const filter = buildFilter(request.query);
    const pageSize = Math.min(
      200,
      Math.max(1, Number(request.query.pageSize) || 50),
    );
    const page = Math.max(1, Number(request.query.page) || 1);
    const total = (
      sqlite
        .prepare(`SELECT COUNT(*) AS n FROM api_logs${filter.sql}`)
        .get(filter.params) as { n: number }
    ).n;
    const items = sqlite
      .prepare(
        `SELECT ${LIST_COLUMNS} FROM api_logs${filter.sql} ORDER BY id DESC LIMIT @limit OFFSET @offset`,
      )
      .all({
        ...filter.params,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
    return { items, total, page, pageSize };
  });

  app.get("/stats", async () => {
    const since = Date.now() - 86_400_000;
    const byState = sqlite
      .prepare(
        `SELECT CASE WHEN state = 'pending' THEN 'pending'
                     WHEN state IN ('error','interrupted') OR status >= 400 THEN 'failed'
                     ELSE 'ok' END AS bucket, COUNT(*) AS n
         FROM api_logs WHERE ts >= ? AND poll = 0 GROUP BY bucket`,
      )
      .all(since) as Array<{ bucket: string; n: number }>;
    const byProvider = sqlite
      .prepare(
        "SELECT provider, COUNT(*) AS n, SUM(CASE WHEN state IN ('error','interrupted') OR status >= 400 THEN 1 ELSE 0 END) AS failed FROM api_logs WHERE ts >= ? AND poll = 0 GROUP BY provider ORDER BY n DESC",
      )
      .all(since);
    const rows = (
      sqlite.prepare("SELECT COUNT(*) AS n FROM api_logs").get() as {
        n: number;
      }
    ).n;
    return {
      last24h: Object.fromEntries(byState.map((row) => [row.bucket, row.n])),
      byProvider,
      rows,
      bytes: logBytes(),
    };
  });

  app.get("/settings", async () => getSettings());
  app.put<{ Body: Partial<LogSettings> }>("/settings", async (request) =>
    saveSettings(request.body ?? {}),
  );

  app.get<{ Querystring: Query }>("/export", async (request, reply) => {
    const filter = buildFilter(request.query);
    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Content-Disposition": `attachment; filename="framedock-api-logs-${new Date().toISOString().slice(0, 10)}.ndjson"`,
    });
    const rows = sqlite
      .prepare(`SELECT * FROM api_logs${filter.sql} ORDER BY id ASC`)
      .iterate(filter.params);
    for (const row of rows) {
      if (!res.write(`${JSON.stringify(row)}\n`)) {
        await new Promise((resolve) => res.once("drain", resolve));
      }
    }
    res.end();
  });

  app.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const row = sqlite
      .prepare("SELECT * FROM api_logs WHERE id = ?")
      .get(Number(request.params.id));
    return row ?? reply.code(404).send({ error: "Log not found" });
  });

  // Deleting everything must be explicit (all=1); otherwise only rows matching the filters go.
  app.delete<{ Querystring: Query }>("/", async (request, reply) => {
    const filter = buildFilter(request.query);
    if (!filter.sql && request.query.all !== "1")
      return reply.code(400).send({ error: "Add filters or all=1" });
    const result = sqlite
      .prepare(`DELETE FROM api_logs${filter.sql}`)
      .run(filter.params);
    return { deleted: result.changes };
  });

  app.delete<{ Params: { id: string } }>("/:id", async (request) => {
    const result = sqlite
      .prepare("DELETE FROM api_logs WHERE id = ?")
      .run(Number(request.params.id));
    return { deleted: result.changes };
  });

  app.post("/prune", async () => {
    pruneLogs();
    return { ok: true };
  });

  // Browser-side calls that did not go through /proxy (proxy disabled, custom proxy, direct requests).
  app.post<{ Body: BrowserCall }>(
    "/ingest",
    { bodyLimit: 20 * 1024 * 1024 },
    async (request, reply) => {
      ingestBrowserCall(request.body, bodyLimitsFrom(getSettings()));
      return reply.code(204).send();
    },
  );
};

export type { CallContext };
export default logsApi;
