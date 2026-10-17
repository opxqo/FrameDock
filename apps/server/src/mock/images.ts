import { createHash } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import sharp from "sharp";
import { z } from "zod";
import { countFiles, fieldValue, type MultipartInput } from "./multipart";

const imageInput = z.object({
  prompt: z.string().default(""),
  n: z.coerce.number().int().min(1).max(15).default(1),
  size: z
    .string()
    .regex(/^\d+x\d+$/i)
    .default("1024x1024")
    .refine((size) => {
      const [width = 0, height = 0] = size.toLowerCase().split("x").map(Number);
      return width > 0 && height > 0 && width <= 4096 && height <= 4096;
    }, "Mock image dimensions must be between 1 and 4096"),
});

function escapeXml(text: string) {
  return Array.from(text)
    .filter((char) => char >= " " || "\t\n\r".includes(char))
    .join("")
    .replace(/[<>&"']/g, (char) => `&#${char.codePointAt(0)};`);
}

async function generateImages(input: z.infer<typeof imageInput>, refs: number) {
  const [width = 1024, height = 1024] = input.size
    .toLowerCase()
    .split("x")
    .map(Number);
  const color = createHash("sha256")
    .update(input.prompt)
    .digest("hex")
    .slice(0, 6);
  const prompt = Array.from(input.prompt).slice(0, 40).join("");
  const data = [];
  for (let index = 1; index <= input.n; index += 1) {
    // A fixed viewBox keeps the labels visible for any requested aspect ratio.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 1000 600">
      <rect x="-10000" y="-10000" width="20000" height="20000" fill="#${color}"/>
      <rect x="25" y="100" width="950" height="400" rx="24" fill="#ffffff" fill-opacity="0.9"/>
      <g fill="#152030" font-family="sans-serif">
        <text x="60" y="170" font-size="36">FrameDock mock · 第 ${index} 张</text>
        <text x="60" y="260" font-size="28">${escapeXml(Array.from(prompt).slice(0, 20).join(""))}</text>
        <text x="60" y="310" font-size="28">${escapeXml(Array.from(prompt).slice(20).join(""))}</text>
        <text x="60" y="420" font-size="32">参考图：${refs}</text>
      </g>
    </svg>`;
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    data.push({ b64_json: png.toString("base64") });
  }
  return { created: Math.floor(Date.now() / 1000), data };
}

const images: FastifyPluginAsync = async (app) => {
  app.post("/images/generations", async (request, reply) => {
    const parsed = imageInput.safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: { message: parsed.error.message } });
    return generateImages(parsed.data, 0);
  });

  app.post<{ Body: MultipartInput }>(
    "/images/edits",
    async (request, reply) => {
      if (!request.isMultipart())
        return reply
          .code(415)
          .send({ error: { message: "Expected multipart/form-data" } });
      const parsed = imageInput.safeParse({
        prompt: fieldValue(request.body, "prompt"),
        n: fieldValue(request.body, "n"),
        size: fieldValue(request.body, "size"),
      });
      if (!parsed.success)
        return reply
          .code(400)
          .send({ error: { message: parsed.error.message } });
      return generateImages(
        parsed.data,
        countFiles(request.body, ["image", "image[]"]),
      );
    },
  );
};

export default images;
