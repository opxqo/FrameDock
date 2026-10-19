import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import sharp from "sharp";

// FrameDock: a stand-in for the YFAI API (docs: yf.token6688.com/openapi.json) so the job pipeline can be tested
// for free, including the failures that used to lose paid results. Point a job at
//   credentials.baseUrl = http://127.0.0.1:<port>/mock-yfai/v1
// Behaviour is steered per task through the prompt text: "[slow=6]" finishes after 6 s (default 2 s),
// "[flaky]" makes every other poll fail with 502, "[fail]" ends the task as failed, "[images=3]" returns 3 images.

type Task = {
  id: string;
  requestId: string;
  readyAt: number;
  mode: { flaky: boolean; fail: boolean; images: number };
  polls: number;
};

const tasks = new Map<string, Task>();
const byClientId = new Map<string, string>();
/** How many times invoke was called, and how many distinct tasks it created (to prove idempotency). */
export const mockYfaiStats = { invokes: 0, tasks: 0 };

async function png(label: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200" fill="#3b6"/><text x="16" y="110" font-size="28" fill="#fff">${label}</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

const mockYfai: FastifyPluginAsync = async (app) => {
  app.post<{
    Body: {
      client_request_id?: string;
      params?: { prompt?: string; aspect_ratio?: string };
    };
  }>("/api/v1/model-runtime/invoke", async (request, reply) => {
    mockYfaiStats.invokes += 1;
    const clientId = request.body?.client_request_id;
    const replay = clientId ? byClientId.get(clientId) : undefined;
    const requestId = `req_${randomUUID().slice(0, 8)}`;
    reply.header("x-request-id", requestId);
    if (replay) {
      reply.header("x-idempotent-replay", "true");
      return { task_id: replay };
    }
    const prompt = request.body?.params?.prompt ?? "";
    const slow = Number(/\[slow=(\d+)\]/.exec(prompt)?.[1] ?? 2);
    const task: Task = {
      id: `task_${randomUUID().slice(0, 8)}`,
      requestId,
      readyAt: Date.now() + slow * 1000,
      mode: {
        flaky: prompt.includes("[flaky]"),
        fail: prompt.includes("[fail]"),
        images: Number(/\[images=(\d+)\]/.exec(prompt)?.[1] ?? 1),
      },
      polls: 0,
    };
    tasks.set(task.id, task);
    mockYfaiStats.tasks += 1;
    if (clientId) byClientId.set(clientId, task.id);
    // "[adjust]": answer like the gateway does when it replaced a parameter value.
    const adjustments = prompt.includes("[adjust]")
      ? {
          param_adjustments: [
            {
              param: "aspect_ratio",
              requested: request.body?.params?.aspect_ratio ?? null,
              applied: "16:9",
              reason: "nearest_supported",
            },
          ],
        }
      : {};
    return {
      task_id: task.id,
      status: "pending",
      is_final: false,
      ...adjustments,
    };
  });

  app.get<{ Params: { id: string } }>(
    "/v1/tasks/:id",
    async (request, reply) => {
      const task = tasks.get(request.params.id);
      if (!task)
        return reply.code(404).send({ error: { message: "not found" } });
      task.polls += 1;
      if (task.mode.flaky && task.polls % 2 === 1)
        return reply.code(502).send({ error: "bad gateway" });
      if (Date.now() < task.readyAt)
        return { task_id: task.id, status: "processing", is_final: false };
      if (task.mode.fail)
        return {
          task_id: task.id,
          status: "failed",
          is_final: true,
          error: { message: "mock: content blocked" },
        };
      const base = `${request.protocol}://${request.headers.host}/mock-yfai/files`;
      return {
        task_id: task.id,
        status: "completed",
        is_final: true,
        // The live service names the ledger's id here, not in X-Request-Id.
        delivery_provenance: { request_id: `ledger_${task.id}` },
        billing: { actual_cost_credits: 0.08 },
        channel_id: "mock-image@MOCK:default",
        result: {
          images: Array.from({ length: task.mode.images }, (_, index) => ({
            url: `${base}/${task.id}-${index + 1}.png`,
          })),
        },
      };
    },
  );

  app.get<{ Params: { name: string } }>(
    "/files/:name",
    async (request, reply) => {
      return reply
        .type("image/png")
        .send(await png(request.params.name.replace(/\.png$/, "")));
    },
  );

  app.get("/v1/skills/balance", async () => ({
    balance: "$10.000000",
    frozen: "$0.000000",
    available_balance: "$10.000000",
    credits: { balance: 72, frozen: 0, available_balance: 72, per_usd: 7.2 },
  }));
  app.get("/v1/models", async () => ({ data: [{ id: "mock-image" }] }));
  app.post("/api/v1/model-runtime/dry-run", async () => ({
    ok: true,
    lane_id: "mock",
  }));
};

export default mockYfai;
