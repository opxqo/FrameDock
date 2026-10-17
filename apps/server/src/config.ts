import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const env = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(8787),
    FRAMEDOCK_DATA_DIR: z.string().min(1).optional(),
  })
  .parse(process.env);

// src/ and dist/ have the same depth, so development and production agree.
const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));

export const config = {
  port: env.PORT,
  dataDir: resolve(repositoryRoot, env.FRAMEDOCK_DATA_DIR ?? "data"),
  migrationsDir: fileURLToPath(new URL("../drizzle/", import.meta.url)),
};
