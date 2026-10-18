import { useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Descriptions, Drawer, Empty, Popconfirm, Spin, Tabs, Tag } from "antd";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Copy, Download, Trash2 } from "@/components/icons";
import { useCopyText } from "@/hooks/use-copy-text";
import { buildCurl, formatBytes, formatDuration, statusInfo } from "@/lib/log-format";
import { deleteLog, fetchLog, fetchLogs, type LogDetail } from "@/services/api/logs";

const TONE_COLOR = { ok: "success", warn: "warning", fail: "error", pending: "processing" } as const;

function parseHeaders(raw: string | null) {
    try {
        return raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
        return {};
    }
}

function BodyView({ text, truncated, empty }: { text: string | null; truncated: boolean; empty: string }) {
    const { t } = useTranslation();
    if (!text) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={empty} className="py-8" />;
    return (
        <div>
            {truncated ? <Tag color="warning" className="mb-2">{t("logs.truncated")}</Tag> : null}
            <pre className="thin-scrollbar max-h-[56dvh] overflow-auto whitespace-pre-wrap break-all rounded-xl bg-muted px-3 py-2.5 font-mono text-xs leading-5">{text}</pre>
        </div>
    );
}

function HeadersView({ raw }: { raw: string | null }) {
    const headers = parseHeaders(raw);
    const entries = Object.entries(headers);
    if (!entries.length) return null;
    return (
        <dl className="mb-3 grid grid-cols-[minmax(0,180px)_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-xl bg-muted px-3 py-2.5 font-mono text-xs leading-5">
            {entries.map(([name, value]) => (
                <div key={name} className="contents">
                    <dt className="truncate text-muted-foreground" title={name}>{name}</dt>
                    <dd className="break-all">{value}</dd>
                </div>
            ))}
        </dl>
    );
}

/** Everything about one call: overview, redacted request and response, and the other calls of the same node/run. */
export function LogDetailDrawer({ id, onClose, onOpen }: { id: number | null; onClose: () => void; onOpen: (id: number) => void }) {
    const { t, i18n } = useTranslation();
    const { message } = App.useApp();
    const copyText = useCopyText();
    const queryClient = useQueryClient();
    const detail = useQuery({ queryKey: ["api-log", id], queryFn: () => fetchLog(id!), enabled: id !== null, refetchInterval: (query) => (query.state.data?.state === "pending" ? 2000 : false) });
    const log = detail.data;
    const relatedFilter = useMemo(() => (log?.run_id ? { run: log.run_id } : log?.node_id ? { node: log.node_id } : undefined), [log?.node_id, log?.run_id]);
    const related = useQuery({ queryKey: ["api-log-related", relatedFilter], queryFn: () => fetchLogs(relatedFilter!, 1, 30), enabled: Boolean(relatedFilter) });

    const download = (item: LogDetail) => {
        const blob = new Blob([JSON.stringify(item, null, 2)], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `api-log-${item.id}.json`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    };

    const remove = async (item: LogDetail) => {
        await deleteLog(item.id);
        void queryClient.invalidateQueries({ queryKey: ["api-logs"] });
        message.success(t("logs.deleted"));
        onClose();
    };

    const status = log ? statusInfo(log) : null;
    const when = log ? new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: "medium", timeStyle: "medium" }).format(new Date(log.ts)) : "";

    return (
        <Drawer
            open={id !== null}
            onClose={onClose}
            width={760}
            destroyOnHidden
            title={
                log ? (
                    <span className="flex min-w-0 items-center gap-2">
                        <Tag className="m-0 font-mono">{log.method}</Tag>
                        {status ? <Tag color={TONE_COLOR[status.tone]} className="m-0">{status.label}</Tag> : null}
                        <span className="min-w-0 truncate font-normal text-muted-foreground">{log.host}{log.path}</span>
                    </span>
                ) : (
                    t("logs.detail")
                )
            }
            extra={
                log ? (
                    <div className="flex items-center gap-1">
                        <Button size="small" icon={<Copy className="size-3.5" />} onClick={() => copyText(buildCurl(log), t("logs.curlCopied"))}>cURL</Button>
                        <Button size="small" icon={<Copy className="size-3.5" />} onClick={() => copyText(JSON.stringify(log, null, 2), t("logs.jsonCopied"))}>JSON</Button>
                        <Button size="small" icon={<Download className="size-3.5" />} onClick={() => download(log)} aria-label={t("logs.download")} />
                        <Popconfirm title={t("logs.deleteOne")} okText={t("common.delete")} cancelText={t("common.cancel")} okButtonProps={{ danger: true }} onConfirm={() => void remove(log)}>
                            <Button size="small" danger icon={<Trash2 className="size-3.5" />} aria-label={t("common.delete")} />
                        </Popconfirm>
                    </div>
                ) : null
            }
        >
            {!log ? (
                <div className="grid h-40 place-items-center">{detail.isError ? <p className="text-sm text-destructive">{t("logs.loadFailed")}</p> : <Spin />}</div>
            ) : (
                <Tabs
                    items={[
                        {
                            key: "overview",
                            label: t("logs.tabs.overview"),
                            children: (
                                <div className="space-y-4">
                                    {log.error ? <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{log.error}</p> : null}
                                    <Descriptions
                                        column={1}
                                        size="small"
                                        bordered
                                        items={[
                                            { key: "time", label: t("logs.fields.time"), children: when },
                                            { key: "url", label: "URL", children: <button type="button" className="break-all text-left font-mono text-xs hover:underline" onClick={() => copyText(log.url, t("logs.copied"))}>{log.url}</button> },
                                            { key: "source", label: t("logs.fields.source"), children: t(`logs.sources.${log.source}`) },
                                            { key: "provider", label: t("logs.fields.provider"), children: log.provider },
                                            { key: "model", label: t("logs.fields.model"), children: log.model || "—" },
                                            { key: "mode", label: t("logs.fields.mode"), children: log.mode || "—" },
                                            { key: "state", label: t("logs.fields.state"), children: t(`logs.states.${log.state}`) },
                                            { key: "headersMs", label: t("logs.fields.headersMs"), children: formatDuration(log.duration_ms) },
                                            { key: "totalMs", label: t("logs.fields.totalMs"), children: formatDuration(log.total_ms) },
                                            { key: "sizes", label: t("logs.fields.sizes"), children: `${t("logs.request")} ${formatBytes(log.req_size)} · ${t("logs.response")} ${formatBytes(log.res_size)}` },
                                            { key: "type", label: t("logs.fields.contentType"), children: log.res_type || "—" },
                                            ...(log.node_id ? [{ key: "node", label: t("logs.fields.node"), children: <Link to={`/logs?node=${log.node_id}`} onClick={onClose} className="font-mono text-xs">{log.node_id}</Link> }] : []),
                                            ...(log.run_id ? [{ key: "run", label: t("logs.fields.run"), children: <Link to={`/logs?run=${log.run_id}`} onClick={onClose} className="font-mono text-xs">{log.run_id}</Link> }] : []),
                                            ...(log.project_id ? [{ key: "project", label: t("logs.fields.project"), children: <Link to={`/canvas/${log.project_id}`} className="font-mono text-xs">{log.project_id}</Link> }] : []),
                                            ...(log.page ? [{ key: "page", label: t("logs.fields.page"), children: log.page }] : []),
                                            ...(log.extra ? [{ key: "extra", label: t("logs.fields.extra"), children: <pre className="whitespace-pre-wrap break-all font-mono text-xs">{log.extra}</pre> }] : []),
                                        ]}
                                    />
                                </div>
                            ),
                        },
                        {
                            key: "request",
                            label: t("logs.request"),
                            children: (
                                <>
                                    <HeadersView raw={log.req_headers} />
                                    <BodyView text={log.req_body} truncated={Boolean(log.req_truncated)} empty={t("logs.noBody")} />
                                </>
                            ),
                        },
                        {
                            key: "response",
                            label: t("logs.response"),
                            children: (
                                <>
                                    <HeadersView raw={log.res_headers} />
                                    <BodyView text={log.res_body} truncated={Boolean(log.res_truncated)} empty={log.state === "pending" ? t("logs.waiting") : t("logs.noBody")} />
                                </>
                            ),
                        },
                        ...(relatedFilter
                            ? [
                                  {
                                      key: "related",
                                      label: t("logs.tabs.related", { count: related.data?.total ?? 0 }),
                                      children: (
                                          <ul className="space-y-1">
                                              {(related.data?.items || []).map((item) => {
                                                  const info = statusInfo(item);
                                                  return (
                                                      <li key={item.id}>
                                                          <button type="button" onClick={() => onOpen(item.id)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-accent ${item.id === log.id ? "bg-accent" : ""}`}>
                                                              <span className="tnum w-16 shrink-0 text-muted-foreground">{new Date(item.ts).toLocaleTimeString()}</span>
                                                              <Tag color={TONE_COLOR[info.tone]} className="m-0">{info.label}</Tag>
                                                              <span className="font-mono">{item.method}</span>
                                                              <span className="min-w-0 flex-1 truncate">{item.host}{item.path}</span>
                                                              <span className="tnum text-muted-foreground">{formatDuration(item.total_ms)}</span>
                                                          </button>
                                                      </li>
                                                  );
                                              })}
                                          </ul>
                                      ),
                                  },
                              ]
                            : []),
                    ]}
                />
            )}
        </Drawer>
    );
}
