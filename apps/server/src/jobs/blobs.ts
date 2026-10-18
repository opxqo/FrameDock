import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { and, eq } from "drizzle-orm";
import { config } from "../config";
import type { openDatabase } from "../db";
import { kv } from "../schema";
import type { FetchedResult, JobKind, JobResult } from "./types";

type Database = ReturnType<typeof openDatabase>["db"];

// Same on-disk layout and kv rows as kv.ts, so the browser reads job output through /api/kv like any media
// file. Keys follow the web app's `<prefix>:<id>` convention (services/file-storage.ts). The image prefix is
// provisional until the web integration (T013/T014) confirms how image_files keys are read.
const TARGETS: Partial<Record<JobKind, { store: string; prefix: string }>> = {
  video: { store: "media_files", prefix: "video" },
  audio: { store: "media_files", prefix: "audio" },
  image: { store: "image_files", prefix: "image" },
};

export async function saveJobBlob(
  db: Database,
  kind: JobKind,
  jobId: string,
  fetched: FetchedResult,
): Promise<JobResult> {
  const target = TARGETS[kind];
  if (!target) throw new Error(`Job kind "${kind}" has no blob storage`);
  const key = `${target.prefix}:${jobId}`;
  const directory = join(config.dataDir, "blobs", target.store);
  const tempDir = join(config.dataDir, "blobs", ".tmp");
  await mkdir(directory, { recursive: true });
  await mkdir(tempDir, { recursive: true });
  const temp = join(tempDir, randomUUID());
  try {
    await writeFile(temp, fetched.bytes);
    await rename(temp, join(directory, encodeURIComponent(key)));
  } finally {
    await rm(temp, { force: true });
  }
  const previous = db
    .select()
    .from(kv)
    .where(and(eq(kv.store, target.store), eq(kv.key, key)))
    .get();
  const row = {
    store: target.store,
    key,
    kind: "blob" as const,
    value: null,
    mime: fetched.mime,
    size: fetched.bytes.length,
    updated_at: Math.max(Date.now(), (previous?.updated_at ?? 0) + 1),
  };
  db.insert(kv)
    .values(row)
    .onConflictDoUpdate({ target: [kv.store, kv.key], set: row })
    .run();
  return {
    store: target.store,
    key,
    mime: fetched.mime,
    size: fetched.bytes.length,
    ...(fetched.width ? { width: fetched.width } : {}),
    ...(fetched.height ? { height: fetched.height } : {}),
    ...(fetched.durationMs ? { durationMs: fetched.durationMs } : {}),
  };
}
