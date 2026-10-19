import { Alert, Button, Empty, Image, Segmented, Table, Tag, Tooltip, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Music2, Download, RefreshCw } from "@/components/icons";
import { bareYfaiModel, formatParamAdjustment, type YfaiParamAdjustment } from "@/lib/yfai-account";
import { type Job, jobFileUrl, resubmitJob } from "@/services/api/jobs";
import { listYfaiJobs } from "@/services/api/yfai";

// FrameDock: what YFAI made for this FrameDock — the server's YFAI tasks with their stored results (YFAI keeps
// results ~15 days; these copies stay), the cost from the account ledger, and the gateway's parameter receipts.

const STATE_COLOR: Record<Job["state"], string> = { queued: "default", submitting: "blue", running: "blue", succeeded: "green", failed: "red", canceled: "default", unknown: "orange" };
type Filter = "all" | "image" | "video" | "audio" | "failed";

function useYfaiJobs(apiKey: string, limit: number) {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const load = useCallback(async () => {
        setBusy(true);
        setError("");
        try {
            setJobs(await listYfaiJobs(apiKey, limit));
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : String(reason));
        } finally {
            setBusy(false);
        }
    }, [apiKey, limit]);
    useEffect(() => {
        void load();
    }, [load]);
    return { jobs, busy, error, load };
}

function Adjustments({ items }: { items: YfaiParamAdjustment[] }) {
    const { t } = useTranslation();
    return (
        <div className="flex flex-wrap gap-1">
            {items.map((item) => (
                <Tooltip key={item.param} title={t(`yfaiPanel.reasons.${item.reason}`, { defaultValue: item.reason })}>
                    <Tag color="gold" className="m-0 font-mono text-[11px]">
                        {formatParamAdjustment(item)}
                    </Tag>
                </Tooltip>
            ))}
        </div>
    );
}

function Preview({ job }: { job: Job }) {
    const { t } = useTranslation();
    // Once a result is on the canvas the canvas keeps its own copy, and storage cleanup removes the task's file.
    const [missing, setMissing] = useState(false);
    const url = jobFileUrl(job);
    if (!url || missing) return <div className="grid size-full place-items-center p-3 text-center text-xs text-muted-foreground">{job.deliveredAt ? t("yfaiPanel.works.onCanvas") : t("yfaiPanel.works.fileMissing")}</div>;
    if (job.kind === "image") {
        const count = job.result?.files?.length ?? 1;
        return (
            <Image.PreviewGroup items={Array.from({ length: count }, (_, index) => jobFileUrl(job, index))}>
                <Image src={url} alt="" rootClassName="!block size-full" className="!size-full object-cover" onError={() => setMissing(true)} />
            </Image.PreviewGroup>
        );
    }
    if (job.kind === "video") return <video src={url} controls preload="metadata" className="size-full bg-black object-contain" onError={() => setMissing(true)} />;
    return (
        <div className="flex size-full flex-col items-center justify-center gap-2 p-2">
            <Music2 className="size-6 text-muted-foreground" />
            <audio src={url} controls preload="none" className="w-full" />
        </div>
    );
}

export function ConfigYfaiWorks({ apiKey }: { apiKey: string }) {
    const { t, i18n } = useTranslation();
    const { jobs, busy, error, load } = useYfaiJobs(apiKey, 120);
    const [filter, setFilter] = useState<Filter>("all");

    const shown = jobs.filter((job) => (filter === "all" ? true : filter === "failed" ? ["failed", "unknown"].includes(job.state) : job.kind === filter));
    const time = new Intl.DateTimeFormat(i18n.resolvedLanguage, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
                <Segmented size="small" value={filter} onChange={(value) => setFilter(value as Filter)} options={(["all", "image", "video", "audio", "failed"] as const).map((value) => ({ value, label: t(`yfaiPanel.works.filters.${value}`) }))} />
                <Button size="small" className="!ml-auto" icon={<RefreshCw className="size-3.5" />} loading={busy} onClick={() => void load()}>
                    {t("yfaiPanel.refresh")}
                </Button>
            </div>
            <p className="text-xs text-stone-500">{t("yfaiPanel.works.description")}</p>
            {error ? <Alert type="error" showIcon message={error} /> : null}
            {shown.length ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
                    {shown.map((job) => {
                        const cost = job.notes?.cost;
                        const adjustments = job.notes?.paramAdjustments ?? [];
                        return (
                            <div key={job.id} className="flex flex-col overflow-hidden rounded-lg border border-stone-200 dark:border-stone-800">
                                <div className="aspect-square overflow-hidden bg-black/5">{job.state === "succeeded" ? <Preview job={job} /> : <div className="grid size-full place-items-center p-3 text-center text-xs text-muted-foreground">{job.error ? <span className="line-clamp-6 break-all">{job.error}</span> : t(`yfaiPanel.works.states.${job.state}`)}</div>}</div>
                                <div className="flex flex-1 flex-col gap-1.5 p-2 text-xs">
                                    <div className="flex items-center gap-1">
                                        <span className="min-w-0 flex-1 truncate font-medium" title={job.model}>{bareYfaiModel(job.model)}</span>
                                        <Tag color={STATE_COLOR[job.state]} className="m-0">{t(`yfaiPanel.works.states.${job.state}`)}</Tag>
                                    </div>
                                    <div className="tnum flex items-center gap-2 text-muted-foreground">
                                        <span>{time.format(new Date(job.createdAt))}</span>
                                        {cost !== undefined ? <span>⚡{cost.toFixed(2)}</span> : null}
                                        {job.state === "succeeded" && !job.deliveredAt ? <Tag color="orange" className="m-0">{t("yfaiPanel.works.undelivered")}</Tag> : null}
                                    </div>
                                    {job.prompt ? <div className="line-clamp-2 text-muted-foreground" title={job.prompt}>{job.prompt}</div> : null}
                                    {adjustments.length ? <Adjustments items={adjustments} /> : null}
                                    <div className="mt-auto flex items-center gap-1 pt-1">
                                        {job.remoteTaskId ? (
                                            <Typography.Text copyable={{ text: [job.remoteTaskId, job.requestId].filter(Boolean).join("\n"), tooltips: [t("yfaiPanel.works.copyIds"), t("yfaiPanel.works.copied")] }} className="!min-w-0 !flex-1 truncate font-mono !text-[11px] !text-muted-foreground">
                                                {job.remoteTaskId}
                                            </Typography.Text>
                                        ) : (
                                            <span className="flex-1" />
                                        )}
                                        {job.state === "succeeded" && !job.deliveredAt ? <Button size="small" type="text" icon={<Download className="size-3.5" />} href={jobFileUrl(job)} download aria-label={t("serverJobs.rescue.download")} /> : null}
                                        {job.state === "unknown" ? (
                                            <Button size="small" onClick={() => void resubmitJob(job.id).then(load, load)}>
                                                {t("jobAudit.resume")}
                                            </Button>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : busy ? null : (
                <Empty description={t("yfaiPanel.works.empty")} />
            )}
        </div>
    );
}

/** Tasks where the gateway changed, defaulted or ignored a requested parameter. */
export function ConfigYfaiAdjustments({ apiKey }: { apiKey: string }) {
    const { t, i18n } = useTranslation();
    const { jobs, busy, error, load } = useYfaiJobs(apiKey, 500);
    const rows = jobs.filter((job) => job.notes?.paramAdjustments?.length);
    const time = new Intl.DateTimeFormat(i18n.resolvedLanguage, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-3">
                <span className="text-xs text-stone-500">{t("yfaiPanel.adjustments.description")}</span>
                <Button size="small" className="!ml-auto" icon={<RefreshCw className="size-3.5" />} loading={busy} onClick={() => void load()}>
                    {t("yfaiPanel.refresh")}
                </Button>
            </div>
            {error ? <Alert type="error" showIcon message={error} /> : null}
            <Table<Job>
                size="small"
                rowKey="id"
                loading={busy}
                dataSource={rows}
                pagination={{ pageSize: 20, hideOnSinglePage: true, size: "small" }}
                locale={{ emptyText: t("yfaiPanel.adjustments.empty") }}
                columns={[
                    { title: t("logs.fields.time"), dataIndex: "createdAt", width: 110, render: (at: number) => <span className="tnum text-xs text-muted-foreground">{time.format(new Date(at))}</span> },
                    { title: t("logs.fields.model"), dataIndex: "model", width: 150, ellipsis: true, render: (model: string) => <span className="text-xs">{bareYfaiModel(model)}</span> },
                    {
                        title: t("yfaiPanel.adjustments.changes"),
                        render: (_: unknown, job) => (
                            <div className="space-y-0.5 text-xs">
                                {job.notes?.paramAdjustments?.map((item) => (
                                    <div key={item.param}>
                                        <span className="font-mono">{formatParamAdjustment(item)}</span>
                                        <span className="ml-2 text-muted-foreground">{t(`yfaiPanel.reasons.${item.reason}`, { defaultValue: item.reason })}</span>
                                    </div>
                                ))}
                            </div>
                        ),
                    },
                ]}
            />
        </div>
    );
}
