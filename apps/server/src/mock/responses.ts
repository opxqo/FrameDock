import { randomUUID } from "node:crypto";
import { setTimeout } from "node:timers/promises";
import type { FastifyPluginAsync } from "fastify";

function userInput(input: unknown): string {
  if (typeof input === "string") return input;
  if (!Array.isArray(input)) return "";
  return input
    .filter((item) => item?.role === "user")
    .map((item) => {
      if (typeof item.content === "string") return item.content;
      if (!Array.isArray(item.content)) return "";
      return item.content
        .filter(
          (part: { type?: string }) =>
            part?.type === "input_text" || part?.type === "text",
        )
        .map((part: { text?: string }) =>
          typeof part.text === "string" ? part.text : "",
        )
        .join("");
    })
    .join("\n");
}

const responses: FastifyPluginAsync = async (app) => {
  app.post<{ Body: { input?: unknown; stream?: boolean } }>(
    "/responses",
    async (request, reply) => {
      const outputText = `模拟回复：${Array.from(userInput(request.body?.input)).slice(0, 50).join("")}`;
      const response = {
        id: `resp_${randomUUID()}`,
        object: "response",
        status: "completed",
        output_text: outputText,
        output: [
          {
            type: "message",
            role: "assistant",
            content: [{ type: "output_text", text: outputText }],
          },
        ],
      };
      if (
        !request.body?.stream &&
        !request.headers.accept?.includes("text/event-stream")
      )
        return response;

      reply.hijack();
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
      });
      const characters = Array.from(outputText);
      for (let index = 0; index < characters.length; index += 4) {
        if (reply.raw.destroyed) return;
        const event = {
          type: "response.output_text.delta",
          delta: characters.slice(index, index + 4).join(""),
        };
        reply.raw.write(
          `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
        );
        await setTimeout(80);
      }
      if (!reply.raw.destroyed) {
        reply.raw.end(
          `event: response.completed\ndata: ${JSON.stringify({ type: "response.completed", response })}\n\n`,
        );
      }
    },
  );
};

export default responses;
