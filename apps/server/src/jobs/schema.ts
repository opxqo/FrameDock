import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const JOB_KINDS = ["image", "video", "audio", "text"] as const;
export const JOB_STATES = [
  "queued",
  "submitting",
  "running",
  "succeeded",
  "failed",
  "canceled",
  "unknown",
] as const;

// FrameDock: durable generation jobs that keep running without a browser page (docs/design/backend-jobs-plan.md).
// `credentials` holds the channel snapshot (baseUrl + apiKey); the apiKey is dropped once the job is final.
export const jobs = sqliteTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    kind: text("kind", { enum: JOB_KINDS }).notNull(),
    adapter: text("adapter").notNull(),
    model: text("model").notNull(),
    state: text("state", { enum: JOB_STATES }).notNull(),
    request: text("request", { mode: "json" }).notNull(),
    credentials: text("credentials", { mode: "json" }),
    idempotency_key: text("idempotency_key"),
    remote_task_id: text("remote_task_id"),
    result: text("result", { mode: "json" }),
    error: text("error"),
    project_id: text("project_id"),
    node_id: text("node_id"),
    run_id: text("run_id"),
    attempts: integer("attempts").notNull().default(0),
    next_poll_at: integer("next_poll_at"),
    cancel_requested: integer("cancel_requested").notNull().default(0),
    created_at: integer("created_at").notNull(),
    updated_at: integer("updated_at").notNull(),
    finished_at: integer("finished_at"),
  },
  (table) => [
    uniqueIndex("jobs_idempotency").on(table.idempotency_key),
    index("jobs_state").on(table.state),
    index("jobs_node").on(table.node_id),
    index("jobs_project").on(table.project_id),
  ],
);
