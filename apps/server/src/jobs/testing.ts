import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { config } from "../config";
import * as schema from "../schema";
import { JobEngine } from "./engine";
import type { FetchedResult, JobAdapter } from "./types";

// Shared by the jobs tests: throwaway SQLite databases and engines that are closed after each test.
const directory = mkdtempSync(join(tmpdir(), "framedock-jobs-"));
let counter = 0;
export const opened: Array<{ engine?: JobEngine; sqlite: Database.Database }> =
  [];

export function openDb(file = join(directory, `db-${++counter}.sqlite`)) {
  const sqlite = new Database(file);
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: config.migrationsDir });
  const entry: (typeof opened)[number] = { sqlite };
  opened.push(entry);
  return { db, sqlite, file, entry };
}

export function makeEngine(
  db: ReturnType<typeof openDb>["db"],
  adapter: JobAdapter,
  overrides: Partial<ConstructorParameters<typeof JobEngine>[0]> = {},
) {
  return new JobEngine({
    db,
    adapters: [adapter],
    saveResult: async (_kind, id, outputs) => {
      const fetched = outputs[0] as FetchedResult;
      return {
        store: "media_files",
        key: `video:${id}`,
        mime: fetched.mime,
        size: fetched.bytes.length,
      };
    },
    submitRetryDelayMs: () => 5,
    retryDelayMs: () => 5,
    ...overrides,
  });
}

export async function waitFor<T>(read: () => T | undefined | false, ms = 2000) {
  const end = Date.now() + ms;
  for (;;) {
    const value = read();
    if (value) return value;
    if (Date.now() > end) throw new Error("waitFor timed out");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

export function track(entry: (typeof opened)[number], engine: JobEngine) {
  entry.engine = engine;
  return engine;
}

export const stateOf = (engine: JobEngine, id: string) => engine.get(id)?.state;
export const untilState = (engine: JobEngine, id: string, state: string) =>
  waitFor(() => stateOf(engine, id) === state && engine.get(id));

export function closeAll() {
  for (const { engine, sqlite } of opened.splice(0)) {
    engine?.close();
    sqlite.close();
  }
}

process.on("exit", () => rmSync(directory, { recursive: true, force: true }));
