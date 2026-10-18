import assert from "node:assert/strict";
import { test } from "node:test";
import {
  captureBody,
  inferProvider,
  maskSecret,
  redactHeaders,
  redactJson,
  redactText,
  redactUrl,
} from "./redact";

const KEY = "sk-live-ABCDEFGHIJKLMNOP1234";

test("maskSecret keeps only the last 4 characters", () => {
  assert.equal(maskSecret(KEY), "[redacted …1234]");
  assert.equal(maskSecret("short"), "[redacted]");
});

test("redactHeaders hides credentials, keeps the rest, drops framedock context", () => {
  const out = redactHeaders({
    Authorization: `Bearer ${KEY}`,
    "X-Goog-Api-Key": KEY,
    "x-custom-token": "tok_123456789",
    Cookie: "sid=abcdefghijk",
    "Content-Type": "application/json",
    "x-framedock-ctx": "%7B%7D",
  });
  assert.equal(out.authorization, "Bearer [redacted …1234]");
  assert.equal(out["x-goog-api-key"], "[redacted …1234]");
  assert.match(out["x-custom-token"] ?? "", /^\[redacted/);
  assert.match(out.cookie ?? "", /^\[redacted/);
  assert.equal(out["content-type"], "application/json");
  assert.equal("x-framedock-ctx" in out, false);
  assert.ok(!JSON.stringify(out).includes(KEY));
});

test("redactUrl blanks secret query values but keeps names and other params", () => {
  const out = redactUrl(
    `https://x.test/v1/models?alt=sse&key=${KEY}&token=abcdefghijkl#frag`,
  );
  assert.ok(!out.includes(KEY));
  assert.ok(!out.includes("abcdefghijkl"));
  assert.match(out, /alt=sse/);
  assert.match(out, /key=/);
  assert.ok(out.endsWith("#frag"));
  assert.equal(redactUrl("https://x.test/plain"), "https://x.test/plain");
});

test("redactJson masks secret fields and summarises base64", () => {
  const png = "A".repeat(4000);
  const out = redactJson({
    model: "m",
    apiKey: KEY,
    nested: { Authorization: `Bearer ${KEY}`, ok: 1 },
    image: `data:image/png;base64,${png}`,
    b64_json: png,
    list: [{ password: "hunter2hunter2" }],
    text: "hello",
  }) as Record<string, unknown>;
  const text = JSON.stringify(out);
  assert.ok(!text.includes(KEY));
  assert.ok(!text.includes(png));
  assert.ok(!text.includes("hunter2"));
  assert.match(
    String(out.image),
    /^<base64 image\/png \d+ bytes sha256:[0-9a-f]{8}>$/,
  );
  assert.match(String(out.b64_json), /^<base64 \d+ bytes sha256:[0-9a-f]{8}>$/);
  assert.equal(out.text, "hello");
  assert.equal(out.model, "m");
});

test("redactText handles SSE, bearer tokens and long base64 runs", () => {
  const blob = "Zm9v".repeat(1000);
  const out = redactText(
    `data: {"b":"${blob}"}\nAuthorization: Bearer ${KEY}\nurl?api_key=${KEY}&x=1`,
  );
  assert.ok(!out.includes(blob));
  assert.ok(!out.includes(KEY));
  assert.match(out, /x=1/);
});

test("captureBody: JSON is redacted and truncated, media is never stored", () => {
  const big = JSON.stringify({
    items: Array.from({ length: 5000 }, (_, i) => `row-${i}`),
    apiKey: KEY,
  });
  const json = captureBody(Buffer.from(big), "application/json", {
    maxStore: 1000,
    maxParse: 1 << 20,
  });
  assert.ok(json);
  assert.equal(json.truncated, true);
  assert.ok(json.text.length < 1200);
  assert.ok(!json.text.includes(KEY));

  const video = captureBody(Buffer.alloc(5000, 1), "video/mp4");
  assert.equal(video?.text, "<binary video/mp4 5000 bytes>");

  const huge = captureBody(Buffer.alloc(200, 120), "application/json", {
    maxStore: 100,
    maxParse: 100,
  });
  assert.match(huge?.text ?? "", /too large to capture/);

  assert.equal(captureBody(undefined, "application/json"), null);
  assert.equal(captureBody(Buffer.alloc(0), "application/json"), null);
});

test("captureBody summarises multipart without file content", () => {
  const boundary = "----b123";
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="prompt"\r\n\r\nhello cat\r\n`,
    ),
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="a.png"\r\nContent-Type: image/png\r\n\r\n`,
    ),
    Buffer.alloc(3000, 7),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const out = captureBody(body, `multipart/form-data; boundary=${boundary}`);
  assert.ok(out);
  const parsed = JSON.parse(out.text) as {
    multipart: Array<Record<string, unknown>>;
  };
  assert.equal(parsed.multipart.length, 2);
  assert.equal(parsed.multipart[0]?.value, "hello cat");
  assert.equal(parsed.multipart[1]?.filename, "a.png");
  assert.equal(parsed.multipart[1]?.size, 3000);
  assert.equal("value" in (parsed.multipart[1] ?? {}), false);
});

test("inferProvider recognises the supported providers", () => {
  assert.equal(
    inferProvider("api.autodl.art", "/api/v1/kling/v1/videos"),
    "kling",
  );
  assert.equal(inferProvider("api.autodl.art", "/api/v1/ark/v3/x"), "ark");
  assert.equal(
    inferProvider("api.autodl.art", "/api/v1/chat/completions"),
    "autodl",
  );
  assert.equal(
    inferProvider("generativelanguage.googleapis.com", "/v1beta"),
    "gemini",
  );
  assert.equal(inferProvider("yf.token6688.com", "/v1/tasks/1"), "yfai");
  assert.equal(
    inferProvider("127.0.0.1:8787", "/v1/images/generations"),
    "mock",
  );
  assert.equal(inferProvider("example.com", "/"), "other");
});
