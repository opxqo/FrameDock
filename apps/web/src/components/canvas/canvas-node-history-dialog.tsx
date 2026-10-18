import { useEffect, useState } from "react";
import { Button, Empty, Modal } from "antd";
import { useTranslation } from "react-i18next";

import { RotateCcw, Trash2 } from "@/components/icons";
import { outputKey, versionKey } from "@/lib/canvas/canvas-history";
import { resolveMediaUrl } from "@/services/file-storage";
import { resolveImageUrl } from "@/services/image-storage";
import type { CanvasNodeData, CanvasNodeVersion } from "@/types/canvas";

function useStoredUrl(version: CanvasNodeVersion) {
    const [url, setUrl] = useState("");
    useEffect(() => {
        let alive = true;
        if (version.kind === "text" || !version.storageKey) return;
        void (version.kind === "image" ? resolveImageUrl(version.storageKey) : resolveMediaUrl(version.storageKey)).then((next) => alive && setUrl(next));
        return () => {
            alive = false;
        };
    }, [version.kind, version.storageKey]);
    return url;
}

function VersionCard({ version, onRestore, onDelete }: { version: CanvasNodeVersion; onRestore: () => void; onDelete: () => void }) {
    const { t, i18n } = useTranslation();
    const url = useStoredUrl(version);
    const when = version.createdAt ? new Intl.DateTimeFormat(i18n.resolvedLanguage, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(version.createdAt)) : t("canvas.history.earlier");
    return (
        <li className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
            <div className="grid aspect-video place-items-center overflow-hidden bg-muted/60">
                {version.kind === "image" ? (
                    url ? <img src={url} alt="" className="size-full object-contain" /> : null
                ) : version.kind === "video" ? (
                    url ? <video src={url} className="size-full object-contain" muted controls preload="metadata" /> : null
                ) : (
                    <p className="line-clamp-6 w-full whitespace-pre-wrap break-words p-3 text-xs leading-5">{version.content}</p>
                )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1 p-2.5">
                <div className="tnum flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{when}</span>
                    {version.model ? <span className="truncate">{version.model.split("::").pop()}</span> : null}
                </div>
                {version.prompt ? <p className="line-clamp-2 text-xs leading-5">{version.prompt}</p> : null}
                <div className="mt-auto flex items-center justify-between pt-1.5">
                    <Button size="small" type="text" danger icon={<Trash2 className="size-3.5" />} onClick={onDelete} aria-label={t("common.delete")} />
                    <Button size="small" icon={<RotateCcw className="size-3.5" />} onClick={onRestore}>
                        {t("canvas.history.restore")}
                    </Button>
                </div>
            </div>
        </li>
    );
}

/** FrameDock: earlier results of one node. Restoring swaps with the current result, so nothing is lost. */
export function CanvasNodeHistoryDialog({ node, onClose, onRestore, onDelete }: { node: CanvasNodeData | null; onClose: () => void; onRestore: (versionId: string) => void; onDelete: (versionId: string) => void }) {
    const { t } = useTranslation();
    const current = node ? outputKey(node) : "";
    // A version equal to what the node shows now is not "earlier": hide it.
    const versions = (node?.metadata?.history || []).filter((version) => versionKey(version) !== current);
    return (
        <Modal title={t("canvas.history.title", { name: node?.title || "" })} open={Boolean(node)} onCancel={onClose} footer={null} width={760} centered destroyOnHidden>
            <div className="max-h-[66dvh] overflow-y-auto pt-2" data-canvas-no-zoom onWheelCapture={(event) => event.stopPropagation()}>
                {versions.length ? (
                    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {versions.map((version) => (
                            <VersionCard key={version.id} version={version} onRestore={() => onRestore(version.id)} onDelete={() => onDelete(version.id)} />
                        ))}
                    </ul>
                ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("canvas.history.empty")} className="py-10" />
                )}
            </div>
        </Modal>
    );
}
