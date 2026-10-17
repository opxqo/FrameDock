import Fastify from "fastify";
import packageJson from "../package.json" with { type: "json" };
import codexApi from "./codex";
import { config } from "./config";
import { openDatabase } from "./db";
import kvApi from "./kv";
import mockApi from "./mock";
import mokeApi from "./moke";
import proxy from "./proxy";

const app = Fastify({ logger: true });
const { db, sqlite } = openDatabase();

await app.register(kvApi, { prefix: "/api/kv", db });

await app.register(proxy, { prefix: "/proxy" });

await app.register(codexApi, { prefix: "/api/codex" });

if (config.moke) {
  await app.register(mokeApi, { prefix: "/api/moke", db });
}

if (config.mockApi) {
  await app.register(mockApi, { prefix: "/v1" });
}

app.addHook("onClose", async () => {
  sqlite.close();
});

app.get("/api/health", async (_request, reply) => {
  try {
    const result = sqlite.prepare("SELECT 1 AS ok").get() as { ok: number };
    const db = result.ok === 1;
    return reply
      .code(db ? 200 : 503)
      .send({ ok: db, db, version: packageJson.version });
  } catch (error) {
    app.log.error(error, "Database health check failed");
    return reply
      .code(503)
      .send({ ok: false, db: false, version: packageJson.version });
  }
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    app.close().catch((error: unknown) => {
      app.log.error(error);
      process.exitCode = 1;
    });
  });
}

try {
  await app.listen({ port: config.port, host: "127.0.0.1" });
} catch (error) {
  app.log.error(error);
  await app.close();
  process.exitCode = 1;
}
