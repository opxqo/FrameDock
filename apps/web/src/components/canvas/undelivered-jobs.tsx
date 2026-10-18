import { App, Button, Modal, Tag } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { ackJob, getJob, isWatchingJob, type Job, listJobs, onJobEvent } from "@/services/api/jobs";

// FrameDock: results YFAI already generated (and billed) that no page picked up — the page was closed or reloaded
// mid-generation, or the user pressed stop while the task was already running. They wait on the server; this
// lists them and puts them back on the canvas, so a paid image is never lost.

type Props = {
    projectId?: string;
    /** Puts the job's images where this page keeps results (the canvas, the generation log). Resolve once they are placed. */
    onPlace: (job: Job) => Promise<void>;
    /** Label of the main action; defaults to "put on canvas". */
    placeLabel?: string;
};

const kvImageUrl = (job: Job, index = 0) => {
    const file = job.result?.files?.[index] ?? job.result;
    return file ? `/api/kv/${encodeURIComponent(file.store)}/${encodeURIComponent(file.key)}` : "";
};

export function UndeliveredJobs({ projectId, onPlace, placeLabel }: Props) {
    const { t } = useTranslation();
    const { message } = App.useApp();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);
    const pending = useRef(new Set<string>());

    const relevant = useCallback((job: Job) => job.kind === "image" && job.state === "succeeded" && !job.deliveredAt && (!job.projectId || !projectId || job.projectId === projectId), [projectId]);

    useEffect(() => {
        let alive = true;
        listJobs({ undelivered: true, kind: "image" })
            .then((items) => alive && setJobs(items.filter(relevant)))
            .catch(() => undefined);
        const off = onJobEvent((job) => {
            if (job.deliveredAt || job.state !== "succeeded") {
                setJobs((current) => current.filter((item) => item.id !== job.id));
                return;
            }
            if (!relevant(job) || pending.current.has(job.id)) return;
            // A page that is itself waiting for the job delivers it and acknowledges it within moments; only show it if that did not happen.
            pending.current.add(job.id);
            window.setTimeout(async () => {
                pending.current.delete(job.id);
                if (isWatchingJob(job.id)) return;
                const fresh = await getJob(job.id).catch(() => undefined);
                if (alive && fresh && relevant(fresh)) setJobs((current) => (current.some((item) => item.id === fresh.id) ? current : [fresh, ...current]));
            }, 6000);
        });
        return () => {
            alive = false;
            off();
        };
    }, [relevant]);

    const place = async (job: Job) => {
        setBusy(job.id);
        try {
            await onPlace(job);
            setJobs((current) => current.filter((item) => item.id !== job.id));
        } catch (error) {
            message.error(error instanceof Error ? error.message : t("serverJobs.rescue.failed"));
        } finally {
            setBusy(null);
        }
    };
    const dismiss = async (job: Job) => {
        await ackJob(job.id).catch(() => undefined);
        setJobs((current) => current.filter((item) => item.id !== job.id));
    };

    if (!jobs.length) return null;
    return (
        <>
            <div className="absolute right-4 bottom-16 z-[90]">
                <Button className="shadow-lg" type="primary" onClick={() => setOpen(true)}>
                    {t("serverJobs.rescue.button", { count: jobs.length })}
                </Button>
            </div>
            <Modal open={open} onCancel={() => setOpen(false)} footer={null} width={720} title={t("serverJobs.rescue.title")}>
                <p className="mb-3 text-sm text-stone-500">{t("serverJobs.rescue.description")}</p>
                <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
                    {jobs.map((job) => (
                        <div key={job.id} className="flex gap-3 rounded-lg border border-stone-200 p-2 dark:border-stone-800">
                            <div className="flex w-40 shrink-0 gap-1 overflow-x-auto">
                                {Array.from({ length: job.result?.files?.length ?? 1 }, (_, index) => (
                                    <img key={index} src={kvImageUrl(job, index)} alt="" className="h-28 w-auto rounded object-cover" />
                                ))}
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col justify-between text-xs">
                                <div className="space-y-1">
                                    <div className="truncate text-sm font-medium">{job.model}</div>
                                    <div className="text-stone-500">{new Date(job.updatedAt).toLocaleString()}</div>
                                    {job.requestId ? <Tag className="max-w-full truncate">{job.requestId}</Tag> : null}
                                </div>
                                <div className="flex gap-2">
                                    <Button size="small" type="primary" loading={busy === job.id} onClick={() => void place(job)}>
                                        {placeLabel ?? t("serverJobs.rescue.place")}
                                    </Button>
                                    <Button size="small" href={kvImageUrl(job)} download>
                                        {t("serverJobs.rescue.download")}
                                    </Button>
                                    <Button size="small" onClick={() => void dismiss(job)}>
                                        {t("serverJobs.rescue.dismiss")}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Modal>
        </>
    );
}
