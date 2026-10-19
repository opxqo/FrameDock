import { Alert, Button, Empty, Select, Table, Tag } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { type AuditReport, fetchJobAudit, resubmitJob } from "@/services/api/jobs";
import { matchYfaiLedger, type YfaiUsageRow } from "@/lib/yfai-account";
import { fetchYfaiUsage, listYfaiJobs } from "@/services/api/yfai";
import { useConfigStore } from "@/stores/use-config-store";

// FrameDock: "did everything we paid for end up on the canvas?" Server tasks are cross-checked with their stored
// files and with the provider, and the YFAI account ledger is matched against the tasks we know about.

type Ledger = { paidCalls: number; paidCredits: number; matched: number; unmatched: Array<{ requestId: string; model: string; credits: number; at: string }>; unmatchedCredits: number };

export function ConfigJobAudit() {
    const { t } = useTranslation();
    const config = useConfigStore((state) => state.config);
    const [days, setDays] = useState(7);
    const [busy, setBusy] = useState(false);
    const [report, setReport] = useState<AuditReport>();
    const [ledger, setLedger] = useState<Ledger | { error: string }>();
    const [error, setError] = useState("");

    const run = async () => {
        setBusy(true);
        setError("");
        setLedger(undefined);
        try {
            setReport(await fetchJobAudit(days));
            const key = config.apiKey;
            const yfaiKey = config.channels?.find((channel) => channel.id === "yfai" || /token6688/.test(channel.baseUrl))?.apiKey || (/token6688/.test(config.baseUrl) ? key : "");
            if (yfaiKey) {
                try {
                    // The ledger names a call by delivery_provenance.request_id (notes.ledgerId); older tasks match by model and time.
                    const usage: YfaiUsageRow[] = [];
                    let cursor = "";
                    for (let page = 0; page < 5; page++) {
                        const result = await fetchYfaiUsage(yfaiKey, { days, cursor, type: "usage" });
                        usage.push(...result.rows.filter((row) => row.requestId));
                        cursor = result.nextCursor;
                        if (!cursor) break;
                    }
                    const matches = matchYfaiLedger(usage, await listYfaiJobs(yfaiKey, 500));
                    const rows = usage.map((row) => ({ requestId: row.requestId, model: row.model, credits: Math.abs(row.credits), at: row.at }));
                    const unmatched = rows.filter((row) => !matches.has(row.requestId));
                    setLedger({ paidCalls: rows.length, paidCredits: rows.reduce((sum, row) => sum + row.credits, 0), matched: rows.length - unmatched.length, unmatched, unmatchedCredits: unmatched.reduce((sum, row) => sum + row.credits, 0) });
                } catch (ledgerError) {
                    setLedger({ error: ledgerError instanceof Error ? ledgerError.message : String(ledgerError) });
                }
            }
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : String(reason));
        } finally {
            setBusy(false);
        }
    };

    const resume = async (jobId: string) => {
        await resubmitJob(jobId).catch((reason) => setError(reason instanceof Error ? reason.message : String(reason)));
        await run();
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <Select value={days} onChange={setDays} options={[1, 3, 7, 30].map((value) => ({ value, label: t("jobAudit.days", { count: value }) }))} className="w-32" />
                <Button type="primary" loading={busy} onClick={() => void run()}>
                    {t("jobAudit.run")}
                </Button>
                <span className="text-xs text-stone-500">{t("jobAudit.description")}</span>
            </div>
            {error ? <Alert type="error" message={error} showIcon /> : null}
            {report ? (
                <>
                    <div className="flex flex-wrap gap-2 text-sm">
                        <Tag>{t("jobAudit.total", { count: report.summary.total })}</Tag>
                        <Tag color="green">{t("jobAudit.succeeded", { count: report.summary.succeeded ?? 0 })}</Tag>
                        <Tag color="red">{t("jobAudit.failed", { count: report.summary.failed ?? 0 })}</Tag>
                        <Tag color={report.findings.length ? "orange" : "green"}>{t("jobAudit.findings", { count: report.findings.length })}</Tag>
                    </div>
                    {report.findings.length ? (
                        <Table
                            size="small"
                            rowKey="jobId"
                            pagination={false}
                            dataSource={report.findings}
                            columns={[
                                { title: t("jobAudit.problem"), dataIndex: "code", width: 150, render: (code: string) => <Tag color={code === "provider_done" || code === "undelivered" ? "blue" : "orange"}>{t(`jobAudit.codes.${code}`)}</Tag> },
                                { title: t("jobAudit.model"), dataIndex: "model", ellipsis: true },
                                { title: t("jobAudit.ids"), render: (_: unknown, row) => <span className="font-mono text-xs break-all">{[row.remoteTaskId, row.requestId].filter(Boolean).join(" · ") || row.jobId.slice(0, 8)}</span> },
                                { title: t("jobAudit.detail"), dataIndex: "message", ellipsis: true },
                                { title: "", width: 110, render: (_: unknown, row) => (row.code === "provider_done" || row.code === "unknown" ? <Button size="small" onClick={() => void resume(row.jobId)}>{t("jobAudit.resume")}</Button> : null) },
                            ]}
                        />
                    ) : (
                        <Empty description={t("jobAudit.clean")} />
                    )}
                </>
            ) : null}
            {ledger && "error" in ledger ? <Alert type="warning" showIcon message={t("jobAudit.ledgerFailed", { error: ledger.error })} /> : null}
            {ledger && !("error" in ledger) ? (
                <Alert
                    type={ledger.unmatched.length ? "warning" : "success"}
                    showIcon
                    message={t("jobAudit.ledger", { calls: ledger.paidCalls, credits: ledger.paidCredits.toFixed(2), matched: ledger.matched })}
                    description={ledger.unmatched.length ? t("jobAudit.ledgerUnmatched", { count: ledger.unmatched.length, credits: ledger.unmatchedCredits.toFixed(2) }) : undefined}
                />
            ) : null}
        </div>
    );
}
