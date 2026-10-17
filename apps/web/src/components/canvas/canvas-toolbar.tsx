import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Segmented, Switch, Tooltip } from "antd";
import { CircleDot, Eraser, Grid2x2, Group, Hand, Image as ImageIcon, Info, LocateFixed, Moon, MousePointer2, Music2, Palette, Puzzle, Settings2, Square, Sun, Trash2, Type, Upload, Video } from "lucide-react";
import { CodexLogo } from "@/components/codex-logo";

import { type CanvasBackgroundMode } from "@/lib/canvas-theme";
import { getNodePluginId, listNodeDefinitions, useNodeRegistryVersion } from "@/lib/canvas/node-registry";
import { getNodeSpec } from "@/constant/canvas";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/use-theme-store";
import { useTranslation } from "react-i18next";

// FrameDock: a vertical tool rail on the left edge of the canvas. Tools carry tooltips with their shortcut;
// undo/redo and zoom live in the bottom-left view controls.
export function CanvasToolbar({
    selectedCount,
    canvasTool,
    backgroundMode,
    showImageInfo,
    onAddImage,
    onAddVideo,
    onAddAudio,
    onAddText,
    onAddConfig,
    onAddCodex,
    onAddGroup,
    onAddExtensionNode,
    onUpload,
    onDelete,
    onClear,
    onCanvasToolChange,
    onBackgroundModeChange,
    onShowImageInfoChange,
    onFocusSelected,
}: {
    selectedCount: number;
    canvasTool: "select" | "pan";
    canUndo?: boolean;
    canRedo?: boolean;
    backgroundMode: CanvasBackgroundMode;
    showImageInfo: boolean;
    onAddImage: () => void;
    onAddVideo: () => void;
    onAddAudio: () => void;
    onAddText: () => void;
    onAddConfig: () => void;
    onAddCodex: () => void;
    onAddGroup: () => void;
    onAddExtensionNode: (type: string) => void;
    onUndo?: () => void;
    onRedo?: () => void;
    onUpload: () => void;
    onDelete: () => void;
    onClear: () => void;
    onCanvasToolChange: (tool: "select" | "pan") => void;
    onBackgroundModeChange: (mode: CanvasBackgroundMode) => void;
    onShowImageInfoChange: (show: boolean) => void;
    onFocusSelected: () => void;
}) {
    const { t } = useTranslation();
    const rootRef = useRef<HTMLDivElement>(null);
    const colorTheme = useThemeStore((state) => state.theme);
    const setTheme = useThemeStore((state) => state.setTheme);
    const [panel, setPanel] = useState<"appearance" | "extensions" | null>(null);
    // Keep extension plugin nodes synchronized with registry changes.
    useNodeRegistryVersion();
    const extensionDefs = listNodeDefinitions().filter((def) => def.showInCreateMenu !== false && getNodePluginId(def.type) !== "builtin");

    // Close the side panels when clicking outside the rail and its panels.
    useEffect(() => {
        if (!panel) return;
        const handlePointerDown = (event: PointerEvent) => {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) setPanel(null);
        };
        document.addEventListener("pointerdown", handlePointerDown, true);
        return () => document.removeEventListener("pointerdown", handlePointerDown, true);
    }, [panel]);

    return (
        <div ref={rootRef} className="pointer-events-none absolute left-3 top-1/2 z-50 -translate-y-1/2" onMouseDown={(event) => event.stopPropagation()}>
            <div role="toolbar" aria-orientation="vertical" aria-label={t("canvas.toolbar.rail")} className="pointer-events-auto flex w-10 flex-col items-center gap-0.5 rounded-lg border border-border bg-card p-1 shadow-panel">
                <RailButton label={t("canvas.toolbar.select")} shortcut="V" active={canvasTool === "select"} onClick={() => onCanvasToolChange("select")}>
                    <MousePointer2 />
                </RailButton>
                <RailButton label={t("canvas.toolbar.pan")} shortcut="H" active={canvasTool === "pan"} onClick={() => onCanvasToolChange("pan")}>
                    <Hand />
                </RailButton>
                <RailDivider />
                <RailButton label={t("canvas.toolbar.text")} onClick={onAddText}>
                    <Type />
                </RailButton>
                <RailButton label={t("canvas.toolbar.image")} onClick={onAddImage}>
                    <ImageIcon />
                </RailButton>
                <RailButton label={t("canvas.toolbar.video")} onClick={onAddVideo}>
                    <Video />
                </RailButton>
                <RailButton label={t("canvas.toolbar.audio")} onClick={onAddAudio}>
                    <Music2 />
                </RailButton>
                <RailButton label={t("canvas.toolbar.config")} onClick={onAddConfig}>
                    <Settings2 />
                </RailButton>
                <RailButton label={t("canvas.toolbar.codex")} onClick={onAddCodex}>
                    <CodexLogo className="size-4" />
                </RailButton>
                <RailButton label={t("canvas.toolbar.group")} shortcut="⌘G" onClick={onAddGroup}>
                    <Group />
                </RailButton>
                {extensionDefs.length ? (
                    <RailButton label={t("canvas.toolbar.extensions")} active={panel === "extensions"} onClick={() => setPanel((value) => (value === "extensions" ? null : "extensions"))}>
                        <Puzzle />
                    </RailButton>
                ) : null}
                <RailDivider />
                <RailButton label={t("canvas.toolbar.upload")} onClick={onUpload}>
                    <Upload />
                </RailButton>
                <RailButton label={t("canvas.toolbar.focus")} shortcut="F" disabled={!selectedCount} onClick={onFocusSelected}>
                    <LocateFixed />
                </RailButton>
                <RailButton label={t("canvas.toolbar.appearance")} active={panel === "appearance"} onClick={() => setPanel((value) => (value === "appearance" ? null : "appearance"))}>
                    <Palette />
                </RailButton>
                <RailDivider />
                {selectedCount ? (
                    <RailButton label={t("canvas.deleteSelected")} shortcut="Del" danger onClick={onDelete}>
                        <Trash2 />
                    </RailButton>
                ) : null}
                <RailButton label={t("canvas.toolbar.clear")} danger onClick={onClear}>
                    <Eraser />
                </RailButton>
            </div>

            {panel === "extensions" && extensionDefs.length ? (
                <RailPanel title={t("canvas.toolbar.extensions")}>
                    <div className="grid gap-0.5">
                        {extensionDefs.map((def) => (
                            <button
                                key={def.type}
                                type="button"
                                className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                                onClick={() => {
                                    onAddExtensionNode(def.type);
                                    setPanel(null);
                                }}
                            >
                                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-secondary text-base">{def.icon}</span>
                                <span className="min-w-0 flex-1 truncate">{getNodeSpec(def.type).title}</span>
                            </button>
                        ))}
                    </div>
                </RailPanel>
            ) : null}

            {panel === "appearance" ? (
                <RailPanel title={t("canvas.toolbar.appearance")}>
                    <div className="pb-1.5 text-xs text-muted-foreground">{t("canvas.toolbar.themeMode")}</div>
                    <Segmented
                        block
                        value={colorTheme}
                        onChange={(value) => setTheme(value as "light" | "dark")}
                        options={[
                            { value: "dark", label: <span className="inline-flex items-center gap-1.5"><Moon className="size-3.5" />{t("canvas.toolbar.dark")}</span> },
                            { value: "light", label: <span className="inline-flex items-center gap-1.5"><Sun className="size-3.5" />{t("canvas.toolbar.light")}</span> },
                        ]}
                    />
                    <div className="mt-3 pb-1.5 text-xs text-muted-foreground">{t("canvas.toolbar.gridStyle")}</div>
                    <Segmented
                        block
                        value={backgroundMode}
                        onChange={(value) => onBackgroundModeChange(value as CanvasBackgroundMode)}
                        options={[
                            { value: "dots", label: <span className="inline-flex items-center gap-1.5"><CircleDot className="size-3.5" />{t("canvas.toolbar.dots")}</span> },
                            { value: "lines", label: <span className="inline-flex items-center gap-1.5"><Grid2x2 className="size-3.5" />{t("canvas.toolbar.lines")}</span> },
                            { value: "blank", label: <span className="inline-flex items-center gap-1.5"><Square className="size-3.5" />{t("canvas.toolbar.blank")}</span> },
                        ]}
                    />
                    <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 py-1 text-sm">
                        <span className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground">
                            <Info className="size-3.5" />
                            {t("canvas.toolbar.imageInfo")}
                        </span>
                        <Switch size="small" checked={showImageInfo} onChange={onShowImageInfoChange} />
                    </label>
                </RailPanel>
            ) : null}
        </div>
    );
}

function RailButton({ label, shortcut, active = false, disabled = false, danger = false, onClick, children }: { label: string; shortcut?: string; active?: boolean; disabled?: boolean; danger?: boolean; onClick?: () => void; children: ReactNode }) {
    return (
        <Tooltip
            placement="right"
            mouseEnterDelay={0.15}
            title={
                <span className="inline-flex items-center gap-2">
                    {label}
                    {shortcut ? <kbd className="font-mono text-[11px] opacity-60">{shortcut}</kbd> : null}
                </span>
            }
        >
            <button
                type="button"
                aria-label={label}
                aria-pressed={active || undefined}
                disabled={disabled}
                onClick={onClick}
                className={cn(
                    "grid size-8 place-items-center rounded-md transition-colors duration-150 disabled:pointer-events-none disabled:opacity-35 [&_svg]:size-4",
                    active ? "bg-signal/15 text-signal" : danger ? "text-muted-foreground hover:bg-destructive/12 hover:text-destructive" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
            >
                {children}
            </button>
        </Tooltip>
    );
}

function RailDivider() {
    return <div className="my-0.5 h-px w-5 bg-border" />;
}

function RailPanel({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="pointer-events-auto absolute left-[calc(100%+8px)] top-1/2 w-64 -translate-y-1/2 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-float">
            <div className="pb-2 text-sm font-medium">{title}</div>
            {children}
        </div>
    );
}
