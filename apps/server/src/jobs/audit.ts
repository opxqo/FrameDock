import { access } from "node:fs/promises";
import { join } from "node:path";
import { desc, gte } from "drizzle-orm";
import { config } from "../config";
import type { openDatabase } from "../db";
import type { JobEngine } from "./engine";
import { jobs } from "./schema";
import type { JobFile, JobRow } from "./types";

type Database = ReturnType<typeof openDatabase>["db"];

// FrameDock job audit: "did every task we started end up somewhere?" It cross-checks the job table, the stored
// result files, and (for tasks still open) the provider itself, and lists what does not add up.

export type AuditCode =
  | "undelivered" // finished, result stored, but no page ever took it
  | "missing_file" // marked succeeded, but the result file is not on disk
  | "provider_done" // still open here, but the provider says it already finished (resume to fetch it)
  | "stalled" // running far longer than the provider's slowest tasks
  | "unknown"; // submit/poll outcome unclear; needs a human decision

export type AuditFinding = {
  code: AuditCode;
  jobId: string;
  kind: string;
  model: string;
  nodeId: string | null;
  projectId: string | null;
  remoteTaskId: string | null;
  requestId: string | null;
  message: string;
  /** What the provider answered when asked about this task (open jobs only). */
  providerStatus?: "running" | "succeeded" | "failed" | "unreachable";
  at: number;
};

export type AuditReport = {
  since: number;
  summary: Record<string, number> & { total: number };
  findings: AuditFinding[];
};

const STALLED_AFTER_MS = 90 * 60_000;

async function fileExists(dataDir: string, file: JobFile) {
  try {
    await access(
      join(dataDir, "blobs", file.store, encodeURIComponent(file.key)),
    );
    return true;
  } catch {
    return false;
  }
}

function describe(row: JobRow, code: AuditCode, message: string): AuditFinding {
  return {
    code,
    jobId: row.id,
    kind: row.kind,
    model: row.model,
    nodeId: row.node_id,
    projectId: row.project_id,
    remoteTaskId: row.remote_task_id,
    requestId: row.request_id,
    message,
    at: row.updated_at,
  };
}

export async function auditJobs(
  db: Database,
  engine: JobEngine,
  days = 7,
  dataDir = config.dataDir,
): Promise<AuditReport> {
  const since = Date.now() - days * 24 * 3600_000;
  const rows = db
    .select()
    .from(jobs)
    .where(gte(jobs.created_at, since))
    .orderBy(desc(jobs.created_at))
    .limit(500)
    .all();

  const summary: AuditReport["summary"] = { total: rows.length };
  const findings: AuditFinding[] = [];
  for (const row of rows) summary[row.state] = (summary[row.state] ?? 0) + 1;

  for (const row of rows) {
    if (row.state === "succeeded") {
      const result = row.result as (JobFile & { files?: JobFile[] }) | null;
      const files = result?.files ?? (result ? [result] : []);
      const present = await Promise.all(
        files.map((file) => fileExists(dataDir, file)),
      );
      if (!files.length || present.includes(false)) {
        findings.push(
          describe(
            row,
            "missing_file",
            "The job succeeded but a result file is missing on the server.",
          ),
        );
      } else if (!row.delivered_at && row.kind !== "video") {
        findings.push(
          describe(
            row,
            "undelivered",
            "Generated and stored, but no page has taken it yet.",
          ),
        );
      }
    } else if (row.state === "running" || row.state === "unknown") {
      const finding = describe(
        row,
        row.state === "unknown" ? "unknown" : "stalled",
        row.error ?? "",
      );
      const providerStatus = await engine.checkProvider(row.id);
      finding.providerStatus = providerStatus;
      if (providerStatus === "succeeded") {
        finding.code = "provider_done";
        finding.message =
          "The provider has already finished this task; resume it to fetch the result.";
        findings.push(finding);
      } else if (row.state === "unknown") {
        finding.message ||= "The outcome of this task is unclear.";
        findings.push(finding);
      } else if (Date.now() - row.created_at > STALLED_AFTER_MS) {
        finding.message = "Still running after more than 90 minutes.";
        findings.push(finding);
      }
    }
  }
  for (const finding of findings) {
    summary[finding.code] = (summary[finding.code] ?? 0) + 1;
  }
  return { since, summary, findings };
}
