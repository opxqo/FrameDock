import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { BetweenHorizontalStart, Check, ClipboardPaste, GalleryHorizontalEnd, GalleryHorizontal, Group, ListEnd, Maximize, Music2, Play, Plus, Scissors, Settings2, TemplateFlow, Trash2, Type, Ungroup, Upload, Video, Image as ImageIcon } from "@/components/icons";
import { CodexLogo } from "@/components/codex-logo";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { MOD_KEY } from "@/stores/use-command-store";
import { CanvasNodeType, type CanvasConnectionRole, type ContextMenuState, type Position } from "@/types/canvas";
import type { VideoFramePosition } from "@/lib/canvas/canvas-video-frame";

export function CanvasNodeContextMenu({
    menu,
    canCaptureVideoFrame,
    canGroup,
    canUngroup,
    connectionRole,
    onClose,
    onCaptureVideoFrame,
    onDuplicate,
    onGroup,
    onUngroup,
    onRunUpstream,
    onRunDownstream,
    onRunSelection,
    onContinueFromLastFrame,
    onSplitText,
    onSetConnectionRole,
    onDelete,
}: {
    menu: ContextMenuState;
    canCaptureVideoFrame: boolean;
    canGroup?: boolean;
    canUngroup?: boolean;
    /** Set for wires into a video generation: the current role (null = automatic). */
    connectionRole?: CanvasConnectionRole | null;
    onClose: () => void;
    onCaptureVideoFrame: (position: VideoFramePosition) => void;
    onDuplicate: () => void;
    onGroup?: () => void;
    onUngroup?: () => void;
    onRunUpstream?: () => void;
    onRunDownstream?: () => void;
    /** Run the selected nodes (a group runs everything inside it). */
    onRunSelection?: () => void;
    onContinueFromLastFrame?: () => void;
    onSplitText?: () => void;
    onSetConnectionRole?: (role: CanvasConnectionRole | undefined) => void;
    onDelete: () => void;
}) {
    const { t } = useTranslation();
    return (
        <MenuShell x={menu.x} y={menu.y} onClose={onClose}>
            {canCaptureVideoFrame ? (
                <>
                    <MenuButton icon={<BetweenHorizontalStart className="size-4" />} label={t("canvas.videoFrames.first")} onClick={() => onCaptureVideoFrame("first")} />
                    <MenuButton icon={<GalleryHorizontalEnd className="size-4" />} label={t("canvas.videoFrames.last")} onClick={() => onCaptureVideoFrame("last")} />
                    <MenuButton icon={<GalleryHorizontal className="size-4" />} label={t("canvas.videoFrames.current")} onClick={() => onCaptureVideoFrame("current")} />
                    {onContinueFromLastFrame ? <MenuButton icon={<Play className="size-4" />} label={t("canvas.videoFrames.continue")} onClick={onContinueFromLastFrame} /> : null}
                    <div className="mx-1 my-1 h-px bg-border" />
                </>
            ) : null}
            {menu.type === "node" && onSplitText ? (
                <>
                    <MenuButton icon={<Scissors className="size-4" />} label={t("canvas.textSplit.menu")} onClick={onSplitText} />
                    <div className="mx-1 my-1 h-px bg-border" />
                </>
            ) : null}
            {menu.type === "node" && onRunSelection ? <MenuButton icon={<Play className="size-4" />} label={t("canvas.workflow.runSelection")} onClick={onRunSelection} /> : null}
            {menu.type === "node" && onRunUpstream && onRunDownstream ? (
                <>
                    <MenuButton icon={<ListEnd className="size-4" />} label={t("canvas.workflow.runUpstream")} shortcut={`${MOD_KEY}↵`} onClick={onRunUpstream} />
                    <MenuButton icon={<Play className="size-4" />} label={t("canvas.workflow.runDownstream")} shortcut={`${MOD_KEY}⇧↵`} onClick={onRunDownstream} />
                    <div className="mx-1 my-1 h-px bg-border" />
                </>
            ) : null}
            {menu.type === "connection" && connectionRole !== undefined && onSetConnectionRole ? (
                <>
                    {([undefined, "first", "last", "reference"] as const).map((role) => (
                        <MenuButton key={role || "auto"} icon={<Check className={cn("size-4", (connectionRole ?? undefined) === role ? "opacity-100" : "opacity-0")} />} label={t(`canvas.connectionRoles.${role || "auto"}Long`)} onClick={() => onSetConnectionRole(role)} />
                    ))}
                    <div className="mx-1 my-1 h-px bg-border" />
                </>
            ) : null}
            {menu.type === "node" && canGroup ? <MenuButton icon={<Group className="size-4" />} label={t("canvas.nodeToolbar.group")} shortcut={`${MOD_KEY}G`} onClick={onGroup} /> : null}
            {menu.type === "node" && canUngroup ? <MenuButton icon={<Ungroup className="size-4" />} label={t("canvas.nodeToolbar.ungroup")} shortcut={`${MOD_KEY}⇧G`} onClick={onUngroup} /> : null}
            {menu.type === "node" ? <MenuButton icon={<Plus className="size-4" />} label={t("canvas.controls.duplicate")} onClick={onDuplicate} /> : null}
            <MenuButton icon={<Trash2 className="size-4" />} label={t("canvas.controls.delete")} shortcut="Del" onClick={onDelete} danger />
        </MenuShell>
    );
}

/** Positioned popup shared by every canvas context menu: stays on screen and closes on any outside press. */
function MenuShell({ x, y, onClose, children }: { x: number; y: number; onClose: () => void; children: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    // Keep the whole menu on screen: flip left/up when it would overflow the viewport.
    const [position, setPosition] = useState({ left: x, top: y });
    useLayoutEffect(() => {
        const box = ref.current?.getBoundingClientRect();
        if (!box) return;
        const margin = 8;
        setPosition({
            left: x + box.width + margin > window.innerWidth ? Math.max(margin, x - box.width) : x,
            top: y + box.height + margin > window.innerHeight ? Math.max(margin, window.innerHeight - box.height - margin) : y,
        });
    }, [x, y]);

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
        <div ref={ref} role="menu" className="glass fixed z-[80] min-w-56 overflow-hidden rounded-2xl p-1.5 text-popover-foreground" style={position} onPointerDown={(event) => event.stopPropagation()}>
            {children}
        </div>
    );
}

export type PaneMenuNodeType = CanvasNodeType.Text | CanvasNodeType.Image | CanvasNodeType.Video | CanvasNodeType.Audio | CanvasNodeType.Config | CanvasNodeType.Codex;

const PANE_NODE_ICONS: Record<PaneMenuNodeType, ReactNode> = {
    [CanvasNodeType.Text]: <Type className="size-4" />,
    [CanvasNodeType.Image]: <ImageIcon className="size-4" />,
    [CanvasNodeType.Video]: <Video className="size-4" />,
    [CanvasNodeType.Audio]: <Music2 className="size-4" />,
    [CanvasNodeType.Config]: <Settings2 className="size-4" />,
    [CanvasNodeType.Codex]: <CodexLogo className="size-4" />,
};

/** Right-click on empty canvas: add a node here, paste, upload, fit the view, insert a template. */
export function CanvasPaneContextMenu({ menu, onClose, onCreate, onPaste, onUpload, onFit, onInsertTemplate }: { menu: Extract<ContextMenuState, { type: "canvas" }>; onClose: () => void; onCreate: (type: PaneMenuNodeType, position: Position) => void; onPaste: () => void; onUpload: () => void; onFit: () => void; onInsertTemplate: () => void }) {
    const { t } = useTranslation();
    const run = (action: () => void) => () => {
        onClose();
        action();
    };
    return (
        <MenuShell x={menu.x} y={menu.y} onClose={onClose}>
            {(Object.keys(PANE_NODE_ICONS) as PaneMenuNodeType[]).map((type) => (
                <MenuButton key={type} icon={PANE_NODE_ICONS[type]} label={`${t("canvas.toolbar.add")}${t(`canvas.nodeTypes.${type}`)}`} onClick={run(() => onCreate(type, menu.position))} />
            ))}
            <div className="mx-1 my-1 h-px bg-border" />
            <MenuButton icon={<ClipboardPaste className="size-4" />} label={t("canvas.paneMenu.paste")} shortcut={`${MOD_KEY}V`} onClick={run(onPaste)} />
            <MenuButton icon={<Upload className="size-4" />} label={t("canvas.toolbar.upload")} onClick={run(onUpload)} />
            <MenuButton icon={<Maximize className="size-4" />} label={t("canvas.shortcutGroups.fit")} shortcut="⇧1" onClick={run(onFit)} />
            <MenuButton icon={<TemplateFlow className="size-4" />} label={t("canvas.workflowTemplates.threeView")} onClick={run(onInsertTemplate)} />
        </MenuShell>
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
