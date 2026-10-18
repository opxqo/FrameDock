// FrameDock: checks the YFAI integration against the live service, using only free endpoints (nothing is
// submitted, frozen or billed):
//   1. the API key works and what the balance is,
//   2. our bundled model catalog (apps/web/src/lib/yfai-models.json) against the live one — models added or removed,
//      prompt limits and parameter ranges that changed,
//   3. a dry run (POST /api/v1/model-runtime/dry-run, ¥0) of every available model with its default parameters, which
//      validates the parameters and the routing exactly as a real submit would.
//
//   YFAI_API_KEY=... bun scripts/verify-yfai.ts        # or: bun scripts/verify-yfai.ts --from-app
// --from-app reads the key from the running FrameDock server's saved settings. The key is never printed.
import { parseYfaiAvailableCredits } from "../apps/web/src/lib/yfai-balance";
import {
  YFAI_BASE_URL,
  YFAI_MODELS,
  type YfaiModel,
  yfaiDefaults,
} from "../apps/web/src/lib/yfai-catalog";

const ORIGIN = YFAI_BASE_URL.replace(/\/v1$/, "");

async function keyFromApp() {
  const server = process.env.FRAMEDOCK_URL ?? "http://127.0.0.1:8787";
  const response = await fetch(
    `${server}/api/kv/local_storage/${encodeURIComponent("infinite-canvas:ai_config_store")}`,
  );
  if (!response.ok)
    throw new Error(
      `Cannot read the app settings from ${server} (${response.status})`,
    );
  const stored = JSON.parse(
    ((await response.json()) as { value: string }).value,
  ) as {
    state?: {
      config?: {
        apiKey?: string;
        baseUrl?: string;
        channels?: Array<{ baseUrl?: string; apiKey?: string }>;
      };
    };
  };
  const config = stored.state?.config;
  const channel = config?.channels?.find(
    (item) => /token6688/.test(item.baseUrl ?? "") && item.apiKey,
  );
  return (
    channel?.apiKey ||
    (/token6688/.test(config?.baseUrl ?? "") ? config?.apiKey : "") ||
    ""
  );
}

const apiKey = process.argv.includes("--from-app")
  ? await keyFromApp()
  : (process.env.YFAI_API_KEY ?? "");
if (!apiKey) {
  console.error("No API key: set YFAI_API_KEY or pass --from-app.");
  process.exit(2);
}

const headers = {
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
};
const problems: string[] = [];
const notes: string[] = [];
const fail = (message: string) => problems.push(message);

async function call(path: string, init?: RequestInit) {
  const response = await fetch(`${ORIGIN}${path}`, {
    ...init,
    headers: { ...headers, ...init?.headers },
  });
  const text = await response.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return {
    status: response.status,
    json: json as Record<string, any> | undefined,
    text,
    requestId: response.headers.get("x-request-id"),
  };
}

// 1. key and balance
const models = await call("/v1/models");
if (models.status !== 200)
  fail(
    `API key check failed: GET /v1/models → ${models.status} ${models.text.slice(0, 120)}`,
  );
else notes.push("API key: valid");
const balance = await call("/v1/skills/balance");
const available = parseYfaiAvailableCredits(balance.json);
if (balance.status === 200 && available !== undefined)
  notes.push(
    `Balance: ⚡${available} available (⚡${balance.json?.credits?.frozen} held by running tasks)`,
  );
else
  fail(
    `Balance unreadable (the app's balance check would be skipped): status ${balance.status}, body ${balance.text.slice(0, 160)}`,
  );

// 2. catalog drift
const live = await call("/v1/logical-models");
const liveModels = ((live.json?.models ?? []) as YfaiModel[]).filter(
  (model) => model.id && model.param_schema,
);
if (live.status !== 200 || !liveModels.length)
  fail(`Live catalog unreadable: ${live.status}`);
else {
  const bundled = new Map(YFAI_MODELS.map((model) => [model.id, model]));
  const current = new Map(liveModels.map((model) => [model.id, model]));
  const added = [...current.keys()].filter((id) => !bundled.has(id));
  const removed = [...bundled.keys()].filter((id) => !current.has(id));
  notes.push(
    `Catalog: ${bundled.size} bundled, ${current.size} live, ${added.length} new, ${removed.length} gone`,
  );
  if (added.length)
    notes.push(
      `  new: ${added.slice(0, 12).join(", ")}${added.length > 12 ? " …" : ""}`,
    );
  if (removed.length)
    fail(
      `Models in the bundled catalog that no longer exist: ${removed.join(", ")}`,
    );
  for (const [id, model] of bundled) {
    const next = current.get(id);
    if (!next) continue;
    if (model.max_prompt_chars !== next.max_prompt_chars)
      fail(
        `${id}: prompt limit changed ${model.max_prompt_chars} → ${next.max_prompt_chars}`,
      );
    for (const [name, spec] of Object.entries(model.param_schema)) {
      const nextSpec = next.param_schema[name];
      if (!nextSpec) fail(`${id}: parameter "${name}" no longer exists`);
      else if (
        JSON.stringify(spec.enum) !== JSON.stringify(nextSpec.enum) ||
        spec.min !== nextSpec.min ||
        spec.max !== nextSpec.max
      )
        notes.push(`  ${id}.${name}: allowed values changed`);
    }
  }
}

// 3. dry run of every available model
const targets = liveModels.filter(
  (model) =>
    model.available !== false &&
    !model.deprecated &&
    ["image", "video", "audio"].includes(model.category),
);
let ok = 0;
let needsInput = 0;
let noDryRun = 0;
const queue = [...targets];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    for (let model = queue.shift(); model; model = queue.shift()) {
      const response = await call("/api/v1/model-runtime/dry-run", {
        method: "POST",
        body: JSON.stringify({
          model_id: model.id,
          modality: model.category,
          params: { ...yfaiDefaults(model), prompt: "dry run" },
        }),
      });
      if (response.status === 200) ok += 1;
      // Many models need a reference image or video to accept a request; that is the model asking for input, not a broken integration.
      else if (
        response.status === 400 &&
        /image|video|audio|attachment|reference|required|source/i.test(
          response.text,
        )
      )
        needsInput += 1;
      // A model whose required inputs are files cannot route without them; the service answers 503 "all vendors failed".
      else if (
        response.status === 503 &&
        Object.values(model.param_schema).some(
          (spec) => spec.type === "upload" && spec.required,
        )
      )
        needsInput += 1;
      // 501: this model's route cannot be simulated (it would really call the vendor), so the service refuses instead of guessing.
      else if (response.status === 501) noDryRun += 1;
      else
        fail(
          `Dry run ${model.id}: ${response.status} ${(response.json?.error?.message ?? response.text).toString().slice(0, 140)} (request ${response.requestId})`,
        );
    }
  }),
);
notes.push(
  `Dry run: ${ok} of ${targets.length} models accepted their defaults, ${needsInput} need a reference file first, ${noDryRun} cannot be dry-run`,
);

console.log(notes.join("\n"));
if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log("\nAll checks passed.");
