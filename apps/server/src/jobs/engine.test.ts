import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { kv } from "../schema";
import { releaseJobReferences } from "./blobs";
import type { JobEngine } from "./engine";
import { jobs } from "./schema";
import {
  closeAll,
  makeEngine,
  openDb,
  stateOf,
  track,
  untilState,
  waitFor,
} from "./testing";
import {
  AdapterError,
  type JobAdapter,
  type JobInput,
  type PollOutcome,
} from "./types";

type Script = {
  submit?: () => Promise<{ remoteTaskId: string }>;
  poll?: () => Promise<PollOutcome>;
};

/** Adapter whose behaviour is scripted per test; counts every call. */
function fakeAdapter(script: Script = {}) {
  const calls = { submit: 0, poll: 0, fetch: 0, cancel: 0 };
  const adapter: JobAdapter = {
    id: "fake",
    concurrency: 2,
    pollIntervalMs: 5,
    maxPolls: 50,
    async submit() {
      calls.submit += 1;
      return script.submit ? script.submit() : { remoteTaskId: "remote-1" };
    },
    async poll() {
      calls.poll += 1;
      return script.poll ? script.poll() : { status: "succeeded" };
    },
    async fetchResult() {
      calls.fetch += 1;
      return { bytes: Buffer.from("video"), mime: "video/mp4" };
    },
    async cancel() {
      calls.cancel += 1;
    },
  };
  return { adapter, calls };
}

const input = (extra: Partial<JobInput> = {}): JobInput => ({
  kind: "video",
  adapter: "fake",
  model: "m",
  request: { prompt: "hello" },
  credentials: { baseUrl: "http://upstream", apiKey: "secret-key" },
  ...extra,
});

afterEach(closeAll);

describe("JobEngine", () => {
  it("runs a job to success, stores the task id, result and clears the api key", async () => {
    const { db, entry } = openDb();
    const { adapter, calls } = fakeAdapter();
    const engine = track(entry, makeEngine(db, adapter));
    const states: string[] = [];
    engine.subscribe((job) => states.push(job.state));

    const { job } = engine.create(input());
    const done = await untilState(engine, job.id, "succeeded");

    assert.equal(done.remote_task_id, "remote-1");
    assert.deepEqual(done.result, {
      store: "media_files",
      key: `video:${job.id}`,
      mime: "video/mp4",
      size: 5,
    });
    assert.equal(
      (done.credentials as { apiKey: string }).apiKey,
      "",
      "api key must not outlive the job",
    );
    assert.deepEqual(states.slice(0, 4), [
      "queued",
      "submitting",
      "running",
      "succeeded",
    ]);
    assert.equal(calls.submit, 1);
  });

  it("returns the existing job for a repeated idempotency key, and frees the key on failure", async () => {
    const { db, entry } = openDb();
    let fail = true;
    const { adapter, calls } = fakeAdapter({
      submit: async () => {
        if (fail) throw new AdapterError("bad request", "fatal");
        return { remoteTaskId: "remote-2" };
      },
    });
    const engine = track(entry, makeEngine(db, adapter));

    const first = engine.create(input({ idempotencyKey: "node-1:abc" }));
    const again = engine.create(input({ idempotencyKey: "node-1:abc" }));
    assert.equal(again.existed, true);
    assert.equal(again.job.id, first.job.id);

    await untilState(engine, first.job.id, "failed");
    assert.equal(calls.submit, 1);

    fail = false;
    const retry = engine.create(input({ idempotencyKey: "node-1:abc" }));
    assert.equal(retry.existed, false, "a failed job must not block a rerun");
    await untilState(engine, retry.job.id, "succeeded");
  });

  it("parks an ambiguous submit as unknown and never resubmits on its own", async () => {
    const { db, entry } = openDb();
    let attempt = 0;
    const { adapter, calls } = fakeAdapter({
      submit: async () => {
        attempt += 1;
        if (attempt === 1) throw new AdapterError("timed out", "unknown");
        return { remoteTaskId: "remote-3" };
      },
    });
    const engine = track(entry, makeEngine(db, adapter));

    const { job } = engine.create(input());
    await untilState(engine, job.id, "unknown");
    await new Promise((resolve) => setTimeout(resolve, 60));
    assert.equal(calls.submit, 1, "no automatic resubmit");

    assert.equal(engine.resubmit(job.id)?.state, "queued");
    await untilState(engine, job.id, "succeeded");
    assert.equal(calls.submit, 2);
  });

  it("treats a plain network error at submit as unknown, not failed", async () => {
    const { db, entry } = openDb();
    const { adapter } = fakeAdapter({
      submit: async () => {
        throw new Error("socket hang up");
      },
    });
    const engine = track(entry, makeEngine(db, adapter));
    const { job } = engine.create(input());
    const row = await untilState(engine, job.id, "unknown");
    assert.match(row.error ?? "", /socket hang up/);
  });

  it("retries transient poll errors, then gives up as unknown after too many", async () => {
    const { db, entry } = openDb();
    let polls = 0;
    const flaky = fakeAdapter({
      poll: async () => {
        polls += 1;
        if (polls <= 2) throw new AdapterError("502", "retryable");
        return { status: "succeeded" };
      },
    });
    const engine = track(entry, makeEngine(db, flaky.adapter));
    const { job } = engine.create(input());
    await untilState(engine, job.id, "succeeded");
    assert.equal(flaky.calls.poll, 3);

    const down = openDb();
    const dead = fakeAdapter({
      poll: async () => {
        throw new AdapterError("down", "retryable");
      },
    });
    const engine2 = track(
      down.entry,
      makeEngine(down.db, dead.adapter, {
        maxPollErrors: 3,
      }),
    );
    const second = engine2.create(input());
    const row = await untilState(engine2, second.job.id, "unknown");
    assert.match(row.error ?? "", /Lost contact/);
    assert.equal(
      row.remote_task_id,
      "remote-1",
      "task id kept for later resume",
    );
  });

  it("fails the job when the provider reports failure or a fatal poll error", async () => {
    const { db, entry } = openDb();
    const { adapter } = fakeAdapter({
      poll: async () => ({ status: "failed", error: "content blocked" }),
    });
    const engine = track(entry, makeEngine(db, adapter));
    const { job } = engine.create(input());
    const row = await untilState(engine, job.id, "failed");
    assert.equal(row.error, "content blocked");
  });

  it("parks a job that exceeds maxPolls as unknown and resumes polling on resubmit", async () => {
    const { db, entry } = openDb();
    let finish = false;
    const { adapter, calls } = fakeAdapter({
      poll: async () =>
        finish ? { status: "succeeded" } : { status: "running" },
    });
    adapter.maxPolls = 3;
    const engine = track(entry, makeEngine(db, adapter));
    const { job } = engine.create(input());
    await untilState(engine, job.id, "unknown");
    finish = true;

    const resumed = engine.resubmit(job.id);
    assert.equal(resumed?.state, "running");
    await untilState(engine, job.id, "succeeded");
    assert.equal(calls.submit, 1, "resume must not submit again");
  });

  it("cancels a running job, tells the provider, and ignores a late result", async () => {
    const { db, entry } = openDb();
    let release: (() => void) | undefined;
    const { adapter, calls } = fakeAdapter({
      poll: () =>
        new Promise((resolve) => {
          release = () => resolve({ status: "succeeded" });
        }),
    });
    const engine = track(entry, makeEngine(db, adapter));
    const { job } = engine.create(input());
    await waitFor(() => release);

    assert.equal(engine.cancel(job.id)?.state, "canceled");
    release?.();
    await new Promise((resolve) => setTimeout(resolve, 40));
    assert.equal(stateOf(engine, job.id), "canceled");
    assert.equal(calls.fetch, 0);
    assert.equal(calls.cancel, 1);
    assert.equal(engine.get(job.id)?.result, null);
  });

  it("cancels while the submit call is still in flight", async () => {
    const { db, entry } = openDb();
    let accept: (() => void) | undefined;
    const { adapter, calls } = fakeAdapter({
      submit: () =>
        new Promise((resolve) => {
          accept = () => resolve({ remoteTaskId: "remote-9" });
        }),
    });
    const engine = track(entry, makeEngine(db, adapter));
    const { job } = engine.create(input());
    await waitFor(() => accept);

    engine.cancel(job.id);
    accept?.();
    const row = await untilState(engine, job.id, "canceled");
    assert.equal(row.remote_task_id, "remote-9");
    assert.equal(calls.poll, 0);
    assert.equal(calls.cancel, 1);
  });

  it("after a restart: submitting becomes unknown, running resumes polling without resubmitting", async () => {
    const first = openDb();
    const seed = (
      id: string,
      state: "submitting" | "running" | "queued",
      remote: string | null,
    ) =>
      first.db
        .insert(jobs)
        .values({
          id,
          kind: "video",
          adapter: "fake",
          model: "m",
          state,
          request: {},
          credentials: { baseUrl: "http://upstream", apiKey: "k" },
          remote_task_id: remote,
          created_at: Date.now(),
          updated_at: Date.now(),
        })
        .run();
    seed("was-submitting", "submitting", null);
    seed("was-running", "running", "remote-77");
    seed("was-queued", "queued", null);
    first.sqlite.close();

    const second = openDb(first.file);
    const { adapter, calls } = fakeAdapter();
    const engine = track(second.entry, makeEngine(second.db, adapter));
    engine.recover();

    const unknown = await untilState(engine, "was-submitting", "unknown");
    assert.match(unknown.error ?? "", /may or may not have accepted/);
    await untilState(engine, "was-running", "succeeded");
    await untilState(engine, "was-queued", "succeeded");
    assert.equal(calls.submit, 1, "only the queued job is submitted");
    assert.equal(
      engine.get("was-running")?.remote_task_id,
      "remote-77",
      "resumed under its original task id",
    );
  });

  it("never exposes credentials in the public view", async () => {
    const { db, entry } = openDb();
    const { adapter } = fakeAdapter();
    const engine = track(entry, makeEngine(db, adapter));
    const { job } = engine.create(input());
    const text = JSON.stringify(
      (await import("./engine")).toPublicJob(job, true),
    );
    assert.equal(text.includes("secret-key"), false);
    assert.equal(text.includes("credentials"), false);
  });

  it("rejects an unknown adapter", () => {
    const { db, entry } = openDb();
    const { adapter } = fakeAdapter();
    const engine = track(entry, makeEngine(db, adapter));
    assert.throws(
      () => engine.create(input({ adapter: "nope" })),
      /Unknown adapter/,
    );
  });
  it("reports each final state once through onFinal, but not unknown", async () => {
    const { db, entry } = openDb();
    const finals: string[] = [];
    const { adapter } = fakeAdapter();
    const engine = track(
      entry,
      makeEngine(db, adapter, {
        onFinal: (job) => finals.push(`${job.id}:${job.state}`),
      }),
    );
    const { job } = engine.create(input());
    await untilState(engine, job.id, "succeeded");
    assert.deepEqual(finals, [`${job.id}:succeeded`]);

    const flaky = fakeAdapter({
      submit: async () => {
        throw new AdapterError("timed out", "unknown");
      },
    });
    const second = openDb();
    const parked = track(
      second.entry,
      makeEngine(second.db, flaky.adapter, {
        onFinal: (row) => finals.push(row.state),
      }),
    );
    const created = parked.create(input());
    await untilState(parked, created.job.id, "unknown");
    assert.equal(
      finals.length,
      1,
      "an unknown job may still be resubmitted, so it keeps its files",
    );
    parked.cancel(created.job.id);
    assert.equal(finals.at(-1), "canceled");
  });

  it("releases only reference files from the job_refs store", async () => {
    const { db } = openDb();
    const now = Date.now();
    for (const [store, key] of [
      ["job_refs", "ref-a"],
      ["media_files", "keep-me"],
    ] as const) {
      db.insert(kv)
        .values({
          store,
          key,
          kind: "blob",
          value: null,
          mime: "image/png",
          size: 1,
          updated_at: now,
        })
        .run();
    }
    await releaseJobReferences(db, {
      files: [
        { store: "job_refs", key: "ref-a" },
        { store: "media_files", key: "keep-me" },
        { dataUrl: "data:image/png;base64,AA==" },
      ],
    });
    const keys = db
      .select()
      .from(kv)
      .all()
      .map((row) => `${row.store}/${row.key}`);
    assert.deepEqual(keys, ["media_files/keep-me"]);
  });
});
