import type { FastifyRequest } from "fastify";

export type MultipartInput = {
  fields: Record<string, string | string[]>;
  files: { field: string; filename: string; mimetype: string; bytes: number }[];
};

// Drain uploads without retaining binary data; mock generation only needs counts.
export async function readMultipart(request: FastifyRequest) {
  const input: MultipartInput = { fields: {}, files: [] };
  for await (const part of request.parts()) {
    if (part.type === "file") {
      let bytes = 0;
      for await (const chunk of part.file) bytes += chunk.length;
      input.files.push({
        field: part.fieldname,
        filename: part.filename,
        mimetype: part.mimetype,
        bytes,
      });
    } else {
      const value = String(part.value);
      const previous = input.fields[part.fieldname];
      input.fields[part.fieldname] =
        previous === undefined ? value : [...[previous].flat(), value];
    }
  }
  return input;
}

export function fieldValue(input: MultipartInput, name: string) {
  const value = input.fields[name];
  return Array.isArray(value) ? value.at(-1) : value;
}

export function countFiles(input: MultipartInput, names: string[]) {
  return input.files.filter((file) => names.includes(file.field)).length;
}
