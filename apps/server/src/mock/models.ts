import type { FastifyPluginAsync } from "fastify";

const models: FastifyPluginAsync = async (app) => {
  app.get("/models", async () => ({
    object: "list",
    data: ["mock-image", "mock-video", "mock-text"].map((id) => ({
      id,
      object: "model",
    })),
  }));
};

export default models;
