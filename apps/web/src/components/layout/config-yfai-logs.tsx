import { useQuery } from "@tanstack/react-query";
import { Button, Switch, Table, Tag, Tooltip } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ExternalLink, RefreshCw } from "@/components/icons";
import { formatDuration, statusInfo, type StatusTone } from "@/lib/log-format";
import { LogDetailDrawer } from "@/pages/logs/components/log-detail-drawer";
import { fetchLogs, type LogRow } from "@/services/api/logs";

// FrameDock: the API call log (apps/server/src/logs.ts) narrowed to YFAI. Same data and detail drawer as /logs.

const TONE_COLOR: Record<StatusTone, string> = { ok: "green", warn: "orange", fail: "red", pending: "blue" };
const PAGE_SIZE = 20;

export function ConfigYfaiLogs() {
    const { t, i18n } = useTranslation();
    const [page, setPage] = useState(1);
    const [failedOnly, setFailedOnly] = useState(false);
    const [hidePoll, setHidePoll] = useState(true);
    const [openId, setOpenId] = useState<number | null>(null);
    const filters = { provider: "yfai", hidePoll, status: failedOnly ? ("failed" as const) : undefined };
    const logs = useQuery({ queryKey: ["yfai-panel-logs", filters, page], queryFn: ({ signal }) => fetchLogs(filters, page, PAGE_SIZE, signal) });
    const time = new Intl.DateTimeFormat(i18n.resolvedLanguage, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="flex items-center gap-2">
                    <Switch size="small" checked={failedOnly} onChange={(value) => { setFailedOnly(value); setPage(1); }} />
                    {t("yfaiPanel.logs.failedOnly")}
                </span>
                <span className="flex items-center gap-2">
                    <Switch size="small" checked={hidePoll} onChange={(value) => { setHidePoll(value); setPage(1); }} />
                    {t("yfaiPanel.logs.hidePoll")}
                </span>
                <div className="ml-auto flex gap-2">
                    <Button size="small" icon={<RefreshCw className="size-3.5" />} loading={logs.isFetching} onClick={() => void logs.refetch()}>
                        {t("yfaiPanel.refresh")}
                    </Button>
                    <Button size="small" href="/logs?provider=yfai" target="_blank" icon={<ExternalLink className="size-3.5" />}>
                        {t("yfaiPanel.logs.openPage")}
                    </Button>
                </div>
            </div>
            <Table<LogRow>
                size="small"
                rowKey="id"
                loading={logs.isLoading}
                dataSource={logs.data?.items}
                onRow={(row) => ({ onClick: () => setOpenId(row.id), className: "cursor-pointer" })}
                pagination={{ current: page, pageSize: PAGE_SIZE, total: logs.data?.total, onChange: setPage, showSizeChanger: false, size: "small" }}
                locale={{ emptyText: logs.error ? String(logs.error) : t("yfaiPanel.logs.empty") }}
                columns={[
                    { title: t("logs.fields.time"), dataIndex: "ts", width: 130, render: (ts: number) => <span className="tnum text-xs text-muted-foreground">{time.format(new Date(ts))}</span> },
                    {
                        title: t("logs.fields.state"),
                        width: 76,
                        render: (_: unknown, row) => {
                            const info = statusInfo(row);
                            return (
                                <Tooltip title={row.error || undefined}>
                                    <Tag color={TONE_COLOR[info.tone]} className="m-0 tnum">{info.label}</Tag>
                                </Tooltip>
                            );
                        },
                    },
                    { title: t("logs.fields.target"), render: (_: unknown, row) => <div className="truncate font-mono text-xs" title={row.url}>{row.method} {row.path}</div> },
                    { title: t("logs.fields.model"), dataIndex: "model", width: 140, ellipsis: true, render: (value: string | null) => <span className="text-xs">{value ? value.split("::").pop() : "—"}</span> },
                    { title: t("logs.fields.duration"), dataIndex: "total_ms", width: 84, align: "right", render: (value: number | null) => <span className="tnum text-xs">{formatDuration(value)}</span> },
                ]}
            />
            <LogDetailDrawer id={openId} onClose={() => setOpenId(null)} onOpen={setOpenId} />
        </div>
    );
}
