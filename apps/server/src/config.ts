import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const env = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(8787),
    HOST: z.string().min(1).default("127.0.0.1"),
    FRAMEDOCK_WEB_DIR: z.string().min(1).optional(),
    FRAMEDOCK_DATA_DIR: z.string().min(1).optional(),
    FRAMEDOCK_MOCK_API: z.string().default("1"),
    FRAMEDOCK_MOKE: z.string().default("1"),
  })
  .parse(process.env);

// src/ and dist/ have the same depth, so development and production agree.
const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));

export const config = {
  port: env.PORT,
  host: env.HOST,
  webDir: resolve(repositoryRoot, env.FRAMEDOCK_WEB_DIR ?? "apps/web/dist"),
  mockApi: env.FRAMEDOCK_MOCK_API !== "0",
  moke: env.FRAMEDOCK_MOKE !== "0",
  dataDir: resolve(repositoryRoot, env.FRAMEDOCK_DATA_DIR ?? "data"),
  migrationsDir: fileURLToPath(new URL("../drizzle/", import.meta.url)),
};
