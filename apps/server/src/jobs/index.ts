import type { FastifyInstance } from "fastify";
import type { openDatabase } from "../db";
import { mockVideoAdapter } from "./adapters/mock";
import { saveJobBlob } from "./blobs";
import { JobEngine } from "./engine";
import jobsApi from "./routes";

export async function registerJobs(
  app: FastifyInstance,
  db: ReturnType<typeof openDatabase>["db"],
) {
  const engine = new JobEngine({
    db,
    adapters: [mockVideoAdapter],
    saveResult: (kind, jobId, fetched) => saveJobBlob(db, kind, jobId, fetched),
    onError: (error, message) => app.log.error({ err: error }, message),
  });
  await app.register(jobsApi, { prefix: "/api/jobs", engine });
  app.addHook("onClose", async () => {
    engine.close();
  });
  engine.recover();
  return engine;
}
