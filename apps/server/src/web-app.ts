// FrameDock: in production one process serves both the API and the built web app (apps/web/dist),
// so closing the dev servers' terminal no longer stops background work.
import { existsSync } from "node:fs";
import { join } from "node:path";
import fastifyStatic from "@fastify/static";
import type { FastifyInstance } from "fastify";
import { config } from "./config";

const API_PREFIXES = ["/api/", "/proxy/", "/v1/"];

export async function registerWebApp(app: FastifyInstance) {
  const indexFile = join(config.webDir, "index.html");
  if (!existsSync(indexFile)) {
    app.log.warn(
      `Web app not built (${config.webDir}); serving the API only. Run \`pnpm build\` to enable it.`,
    );
    return;
  }

  await app.register(fastifyStatic, {
    root: config.webDir,
    // Vite fingerprints everything under assets/, so it can be cached forever; other files must revalidate.
    setHeaders(res, path) {
      res.header(
        "Cache-Control",
        path.includes("/assets/")
          ? "public, max-age=31536000, immutable"
          : "no-cache",
      );
    },
  });

  // Single-page app: unknown GET routes fall back to index.html, except API paths, which stay real 404s.
  app.setNotFoundHandler((request, reply) => {
    const path = request.url.split("?")[0] ?? "";
    const isApi = API_PREFIXES.some((prefix) => path.startsWith(prefix));
    // A missing file (e.g. a stale hashed asset) must stay a 404 rather than turn into HTML.
    const isFile = /\.[a-z0-9]+$/i.test(path);
    if (request.method !== "GET" || isApi || isFile) {
      return reply.code(404).send({ error: "Not found" });
    }
    return reply.header("Cache-Control", "no-cache").sendFile("index.html");
  });
  app.log.info(`Serving web app from ${config.webDir}`);
}
