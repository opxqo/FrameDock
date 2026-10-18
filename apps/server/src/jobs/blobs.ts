import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { and, eq } from "drizzle-orm";
import { config } from "../config";
import type { openDatabase } from "../db";
import { kv } from "../schema";
import type { FetchedResult, JobFile, JobKind, JobResult } from "./types";

type Database = ReturnType<typeof openDatabase>["db"];

// Same on-disk layout and kv rows as kv.ts, so the browser reads job output through /api/kv like any media
// file. Keys follow the web app's `<prefix>:<id>` convention (services/file-storage.ts, image-storage.ts).
const TARGETS: Partial<Record<JobKind, { store: string; prefix: string }>> = {
  video: { store: "media_files", prefix: "video" },
  audio: { store: "media_files", prefix: "audio" },
  image: { store: "image_files", prefix: "image" },
};

async function writeBlob(
  db: Database,
  target: { store: string; key: string },
  fetched: FetchedResult,
): Promise<JobFile> {
  const directory = join(config.dataDir, "blobs", target.store);
  const tempDir = join(config.dataDir, "blobs", ".tmp");
  await mkdir(directory, { recursive: true });
  await mkdir(tempDir, { recursive: true });
  const temp = join(tempDir, randomUUID());
  try {
    await writeFile(temp, fetched.bytes);
    await rename(temp, join(directory, encodeURIComponent(target.key)));
  } finally {
    await rm(temp, { force: true });
  }
  const previous = db
    .select()
    .from(kv)
    .where(and(eq(kv.store, target.store), eq(kv.key, target.key)))
    .get();
  const row = {
    store: target.store,
    key: target.key,
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
    key: target.key,
    mime: fetched.mime,
    size: fetched.bytes.length,
    ...(fetched.width ? { width: fetched.width } : {}),
    ...(fetched.height ? { height: fetched.height } : {}),
    ...(fetched.durationMs ? { durationMs: fetched.durationMs } : {}),
  };
}

/**
 * Stores every output of a job. The first keeps the plain `<prefix>:<jobId>` key; further outputs get
 * `<prefix>:<jobId>-2`, `-3`, ... The result describes the first at the top level and lists all in `files`.
 */
export async function saveJobBlobs(
  db: Database,
  kind: JobKind,
  jobId: string,
  outputs: FetchedResult[],
): Promise<JobResult> {
  const target = TARGETS[kind];
  if (!target) throw new Error(`Job kind "${kind}" has no blob storage`);
  if (!outputs.length) throw new Error("Job produced no output");
  const files: JobFile[] = [];
  for (const [index, fetched] of outputs.entries()) {
    const key = `${target.prefix}:${jobId}${index ? `-${index + 1}` : ""}`;
    files.push(await writeBlob(db, { store: target.store, key }, fetched));
  }
  const [first] = files as [JobFile];
  return { ...first, files };
}

/** Where the browser puts reference files for a job (see apps/web/src/services/api/jobs.ts). */
export const JOB_REFERENCE_STORE = "job_refs";

/** Deletes the reference files a finished job's request pointed at. Anything outside job_refs is left alone. */
export async function releaseJobReferences(db: Database, request: unknown) {
  const files = (
    request as { files?: Array<{ store?: string; key?: string }> } | null
  )?.files;
  if (!Array.isArray(files)) return;
  for (const file of files) {
    if (file.store !== JOB_REFERENCE_STORE || !file.key) continue;
    await rm(
      join(
        config.dataDir,
        "blobs",
        JOB_REFERENCE_STORE,
        encodeURIComponent(file.key),
      ),
      { force: true },
    );
    db.delete(kv)
      .where(and(eq(kv.store, JOB_REFERENCE_STORE), eq(kv.key, file.key)))
      .run();
  }
}
