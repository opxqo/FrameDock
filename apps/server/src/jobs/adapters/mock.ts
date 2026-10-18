import { FormData } from "undici";
import { upstreamFetch } from "../../upstream";
import { AdapterError, type JobAdapter } from "../types";

// FrameDock: drives the local mock API (src/mock/videos.ts) through the same OpenAI-style video flow the
// real adapters will use, so the whole job pipeline can be tested without spending anything.
// request: { prompt: string }; credentials.baseUrl: e.g. http://127.0.0.1:8787/v1

type MockRequest = { prompt?: string };

async function call(
  url: string,
  init: Parameters<typeof upstreamFetch>[1],
  signal: AbortSignal,
) {
  try {
    return await upstreamFetch(url, { ...init, signal });
  } catch (error) {
    throw new AdapterError(
      `Mock API unreachable: ${error instanceof Error ? error.message : String(error)}`,
      "retryable",
    );
  }
}

export const mockVideoAdapter: JobAdapter = {
  id: "mock-video",
  concurrency: 2,
  pollIntervalMs: 1000,
  maxPolls: 60,

  async submit({ request, credentials, signal }) {
    const form = new FormData();
    form.set("prompt", (request as MockRequest)?.prompt ?? "");
    const response = await call(
      `${credentials.baseUrl}/videos`,
      { method: "POST", body: form },
      signal,
    );
    if (!response.ok) {
      throw new AdapterError(
        `Mock API rejected the task (${response.status})`,
        response.status >= 500 ? "unknown" : "fatal",
      );
    }
    const body = (await response.json()) as { id?: string };
    if (!body.id)
      throw new AdapterError("Mock API returned no task id", "unknown");
    return { remoteTaskId: body.id };
  },

  async poll({ credentials, signal }, remoteTaskId) {
    const response = await call(
      `${credentials.baseUrl}/videos/${remoteTaskId}`,
      {},
      signal,
    );
    if (response.status === 404)
      throw new AdapterError("Task not found at provider", "fatal");
    if (!response.ok)
      throw new AdapterError(`Poll failed (${response.status})`, "retryable");
    const body = (await response.json()) as { status?: string };
    if (body.status === "completed") return { status: "succeeded" };
    if (body.status === "failed")
      return { status: "failed", error: "Mock task failed" };
    return { status: "running" };
  },

  async fetchResult({ credentials, signal }, remoteTaskId) {
    const response = await call(
      `${credentials.baseUrl}/videos/${remoteTaskId}/content`,
      {},
      signal,
    );
    if (!response.ok)
      throw new AdapterError(
        `Download failed (${response.status})`,
        "retryable",
      );
    return {
      bytes: Buffer.from(await response.arrayBuffer()),
      mime: response.headers.get("content-type") ?? "video/mp4",
      width: 640,
      height: 360,
      durationMs: 3000,
    };
  },
};
