import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Form, Input, InputNumber, Modal, Popconfirm, Segmented, Select, Switch, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import { Download, RefreshCw, Search, Settings2, Trash2, X } from "@/components/icons";
import { formatBytes, formatDuration, statusInfo } from "@/lib/log-format";
import { deleteLogs, fetchLogSettings, fetchLogStats, fetchLogs, logExportUrl, saveLogSettings, type LogFilters, type LogRow, type LogSettings } from "@/services/api/logs";
import { LogDetailDrawer } from "./components/log-detail-drawer";

const TONE_COLOR = { ok: "success", warn: "warning", fail: "error", pending: "processing" } as const;
const RANGES = { "1h": 3_600_000, "24h": 86_400_000, "7d": 7 * 86_400_000, all: 0 } as const;
type Range = keyof typeof RANGES;

function useDebounced<T>(value: T, delay: number) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(value), delay);
        return () => window.clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}

export default function LogsPage() {
    const { t, i18n } = useTranslation();
    const { message } = App.useApp();
    const queryClient = useQueryClient();
    const [params, setParams] = useSearchParams();
    const node = params.get("node") || "";
    const run = params.get("run") || "";
    const project = params.get("project") || "";
    const [status, setStatus] = useState<"" | "ok" | "failed" | "pending">((params.get("status") as "failed") || "");
    const [source, setSource] = useState(params.get("source") || "");
    const [provider, setProvider] = useState(params.get("provider") || "");
    const [range, setRange] = useState<Range>("24h");
    const [keyword, setKeyword] = useState(params.get("q") || "");
    const [hidePoll, setHidePoll] = useState(!(node || run));
    const [live, setLive] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [openId, setOpenId] = useState<number | null>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const q = useDebounced(keyword.trim(), 300);
    // Anything narrower than "24h" would hide a node's older calls when arriving from a deep link.
    const effectiveRange: Range = node || run ? "all" : range;

    const filters = useMemo<LogFilters>(
        () => ({ status, source, provider, q, node, run, project, hidePoll, since: RANGES[effectiveRange] ? Date.now() - RANGES[effectiveRange] : undefined }),
        // `since` is recomputed on every refetch interval through the query key below, not on each render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [status, source, provider, q, node, run, project, hidePoll, effectiveRange],
    );

    useEffect(() => setPage(1), [filters]);

    const list = useQuery({
        queryKey: ["api-logs", filters, page, pageSize],
        queryFn: ({ signal }) => fetchLogs({ ...filters, since: RANGES[effectiveRange] ? Date.now() - RANGES[effectiveRange] : undefined }, page, pageSize, signal),
        placeholderData: keepPreviousData,
        refetchInterval: live ? 3000 : false,
    });
    const stats = useQuery({ queryKey: ["api-log-stats"], queryFn: fetchLogStats, refetchInterval: live ? 5000 : 15000 });

    const clearContext = (key: "node" | "run" | "project") => {
        const next = new URLSearchParams(params);
        next.delete(key);
        setParams(next, { replace: true });
    };

    const clear = async (scope: "filtered" | "all") => {
        const result = await deleteLogs(scope === "all" ? "all" : filters);
        message.success(t("logs.clearedCount", { count: result.deleted }));
        void queryClient.invalidateQueries({ queryKey: ["api-logs"] });
        void queryClient.invalidateQueries({ queryKey: ["api-log-stats"] });
    };

    const hasFilter = Boolean(status || source || provider || q || node || run || project || effectiveRange !== "all");

    const columns: ColumnsType<LogRow> = [
        {
            title: t("logs.fields.time"),
            dataIndex: "ts",
            width: 150,
            render: (ts: number) => <span className="tnum text-xs text-muted-foreground">{new Intl.DateTimeFormat(i18n.resolvedLanguage, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(ts))}</span>,
        },
        {
            title: t("logs.fields.state"),
            width: 96,
            render: (_: unknown, row) => {
                const info = statusInfo(row);
                return (
                    <Tooltip title={row.error || undefined}>
                        <Tag color={TONE_COLOR[info.tone]} className="m-0 tnum">{info.label}</Tag>
                    </Tooltip>
                );
            },
        },
        { title: t("logs.fields.method"), dataIndex: "method", width: 76, render: (method: string) => <span className="font-mono text-xs">{method}</span> },
        { title: t("logs.fields.provider"), dataIndex: "provider", width: 96, render: (value: string, row) => <span className="text-xs">{value}{row.source !== "proxy" ? <span className="ml-1 text-muted-foreground">· {t(`logs.sources.${row.source}`)}</span> : null}</span> },
        {
            title: t("logs.fields.target"),
            render: (_: unknown, row) => (
                <div className="min-w-0 max-w-[420px]">
                    <div className="truncate font-mono text-xs" title={row.url}>{row.path}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{row.host}{row.poll ? ` · ${t("logs.poll")}` : ""}</div>
                </div>
            ),
        },
        { title: t("logs.fields.model"), dataIndex: "model", width: 150, ellipsis: true, render: (value: string | null) => <span className="text-xs">{value ? value.split("::").pop() : "—"}</span> },
        { title: t("logs.fields.duration"), dataIndex: "total_ms", width: 96, align: "right", render: (value: number | null) => <span className="tnum text-xs">{formatDuration(value)}</span> },
        { title: t("logs.fields.size"), dataIndex: "res_size", width: 88, align: "right", render: (value: number | null) => <span className="tnum text-xs text-muted-foreground">{formatBytes(value)}</span> },
        { title: t("logs.fields.node"), dataIndex: "node_id", width: 96, render: (value: string | null, row) => (value ? <span className="font-mono text-xs text-muted-foreground" title={`${value}${row.mode ? ` · ${row.mode}` : ""}`}>{value.slice(0, 8)}</span> : <span className="text-xs text-muted-foreground">{row.page || "—"}</span>) },
    ];

    const failed = stats.data?.last24h.failed ?? 0;
    const ok = stats.data?.last24h.ok ?? 0;

    return (
        <div className="flex h-full flex-col overflow-hidden bg-background">
            <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-xl font-semibold">{t("logs.title")}</h1>
                    {stats.data ? (
                        <p className="tnum text-sm text-muted-foreground">
                            {t("logs.summary", { ok, failed, rows: stats.data.rows })}
                            <span className="ml-2">· {formatBytes(stats.data.bytes)}</span>
                        </p>
                    ) : null}
                    <div className="ml-auto flex items-center gap-2">
                        <span className="flex items-center gap-2 text-sm">
                            <Switch size="small" checked={live} onChange={setLive} />
                            {t("logs.live")}
                        </span>
                        <Button icon={<RefreshCw className={`size-4 ${list.isFetching ? "animate-spin" : ""}`} />} onClick={() => void list.refetch()} aria-label={t("logs.refresh")} />
                        <Button icon={<Download className="size-4" />} href={logExportUrl({ ...filters, since: RANGES[effectiveRange] ? Date.now() - RANGES[effectiveRange] : undefined })}>{t("logs.export")}</Button>
                        <Popconfirm
                            title={t("logs.clearTitle")}
                            description={
                                <div className="flex flex-col gap-1.5 pt-1">
                                    {hasFilter ? <Button size="small" danger onClick={() => void clear("filtered")}>{t("logs.clearFiltered", { count: list.data?.total ?? 0 })}</Button> : null}
                                    <Button size="small" danger type="primary" onClick={() => void clear("all")}>{t("logs.clearAll")}</Button>
                                </div>
                            }
                            showCancel={false}
                            okButtonProps={{ style: { display: "none" } }}
                        >
                            <Button icon={<Trash2 className="size-4" />}>{t("logs.clear")}</Button>
                        </Popconfirm>
                        <Button icon={<Settings2 className="size-4" />} onClick={() => setSettingsOpen(true)} aria-label={t("logs.settings")} />
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Input className="max-w-xs !rounded-full" prefix={<Search className="size-4 text-muted-foreground" />} placeholder={t("logs.search")} value={keyword} onChange={(event) => setKeyword(event.target.value)} allowClear />
                    <Segmented value={status} onChange={(value) => setStatus(value as typeof status)} options={[{ value: "", label: t("logs.status.all") }, { value: "ok", label: t("logs.status.ok") }, { value: "failed", label: t("logs.status.failed") }, { value: "pending", label: t("logs.status.pending") }]} />
                    <Select value={source} onChange={setSource} style={{ width: 110 }} options={[{ value: "", label: t("logs.allSources") }, ...(["proxy", "browser", "codex", "moke"] as const).map((value) => ({ value, label: t(`logs.sources.${value}`) }))]} />
                    <Select value={provider} onChange={setProvider} style={{ width: 120 }} options={[{ value: "", label: t("logs.allProviders") }, ...(stats.data?.byProvider || []).map((item) => ({ value: item.provider, label: `${item.provider} (${item.n})` }))]} />
                    <Select value={effectiveRange} onChange={setRange} disabled={Boolean(node || run)} style={{ width: 110 }} options={(Object.keys(RANGES) as Range[]).map((value) => ({ value, label: t(`logs.ranges.${value}`) }))} />
                    <span className="flex items-center gap-2 text-sm">
                        <Switch size="small" checked={hidePoll} onChange={setHidePoll} />
                        {t("logs.hidePoll")}
                    </span>
                    {([["node", node], ["run", run], ["project", project]] as const).map(([key, value]) =>
                        value ? (
                            <Tag key={key} closable closeIcon={<X className="size-3" />} onClose={() => clearContext(key)} className="m-0 font-mono">
                                {t(`logs.fields.${key}`)}: {value.slice(0, 12)}
                            </Tag>
                        ) : null,
                    )}
                </div>

                <Table<LogRow>
                    className="mt-4"
                    size="small"
                    rowKey="id"
                    columns={columns}
                    dataSource={list.data?.items}
                    loading={list.isLoading}
                    scroll={{ x: 980 }}
                    onRow={(row) => ({ onClick: () => setOpenId(row.id), className: "cursor-pointer" })}
                    pagination={{ current: page, pageSize, total: list.data?.total ?? 0, showSizeChanger: true, pageSizeOptions: [25, 50, 100, 200], showTotal: (total) => t("logs.total", { count: total }), onChange: (next, size) => { setPage(next); setPageSize(size); } }}
                    locale={{ emptyText: t("logs.empty") }}
                />
            </main>

            <LogDetailDrawer id={openId} onClose={() => setOpenId(null)} onOpen={setOpenId} />
            <LogSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </div>
    );
}

function LogSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { t } = useTranslation();
    const { message } = App.useApp();
    const queryClient = useQueryClient();
    const [form] = Form.useForm<LogSettings & { bodyLimitKb: number }>();
    const settings = useQuery({ queryKey: ["api-log-settings"], queryFn: fetchLogSettings, enabled: open });

    useEffect(() => {
        if (settings.data) form.setFieldsValue({ ...settings.data, bodyLimitKb: Math.round(settings.data.bodyLimit / 1024) });
    }, [form, settings.data]);

    const save = async () => {
        const values = await form.validateFields();
        await saveLogSettings({ retentionDays: values.retentionDays, maxRows: values.maxRows, maxDbMb: values.maxDbMb, bodyLimit: values.bodyLimitKb * 1024, logResponseBody: values.logResponseBody });
        void queryClient.invalidateQueries({ queryKey: ["api-log-settings"] });
        void queryClient.invalidateQueries({ queryKey: ["api-logs"] });
        message.success(t("logs.settingsSaved"));
        onClose();
    };

    return (
        <Modal title={t("logs.settings")} open={open} onCancel={onClose} onOk={() => void save()} okText={t("common.save")} cancelText={t("common.cancel")} destroyOnHidden width={520}>
            <Form form={form} layout="vertical" requiredMark={false} className="pt-2">
                <div className="grid gap-x-4 sm:grid-cols-2">
                    <Form.Item name="retentionDays" label={t("logs.settingsFields.retentionDays")} extra={t("logs.settingsFields.retentionHint")}>
                        <InputNumber min={0} max={3650} className="!w-full" addonAfter={t("logs.settingsFields.days")} />
                    </Form.Item>
                    <Form.Item name="maxRows" label={t("logs.settingsFields.maxRows")}>
                        <InputNumber min={100} max={1_000_000} step={1000} className="!w-full" />
                    </Form.Item>
                    <Form.Item name="maxDbMb" label={t("logs.settingsFields.maxDbMb")}>
                        <InputNumber min={10} max={20000} step={50} className="!w-full" addonAfter="MB" />
                    </Form.Item>
                    <Form.Item name="bodyLimitKb" label={t("logs.settingsFields.bodyLimit")} extra={t("logs.settingsFields.bodyHint")}>
                        <InputNumber min={1} max={256} className="!w-full" addonAfter="KB" />
                    </Form.Item>
                </div>
                <Form.Item name="logResponseBody" label={t("logs.settingsFields.responseBody")} valuePropName="checked">
                    <Switch />
                </Form.Item>
            </Form>
        </Modal>
    );
}
