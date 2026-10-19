// FrameDock: pure helpers for the YFAI account panel (balance, the account ledger, parameter receipts).
// Field meanings follow the YFAI docs: GET /v1/skills/balance, GET /v1/skills/usage and `param_adjustments`.

import { parseYfaiAvailableCredits } from "@/lib/yfai-balance";

/** ⚡ figures from the `credits` block — the numbers the YFAI website shows. */
export type YfaiBalance = { available?: number; frozen?: number; total?: number };

export function parseYfaiBalance(payload: unknown): YfaiBalance {
    const credits = (payload as { credits?: Record<string, unknown> } | undefined)?.credits;
    const number = (value: unknown) => (value === undefined || value === null || !Number.isFinite(Number(value)) ? undefined : Number(value));
    return { available: parseYfaiAvailableCredits(payload), frozen: number(credits?.frozen), total: number(credits?.balance) };
}

/** Record types in the account ledger; anything else is shown by its raw name. */
export const YFAI_USAGE_TYPES = ["usage", "refund", "unfreeze", "freeze", "checkin_bonus", "subscription"] as const;

/** One ledger row. `credits` keeps its sign: negative left the account, positive came back. */
export type YfaiUsageRow = { requestId: string; type: string; model: string; channel: string; feature: string; credits: number; at: string };

export function parseYfaiUsagePage(payload: unknown): { rows: YfaiUsageRow[]; nextCursor: string } {
    const record = (payload ?? {}) as { data?: unknown; next_cursor?: unknown };
    const items = Array.isArray(record.data) ? record.data : [];
    const rows = items.flatMap((item): YfaiUsageRow[] => {
        if (!item || typeof item !== "object") return [];
        const row = item as { request_id?: unknown; type?: unknown; model?: unknown; channel?: unknown; feature?: unknown; created_at?: unknown; cost?: { credits?: unknown } };
        const credits = Number(row.cost?.credits);
        return [{ requestId: String(row.request_id ?? ""), type: String(row.type ?? ""), model: String(row.model ?? ""), channel: String(row.channel ?? ""), feature: String(row.feature ?? ""), credits: Number.isFinite(credits) ? credits : 0, at: String(row.created_at ?? "") }];
    });
    return { rows, nextCursor: typeof record.next_cursor === "string" ? record.next_cursor : "" };
}

/**
 * Totals the way the docs prescribe: model spending is only usage + refund + unfreeze (a sign-in bonus is not
 * "spending less", a storage subscription is not a model cost, and a pending freeze is not final).
 * `modelSpent` is positive ⚡.
 */
export function summarizeYfaiUsage(rows: YfaiUsageRow[]) {
    const sum = (types: string[]) => rows.filter((row) => types.includes(row.type)).reduce((total, row) => total + row.credits, 0);
    return {
        modelSpent: -sum(["usage", "refund", "unfreeze"]),
        charged: -sum(["usage"]),
        returned: sum(["refund", "unfreeze"]),
        pending: -sum(["freeze"]),
        calls: rows.filter((row) => row.type === "usage").length,
    };
}

/** Job model ids carry the channel prefix (`yfai::mj_imagine`); the ledger uses the bare name. */
export const bareYfaiModel = (model: string) => model.replace(/^yfai::/, "");

export type YfaiParamAdjustment = { param: string; requested: unknown; applied: unknown; reason: string };

const show = (value: unknown) => (value === null || value === undefined || value === "" ? "—" : typeof value === "object" ? JSON.stringify(value) : String(value));

/** "aspect_ratio: 21:9 → 16:9". The reason is translated by the caller (`yfaiPanel.reasons.<reason>`). */
export function formatParamAdjustment(item: YfaiParamAdjustment) {
    return `${item.param}: ${show(item.requested)} → ${show(item.applied)}`;
}

/**
 * Billing facts of a finished YFAI task (GET /v1/tasks/{id}): the ledger's id for the call is
 * `delivery_provenance.request_id` — not the X-Request-Id response header — plus the actual ⚡ cost and the lane.
 * Same reading as the server adapter (apps/server/src/jobs/adapters/yfai.ts yfaiTaskBilling).
 */
export function yfaiTaskBilling(task: unknown): { ledgerId?: string; cost?: number; lane?: string } {
    if (!task || typeof task !== "object") return {};
    const record = task as { delivery_provenance?: { request_id?: unknown }; billing?: { actual_cost_credits?: unknown }; channel_id?: unknown };
    const notes: { ledgerId?: string; cost?: number; lane?: string } = {};
    if (typeof record.delivery_provenance?.request_id === "string" && record.delivery_provenance.request_id) notes.ledgerId = record.delivery_provenance.request_id;
    const cost = Number(record.billing?.actual_cost_credits);
    if (record.billing?.actual_cost_credits !== undefined && Number.isFinite(cost)) notes.cost = cost;
    if (typeof record.channel_id === "string" && record.channel_id) notes.lane = record.channel_id;
    return notes;
}

/** Ledger rows are written when a task settles, within moments of the job finishing. */
const SETTLE_WINDOW_MS = 3 * 60_000;

type LedgerJob = { id: string; model: string; createdAt: number; finishedAt: number | null; updatedAt: number; notes: { ledgerId?: string } | null };

/**
 * Pairs paid ledger rows (`usage`) with the jobs that made them: exactly by the recorded ledger id, otherwise by
 * the same model settling within three minutes of the job finishing (each job used once, nearest first).
 * Returns ledger request id → { jobId, exact }.
 */
export function matchYfaiLedger(rows: YfaiUsageRow[], jobs: LedgerJob[]) {
    const matches = new Map<string, { jobId: string; exact: boolean }>();
    const used = new Set<string>();
    const byLedger = new Map(jobs.filter((job) => job.notes?.ledgerId).map((job) => [job.notes!.ledgerId!, job]));
    const paid = rows.filter((row) => row.type === "usage" && row.requestId);
    for (const row of paid) {
        const job = byLedger.get(row.requestId);
        if (!job) continue;
        matches.set(row.requestId, { jobId: job.id, exact: true });
        used.add(job.id);
    }
    // Jobs that already know their (different) ledger id cannot be another row's job.
    const open = jobs.filter((job) => !job.notes?.ledgerId && !used.has(job.id));
    for (const row of paid) {
        if (matches.has(row.requestId)) continue;
        const at = Date.parse(row.at);
        if (!Number.isFinite(at)) continue;
        let best: { job: LedgerJob; distance: number } | undefined;
        for (const job of open) {
            if (used.has(job.id) || bareYfaiModel(job.model) !== row.model) continue;
            const distance = Math.abs(at - (job.finishedAt ?? job.updatedAt));
            if (distance <= SETTLE_WINDOW_MS && (!best || distance < best.distance)) best = { job, distance };
        }
        if (best) {
            matches.set(row.requestId, { jobId: best.job.id, exact: false });
            used.add(best.job.id);
        }
    }
    return matches;
}
