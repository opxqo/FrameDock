import { z } from "zod";

export const portDataTypeSchema = z.enum(["text", "image", "video"]);
export type PortDataType = z.infer<typeof portDataTypeSchema>;

export const nodeTypeSchema = z.enum([
  "text",
  "image",
  "video",
  "image_gen",
  "video_gen",
  "group",
]);
export type NodeType = z.infer<typeof nodeTypeSchema>;

export const nodeStatusSchema = z.enum([
  "idle",
  "queued",
  "running",
  "succeeded",
  "failed",
  "stale",
]);
export type NodeStatus = z.infer<typeof nodeStatusSchema>;

export const runStatusSchema = z.enum([
  "pending",
  "submitted",
  "running",
  "succeeded",
  "failed",
  "canceled",
]);
export type RunStatus = z.infer<typeof runStatusSchema>;
