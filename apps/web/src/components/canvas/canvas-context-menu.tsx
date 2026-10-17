import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { BetweenHorizontalStart, GalleryHorizontalEnd, GalleryHorizontal, Group, ListEnd, Play, Plus, Trash2, Ungroup } from "@/components/icons";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { MOD_KEY } from "@/stores/use-command-store";
import type { ContextMenuState } from "@/types/canvas";
import type { VideoFramePosition } from "@/lib/canvas/canvas-video-frame";

export function CanvasNodeContextMenu({ menu, canCaptureVideoFrame, canGroup, canUngroup, onClose, onCaptureVideoFrame, onDuplicate, onGroup, onUngroup, onRunUpstream, onRunDownstream, onDelete }: { menu: ContextMenuState; canCaptureVideoFrame: boolean; canGroup?: boolean; canUngroup?: boolean; onClose: () => void; onCaptureVideoFrame: (position: VideoFramePosition) => void; onDuplicate: () => void; onGroup?: () => void; onUngroup?: () => void; onRunUpstream?: () => void; onRunDownstream?: () => void; onDelete: () => void }) {
    const { t } = useTranslation();
    const ref = useRef<HTMLDivElement>(null);
    // Keep the whole menu on screen: flip left/up when it would overflow the viewport.
    const [position, setPosition] = useState({ left: menu.x, top: menu.y });
    useLayoutEffect(() => {
        const box = ref.current?.getBoundingClientRect();
        if (!box) return;
        const margin = 8;
        setPosition({
            left: menu.x + box.width + margin > window.innerWidth ? Math.max(margin, menu.x - box.width) : menu.x,
            top: menu.y + box.height + margin > window.innerHeight ? Math.max(margin, window.innerHeight - box.height - margin) : menu.y,
        });
    }, [menu.x, menu.y]);

    useEffect(() => {
        const close = (event: PointerEvent) => {
            const target = event.target;
            if (target instanceof Element && target.closest(".ant-popover")) return;
            onClose();
        };
        window.addEventListener("pointerdown", close);
        return () => window.removeEventListener("pointerdown", close);
    }, [onClose]);

    return (
        <div
            ref={ref}
            role="menu"
            className="glass fixed z-[80] min-w-56 overflow-hidden rounded-2xl p-1.5 text-popover-foreground"
            style={position}
            onPointerDown={(event) => event.stopPropagation()}
        >
            {canCaptureVideoFrame ? (
                <>
                    <MenuButton icon={<BetweenHorizontalStart className="size-4" />} label={t("canvas.videoFrames.first")} onClick={() => onCaptureVideoFrame("first")} />
                    <MenuButton icon={<GalleryHorizontalEnd className="size-4" />} label={t("canvas.videoFrames.last")} onClick={() => onCaptureVideoFrame("last")} />
                    <MenuButton icon={<GalleryHorizontal className="size-4" />} label={t("canvas.videoFrames.current")} onClick={() => onCaptureVideoFrame("current")} />
                    <div className="mx-1 my-1 h-px bg-border" />
                </>
            ) : null}
            {menu.type === "node" && onRunUpstream && onRunDownstream ? (
                <>
                    <MenuButton icon={<ListEnd className="size-4" />} label={t("canvas.workflow.runUpstream")} shortcut={`${MOD_KEY}↵`} onClick={onRunUpstream} />
                    <MenuButton icon={<Play className="size-4" />} label={t("canvas.workflow.runDownstream")} shortcut={`${MOD_KEY}⇧↵`} onClick={onRunDownstream} />
                    <div className="mx-1 my-1 h-px bg-border" />
                </>
            ) : null}
            {menu.type === "node" && canGroup ? <MenuButton icon={<Group className="size-4" />} label={t("canvas.nodeToolbar.group")} shortcut={`${MOD_KEY}G`} onClick={onGroup} /> : null}
            {menu.type === "node" && canUngroup ? <MenuButton icon={<Ungroup className="size-4" />} label={t("canvas.nodeToolbar.ungroup")} shortcut={`${MOD_KEY}⇧G`} onClick={onUngroup} /> : null}
            {menu.type === "node" ? <MenuButton icon={<Plus className="size-4" />} label={t("canvas.controls.duplicate")} onClick={onDuplicate} /> : null}
            <MenuButton icon={<Trash2 className="size-4" />} label={t("canvas.controls.delete")} shortcut="Del" onClick={onDelete} danger />
        </div>
    );
}

function MenuButton({ icon, label, shortcut, onClick, danger = false }: { icon: ReactNode; label: string; shortcut?: string; onClick?: () => void; danger?: boolean }) {
    return (
        <button
            type="button"
            role="menuitem"
            className={cn("flex h-9 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-left text-sm transition-colors duration-100 [&_svg]:shrink-0", danger ? "text-destructive hover:bg-destructive/12" : "hover:bg-accent")}
            onClick={onClick}
        >
            {icon}
            <span className="min-w-0 flex-1 truncate">{label}</span>
            {shortcut ? <kbd className="font-mono text-[11px] text-muted-foreground">{shortcut}</kbd> : null}
        </button>
    );
}
