// Production entry: build whatever is missing, then run the single server process (API + web app).
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const needed = [
  join(root, "apps/server/dist/index.js"),
  join(root, "apps/web/dist/index.html"),
];

function run(args) {
  const result = spawnSync("pnpm", args, { cwd: root, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (needed.some((file) => !existsSync(file))) {
  console.log("Build output missing, running `pnpm build` first.");
  run(["build"]);
}
run(["--filter", "@framedock/server", "start"]);
