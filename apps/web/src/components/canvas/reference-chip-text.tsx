import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";

import { promptSegments } from "@/lib/canvas/prompt-reference-tokens";
import type { CanvasResourceReference } from "@/lib/canvas/canvas-resource-references";
import { getImagePreviewRevision, subscribeImagePreviews } from "@/services/image-storage";

// FrameDock: text that holds references (`@[node:id]`, e.g. what 动作戏导演 writes) shown for reading: a reference is a small
// thumbnail with its number — the same chip the prompt box uses — instead of the raw token. The stored text is not changed.

export function ReferenceChipText({ value, references }: { value: string; references: CanvasResourceReference[] }) {
    const { t } = useTranslation();
    // Thumbnails are cached by the image store; re-render when one arrives.
    useSyncExternalStore(subscribeImagePreviews, getImagePreviewRevision);
    return (
        <>
            {promptSegments(value, references).map((segment, index) => {
                if (segment.type === "text") return segment.value;
                if (segment.type === "missing") {
                    return (
                        <span key={index} className="mx-px inline-flex h-6 items-center rounded-md border border-destructive/50 px-1 align-middle font-sans text-xs leading-none text-destructive" title={t("canvas.references.missingChipHint")}>
                            {t("canvas.references.missingChip")}
                        </span>
                    );
                }
                if (segment.kind === "image" && segment.previewUrl) {
                    return (
                        <span key={index} className="relative mx-px inline-flex size-6 items-center justify-center overflow-hidden rounded align-middle" title={`${segment.label} · ${segment.title}`}>
                            <img src={segment.previewUrl} alt={segment.title} draggable={false} className="size-6 object-cover" />
                            <span className="absolute bottom-0 right-0 rounded-tl bg-foreground/80 px-0.5 font-sans text-[9px] font-semibold leading-3 text-background">{segment.label.match(/\d+/)?.[0] ?? ""}</span>
                        </span>
                    );
                }
                return (
                    <span key={index} className="mx-px inline-flex h-6 max-w-40 items-center rounded-md border border-border px-1 align-middle font-sans text-xs leading-none" title={segment.title}>
                        <span className="truncate">{segment.label}</span>
                    </span>
                );
            })}
        </>
    );
}
