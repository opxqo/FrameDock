import { Alert, Button, Select, Table, Tag, Tooltip } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { RefreshCw } from "@/components/icons";
import { matchYfaiLedger, summarizeYfaiUsage, type YfaiUsageRow } from "@/lib/yfai-account";
import { yfaiModels } from "@/lib/yfai-catalog";
import { useConfigStore } from "@/stores/use-config-store";
import type { Job } from "@/services/api/jobs";
import { fetchYfaiUsage, listYfaiJobs } from "@/services/api/yfai";

// FrameDock: the YFAI account ledger (same records as the website's 消费记录), each paid call matched against the
// local task that made it. Amounts keep their sign; totals follow the docs (see summarizeYfaiUsage).

export function ConfigYfaiUsage({ apiKey, onAudit }: { apiKey: string; /** Opens the task audit, where unmatched charges are explained. */ onAudit: () => void }) {
    const { t, i18n } = useTranslation();
    const [days, setDays] = useState(7);
    const [rows, setRows] = useState<YfaiUsageRow[]>([]);
    const [cursor, setCursor] = useState("");
    const [jobs, setJobs] = useState<Job[]>([]);
    const [busy, setBusy] = useState(false);
    const catalog = useConfigStore((state) => state.config.yfaiModels);
    const [error, setError] = useState("");

    const load = useCallback(
        async (next?: string) => {
            setBusy(true);
            setError("");
            try {
                const [page, jobs] = await Promise.all([fetchYfaiUsage(apiKey, { days, cursor: next }), next ? Promise.resolve(null) : listYfaiJobs(apiKey, 500)]);
                if (jobs) setJobs(jobs);
                setRows((current) => (next ? [...current, ...page.rows] : page.rows));
                setCursor(page.nextCursor);
            } catch (reason) {
                setError(reason instanceof Error ? reason.message : String(reason));
            } finally {
                setBusy(false);
            }
        },
        [apiKey, days],
    );

    useEffect(() => {
        void load();
    }, [load]);

    const summary = summarizeYfaiUsage(rows);
    // Chat calls are answered directly, not run as background tasks, so they never have a local task.
    const chat = new Set(yfaiModels(catalog).filter((model) => model.category === "chat").flatMap((model) => [model.id, model.public_id ?? ""]));
    const matches = useMemo(() => matchYfaiLedger(rows, jobs), [rows, jobs]);
    const unmatched = rows.filter((row) => row.type === "usage" && row.requestId && !chat.has(row.model) && !matches.has(row.requestId)).length;
    const time = new Intl.DateTimeFormat(i18n.resolvedLanguage, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    const typeLabel = (type: string) => t(`yfaiPanel.usage.types.${type}`, { defaultValue: type || "—" });

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
                <Select size="small" value={days} onChange={setDays} options={[1, 3, 7, 30].map((value) => ({ value, label: t("jobAudit.days", { count: value }) }))} className="w-28" />
                <span className="text-xs text-stone-500">{t("yfaiPanel.usage.description")}</span>
                <Button size="small" className="!ml-auto" icon={<RefreshCw className="size-3.5" />} loading={busy} onClick={() => void load()}>
                    {t("yfaiPanel.refresh")}
                </Button>
            </div>
            {error ? <Alert type="error" showIcon message={error} /> : null}
            {rows.length ? (
                <Alert
                    type={unmatched ? "warning" : "info"}
                    showIcon
                    message={t("yfaiPanel.usage.summary", { rows: rows.length, spent: summary.modelSpent.toFixed(2), calls: summary.calls, returned: summary.returned.toFixed(2), pending: summary.pending.toFixed(2) })}
                    description={
                        unmatched ? (
                            <span>
                                {t("yfaiPanel.usage.unmatched", { count: unmatched })}{" "}
                                <Button size="small" type="link" className="!px-0" onClick={onAudit}>
                                    {t("yfaiPanel.usage.openAudit")}
                                </Button>
                            </span>
                        ) : undefined
                    }
                />
            ) : null}
            <Table<YfaiUsageRow>
                size="small"
                rowKey={(row, index) => `${row.requestId}-${row.type}-${row.at}-${index}`}
                loading={busy && !rows.length}
                dataSource={rows}
                pagination={false}
                locale={{ emptyText: t("yfaiPanel.usage.empty") }}
                columns={[
                    { title: t("logs.fields.time"), dataIndex: "at", width: 110, render: (at: string) => <span className="tnum text-xs text-muted-foreground">{at ? time.format(new Date(at)) : "—"}</span> },
                    { title: t("yfaiPanel.usage.type"), dataIndex: "type", width: 90, render: (type: string) => <Tag className="m-0">{typeLabel(type)}</Tag> },
                    { title: t("logs.fields.model"), ellipsis: true, render: (_: unknown, row) => <span className="text-xs" title={row.requestId}>{row.model || row.feature || "—"}{row.channel ? <span className="ml-1 text-muted-foreground">· {row.channel}</span> : null}</span> },
                    { title: "⚡", dataIndex: "credits", width: 80, align: "right", render: (credits: number) => <span className={`tnum text-xs ${credits > 0 ? "text-green-600" : ""}`}>{credits > 0 ? "+" : ""}{credits.toFixed(2)}</span> },
                    {
                        title: t("yfaiPanel.usage.local"),
                        width: 104,
                        render: (_: unknown, row) => {
                            if (row.type !== "usage" || !row.requestId) return null;
                            if (chat.has(row.model)) return <span className="text-xs text-muted-foreground">{t("yfaiPanel.usage.chat")}</span>;
                            const match = matches.get(row.requestId);
                            if (!match) return <Tag color="orange" className="m-0">{t("yfaiPanel.usage.notFound")}</Tag>;
                            return match.exact ? <Tag color="green" className="m-0">{t("yfaiPanel.usage.matched")}</Tag> : (
                                <Tooltip title={t("yfaiPanel.usage.byTimeHint")}>
                                    <Tag color="blue" className="m-0">{t("yfaiPanel.usage.byTime")}</Tag>
                                </Tooltip>
                            );
                        },
                    },
                ]}
            />
            {cursor ? (
                <div className="text-center">
                    <Button size="small" loading={busy} onClick={() => void load(cursor)}>
                        {t("yfaiPanel.usage.more")}
                    </Button>
                </div>
            ) : null}
        </div>
    );
}
