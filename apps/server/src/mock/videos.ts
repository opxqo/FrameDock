import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import type { FastifyPluginAsync } from "fastify";
import sharp from "sharp";
import { config } from "../config";
import { countFiles, fieldValue, type MultipartInput } from "./multipart";

const run = promisify(execFile);

async function generateVideo() {
  const directory = join(config.dataDir, "mock");
  const target = join(directory, "video.mp4");
  try {
    return await readFile(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  await mkdir(directory, { recursive: true });
  const temporaryDir = await mkdtemp(join(directory, "video-"));
  const temporary = join(temporaryDir, "video.mp4");
  try {
    // Homebrew ffmpeg may omit drawtext. Render the title and second counter
    // with sharp, then let ffmpeg overlay these three transparent frames.
    for (let second = 0; second < 3; second += 1) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">
        <rect x="10" y="10" width="310" height="100" rx="8" fill="#000" fill-opacity="0.7"/>
        <g fill="white" font-family="sans-serif">
          <text x="20" y="50" font-size="30">FrameDock mock</text>
          <text x="20" y="90" font-size="24">00:0${second}</text>
        </g>
      </svg>`;
      await sharp(Buffer.from(svg))
        .png()
        .toFile(join(temporaryDir, `frame-${second}.png`));
    }
    await run(
      "/opt/homebrew/bin/ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc2=size=640x360:rate=24",
        "-framerate",
        "1",
        "-i",
        join(temporaryDir, "frame-%d.png"),
        "-t",
        "3",
        "-filter_complex",
        "[0:v][1:v]overlay=0:0",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        temporary,
      ],
      { timeout: 30_000 },
    );
    await rename(temporary, target);
    return await readFile(target);
  } catch (error) {
    throw new Error(
      `Mock video generation failed: ensure /opt/homebrew/bin/ffmpeg is installed with overlay and libx264 support. ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    await rm(temporaryDir, { recursive: true, force: true });
  }
}

const videos: FastifyPluginAsync = async (app) => {
  const tasks = new Map<
    string,
    { prompt: string; referenceCount: number; polls: number }
  >();
  let video: Promise<Buffer> | undefined;

  app.post<{ Body: MultipartInput }>("/videos", async (request, reply) => {
    if (!request.isMultipart())
      return reply
        .code(415)
        .send({ error: { message: "Expected multipart/form-data" } });
    const prompt = fieldValue(request.body, "prompt") || "";
    // The frontend sends first_frame/image[] plus an identical `images` alias.
    const referenceCount = Math.max(
      countFiles(request.body, [
        "image",
        "image[]",
        "first_frame",
        "last_frame",
      ]),
      countFiles(request.body, ["images"]),
    );
    const id = `video_${randomUUID()}`;
    tasks.set(id, { prompt, referenceCount, polls: 0 });
    request.log.info({ id, prompt, referenceCount }, "Mock video task created");
    return { id, status: "queued" };
  });

  app.get<{ Params: { id: string } }>("/videos/:id", async (request, reply) => {
    const task = tasks.get(request.params.id);
    if (!task)
      return reply
        .code(404)
        .send({ error: { message: "Mock video task not found" } });
    task.polls += 1;
    return {
      id: request.params.id,
      status: task.polls <= 3 ? "in_progress" : "completed",
    };
  });

  app.get<{ Params: { id: string } }>(
    "/videos/:id/content",
    async (request, reply) => {
      const task = tasks.get(request.params.id);
      if (!task)
        return reply
          .code(404)
          .send({ error: { message: "Mock video task not found" } });
      if (task.polls <= 3)
        return reply
          .code(409)
          .send({ error: { message: "Mock video task is still in progress" } });
      try {
        video ??= generateVideo();
        const content = await video;
        return reply.type("video/mp4").send(content);
      } catch (error) {
        video = undefined;
        request.log.error(error, "Mock video unavailable");
        return reply.code(500).send({
          error: {
            message:
              error instanceof Error ? error.message : "Mock video unavailable",
          },
        });
      }
    },
  );
};

export default videos;
