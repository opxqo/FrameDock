import { mkdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { config } from "./config";
import * as schema from "./schema";

export function openDatabase() {
  mkdirSync(config.dataDir, { recursive: true });
  const sqlite = new Database(join(config.dataDir, "framedock.db"));

  try {
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    const db = drizzle(sqlite, { schema });
    migrate(db, { migrationsFolder: config.migrationsDir });
    return { db, sqlite };
  } catch (error) {
    sqlite.close();
    throw error;
  }
}
