import Fastify from "fastify";
import packageJson from "../package.json" with { type: "json" };
import codexApi from "./codex";
import { config } from "./config";
import { openDatabase } from "./db";
import { registerJobs } from "./jobs";
import kvApi from "./kv";
import { initCallLog, startRetentionJob } from "./logging/logger";
import logsApi from "./logs";
import mockApi from "./mock";
import mockYfai from "./mock/yfai";
import mokeApi from "./moke";
import proxy from "./proxy";
import { registerWebApp } from "./web-app";

const app = Fastify({ logger: true, forceCloseConnections: "idle" });
const { db, sqlite } = openDatabase();
initCallLog(sqlite, (error, message) => app.log.warn({ err: error }, message));
const stopRetention = startRetentionJob();

await app.register(kvApi, { prefix: "/api/kv", db });

await registerJobs(app, db);

await app.register(logsApi, { prefix: "/api/logs", sqlite });

await app.register(proxy, { prefix: "/proxy" });

await app.register(codexApi, { prefix: "/api/codex" });

if (config.moke) {
  await app.register(mokeApi, { prefix: "/api/moke", db });
}

if (config.mockApi) {
  await app.register(mockApi, { prefix: "/v1" });
  await app.register(mockYfai, { prefix: "/mock-yfai" });
}

await registerWebApp(app);

app.addHook("onClose", async () => {
  stopRetention();
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

// A stuck request must not keep a stopping service alive forever (launchd would eventually SIGKILL it).
const SHUTDOWN_TIMEOUT_MS = 10_000;

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    app.log.info(`${signal} received, shutting down`);
    setTimeout(() => {
      app.log.error("Graceful shutdown timed out, exiting");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS).unref();
    app.close().catch((error: unknown) => {
      app.log.error(error);
      process.exitCode = 1;
    });
  });
}

try {
  await app.listen({ port: config.port, host: config.host });
} catch (error) {
  app.log.error(error);
  await app.close();
  process.exitCode = 1;
}
