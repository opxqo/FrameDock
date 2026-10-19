import { expect, test } from "bun:test";
import { bareYfaiModel, formatParamAdjustment, parseYfaiBalance, parseYfaiUsagePage, matchYfaiLedger, summarizeYfaiUsage, yfaiTaskBilling } from "../src/lib/yfai-account";

// The ledger sample from the YFAI docs (GET /v1/skills/usage), plus a refund, a failure return and a pending hold.
const page = {
    data: [
        { request_id: "a", created_at: "2026-09-29T08:59:39Z", type: "usage", model: "seedance-2-0-promo", channel: "ZQI", cost: { credits: -3.000298, usd: -0.416708 } },
        { request_id: "b", created_at: "2026-09-24T03:55:20Z", type: "subscription", feature: "storage_subscription", cost: { credits: -9.9 } },
        { created_at: "2026-09-23T02:34:53Z", type: "checkin_bonus", cost: { credits: 1.000001 } },
        { request_id: "c", type: "usage", model: "mj_imagine", cost: { credits: -1 } },
        { request_id: "c", type: "refund", model: "mj_imagine", cost: { credits: 0.5 } },
        { request_id: "d", type: "unfreeze", model: "kling-v3", cost: { credits: 2 } },
        { request_id: "e", type: "freeze", model: "kling-v3", cost: { credits: -4 } },
    ],
    next_cursor: "MTc5",
};

test("ledger rows keep their sign and the next cursor", () => {
    const { rows, nextCursor } = parseYfaiUsagePage(page);
    expect(nextCursor).toBe("MTc5");
    expect(rows).toHaveLength(7);
    expect(rows[0]).toEqual({ requestId: "a", type: "usage", model: "seedance-2-0-promo", channel: "ZQI", feature: "", credits: -3.000298, at: "2026-09-29T08:59:39Z" });
    expect(rows[2]?.requestId).toBe("");
    expect(parseYfaiUsagePage({ data: [] }).nextCursor).toBe("");
});

test("model spending counts usage, refund and unfreeze only — not a bonus, a subscription or a pending hold", () => {
    const summary = summarizeYfaiUsage(parseYfaiUsagePage(page).rows);
    expect(summary.modelSpent).toBeCloseTo(3.000298 + 1 - 0.5 - 2, 6);
    expect(summary.charged).toBeCloseTo(4.000298, 6);
    expect(summary.returned).toBeCloseTo(2.5, 6);
    expect(summary.pending).toBeCloseTo(4, 6);
    expect(summary.calls).toBe(2);
});

test("balance reads the ⚡ credits block", () => {
    expect(parseYfaiBalance({ balance: "$12.3", credits: { balance: 88.888882, frozen: 3.6, available: 85.288882 } })).toEqual({ total: 88.888882, frozen: 3.6, available: 85.288882 });
    expect(parseYfaiBalance({})).toEqual({ total: undefined, frozen: undefined, available: undefined });
});

test("parameter receipts read as requested → applied", () => {
    expect(formatParamAdjustment({ param: "aspect_ratio", requested: "21:9", applied: "16:9", reason: "nearest_supported" })).toBe("aspect_ratio: 21:9 → 16:9");
    expect(formatParamAdjustment({ param: "quality", requested: null, applied: "快速", reason: "card_default" })).toBe("quality: — → 快速");
    expect(bareYfaiModel("yfai::mj_imagine")).toBe("mj_imagine");
});

test("a finished task names its ledger id in delivery_provenance, not in the X-Request-Id header", () => {
    // Shape of a live GET /v1/tasks/{id} (trimmed): the ledger row for this call has request_id e1837e79-….
    const task = { id: "task-1", status: "completed", is_final: true, channel_id: "mj_imagine@BB6:default", billing: { actual_cost_credits: 0.53285 }, delivery_provenance: { client_request_id: "job-1", request_id: "e1837e79-9572-4070-a6da-6e5676a8b3d3" } };
    expect(yfaiTaskBilling(task)).toEqual({ ledgerId: "e1837e79-9572-4070-a6da-6e5676a8b3d3", cost: 0.53285, lane: "mj_imagine@BB6:default" });
    expect(yfaiTaskBilling({ status: "failed", is_final: true })).toEqual({});
});

test("ledger rows match jobs by recorded ledger id, else by model and settle time, one job each", () => {
    const minute = 60_000;
    const t0 = Date.parse("2026-10-18T16:00:00Z");
    const row = (requestId: string, model: string, at: number) => ({ requestId, type: "usage", model, channel: "", feature: "", credits: -1, at: new Date(at).toISOString() });
    const job = (id: string, model: string, finishedAt: number, ledgerId?: string) => ({ id, model, createdAt: finishedAt - 3 * minute, finishedAt, updatedAt: finishedAt, notes: ledgerId === undefined ? null : { ledgerId } });
    const rows = [row("L1", "mj_imagine", t0), row("L2", "mj_imagine", t0 + 10 * minute), row("L3", "mj_imagine", t0 + 10 * minute + 30_000), row("L4", "kling-v3", t0)];
    const jobs = [job("exact", "yfai::mj_imagine", t0 + 9 * minute, "L1"), job("near", "mj_imagine", t0 + 10 * minute + 20_000, ""), job("far", "mj_imagine", t0 + 20 * minute, "")];
    const matches = matchYfaiLedger(rows, jobs);
    expect(matches.get("L1")).toEqual({ jobId: "exact", exact: true });
    // "near" is closest to L3 in time but L2 is matched first; each job pays for one row only.
    expect(matches.get("L2")).toEqual({ jobId: "near", exact: false });
    expect(matches.has("L3")).toBe(false);
    expect(matches.has("L4")).toBe(false);
});
