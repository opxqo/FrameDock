import type { ServerResponse } from "node:http";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { JobEngine } from "./engine";
import { toPublicJob } from "./engine";
import { JOB_KINDS, JOB_STATES } from "./schema";

const createBody = z.object({
  kind: z.enum(JOB_KINDS),
  adapter: z.string().min(1),
  model: z.string().min(1),
  request: z.unknown(),
  credentials: z.object({ baseUrl: z.string(), apiKey: z.string() }).optional(),
  idempotencyKey: z.string().min(1).max(200).optional(),
  projectId: z.string().optional(),
  nodeId: z.string().optional(),
  runId: z.string().optional(),
});

const listQuery = z.object({
  node: z.string().optional(),
  project: z.string().optional(),
  state: z.enum(JOB_STATES).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

const HEARTBEAT_MS = 25_000;

const jobsApi: FastifyPluginAsync<{ engine: JobEngine }> = async (
  app,
  { engine },
) => {
  app.addHook("onRequest", async (_request, reply) => {
    reply.header("Cache-Control", "no-store");
  });

  app.post("/", async (request, reply) => {
    const parsed = createBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: z.prettifyError(parsed.error) });
    }
    if (!engine.hasAdapter(parsed.data.adapter)) {
      return reply
        .code(400)
        .send({ error: `Unknown adapter: ${parsed.data.adapter}` });
    }
    const header = request.headers["idempotency-key"];
    const { job, existed } = engine.create({
      ...parsed.data,
      idempotencyKey:
        (typeof header === "string" && header) || parsed.data.idempotencyKey,
    });
    return reply.code(existed ? 200 : 201).send({ job: toPublicJob(job) });
  });

  app.get("/", async (request, reply) => {
    const parsed = listQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: z.prettifyError(parsed.error) });
    }
    return { jobs: engine.list(parsed.data).map((row) => toPublicJob(row)) };
  });

  // Server-sent events: one `job` event per state change. Clients resync with GET / after reconnecting.
  const streams = new Set<ServerResponse>();
  app.get("/events", (request, reply) => {
    reply.hijack();
    const response = reply.raw;
    response.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    response.write("retry: 3000\n: connected\n\n");
    streams.add(response);
    const unsubscribe = engine.subscribe((job) => {
      response.write(`event: job\ndata: ${JSON.stringify(job)}\n\n`);
    });
    const heartbeat = setInterval(
      () => response.write(": ping\n\n"),
      HEARTBEAT_MS,
    );
    request.raw.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
      streams.delete(response);
    });
  });
  // Open streams would otherwise hold app.close() until the shutdown timeout.
  app.addHook("preClose", async () => {
    for (const response of streams) response.end();
    streams.clear();
  });

  app.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const row = engine.get(request.params.id);
    if (!row) return reply.code(404).send({ error: "Job not found" });
    return { job: toPublicJob(row, true) };
  });

  app.post<{ Params: { id: string } }>(
    "/:id/cancel",
    async (request, reply) => {
      const row = engine.cancel(request.params.id);
      if (!row) return reply.code(404).send({ error: "Job not found" });
      return { job: toPublicJob(row) };
    },
  );

  app.post<{ Params: { id: string } }>(
    "/:id/resubmit",
    async (request, reply) => {
      if (!engine.get(request.params.id)) {
        return reply.code(404).send({ error: "Job not found" });
      }
      const row = engine.resubmit(request.params.id);
      if (!row) {
        return reply.code(409).send({
          error:
            "Only jobs in the unknown state, with saved credentials, can be resubmitted",
        });
      }
      return { job: toPublicJob(row) };
    },
  );
};

export default jobsApi;
