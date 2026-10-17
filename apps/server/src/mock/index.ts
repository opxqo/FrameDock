import multipart from "@fastify/multipart";
import type { FastifyPluginAsync } from "fastify";
import images from "./images";
import models from "./models";
import { readMultipart } from "./multipart";
import responses from "./responses";
import videos from "./videos";

const mockApi: FastifyPluginAsync = async (app) => {
  await app.register(multipart, {
    limits: { fileSize: 20 * 1024 * 1024, files: 40, fields: 100, parts: 140 },
  });
  app.addHook("preValidation", async (request) => {
    if (request.isMultipart()) request.body = await readMultipart(request);
    request.log.info(
      {
        params: request.params,
        query: request.query,
        body: request.body,
      },
      "Mock API request",
    );
  });
  await app.register(models);
  await app.register(images);
  await app.register(videos);
  await app.register(responses);
};

export default mockApi;
