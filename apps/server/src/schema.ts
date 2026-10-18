import type { NodeStatus, NodeType, RunStatus } from "@framedock/shared";
import {
  type AnySQLiteColumn,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const kv = sqliteTable(
  "kv",
  {
    store: text("store").notNull(),
    key: text("key").notNull(),
    kind: text("kind", { enum: ["json", "blob"] }).notNull(),
    value: text("value"),
    mime: text("mime"),
    size: integer("size"),
    updated_at: integer("updated_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.store, table.key] })],
);

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  viewport: text("viewport", { mode: "json" }).notNull(),
  created_at: integer("created_at").notNull(),
  updated_at: integer("updated_at").notNull(),
});

export const nodes = sqliteTable("nodes", {
  id: text("id").primaryKey(),
  project_id: text("project_id")
    .notNull()
    .references(() => projects.id),
  type: text("type").$type<NodeType>().notNull(),
  title: text("title").notNull(),
  x: real("x").notNull(),
  y: real("y").notNull(),
  width: real("width").notNull(),
  height: real("height").notNull(),
  parent_id: text("parent_id").references((): AnySQLiteColumn => nodes.id),
  params: text("params", { mode: "json" }).notNull(),
  output: text("output", { mode: "json" }),
  status: text("status").$type<NodeStatus>().notNull(),
  input_hash: text("input_hash"),
  origin: text("origin", { mode: "json" }).notNull(),
  created_at: integer("created_at").notNull(),
  updated_at: integer("updated_at").notNull(),
});

export const edges = sqliteTable("edges", {
  id: text("id").primaryKey(),
  project_id: text("project_id")
    .notNull()
    .references(() => projects.id),
  source_node_id: text("source_node_id")
    .notNull()
    .references(() => nodes.id),
  source_port: text("source_port").notNull(),
  target_node_id: text("target_node_id")
    .notNull()
    .references(() => nodes.id),
  target_port: text("target_port").notNull(),
  order: integer("order").notNull(),
});

export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  project_id: text("project_id")
    .notNull()
    .references(() => projects.id),
  kind: text("kind", { enum: ["image", "video", "audio", "text"] }).notNull(),
  path: text("path").notNull(),
  mime: text("mime").notNull(),
  width: integer("width"),
  height: integer("height"),
  duration: real("duration"),
  size: integer("size").notNull(),
  sha256: text("sha256").notNull(),
  thumbnail_path: text("thumbnail_path"),
  source: text("source", { enum: ["upload", "generated"] }).notNull(),
  created_at: integer("created_at").notNull(),
});

export const runs = sqliteTable("runs", {
  id: text("id").primaryKey(),
  node_id: text("node_id")
    .notNull()
    .references(() => nodes.id),
  input_hash: text("input_hash").notNull(),
  inputs_snapshot: text("inputs_snapshot", { mode: "json" }).notNull(),
  adapter: text("adapter").notNull(),
  model: text("model").notNull(),
  remote_task_id: text("remote_task_id"),
  status: text("status").$type<RunStatus>().notNull(),
  output: text("output", { mode: "json" }),
  error: text("error"),
  cost: text("cost", { mode: "json" }),
  created_at: integer("created_at").notNull(),
  finished_at: integer("finished_at"),
});

// FrameDock: one row per API call (provider calls through /proxy, Codex, MOKE, and browser-side calls that
// bypass the proxy). Bodies and headers are stored already redacted and truncated (see logging/redact.ts).
export const apiLogs = sqliteTable(
  "api_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ts: integer("ts").notNull(),
    state: text("state", {
      enum: ["pending", "done", "error", "interrupted"],
    }).notNull(),
    source: text("source", {
      enum: ["proxy", "browser", "codex", "moke"],
    }).notNull(),
    method: text("method").notNull(),
    url: text("url").notNull(),
    url_hash: text("url_hash").notNull(),
    host: text("host").notNull(),
    path: text("path").notNull(),
    provider: text("provider").notNull(),
    model: text("model"),
    status: integer("status"),
    error: text("error"),
    duration_ms: integer("duration_ms"),
    total_ms: integer("total_ms"),
    req_headers: text("req_headers"),
    req_body: text("req_body"),
    req_size: integer("req_size"),
    req_truncated: integer("req_truncated").notNull().default(0),
    res_headers: text("res_headers"),
    res_body: text("res_body"),
    res_size: integer("res_size"),
    res_truncated: integer("res_truncated").notNull().default(0),
    res_type: text("res_type"),
    project_id: text("project_id"),
    node_id: text("node_id"),
    mode: text("mode"),
    run_id: text("run_id"),
    page: text("page"),
    req_uid: text("req_uid"),
    poll: integer("poll").notNull().default(0),
    extra: text("extra"),
  },
  (table) => [
    index("api_logs_ts").on(table.ts),
    index("api_logs_node").on(table.node_id),
    index("api_logs_run").on(table.run_id),
    index("api_logs_state_status").on(table.state, table.status),
    index("api_logs_poll").on(table.method, table.url_hash, table.ts),
  ],
);
