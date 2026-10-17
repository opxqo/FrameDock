import { Image as ImageIcon, Type, Upload, Video } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { MOD_KEY } from "@/stores/use-command-store";

// FrameDock: an empty canvas teaches its three entry points instead of showing a bare grid.
// The wrapper ignores pointer events so double-click and drop still reach the canvas.
export function CanvasEmptyHint({ onAddText, onAddImage, onAddVideo, onUpload }: { onAddText: () => void; onAddImage: () => void; onAddVideo: () => void; onUpload: () => void }) {
    const { t } = useTranslation();
    return (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center pt-12">
            <div className="flex w-[min(440px,calc(100%-96px))] flex-col items-center text-center">
                <h2 className="text-base font-medium">{t("canvas.emptyHint.title")}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">{t("canvas.emptyHint.description")}</p>
                <div className="pointer-events-auto mt-5 grid w-full grid-cols-4 gap-2">
                    <HintAction icon={<Type />} label={t("canvas.nodeTypes.text")} onClick={onAddText} />
                    <HintAction icon={<ImageIcon />} label={t("canvas.nodeTypes.image")} onClick={onAddImage} />
                    <HintAction icon={<Video />} label={t("canvas.nodeTypes.video")} onClick={onAddVideo} />
                    <HintAction icon={<Upload />} label={t("canvas.emptyHint.upload")} onClick={onUpload} />
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                    {t("canvas.emptyHint.keys", { palette: `${MOD_KEY}K` })}
                </p>
            </div>
        </div>
    );
}

function HintAction({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} className="flex h-16 flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-card text-sm text-muted-foreground transition-colors duration-150 hover:border-foreground/20 hover:text-foreground [&_svg]:size-4">
            {icon}
            {label}
        </button>
    );
}
