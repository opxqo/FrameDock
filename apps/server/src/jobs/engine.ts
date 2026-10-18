import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import { and, desc, eq, inArray } from "drizzle-orm";
import PQueue from "p-queue";
import type { openDatabase } from "../db";
import { jobs } from "./schema";
import {
  type AdapterContext,
  AdapterError,
  type FetchedResult,
  FINAL_STATES,
  type JobAdapter,
  type JobInput,
  type JobKind,
  type JobResult,
  type JobRow,
  type JobState,
  type PublicJob,
} from "./types";

type Database = ReturnType<typeof openDatabase>["db"];

export type JobFilter = {
  node?: string;
  project?: string;
  state?: JobState;
  limit?: number;
};

export type EngineOptions = {
  db: Database;
  adapters: JobAdapter[];
  /** Persists fetched output and describes where it went. */
  saveResult: (
    kind: JobKind,
    jobId: string,
    fetched: FetchedResult,
  ) => Promise<JobResult>;
  onError?: (error: unknown, message: string) => void;
  /** Called once when a job reaches a final state (succeeded, failed or canceled). */
  onFinal?: (job: JobRow) => void;
  /** Consecutive failed polls before a job is parked as `unknown`. */
  maxPollErrors?: number;
  /** Simultaneous result downloads across all adapters. */
  downloadConcurrency?: number;
  /** Delay before retrying a failed poll; the default backs off up to a minute. */
  retryDelayMs?: (consecutiveErrors: number, adapter: JobAdapter) => number;
};

export function toPublicJob(row: JobRow, withRequest = false): PublicJob {
  return {
    id: row.id,
    kind: row.kind,
    adapter: row.adapter,
    model: row.model,
    state: row.state,
    remoteTaskId: row.remote_task_id,
    result: (row.result as JobResult | null) ?? null,
    error: row.error,
    projectId: row.project_id,
    nodeId: row.node_id,
    runId: row.run_id,
    attempts: row.attempts,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    finishedAt: row.finished_at,
    ...(withRequest ? { request: row.request } : {}),
  };
}

function describe(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function asAdapterError(error: unknown) {
  // A bare error (network failure, bug) says nothing about whether the provider saw the call.
  return error instanceof AdapterError
    ? error
    : new AdapterError(describe(error), "retryable");
}

const SUBMIT_ERROR =
  "Server stopped while submitting; the provider may or may not have accepted the task.";

/**
 * Durable job runner. Every state change is written to SQLite first and then published, so a restart can pick
 * up exactly where the job was. The one rule that protects against double billing: a job whose submit outcome
 * is unclear becomes `unknown` and is only resubmitted when the user asks (see `resubmit`).
 */
export class JobEngine {
  private readonly db: Database;
  private readonly adapters = new Map<string, JobAdapter>();
  private readonly submitQueues = new Map<string, PQueue>();
  private readonly downloads: PQueue;
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly aborts = new Map<string, AbortController>();
  private readonly pollErrors = new Map<string, number>();
  private readonly events = new EventEmitter();
  private readonly maxPollErrors: number;
  private readonly retryDelay: NonNullable<EngineOptions["retryDelayMs"]>;
  private closed = false;

  constructor(private readonly options: EngineOptions) {
    this.db = options.db;
    this.maxPollErrors = options.maxPollErrors ?? 8;
    this.downloads = new PQueue({
      concurrency: options.downloadConcurrency ?? 2,
    });
    this.retryDelay =
      options.retryDelayMs ??
      ((count, adapter) =>
        Math.min(adapter.pollIntervalMs * 2 ** count, 60_000));
    this.events.setMaxListeners(0);
    for (const adapter of options.adapters) {
      this.adapters.set(adapter.id, adapter);
      this.submitQueues.set(
        adapter.id,
        new PQueue({ concurrency: adapter.concurrency }),
      );
    }
  }

  hasAdapter(id: string) {
    return this.adapters.has(id);
  }

  /** Call once after construction: resumes whatever the previous process left behind. */
  recover() {
    for (const row of this.db
      .select()
      .from(jobs)
      .where(inArray(jobs.state, ["submitting", "queued", "running"]))
      .all()) {
      if (row.state === "submitting") {
        this.update(row.id, ["submitting"], {
          state: "unknown",
          error: SUBMIT_ERROR,
        });
      } else if (row.state === "queued") {
        this.enqueueSubmit(row.id);
      } else if (!row.remote_task_id) {
        this.update(row.id, ["running"], {
          state: "unknown",
          error: "Task id was not recorded before the server stopped.",
        });
      } else {
        this.schedulePoll(
          row.id,
          Math.max(0, (row.next_poll_at ?? 0) - Date.now()),
        );
      }
    }
  }

  /** Stops timers and queued work. Jobs keep their persisted state and resume on the next start. */
  close() {
    this.closed = true;
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    for (const controller of this.aborts.values()) controller.abort();
    this.aborts.clear();
    for (const queue of this.submitQueues.values()) queue.clear();
    this.downloads.clear();
    this.events.removeAllListeners();
  }

  subscribe(listener: (job: PublicJob) => void) {
    this.events.on("job", listener);
    return () => {
      this.events.off("job", listener);
    };
  }

  get(id: string) {
    return this.db.select().from(jobs).where(eq(jobs.id, id)).get();
  }

  list(filter: JobFilter = {}) {
    const conditions = [
      filter.node ? eq(jobs.node_id, filter.node) : undefined,
      filter.project ? eq(jobs.project_id, filter.project) : undefined,
      filter.state ? eq(jobs.state, filter.state) : undefined,
    ].filter((condition) => condition !== undefined);
    return this.db
      .select()
      .from(jobs)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(jobs.created_at))
      .limit(Math.min(filter.limit ?? 100, 500))
      .all();
  }

  /** Creates a job, or returns the existing one for the same idempotency key. */
  create(input: JobInput): { job: JobRow; existed: boolean } {
    if (!this.adapters.has(input.adapter)) {
      throw new Error(`Unknown adapter: ${input.adapter}`);
    }
    if (input.idempotencyKey) {
      const existing = this.db
        .select()
        .from(jobs)
        .where(eq(jobs.idempotency_key, input.idempotencyKey))
        .get();
      if (existing) return { job: existing, existed: true };
    }
    const now = Date.now();
    const job = this.db
      .insert(jobs)
      .values({
        id: randomUUID(),
        kind: input.kind,
        adapter: input.adapter,
        model: input.model,
        state: "queued",
        request: input.request ?? null,
        credentials: input.credentials ?? null,
        idempotency_key: input.idempotencyKey ?? null,
        project_id: input.projectId ?? null,
        node_id: input.nodeId ?? null,
        run_id: input.runId ?? null,
        created_at: now,
        updated_at: now,
      })
      .returning()
      .get();
    this.publish(job);
    this.enqueueSubmit(job.id);
    return { job, existed: false };
  }

  cancel(id: string): JobRow | undefined {
    const row = this.get(id);
    if (!row || FINAL_STATES.includes(row.state)) return row;
    if (row.state === "submitting") {
      // The submit call is in flight; it checks this flag when it returns.
      this.aborts.get(id)?.abort();
      return this.update(id, ["submitting"], { cancel_requested: 1 });
    }
    this.stopWork(id);
    const canceled = this.finish(
      id,
      ["queued", "running", "unknown"],
      "canceled",
    );
    if (canceled && row.remote_task_id)
      this.cancelRemote(row, row.remote_task_id);
    return canceled;
  }

  /**
   * Only for `unknown` jobs, and only on the user's say-so. With a recorded task id this resumes polling;
   * without one the provider may have accepted the first attempt, so this can bill a second time.
   */
  resubmit(id: string): JobRow | undefined {
    const row = this.get(id);
    if (!row || row.state !== "unknown") return undefined;
    if (!row.credentials || !(row.credentials as { apiKey?: string }).apiKey) {
      return undefined;
    }
    if (row.remote_task_id) {
      const resumed = this.update(id, ["unknown"], {
        state: "running",
        error: null,
        attempts: 0,
      });
      this.schedulePoll(id, 0);
      return resumed;
    }
    const queued = this.update(id, ["unknown"], {
      state: "queued",
      error: null,
      cancel_requested: 0,
    });
    this.enqueueSubmit(id);
    return queued;
  }

  // --- internals ---------------------------------------------------------------------------------------

  private publish(row: JobRow) {
    if (!this.closed) this.events.emit("job", toPublicJob(row));
  }

  /** Conditional write: applies only while the job is still in one of `from`, so late callbacks cannot clobber. */
  private update(id: string, from: JobState[], patch: Partial<JobRow>) {
    if (this.closed) return undefined;
    const row = this.db
      .update(jobs)
      .set({ ...patch, updated_at: Date.now() })
      .where(and(eq(jobs.id, id), inArray(jobs.state, from)))
      .returning()
      .get();
    if (row) this.publish(row);
    return row;
  }

  private finish(
    id: string,
    from: JobState[],
    state: "succeeded" | "failed" | "canceled",
    extra: Partial<JobRow> = {},
  ) {
    const current = this.get(id);
    const credentials = current?.credentials as {
      baseUrl: string;
      apiKey: string;
    } | null;
    const row = this.update(id, from, {
      ...extra,
      state,
      credentials: credentials ? { ...credentials, apiKey: "" } : null,
      // A failed or canceled job frees its key so the same request can be run again.
      ...(state === "succeeded" ? {} : { idempotency_key: null }),
      next_poll_at: null,
      finished_at: Date.now(),
    });
    if (row) {
      this.stopWork(id);
      try {
        this.options.onFinal?.(row);
      } catch (error) {
        this.options.onError?.(error, `onFinal failed for job ${id}`);
      }
    }
    return row;
  }

  private stopWork(id: string) {
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);
    this.timers.delete(id);
    this.aborts.get(id)?.abort();
    this.aborts.delete(id);
    this.pollErrors.delete(id);
  }

  private context(row: JobRow, signal: AbortSignal): AdapterContext {
    return {
      jobId: row.id,
      kind: row.kind,
      model: row.model,
      request: row.request,
      credentials: (row.credentials as AdapterContext["credentials"]) ?? {
        baseUrl: "",
        apiKey: "",
      },
      signal,
    };
  }

  private cancelRemote(row: JobRow, remoteTaskId: string) {
    const adapter = this.adapters.get(row.adapter);
    if (!adapter?.cancel) return;
    const signal = AbortSignal.timeout(15_000);
    adapter
      .cancel(this.context(row, signal), remoteTaskId)
      .catch((error) =>
        this.options.onError?.(
          error,
          `Cancel at provider failed for job ${row.id}`,
        ),
      );
  }

  private enqueueSubmit(id: string) {
    const row = this.get(id);
    const queue = row && this.submitQueues.get(row.adapter);
    if (!queue) return;
    void queue
      .add(() => this.submit(id))
      .catch((error) =>
        this.options.onError?.(error, `Submit crashed for job ${id}`),
      );
  }

  private async submit(id: string) {
    const claimed = this.update(id, ["queued"], { state: "submitting" });
    const adapter = claimed && this.adapters.get(claimed.adapter);
    if (!claimed || !adapter) return;
    const controller = new AbortController();
    this.aborts.set(id, controller);

    let remoteTaskId: string;
    try {
      ({ remoteTaskId } = await adapter.submit(
        this.context(claimed, controller.signal),
      ));
    } catch (error) {
      this.aborts.delete(id);
      const failure = asAdapterError(error);
      if (this.get(id)?.cancel_requested) {
        this.finish(id, ["submitting"], "canceled");
      } else if (failure.kind === "fatal") {
        this.finish(id, ["submitting"], "failed", { error: failure.message });
      } else {
        // Do not resubmit: the provider may have accepted the request before the error.
        this.update(id, ["submitting"], {
          state: "unknown",
          error: failure.message,
        });
      }
      return;
    }

    this.aborts.delete(id);
    if (this.closed) return;
    if (this.get(id)?.cancel_requested) {
      const canceled = this.finish(id, ["submitting"], "canceled", {
        remote_task_id: remoteTaskId,
      });
      if (canceled) this.cancelRemote(canceled, remoteTaskId);
      return;
    }
    // Written in the same statement that leaves `submitting`, so a restart always finds the task id.
    this.update(id, ["submitting"], {
      state: "running",
      remote_task_id: remoteTaskId,
      next_poll_at: Date.now() + adapter.pollIntervalMs,
    });
    this.schedulePoll(id, adapter.pollIntervalMs);
  }

  private schedulePoll(id: string, delayMs: number) {
    if (this.closed) return;
    const existing = this.timers.get(id);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      this.timers.delete(id);
      void this.pollOnce(id).catch((error) =>
        this.options.onError?.(error, `Poll crashed for job ${id}`),
      );
    }, delayMs);
    timer.unref();
    this.timers.set(id, timer);
  }

  private async pollOnce(id: string) {
    const row = this.get(id);
    const adapter = row && this.adapters.get(row.adapter);
    if (!row || !adapter || row.state !== "running" || !row.remote_task_id)
      return;
    const remoteTaskId = row.remote_task_id;
    const controller = new AbortController();
    this.aborts.set(id, controller);
    const context = this.context(row, controller.signal);

    try {
      const outcome = await adapter.poll(context, remoteTaskId);
      if (this.get(id)?.state !== "running" || this.closed) return;

      if (outcome.status === "failed") {
        this.finish(id, ["running"], "failed", { error: outcome.error });
      } else if (outcome.status === "running") {
        this.pollErrors.delete(id);
        const attempts = row.attempts + 1;
        if (attempts >= adapter.maxPolls) {
          this.update(id, ["running"], {
            state: "unknown",
            attempts,
            error:
              "Stopped waiting for the provider; the task may still finish there.",
          });
          return;
        }
        this.update(id, ["running"], {
          attempts,
          next_poll_at: Date.now() + adapter.pollIntervalMs,
        });
        this.schedulePoll(id, adapter.pollIntervalMs);
      } else {
        const fetched = await this.downloads.add(() =>
          adapter.fetchResult(context, remoteTaskId, outcome.payload),
        );
        if (!fetched || this.get(id)?.state !== "running" || this.closed)
          return;
        const result = await this.options.saveResult(row.kind, id, fetched);
        this.finish(id, ["running"], "succeeded", { result, error: null });
      }
    } catch (error) {
      if (this.closed || this.get(id)?.state !== "running") return;
      const failure = asAdapterError(error);
      if (failure.kind === "fatal") {
        this.finish(id, ["running"], "failed", { error: failure.message });
        return;
      }
      const count = (this.pollErrors.get(id) ?? 0) + 1;
      this.pollErrors.set(id, count);
      if (count >= this.maxPollErrors) {
        this.update(id, ["running"], {
          state: "unknown",
          error: `Lost contact with the provider: ${failure.message}`,
        });
        this.stopWork(id);
        return;
      }
      this.schedulePoll(id, this.retryDelay(count, adapter));
    } finally {
      if (this.aborts.get(id) === controller) this.aborts.delete(id);
    }
  }
}
