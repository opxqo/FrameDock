import type { FastifyInstance } from "fastify";
import type { openDatabase } from "../db";
import { mockVideoAdapter } from "./adapters/mock";
import { openaiVideoAdapter } from "./adapters/openai-video";
import { yfaiAdapter } from "./adapters/yfai";
import { releaseJobReferences, saveJobBlobs } from "./blobs";
import { JobEngine } from "./engine";
import jobsApi from "./routes";

export async function registerJobs(
  app: FastifyInstance,
  db: ReturnType<typeof openDatabase>["db"],
) {
  const engine = new JobEngine({
    db,
    adapters: [mockVideoAdapter, yfaiAdapter, openaiVideoAdapter],
    saveResult: (kind, jobId, outputs) =>
      saveJobBlobs(db, kind, jobId, outputs),
    // Reference files uploaded for a job are only needed until it ends.
    onFinal: (job) => {
      releaseJobReferences(db, job.request).catch((error) =>
        app.log.warn(
          { err: error },
          `Could not remove reference files of job ${job.id}`,
        ),
      );
    },
    onError: (error, message) => app.log.error({ err: error }, message),
  });
  await app.register(jobsApi, { prefix: "/api/jobs", engine, db });
  app.addHook("onClose", async () => {
    engine.close();
  });
  engine.recover();
  return engine;
}
