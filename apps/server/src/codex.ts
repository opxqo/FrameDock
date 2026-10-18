// FrameDock: run the local Codex CLI for canvas "Codex" nodes.
// Event shapes verified against codex-cli 0.163.0 (`codex exec --json`): text arrives as completed
// `agent_message` items; generated images are written to $CODEX_HOME/generated_images/<thread_id>/.
import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { extname, join } from "node:path";
import { createInterface } from "node:readline";
import type { FastifyPluginAsync } from "fastify";
import { config } from "./config";
import {
  bodyLimits,
  type CallHandle,
  finishCall,
  parseContext,
  startCall,
} from "./logging/logger";
import { captureBody } from "./logging/redact";

const CODEX_BIN = process.env.CODEX_BIN || "codex";
const CODEX_HOME = process.env.CODEX_HOME || join(homedir(), ".codex");
const RUN_TIMEOUT_MS = 20 * 60 * 1000;
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

type RunBody = {
  mode?: "text" | "image";
  prompt?: string;
  images?: string[];
  effort?: string;
  model?: string;
};

type CodexModel = {
  slug: string;
  name: string;
  defaultEffort: string;
  efforts: string[];
};
type CatalogEntry = {
  slug?: string;
  display_name?: string;
  visibility?: string;
  default_reasoning_level?: string;
  supported_reasoning_levels?: Array<{ effort?: string }>;
};

let modelCache: { at: number; models: CodexModel[] } | null = null;

/** Models offered to this Codex login (`codex debug models`, visible ones only), cached for 10 minutes. */
function listModels(): Promise<CodexModel[]> {
  if (modelCache && Date.now() - modelCache.at < 10 * 60 * 1000)
    return Promise.resolve(modelCache.models);
  return new Promise((resolve) => {
    execFile(
      CODEX_BIN,
      ["debug", "models"],
      { timeout: 20_000, maxBuffer: 32 * 1024 * 1024 },
      (error, stdout) => {
        if (error) return resolve([]);
        try {
          const catalog = JSON.parse(stdout) as { models?: CatalogEntry[] };
          const models = (catalog.models || [])
            .filter((entry) => entry.slug && entry.visibility === "list")
            .map((entry) => ({
              slug: entry.slug as string,
              name: entry.display_name || (entry.slug as string),
              defaultEffort: entry.default_reasoning_level || "medium",
              efforts: (entry.supported_reasoning_levels || []).flatMap(
                (level) => (level.effort ? [level.effort] : []),
              ),
            }));
          modelCache = { at: Date.now(), models };
          resolve(models);
        } catch {
          resolve([]);
        }
      },
    );
  });
}

/** Codex sometimes appends ChatGPT UI hints such as "[创建图像](chatgpt-system-hint://picture_v2)". */
function cleanText(text: string) {
  return text
    .replace(/\[[^\]]*\]\(chatgpt-system-hint:\/\/[^)]*\)/g, "")
    .trim();
}

type CodexEvent = {
  type?: string;
  thread_id?: string;
  message?: string;
  error?: { message?: string };
  item?: {
    type?: string;
    text?: string;
    message?: string;
    command?: string;
  };
};

const TEXT_INSTRUCTION =
  "你是画布里的文本生成节点。直接输出最终结果正文，不要解释过程，不要读取或修改任何文件，不要运行命令。\n\n";
const IMAGE_INSTRUCTION =
  "你是画布里的图片生成节点。请调用图片生成工具生成图片，不要只回复文字，不要修改任何项目文件。若附带了参考图，请据此生成或修改。\n\n";

/** Codex prints housekeeping warnings (e.g. PATH aliases) around its real output; keep only the real lines. */
function withoutWarnings(text: string) {
  return text
    .split("\n")
    .filter((line) => !/^WARNING:/i.test(line.trim()))
    .join("\n")
    .trim();
}

/**
 * "Operation not permitted" while starting Codex means this server itself runs in a restricted environment
 * (a sandboxed terminal), where the Codex CLI cannot create its app-server. Say so instead of the raw error.
 */
function explainFailure(message: string) {
  if (/operation not permitted|os error 1\b/i.test(message))
    return `Codex 无法启动：服务运行在受限环境里，Codex 没有权限初始化。请在普通终端（不是沙箱）里重新运行 pnpm dev。原始错误：${message}`;
  if (/not logged in|log in|unauthorized|401/i.test(message))
    return `Codex 还没有登录或登录已过期，请在终端运行 codex login。原始错误：${message}`;
  return message;
}

function run(
  file: string,
  args: string[],
): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    execFile(file, args, { timeout: 10_000 }, (error, stdout, stderr) =>
      resolve({
        ok: !error,
        output: withoutWarnings(`${stdout}${stderr}`),
      }),
    );
  });
}

function dataUrlToFile(dataUrl: string) {
  const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  if (!match) return null;
  const ext =
    match[1] === "image/jpeg"
      ? ".jpg"
      : match[1] === "image/webp"
        ? ".webp"
        : ".png";
  return { ext, bytes: Buffer.from(match[2] ?? "", "base64") };
}

function activityFor(event: CodexEvent): string | undefined {
  const item = event.item;
  if (event.type === "turn.started") return "思考中…";
  if (event.type === "item.started" && item?.type === "command_execution")
    return item.command?.includes("imagegen")
      ? "正在生成图片…"
      : "正在执行命令…";
  if (
    event.type === "item.completed" &&
    item?.type === "agent_message" &&
    item.text
  )
    return item.text.slice(0, 80);
  return undefined;
}

/** Records a small Codex route call (status/models) and its result in the API log. */
async function logged<T>(
  request: {
    method: string;
    url: string;
    headers: Record<string, string | string[] | undefined>;
  },
  action: () => Promise<T>,
): Promise<T> {
  const handle = startCall({
    source: "codex",
    method: request.method,
    url: `codex:${request.url.split("?")[0]}`,
    provider: "codex",
    context: parseContext(request.headers["x-framedock-ctx"]),
  });
  try {
    const result = await action();
    finishCall(handle, {
      state: "done",
      status: 200,
      resType: "application/json",
      body: captureBody(
        JSON.stringify(result),
        "application/json",
        bodyLimits(),
      ),
    });
    return result;
  } catch (error) {
    finishCall(handle, {
      state: "error",
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

const codexApi: FastifyPluginAsync = async (app) => {
  app.get("/models", async (request) =>
    logged(request, async () => ({ models: await listModels() })),
  );

  app.get("/status", async (request) =>
    logged(request, async () => {
      const version = await run(CODEX_BIN, ["--version"]);
      if (!version.ok)
        return { available: false, loggedIn: false, version: "" };
      const login = await run(CODEX_BIN, ["login", "status"]);
      return {
        available: true,
        version: version.output,
        loggedIn: login.ok && /logged in/i.test(login.output),
        login: login.output,
      };
    }),
  );

  app.post<{ Body: RunBody }>(
    "/run",
    { bodyLimit: 60 * 1024 * 1024 },
    async (request, reply) => {
      const {
        mode = "text",
        prompt = "",
        images = [],
        effort = "low",
        model = "",
      } = request.body || {};
      // Only accept a model and effort that this Codex login actually offers.
      const models = await listModels();
      const selected = models.find((item) => item.slug === model);
      const safeEffort = selected
        ? selected.efforts.includes(effort)
          ? effort
          : selected.defaultEffort
        : ["low", "medium", "high"].includes(effort)
          ? effort
          : "low";
      if (!prompt.trim() && !images.length)
        return reply.code(400).send({ error: "提示词不能为空" });

      const runDir = join(config.dataDir, "codex-runs", randomUUID());
      await mkdir(runDir, { recursive: true });
      const imageFiles: string[] = [];
      for (const [index, dataUrl] of images.entries()) {
        const file = dataUrlToFile(dataUrl);
        if (!file) continue;
        const path = join(runDir, `input-${index + 1}${file.ext}`);
        await writeFile(path, file.bytes);
        imageFiles.push(path);
      }

      const args = [
        "exec",
        "--json",
        "--ephemeral",
        "--ignore-user-config",
        "--skip-git-repo-check",
        "-s",
        "read-only",
        "-C",
        runDir,
        "-c",
        `model_reasoning_effort=${safeEffort}`,
        ...(selected ? ["-m", selected.slug] : []),
        ...(mode === "image" ? ["--enable", "image_generation"] : []),
        ...imageFiles.flatMap((file) => ["-i", file]),
        "--",
        `${mode === "image" ? IMAGE_INSTRUCTION : TEXT_INSTRUCTION}${prompt}`,
      ];

      reply.hijack();
      const res = reply.raw;
      res.writeHead(200, {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      });
      // What the run did, kept for the API log (statuses, image sizes — never the image bytes).
      const trail: string[] = [];
      const imageSizes: number[] = [];
      const send = (event: Record<string, unknown>) => {
        if (event.type === "status" && trail.length < 60)
          trail.push(String(event.text));
        if (event.type === "image")
          imageSizes.push(String(event.dataUrl ?? "").length);
        if (!res.writableEnded) res.write(`${JSON.stringify(event)}\n`);
      };
      const logHandle: CallHandle | null = startCall({
        source: "codex",
        method: "POST",
        url: "codex:/api/codex/run",
        provider: "codex",
        contentType: "application/json",
        context: parseContext(request.headers["x-framedock-ctx"]),
        body: JSON.stringify({
          mode,
          model: selected?.slug ?? null,
          effort: safeEffort,
          prompt,
          images: images.map((image) => `${image.length} chars`),
        }),
        extra: {
          args: args.slice(0, -1).filter((arg) => arg !== runDir),
          timeoutMs: RUN_TIMEOUT_MS,
        },
      });

      const child = spawn(CODEX_BIN, args, {
        cwd: runDir,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let threadId = "";
      let finalText = "";
      let failure = "";
      let stderr = "";
      const timer = setTimeout(() => {
        failure = "Codex 运行超时（20 分钟）";
        child.kill("SIGTERM");
      }, RUN_TIMEOUT_MS);
      // Stop/cancel in the browser closes the response: stop the Codex process with it.
      res.on("close", () => {
        if (child.exitCode === null) child.kill("SIGTERM");
      });

      send({ type: "status", text: "正在启动 Codex…" });
      child.stderr.on("data", (chunk: Buffer) => {
        stderr = `${stderr}${chunk.toString()}`.slice(-4000);
      });
      createInterface({ input: child.stdout }).on("line", (line) => {
        let event: CodexEvent;
        try {
          event = JSON.parse(line) as CodexEvent;
        } catch {
          return;
        }
        if (event.type === "thread.started" && event.thread_id)
          threadId = event.thread_id;
        const item = event.item;
        if (
          event.type === "item.completed" &&
          item?.type === "agent_message" &&
          item.text?.trim()
        )
          finalText = item.text;
        if (
          event.type === "item.completed" &&
          item?.type === "error" &&
          item.message &&
          !/ignoring .*configuration/i.test(item.message)
        )
          failure = item.message;
        if (event.type === "turn.failed" || event.type === "error")
          failure = event.error?.message || event.message || "Codex 运行失败";
        const activity = activityFor(event);
        if (activity) send({ type: "status", text: activity });
      });

      child.on("close", async (code) => {
        clearTimeout(timer);
        const clientGone = res.destroyed;
        try {
          if (mode === "image" && threadId) {
            const dir = join(CODEX_HOME, "generated_images", threadId);
            const files = (
              await readdir(dir).catch(() => [] as string[])
            ).filter((name) =>
              IMAGE_EXTENSIONS.has(extname(name).toLowerCase()),
            );
            for (const name of files) {
              const ext = extname(name).toLowerCase();
              const mime =
                ext === ".jpg" || ext === ".jpeg"
                  ? "image/jpeg"
                  : ext === ".webp"
                    ? "image/webp"
                    : "image/png";
              send({
                type: "image",
                dataUrl: `data:${mime};base64,${(await readFile(join(dir, name))).toString("base64")}`,
              });
            }
            if (!files.length && !failure)
              failure = finalText || "Codex 没有生成图片";
          }
          if (code !== 0 && !failure)
            failure = stderr.trim().split("\n").pop() || `Codex 退出码 ${code}`;
          if (failure)
            send({ type: "error", message: explainFailure(failure) });
          else send({ type: "done", text: cleanText(finalText) });
        } finally {
          finishCall(logHandle, {
            state: failure || clientGone ? "error" : "done",
            status: failure ? 500 : 200,
            error: failure
              ? explainFailure(failure)
              : clientGone
                ? "客户端取消"
                : undefined,
            resType: "application/x-ndjson",
            body: captureBody(
              JSON.stringify({
                exitCode: code,
                threadId: threadId || undefined,
                activity: trail,
                images: imageSizes.map((chars) => `${chars} chars of data URL`),
                text: cleanText(finalText),
                stderrTail: stderr.trim().split("\n").slice(-6).join("\n"),
              }),
              "application/json",
              bodyLimits(),
            ),
          });
          res.end();
          await rm(runDir, { recursive: true, force: true });
        }
      });
      child.on("error", (error) => {
        failure = `无法启动 Codex：${error.message}`;
      });
    },
  );
};

export default codexApi;
