import type { NodeStatus, NodeType, RunStatus } from "@framedock/shared";
import {
  type AnySQLiteColumn,
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
