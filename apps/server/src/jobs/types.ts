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
export type JobFile = {
  store: string;
  key: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
  durationMs?: number;
};

/** The first output's fields at the top level (older clients read only these); `files` lists every output. */
export type JobResult = JobFile & { files?: JobFile[] };

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

/** One gateway change to a requested parameter (YFAI `param_adjustments`): `requested` was replaced by `applied`. */
export type ParamAdjustment = {
  param: string;
  requested: unknown;
  applied: unknown;
  reason: string;
};

/** Provider remarks kept with a job; each field is filled in by the adapter that knows it. */
export type JobNotes = {
  paramAdjustments?: ParamAdjustment[];
  /** The id the provider's account ledger uses for this call (YFAI: delivery_provenance.request_id). */
  ledgerId?: string;
  /** What the call actually cost, in the provider's display unit (YFAI ⚡). */
  cost?: number;
  /** Which provider lane served it (YFAI channel_id). */
  lane?: string;
};

/** What clients see: never includes credentials. The (possibly large) request is only sent on demand. */
export type PublicJob = {
  id: string;
  kind: JobKind;
  adapter: string;
  model: string;
  state: JobState;
  remoteTaskId: string | null;
  requestId: string | null;
  result: JobResult | null;
  error: string | null;
  projectId: string | null;
  nodeId: string | null;
  runId: string | null;
  attempts: number;
  createdAt: number;
  updatedAt: number;
  finishedAt: number | null;
  deliveredAt: number | null;
  notes: JobNotes | null;
  /** The start of the prompt, when the request has one. */
  prompt: string | null;
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
  kind: JobKind;
  model: string;
  request: unknown;
  credentials: Credentials;
  signal: AbortSignal;
};

export type PollOutcome =
  | { status: "running" }
  | { status: "succeeded"; payload?: unknown; notes?: JobNotes }
  | { status: "failed"; error: string; notes?: JobNotes };

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
  /**
   * True when the provider deduplicates a submit by a client-chosen id (YFAI `client_request_id`), so repeating
   * an unclear submit cannot bill twice. The engine then retries it by itself instead of parking the job.
   */
  idempotentSubmit?: boolean;
  pollIntervalMs: number;
  /** Polls before the job is parked as `unknown` (the provider may still finish it). */
  maxPolls: number;
  submit(
    context: AdapterContext,
  ): Promise<{ remoteTaskId: string; requestId?: string; notes?: JobNotes }>;
  poll(context: AdapterContext, remoteTaskId: string): Promise<PollOutcome>;
  fetchResult(
    context: AdapterContext,
    remoteTaskId: string,
    payload: unknown,
  ): Promise<FetchedResult | FetchedResult[]>;
  /** Best effort; failures are ignored. */
  cancel?(context: AdapterContext, remoteTaskId: string): Promise<void>;
}
