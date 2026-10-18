import { useEffect, useMemo, useState } from "react";
import { Checkbox, Modal, Segmented } from "antd";
import { useTranslation } from "react-i18next";

import { guessSplitRule, splitText, type TextSplitRule } from "@/lib/canvas/text-split";
import { cn } from "@/lib/utils";

export type TextSplitResult = { parts: string[]; generate: "image" | "video" | null };

/** FrameDock: split a text node into one text node per shot, optionally each wired to its own generator. */
export function CanvasTextSplitDialog({ text, open, onCancel, onConfirm }: { text: string; open: boolean; onCancel: () => void; onConfirm: (result: TextSplitResult) => void }) {
    const { t } = useTranslation();
    const [rule, setRule] = useState<TextSplitRule>("lines");
    const [withGenerator, setWithGenerator] = useState(true);
    const [generator, setGenerator] = useState<"image" | "video">("image");

    useEffect(() => {
        if (open) setRule(guessSplitRule(text));
    }, [open, text]);

    const parts = useMemo(() => splitText(text, rule), [rule, text]);

    return (
        <Modal
            title={t("canvas.textSplit.title")}
            open={open}
            onCancel={onCancel}
            onOk={() => onConfirm({ parts, generate: withGenerator ? generator : null })}
            okButtonProps={{ disabled: parts.length < 2 }}
            okText={t("canvas.textSplit.confirm", { count: parts.length })}
            cancelText={t("common.cancel")}
            width={560}
            centered
            destroyOnHidden
        >
            <div className="space-y-4 pt-2" data-canvas-no-zoom onWheelCapture={(event) => event.stopPropagation()}>
                <Segmented value={rule} onChange={(value) => setRule(value as TextSplitRule)} options={(["lines", "numbered", "divider"] as const).map((value) => ({ value, label: t(`canvas.textSplit.rules.${value}`) }))} />
                <ol className={cn("thin-scrollbar max-h-64 space-y-1.5 overflow-y-auto rounded-xl border border-border p-2 text-[13px]", parts.length < 2 && "opacity-60")}>
                    {parts.map((part, index) => (
                        <li key={index} className="flex gap-2 rounded-lg bg-muted/60 px-2.5 py-1.5">
                            <span className="tnum shrink-0 text-muted-foreground">{index + 1}</span>
                            <span className="line-clamp-3 whitespace-pre-wrap break-words">{part}</span>
                        </li>
                    ))}
                </ol>
                {parts.length < 2 ? <p className="text-xs text-muted-foreground">{t("canvas.textSplit.tooFew")}</p> : null}
                <div className="flex flex-wrap items-center gap-3">
                    <Checkbox checked={withGenerator} onChange={(event) => setWithGenerator(event.target.checked)}>
                        {t("canvas.textSplit.withGenerator")}
                    </Checkbox>
                    {withGenerator ? <Segmented size="small" value={generator} onChange={(value) => setGenerator(value as "image" | "video")} options={(["image", "video"] as const).map((value) => ({ value, label: t(`canvas.configNode.${value}`) }))} /> : null}
                </div>
            </div>
        </Modal>
    );
}
