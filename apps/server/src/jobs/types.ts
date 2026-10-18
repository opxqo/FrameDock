import type { JOB_KINDS, JOB_STATES, jobs } from "./schema";

export type JobKind = (typeof JOB_KINDS)[number];
export type JobState = (typeof JOB_STATES)[number];
export type JobRow = typeof jobs.$inferSelect;

export const FINAL_STATES: readonly JobState[] = [
  "succeeded",
  "failed",
  "canceled",
];

/** Channel snapshot taken at submit time; `apiKey` is emptied once the job is final. */
export type Credentials = { baseUrl: string; apiKey: string };

/** Where a finished job's output lives: a kv blob, read through the existing /api/kv interface. */
export type JobResult = {
  store: string;
  key: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
  durationMs?: number;
};

export type JobInput = {
  kind: JobKind;
  adapter: string;
  model: string;
  request: unknown;
  credentials?: Credentials;
  idempotencyKey?: string;
  projectId?: string;
  nodeId?: string;
  runId?: string;
};

/** What clients see: never includes credentials. The (possibly large) request is only sent on demand. */
export type PublicJob = {
  id: string;
  kind: JobKind;
  adapter: string;
  model: string;
  state: JobState;
  remoteTaskId: string | null;
  result: JobResult | null;
  error: string | null;
  projectId: string | null;
  nodeId: string | null;
  runId: string | null;
  attempts: number;
  createdAt: number;
  updatedAt: number;
  finishedAt: number | null;
  request?: unknown;
};

/**
 * - `fatal`: the provider definitely rejected the call; the job fails.
 * - `retryable`: transient (network blip, 5xx). While polling it is retried with backoff; while submitting the
 *   outcome is unknown, so it is treated like `unknown`.
 * - `unknown`: cannot tell whether the provider accepted the call (e.g. submit timed out). Never auto-resubmitted.
 */
export class AdapterError extends Error {
  constructor(
    message: string,
    readonly kind: "fatal" | "retryable" | "unknown",
  ) {
    super(message);
    this.name = "AdapterError";
  }
}

export type AdapterContext = {
  jobId: string;
  model: string;
  request: unknown;
  credentials: Credentials;
  signal: AbortSignal;
};

export type PollOutcome =
  | { status: "running" }
  | { status: "succeeded"; payload?: unknown }
  | { status: "failed"; error: string };

export type FetchedResult = {
  bytes: Buffer;
  mime: string;
  width?: number;
  height?: number;
  durationMs?: number;
};

export interface JobAdapter {
  id: string;
  /** Simultaneous submits for this adapter. */
  concurrency: number;
  pollIntervalMs: number;
  /** Polls before the job is parked as `unknown` (the provider may still finish it). */
  maxPolls: number;
  submit(context: AdapterContext): Promise<{ remoteTaskId: string }>;
  poll(context: AdapterContext, remoteTaskId: string): Promise<PollOutcome>;
  fetchResult(
    context: AdapterContext,
    remoteTaskId: string,
    payload: unknown,
  ): Promise<FetchedResult>;
  /** Best effort; failures are ignored. */
  cancel?(context: AdapterContext, remoteTaskId: string): Promise<void>;
}
