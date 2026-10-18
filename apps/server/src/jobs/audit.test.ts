import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import { auditJobs } from "./audit";
import { jobs } from "./schema";
import { closeAll, makeEngine, openDb, track } from "./testing";
import type { JobAdapter } from "./types";

// What the audit must catch: results that exist but nobody took, results that vanished, and tasks the provider
// finished while we were not looking.

afterEach(closeAll);

function adapterWith(poll: JobAdapter["poll"]): JobAdapter {
  return {
    id: "fake",
    concurrency: 1,
    // Slow on purpose: the engine's own polling must not race the audit's read-only check.
    pollIntervalMs: 3_600_000,
    maxPolls: 10,
    submit: async () => ({ remoteTaskId: "remote-1" }),
    poll,
    fetchResult: async () => ({ bytes: Buffer.from("x"), mime: "image/png" }),
  };
}

function seed(
  db: ReturnType<typeof openDb>["db"],
  id: string,
  patch: Partial<typeof jobs.$inferInsert>,
) {
  db.insert(jobs)
    .values({
      id,
      kind: "image",
      adapter: "fake",
      model: "m",
      state: "succeeded",
      request: {},
      credentials: { baseUrl: "http://x", apiKey: "k" },
      created_at: Date.now(),
      updated_at: Date.now(),
      ...patch,
    })
    .run();
}

describe("auditJobs", () => {
  it("flags undelivered results and missing files, and stays quiet once delivered", async () => {
    const dir = mkdtempSync(join(tmpdir(), "framedock-audit-"));
    mkdirSync(join(dir, "blobs", "image_files"), { recursive: true });
    writeFileSync(
      join(dir, "blobs", "image_files", encodeURIComponent("image:a")),
      "x",
    );
    const { db, entry } = openDb();
    const engine = track(
      entry,
      makeEngine(
        db,
        adapterWith(async () => ({ status: "running" })),
      ),
    );
    seed(db, "a", {
      result: {
        store: "image_files",
        key: "image:a",
        mime: "image/png",
        size: 1,
      },
    });
    seed(db, "b", {
      result: {
        store: "image_files",
        key: "image:gone",
        mime: "image/png",
        size: 1,
      },
      delivered_at: Date.now(),
    });

    const report = await auditJobs(db, engine, 7, dir);
    const codes = Object.fromEntries(
      report.findings.map((f) => [f.jobId, f.code]),
    );
    assert.deepEqual(codes, { a: "undelivered", b: "missing_file" });

    engine.acknowledge("a");
    const after = await auditJobs(db, engine, 7, dir);
    assert.deepEqual(
      after.findings.map((f) => f.jobId),
      ["b"],
    );
  });

  it("asks the provider about open jobs and reports one that already finished there", async () => {
    let finished = false;
    const { db, entry } = openDb();
    const engine = track(
      entry,
      makeEngine(
        db,
        adapterWith(async () =>
          finished ? { status: "succeeded" } : { status: "running" },
        ),
      ),
    );
    seed(db, "open", {
      state: "unknown",
      remote_task_id: "remote-9",
      error: "lost contact",
    });

    let report = await auditJobs(db, engine);
    assert.equal(report.findings[0]?.code, "unknown");
    assert.equal(report.findings[0]?.providerStatus, "running");

    finished = true;
    report = await auditJobs(db, engine);
    assert.equal(report.findings[0]?.code, "provider_done");
    assert.match(report.findings[0]?.message ?? "", /already finished/);
  });

  it("calls a long-running job stalled, and reports provider trouble as unreachable", async () => {
    const { db, entry } = openDb();
    const engine = track(
      entry,
      makeEngine(
        db,
        adapterWith(async () => {
          throw new Error("down");
        }),
      ),
    );
    seed(db, "old", {
      state: "running",
      remote_task_id: "r",
      created_at: Date.now() - 2 * 3600_000,
    });
    const report = await auditJobs(db, engine);
    assert.equal(report.findings[0]?.code, "stalled");
    assert.equal(report.findings[0]?.providerStatus, "unreachable");
    assert.equal(report.summary.running, 1);
  });
});
