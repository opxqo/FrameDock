import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, Modal, Segmented, Slider } from "antd";
import { useTranslation } from "react-i18next";

import { labStats, matchColors, type ColorMatchOptions } from "@/lib/color-match";
import { pixelsToDataUrl, readImagePixels } from "@/lib/canvas/canvas-image-data";
import type { CanvasNodeData } from "@/types/canvas";

export type CanvasColorMatchParams = ColorMatchOptions & { masterId: string; targetIds: string[] };

type Candidate = Pick<CanvasNodeData, "id" | "title"> & { url: string };

const PREVIEW_EDGE = 360;

// FrameDock: pick a master image and pull one or more images towards its grade (brightness, colour temperature,
// contrast). Local and free; the originals stay, each result becomes a new node.
export function CanvasNodeColorMatchDialog({
    node,
    candidates,
    defaultMasterId,
    selectedIds,
    open,
    onClose,
    onConfirm,
}: {
    node: Candidate;
    /** Every other image on the canvas that has a picture. */
    candidates: Candidate[];
    defaultMasterId?: string;
    /** Other images selected on the canvas, offered as extra targets. */
    selectedIds: string[];
    open: boolean;
    onClose: () => void;
    onConfirm: (params: CanvasColorMatchParams) => void;
}) {
    const { t } = useTranslation();
    const [masterId, setMasterId] = useState<string | undefined>(defaultMasterId);
    const [extraIds, setExtraIds] = useState<string[]>([]);
    const [strength, setStrength] = useState(80);
    const [scope, setScope] = useState<ColorMatchOptions["scope"]>("all");
    const [preview, setPreview] = useState<{ before: string; after: string } | null>(null);
    const [error, setError] = useState("");

    const master = candidates.find((item) => item.id === masterId);
    const extraTargets = useMemo(() => candidates.filter((item) => selectedIds.includes(item.id) && item.id !== masterId), [candidates, masterId, selectedIds]);

    useEffect(() => {
        if (!open) return;
        setMasterId(defaultMasterId);
        setExtraIds(selectedIds.filter((id) => id !== defaultMasterId && id !== node.id));
        setStrength(80);
        setScope("all");
        setError("");
        // selectedIds is rebuilt on every parent render; compare its content, not its identity.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultMasterId, node.id, open, selectedIds.join(",")]);

    // Live preview on small copies; the full-size result is computed on confirm.
    useEffect(() => {
        if (!open || !master) {
            setPreview(null);
            return;
        }
        let alive = true;
        void (async () => {
            try {
                const [target, reference] = await Promise.all([readImagePixels(node.url, PREVIEW_EDGE), readImagePixels(master.url, 512)]);
                const after = matchColors(target, labStats(reference), { strength: strength / 100, scope });
                if (alive) setPreview({ before: pixelsToDataUrl(target), after: pixelsToDataUrl(after) });
            } catch (reason) {
                if (alive) setError(reason instanceof Error ? reason.message : String(reason));
            }
        })();
        return () => {
            alive = false;
        };
    }, [master, node.url, open, scope, strength]);

    const confirm = () => {
        if (!masterId) return;
        onConfirm({ masterId, targetIds: [node.id, ...extraIds.filter((id) => id !== node.id && id !== masterId)], strength: strength / 100, scope });
    };

    return (
        <Modal title={null} open={open} onCancel={onClose} footer={null} width={880} centered destroyOnHidden>
            <div className="space-y-5">
                <div>
                    <h2 className="text-xl font-semibold">{t("canvas.colorMatch.title")}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{t("canvas.colorMatch.description")}</p>
                </div>

                <section>
                    <div className="mb-2 text-sm font-medium">{t("canvas.colorMatch.master")}</div>
                    {candidates.length ? (
                        <div className="thin-scrollbar flex gap-2 overflow-x-auto pb-1">
                            {candidates.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    title={item.title}
                                    onClick={() => setMasterId(item.id)}
                                    className="relative size-16 shrink-0 overflow-hidden rounded-lg border-2"
                                    style={{ borderColor: item.id === masterId ? "var(--ant-color-primary, #1677ff)" : "transparent" }}
                                >
                                    <img src={item.url} alt={item.title} className="size-full object-cover" />
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">{t("canvas.colorMatch.noCandidates")}</p>
                    )}
                </section>

                <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_300px]">
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            [t("canvas.colorMatch.before"), preview?.before ?? node.url],
                            [t("canvas.colorMatch.after"), preview?.after],
                        ].map(([label, url]) => (
                            <figure key={label} className="space-y-1">
                                <figcaption className="text-xs text-muted-foreground">{label}</figcaption>
                                <div className="grid aspect-square place-items-center overflow-hidden rounded-xl border bg-black/5">
                                    {url ? <img src={url} alt={label} className="max-h-full max-w-full object-contain" /> : <span className="px-4 text-center text-xs text-muted-foreground">{t("canvas.colorMatch.pickMaster")}</span>}
                                </div>
                            </figure>
                        ))}
                    </div>

                    <div className="space-y-5">
                        <div>
                            <div className="mb-1 flex justify-between text-sm">
                                <span>{t("canvas.colorMatch.strength")}</span>
                                <span className="tnum">{strength}%</span>
                            </div>
                            <Slider min={0} max={100} value={strength} onChange={setStrength} />
                        </div>
                        <div>
                            <div className="mb-1 text-sm">{t("canvas.colorMatch.scope")}</div>
                            <Segmented
                                block
                                value={scope}
                                onChange={(value) => setScope(value as ColorMatchOptions["scope"])}
                                options={[
                                    { label: t("canvas.colorMatch.scopeAll"), value: "all" },
                                    { label: t("canvas.colorMatch.scopeTone"), value: "tone" },
                                ]}
                            />
                        </div>
                        {extraTargets.length ? (
                            <div>
                                <div className="mb-1 text-sm">{t("canvas.colorMatch.alsoApply")}</div>
                                <Checkbox.Group className="flex flex-col gap-1" value={extraIds} onChange={(values) => setExtraIds(values as string[])} options={extraTargets.map((item) => ({ label: item.title || item.id, value: item.id }))} />
                            </div>
                        ) : null}
                        <p className="text-xs text-muted-foreground">{t("canvas.colorMatch.limits")}</p>
                        {error ? <p className="text-xs text-red-500">{error}</p> : null}
                        <div className="flex justify-end gap-2">
                            <Button onClick={onClose}>{t("common.cancel")}</Button>
                            <Button type="primary" disabled={!masterId} onClick={confirm}>
                                {t("canvas.colorMatch.apply", { count: 1 + extraIds.filter((id) => id !== node.id && id !== masterId).length })}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
