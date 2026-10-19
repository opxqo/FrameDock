import type { ReactNode } from "react";
import { Fragment, useEffect, useRef, useState } from "react";
import { Segmented, Switch, Tooltip } from "antd";
import { CircleDot, Eraser, Grid2x2, Group, Image as ImageIcon, Info, LocateFixed, Moon, Music2, Palette, Puzzle, Settings2, Square, Sun, Trash2, Type, Upload, Video } from "@/components/icons";
import { CodexLogo } from "@/components/codex-logo";

import { type CanvasBackgroundMode } from "@/lib/canvas-theme";
import { getNodePluginId, listNodeDefinitions, useNodeRegistryVersion } from "@/lib/canvas/node-registry";
import { getNodeSpec } from "@/constant/canvas";
import { groupDefinitions } from "@/components/canvas/canvas-create-menus";
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
        <div ref={rootRef} className="pointer-events-none absolute left-4 top-1/2 z-50 -translate-y-1/2" onMouseDown={(event) => event.stopPropagation()}>
            {/* Select / pan live in the bottom dock with the view controls; the rail is for adding things. */}
            <div role="toolbar" aria-orientation="vertical" aria-label={t("canvas.toolbar.rail")} className="glass pointer-events-auto flex w-[52px] flex-col items-center gap-1 rounded-full py-2">
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
                    <CodexLogo className="size-5" />
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
                        {groupDefinitions(extensionDefs).map(([group, subgroups]) => (
                            <Fragment key={group || "_"}>
                                {group ? <div className="mt-2 border-t border-border px-2 pb-1 pt-3 text-[11px] font-medium tracking-[0.08em] text-muted-foreground/70 first:mt-0 first:border-t-0 first:pt-1">{group}</div> : null}
                                {subgroups.map(([subgroup, defs]) => (
                                    <Fragment key={subgroup || "_"}>
                                        {subgroup ? (
                                            <div className="px-2 pb-0.5 pt-2 text-[11px] text-muted-foreground">{subgroup}</div>
                                        ) : null}
                                        {defs.map((def) => (
                                            <button
                                                key={def.type}
                                                type="button"
                                                className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2 py-1 text-left text-[13px] transition-colors hover:bg-accent"
                                                onClick={() => {
                                                    onAddExtensionNode(def.type);
                                                    setPanel(null);
                                                }}
                                            >
                                                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary text-base">{def.icon}</span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate font-medium leading-4">{getNodeSpec(def.type).title}</span>
                                                    {def.description ? <span className="block truncate text-[11px] text-muted-foreground">{def.description}</span> : null}
                                                </span>
                                            </button>
                                        ))}
                                    </Fragment>
                                ))}
                            </Fragment>
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
                    "grid size-9 place-items-center rounded-full transition-colors duration-150 disabled:pointer-events-none disabled:opacity-35 [&_svg]:size-5",
                    active ? "bg-signal text-signal-foreground" : danger ? "text-muted-foreground hover:bg-destructive/12 hover:text-destructive" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
            >
                {children}
            </button>
        </Tooltip>
    );
}

function RailDivider() {
    return <div className="my-1 h-px w-6 bg-border" />;
}

function RailPanel({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="glass pointer-events-auto absolute left-[calc(100%+12px)] top-1/2 w-64 -translate-y-1/2 rounded-2xl p-4 text-popover-foreground">
            <div className="pb-2 text-sm font-medium">{title}</div>
            {children}
        </div>
    );
}
