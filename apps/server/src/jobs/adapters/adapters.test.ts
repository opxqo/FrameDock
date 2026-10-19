import assert from "node:assert/strict";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import { after, afterEach, before, describe, it } from "node:test";
import sharp from "sharp";
import { toPublicJob } from "../engine";
import { closeAll, makeEngine, openDb, track, untilState } from "../testing";
import type { FetchedResult, JobInput } from "../types";
import { openaiVideoAdapter } from "./openai-video";
import { yfaiAdapter } from "./yfai";

// Real adapters against a scripted HTTP server: wire format, error classification and result download.

type Seen = {
  method: string;
  url: string;
  headers: IncomingMessage["headers"];
  body: Buffer;
};
type Handler = (request: Seen, response: ServerResponse) => void;

const MP4 = Buffer.from("fake-mp4-bytes");
let server: Server;
let base = "";
let handler: Handler = (_request, response) => response.writeHead(404).end();
let seen: Seen[] = [];

before(async () => {
  server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const entry = {
        method: request.method ?? "",
        url: request.url ?? "",
        headers: request.headers,
        body: Buffer.concat(chunks),
      };
      seen.push(entry);
      handler(entry, response);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());
afterEach(() => {
  closeAll();
  seen = [];
});

const json = (response: ServerResponse, status: number, body: unknown) =>
  response
    .writeHead(status, { "content-type": "application/json" })
    .end(JSON.stringify(body));
const media = (response: ServerResponse) =>
  response.writeHead(200, { "content-type": "video/mp4" }).end(MP4);

const fast = <T extends { pollIntervalMs: number }>(adapter: T): T => ({
  ...adapter,
  pollIntervalMs: 5,
});

function setup(adapter: ReturnType<typeof fast<typeof yfaiAdapter>>) {
  const { db, entry } = openDb();
  const saved: FetchedResult[] = [];
  const engine = track(
    entry,
    makeEngine(db, adapter, {
      saveResult: async (_kind, id, outputs) => {
        saved.push(...outputs);
        const [fetched] = outputs as [FetchedResult];
        return {
          store: "media_files",
          key: `video:${id}`,
          mime: fetched.mime,
          size: fetched.bytes.length,
        };
      },
    }),
  );
  return { engine, saved };
}

const yfaiJob = (extra: Partial<JobInput> = {}): JobInput => ({
  kind: "video",
  adapter: "yfai",
  model: "veo",
  request: {
    invoke: { model_id: "veo", modality: "video", params: { prompt: "a cat" } },
  },
  credentials: { baseUrl: `${base}/v1`, apiKey: "yf-key" },
  ...extra,
});

describe("yfai adapter", () => {
  it("submits the invoke envelope, rides out 503/not-final polls and downloads the first video", async () => {
    let polls = 0;
    handler = (request, response) => {
      if (request.url === "/api/v1/model-runtime/invoke") {
        response.setHeader("x-request-id", "req_test");
        return json(response, 200, { code: 200, data: { task_id: "t1" } });
      }
      if (request.url === "/v1/tasks/t1") {
        polls += 1;
        if (polls === 1) return json(response, 503, { error: "busy" });
        if (polls === 2)
          return json(response, 200, {
            task_id: "t1",
            is_final: false,
            status: "needs_review",
          });
        return json(response, 200, {
          task_id: "t1",
          is_final: true,
          status: "completed",
          result: {
            videos: [
              { original_url: `${base}/files/v.mp4` },
              { url: `${base}/files/other.mp4` },
            ],
          },
        });
      }
      if (request.url === "/files/v.mp4" || request.url === "/files/other.mp4")
        return media(response);
      response.writeHead(404).end();
    };
    const { engine, saved } = setup(fast(yfaiAdapter));
    const { job } = engine.create(yfaiJob());
    const done = await untilState(engine, job.id, "succeeded");

    assert.equal(done.remote_task_id, "t1");
    assert.equal(polls, 3);
    assert.equal(saved.length, 2, "every output of the task is kept");
    assert.deepEqual(saved[0]?.bytes, MP4);
    assert.equal(saved[0]?.mime, "video/mp4");
    const invoke = seen.find(
      (entry) => entry.url === "/api/v1/model-runtime/invoke",
    );
    assert.equal(invoke?.headers.authorization, "Bearer yf-key");
    const sent = JSON.parse(invoke?.body.toString() ?? "{}");
    assert.deepEqual(sent.params, { prompt: "a cat" });
    assert.equal(
      sent.client_request_id,
      job.id,
      "the job id is the idempotency key, whatever the browser sent",
    );
    assert.equal(
      done.request_id,
      "req_test",
      "the provider's request id is kept",
    );
    const download = seen.find((entry) => entry.url === "/files/v.mp4");
    assert.equal(
      download?.headers.authorization,
      undefined,
      "result links must not receive the api key",
    );
  });

  it("fails with the provider's reason and task id when the task ends badly", async () => {
    handler = (request, response) =>
      request.url === "/api/v1/model-runtime/invoke"
        ? json(response, 200, { task_id: "t2" })
        : json(response, 200, {
            is_final: true,
            status: "failed",
            error: { message: "content blocked" },
          });
    const { engine } = setup(fast(yfaiAdapter));
    const { job } = engine.create(yfaiJob());
    const failed = await untilState(engine, job.id, "failed");
    assert.match(failed.error ?? "", /content blocked/);
    assert.match(failed.error ?? "", /t2/);
  });

  it("classifies submit errors: 4xx and error envelopes fail; a 5xx is repeated with the same id, then parked as unknown", async () => {
    handler = (_request, response) =>
      json(response, 422, { error: { message: "bad params" } });
    const rejected = setup(fast(yfaiAdapter));
    const first = rejected.engine.create(yfaiJob());
    assert.match(
      (await untilState(rejected.engine, first.job.id, "failed")).error ?? "",
      /bad params/,
    );

    handler = (_request, response) =>
      json(response, 200, { code: 4001, msg: "no balance" });
    const envelope = setup(fast(yfaiAdapter));
    const second = envelope.engine.create(yfaiJob());
    assert.match(
      (await untilState(envelope.engine, second.job.id, "failed")).error ?? "",
      /no balance/,
    );

    seen = [];
    handler = (_request, response) =>
      json(response, 502, { error: "bad gateway" });
    const flaky = setup(fast(yfaiAdapter));
    const third = flaky.engine.create(yfaiJob());
    await untilState(flaky.engine, third.job.id, "unknown");
    assert.equal(
      seen.length,
      5,
      "an unclear submit is repeated a bounded number of times",
    );
    const ids = new Set(
      seen.map((entry) => JSON.parse(entry.body.toString()).client_request_id),
    );
    assert.deepEqual(
      [...ids],
      [third.job.id],
      "every repeat carries the same id, so the provider cannot bill twice",
    );
  });

  it("recovers from a submit that failed once: same id, one task", async () => {
    let calls = 0;
    handler = (request, response) => {
      if (request.url === "/api/v1/model-runtime/invoke") {
        calls += 1;
        if (calls === 1) return response.destroy(); // connection reset after the request was sent
        return json(response, 200, { task_id: "t-retry" });
      }
      if (request.url === "/v1/tasks/t-retry") {
        return json(response, 200, {
          is_final: true,
          status: "completed",
          result: { videos: [{ url: `${base}/files/v.mp4` }] },
        });
      }
      if (request.url === "/files/v.mp4") return media(response);
      response.writeHead(404).end();
    };
    const { engine } = setup(fast(yfaiAdapter));
    const { job } = engine.create(yfaiJob());
    const done = await untilState(engine, job.id, "succeeded");
    assert.equal(done.remote_task_id, "t-retry");
    assert.equal(calls, 2);
  });

  it("explains a 402 as a balance problem", async () => {
    handler = (_request, response) =>
      json(response, 402, {
        error: { message: "wallet balance insufficient for image mj_imagine" },
      });
    const { engine } = setup(fast(yfaiAdapter));
    const { job } = engine.create(yfaiJob());
    const failed = await untilState(engine, job.id, "failed");
    assert.match(
      failed.error ?? "",
      /Not enough available balance: wallet balance insufficient/,
    );
  });

  it("keeps every image of a batch with its pixel size", async () => {
    const png = await sharp({
      create: { width: 8, height: 4, channels: 3, background: "#fff" },
    })
      .png()
      .toBuffer();
    handler = (request, response) => {
      if (request.url === "/api/v1/model-runtime/invoke")
        return json(response, 200, { task_id: "img-1" });
      if (request.url === "/v1/tasks/img-1") {
        return json(response, 200, {
          is_final: true,
          status: "completed",
          result: {
            images: [
              { original_url: `${base}/i/1.png` },
              { url: `${base}/i/2.png` },
            ],
          },
        });
      }
      if (request.url?.startsWith("/i/"))
        return response
          .writeHead(200, { "content-type": "image/png" })
          .end(png);
      response.writeHead(404).end();
    };
    const { engine, saved } = setup(fast(yfaiAdapter));
    const { job } = engine.create(yfaiJob({ kind: "image" }));
    await untilState(engine, job.id, "succeeded");
    assert.equal(saved.length, 2);
    assert.deepEqual([saved[0]?.width, saved[0]?.height], [8, 4]);
  });

  it("stops on an expired task (410)", async () => {
    handler = (request, response) =>
      request.url === "/api/v1/model-runtime/invoke"
        ? json(response, 200, { task_id: "t3" })
        : json(response, 410, { error: "gone" });
    const { engine } = setup(fast(yfaiAdapter));
    const { job } = engine.create(yfaiJob());
    assert.match(
      (await untilState(engine, job.id, "failed")).error ?? "",
      /expired/,
    );
  });

  it("keeps the gateway's param_adjustments from the submit and the finished task", async () => {
    handler = (request, response) => {
      if (request.url === "/api/v1/model-runtime/invoke")
        return json(response, 200, {
          code: 200,
          data: {
            task_id: "t4",
            param_adjustments: [
              { param: "duration", requested: "7", applied: 8, reason: "nearest_supported" },
              { param: "seconds", requested: 5, applied: null, reason: "field_alias" },
            ],
          },
        });
      if (request.url === "/v1/tasks/t4")
        return json(response, 200, {
          task_id: "t4",
          is_final: true,
          status: "completed",
          output_url: `${base}/files/v.mp4`,
          delivery_provenance: { request_id: "ledger-uuid" },
          billing: { actual_cost_credits: 1.25 },
          channel_id: "veo@ZQI:default",
          param_adjustments: [
            { param: "duration", requested: "7", applied: 6, reason: "nearest_vendor_supported" },
          ],
        });
      return media(response);
    };
    const { engine } = setup(fast(yfaiAdapter));
    const { job } = engine.create(yfaiJob());
    const done = toPublicJob(await untilState(engine, job.id, "succeeded"));
    assert.deepEqual(done.notes?.paramAdjustments, [
      { param: "duration", requested: "7", applied: 6, reason: "nearest_vendor_supported" },
      { param: "seconds", requested: 5, applied: null, reason: "field_alias" },
    ]);
    assert.equal(done.notes?.ledgerId, "ledger-uuid");
    assert.equal(done.notes?.cost, 1.25);
    assert.equal(done.notes?.lane, "veo@ZQI:default");
    assert.deepEqual(engine.addNotes(job.id, { cost: 2 })?.notes, { ...done.notes, cost: 2 });
    assert.equal(done.prompt, "a cat");
    assert.equal(engine.list({ adapter: "yfai" }).length, 1);
    assert.equal(engine.list({ adapter: "openai-video" }).length, 0);
  });

  it("downloads a finished result again on request, with a key given only for that call", async () => {
    handler = (request, response) => {
      if (request.url === "/api/v1/model-runtime/invoke")
        return json(response, 200, { task_id: "t5" });
      if (request.url === "/v1/tasks/t5")
        return json(response, 200, {
          task_id: "t5",
          is_final: true,
          status: "completed",
          output_url: `${base}/files/v.mp4`,
        });
      return media(response);
    };
    const { engine, saved } = setup(fast(yfaiAdapter));
    const { job } = engine.create(yfaiJob());
    await untilState(engine, job.id, "succeeded");
    seen = [];
    const restored = await engine.restoreResult(job.id, "fresh-key");
    assert.ok(restored?.result);
    assert.equal(saved.length, 2, "the result was saved a second time");
    assert.equal(seen[0]?.headers.authorization, "Bearer fresh-key");
    assert.equal(
      (restored.credentials as { apiKey: string }).apiKey,
      "",
      "the key is not stored",
    );
    assert.equal(await engine.restoreResult("missing", "k"), undefined);
  });

  it("rejects a job without an invoke payload", async () => {
    const { engine } = setup(fast(yfaiAdapter));
    const { job } = engine.create(yfaiJob({ request: {} }));
    assert.match(
      (await untilState(engine, job.id, "failed")).error ?? "",
      /invoke payload/,
    );
  });
});

const videoJob = (extra: Partial<JobInput> = {}): JobInput => ({
  kind: "video",
  adapter: "openai-video",
  model: "sora",
  request: {
    fields: { prompt: "waves", seconds: "5", "tags[]": ["a", "b"] },
    files: [
      {
        field: "first_frame",
        filename: "first.png",
        dataUrl: `data:image/png;base64,${Buffer.from("PNGDATA").toString("base64")}`,
      },
    ],
  },
  credentials: { baseUrl: base, apiKey: "oa-key" },
  ...extra,
});

describe("openai-video adapter", () => {
  it("sends multipart fields and files, polls, and downloads the content endpoint with the key", async () => {
    let polls = 0;
    handler = (request, response) => {
      if (request.method === "POST" && request.url === "/v1/videos") {
        return json(response, 200, {
          code: 0,
          data: { id: "vid_1", status: "queued" },
        });
      }
      if (request.url === "/v1/videos/vid_1") {
        polls += 1;
        return json(response, 200, {
          id: "vid_1",
          status: polls < 3 ? "in_progress" : "completed",
        });
      }
      if (request.url === "/v1/videos/vid_1/content") return media(response);
      response.writeHead(404).end();
    };
    const { engine, saved } = setup(fast(openaiVideoAdapter));
    const { job } = engine.create(videoJob());
    await untilState(engine, job.id, "succeeded");

    assert.deepEqual(saved[0]?.bytes, MP4);
    const create = seen.find((entry) => entry.method === "POST");
    assert.equal(create?.headers.authorization, "Bearer oa-key");
    assert.match(
      create?.headers["content-type"] ?? "",
      /^multipart\/form-data/,
    );
    const text = create?.body.toString("latin1") ?? "";
    assert.match(text, /name="prompt"\r\n\r\nwaves/);
    assert.match(text, /name="seconds"\r\n\r\n5/);
    assert.equal((text.match(/name="tags\[\]"/g) ?? []).length, 2);
    assert.match(text, /name="first_frame"; filename="first\.png"/);
    assert.ok(text.includes("PNGDATA"));
    const content = seen.find(
      (entry) => entry.url === "/v1/videos/vid_1/content",
    );
    assert.equal(content?.headers.authorization, "Bearer oa-key");
  });

  it("downloads a result url directly, without the key, and accepts a /v1 base", async () => {
    handler = (request, response) => {
      if (request.method === "POST")
        return json(response, 200, { id: "vid_2" });
      if (request.url === "/v1/videos/vid_2") {
        return json(response, 200, {
          status: "completed",
          video_url: `${base}/out/final.mp4`,
        });
      }
      if (request.url === "/out/final.mp4") return media(response);
      response.writeHead(404).end();
    };
    const { engine } = setup(fast(openaiVideoAdapter));
    const { job } = engine.create(
      videoJob({ credentials: { baseUrl: `${base}/v1/`, apiKey: "oa-key" } }),
    );
    await untilState(engine, job.id, "succeeded");
    const download = seen.find((entry) => entry.url === "/out/final.mp4");
    assert.equal(download?.headers.authorization, undefined);
  });

  it("reports a failed task and treats a JSON body from the content endpoint as an error, not media", async () => {
    handler = (request, response) => {
      if (request.method === "POST")
        return json(response, 200, { id: "vid_3" });
      return json(response, 200, {
        status: "failed",
        error: { message: "moderation" },
      });
    };
    const failing = setup(fast(openaiVideoAdapter));
    const first = failing.engine.create(videoJob());
    assert.match(
      (await untilState(failing.engine, first.job.id, "failed")).error ?? "",
      /moderation/,
    );

    handler = (request, response) => {
      if (request.method === "POST")
        return json(response, 200, { id: "vid_4" });
      if (request.url?.endsWith("/content"))
        return json(response, 200, { error: { message: "quota used up" } });
      return json(response, 200, { status: "completed" });
    };
    const content = setup({ ...fast(openaiVideoAdapter) });
    const second = content.engine.create(videoJob());
    // Download errors are retried; after the retry budget the job parks as unknown with the provider's message.
    const { engine } = content;
    const row = await untilState(engine, second.job.id, "unknown");
    assert.match(row.error ?? "", /quota used up/);
    assert.equal(content.saved.length, 0);
  });

  it("does not resend a submit that returned 5xx, and fails on unreadable reference files", async () => {
    handler = (_request, response) => json(response, 500, { error: "boom" });
    const flaky = setup(fast(openaiVideoAdapter));
    const first = flaky.engine.create(videoJob());
    await untilState(flaky.engine, first.job.id, "unknown");
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(seen.length, 1);

    seen = [];
    const missing = setup(fast(openaiVideoAdapter));
    const second = missing.engine.create(
      videoJob({
        request: {
          fields: { prompt: "x" },
          files: [
            {
              field: "image[]",
              filename: "a.png",
              store: "media_files",
              key: "image:does-not-exist",
            },
          ],
        },
      }),
    );
    assert.match(
      (await untilState(missing.engine, second.job.id, "failed")).error ?? "",
      /missing on the server/,
    );

    const bad = setup(fast(openaiVideoAdapter));
    const third = bad.engine.create(
      videoJob({
        request: {
          fields: {},
          files: [
            {
              field: "image[]",
              filename: "a.png",
              store: "../etc",
              key: "passwd",
            },
          ],
        },
      }),
    );
    assert.match(
      (await untilState(bad.engine, third.job.id, "failed")).error ?? "",
      /no readable source/,
    );
    assert.equal(
      seen.length,
      0,
      "nothing is sent when a file cannot be loaded",
    );
  });
});
