import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { and, asc, eq } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { config } from "./config";
import type { openDatabase } from "./db";
import { kv } from "./schema";

const BODY_LIMIT = 1024 ** 3;
type Params = { store: string; key: string };

const kvApi: FastifyPluginAsync<{
  db: ReturnType<typeof openDatabase>["db"];
}> = async (app, { db }) => {
  // Parsers stay encapsulated here, including application/json blobs.
  app.removeAllContentTypeParsers();
  const jsonParser = app.getDefaultJsonParser("ignore", "ignore");
  app.addContentTypeParser(
    "*",
    { parseAs: "buffer", bodyLimit: BODY_LIMIT },
    (request, body, done) => {
      if (request.headers["x-kv-kind"] === "blob") {
        done(null, body);
      } else {
        jsonParser(request, body.toString(), done);
      }
    },
  );

  app.addHook("onRequest", async (request, reply) => {
    // Fastify already URL-decodes params; decoding twice corrupts literal % keys.
    const { store, key } = request.params as Partial<Params>;
    if (!store || !/^[a-z0-9_]+$/.test(store) || key === "." || key === "..") {
      return reply.code(400).send({ error: "Invalid store or key" });
    }
    reply.header("Cache-Control", "no-store");
  });

  const directory = (store: string) => join(config.dataDir, "blobs", store);
  const filename = (store: string, key: string) =>
    join(directory(store), encodeURIComponent(key));
  const where = (store: string, key: string) =>
    and(eq(kv.store, store), eq(kv.key, key));

  // Serialize file + metadata operations per store (also clear versus upload).
  const pending = new Map<string, Promise<unknown>>();
  async function locked<T>(
    store: string,
    action: () => Promise<T>,
  ): Promise<T> {
    const result = (pending.get(store) ?? Promise.resolve())
      .catch(() => undefined)
      .then(action);
    pending.set(store, result);
    try {
      return await result;
    } finally {
      if (pending.get(store) === result) pending.delete(store);
    }
  }

  app.get<{ Params: Params }>("/:store", async ({ params }) =>
    locked(params.store, async () => ({
      entries: db
        .select()
        .from(kv)
        .where(eq(kv.store, params.store))
        .orderBy(asc(kv.key))
        .all()
        .map((row) => ({
          key: row.key,
          kind: row.kind,
          ...(row.kind === "json"
            ? { value: JSON.parse(row.value ?? "null") }
            : { mime: row.mime, size: row.size }),
          updatedAt: row.updated_at,
        })),
    })),
  );

  app.get<{ Params: Params }>("/:store/:key", async ({ params }, reply) =>
    locked(params.store, async () => {
      const row = db
        .select()
        .from(kv)
        .where(where(params.store, params.key))
        .get();
      if (!row) return reply.code(404).send({ error: "Key not found" });
      reply.header("x-kv-updated-at", String(row.updated_at));
      if (row.kind === "json") {
        return {
          kind: "json",
          value: JSON.parse(row.value ?? "null"),
          updatedAt: row.updated_at,
        };
      }
      let bytes: Buffer;
      try {
        bytes = await readFile(filename(params.store, params.key));
      } catch (error) {
        // Metadata without its file (e.g. deleted by hand): report it as missing, not as a server error.
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return reply.code(404).send({ error: "Blob file missing" });
        }
        throw error;
      }
      return reply
        .header("x-kv-kind", "blob")
        .type(row.mime || "application/octet-stream")
        .send(bytes);
    }),
  );

  app.put<{ Params: Params }>(
    "/:store/:key",
    { bodyLimit: BODY_LIMIT },
    async (request, reply) => {
      const { store, key } = request.params;
      const blob = request.headers["x-kv-kind"] === "blob";
      const body = request.body;
      if (
        !blob &&
        (!body || typeof body !== "object" || !Object.hasOwn(body, "value"))
      ) {
        return reply.code(400).send({ error: "Expected JSON { value }" });
      }
      // Optional optimistic concurrency: `If-Match: <updatedAt>` (0 = must not exist yet) → 409 on mismatch.
      const ifMatch = request.headers["if-match"];
      return locked(store, async () => {
        const previous = db.select().from(kv).where(where(store, key)).get();
        if (typeof ifMatch === "string" && ifMatch !== "*") {
          const current = previous?.updated_at ?? 0;
          if (Number(ifMatch) !== current) {
            return reply
              .code(409)
              .header("x-kv-updated-at", String(current))
              .send({ error: "Version conflict", updatedAt: current });
          }
        }
        const bytes = blob ? (body as Buffer) : null;
        const row = {
          store,
          key,
          kind: blob ? ("blob" as const) : ("json" as const),
          value: blob
            ? null
            : JSON.stringify((body as { value: unknown }).value),
          mime: blob
            ? (request.headers["content-type"] ?? "application/octet-stream")
            : null,
          size: bytes?.length ?? null,
          // Strictly increasing per key, so two writes in the same millisecond still get distinct versions.
          updated_at: Math.max(Date.now(), (previous?.updated_at ?? 0) + 1),
        };
        if (bytes) {
          await mkdir(directory(store), { recursive: true });
          // Separate temp directory avoids collisions with legitimate keys.
          const tempDir = join(config.dataDir, "blobs", ".tmp");
          await mkdir(tempDir, { recursive: true });
          const temp = join(tempDir, randomUUID());
          try {
            await writeFile(temp, bytes);
            await rename(temp, filename(store, key));
          } finally {
            await rm(temp, { force: true });
          }
        }
        db.insert(kv)
          .values(row)
          .onConflictDoUpdate({ target: [kv.store, kv.key], set: row })
          .run();
        if (!blob && previous?.kind === "blob") {
          await rm(filename(store, key), { force: true });
        }
        return reply
          .header("x-kv-updated-at", String(row.updated_at))
          .code(204)
          .send();
      });
    },
  );

  app.delete<{ Params: Params }>("/:store/:key", async ({ params }, reply) =>
    locked(params.store, async () => {
      await rm(filename(params.store, params.key), { force: true });
      db.delete(kv).where(where(params.store, params.key)).run();
      return reply.code(204).send();
    }),
  );

  app.delete<{ Params: Params }>("/:store", async ({ params }, reply) =>
    locked(params.store, async () => {
      await rm(directory(params.store), { recursive: true, force: true });
      db.delete(kv).where(eq(kv.store, params.store)).run();
      return reply.code(204).send();
    }),
  );
};

export default kvApi;
