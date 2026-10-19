import { Fragment, useEffect, useRef, useState } from "react";
import { ChevronRight, ImageIcon, List, Music2, Settings2, Video, X } from "@/components/icons";
import { CodexLogo } from "@/components/codex-logo";
import { useTranslation } from "react-i18next";

import { canvasThemes } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";
import { listNodeDefinitions, useNodeRegistryVersion } from "@/lib/canvas/node-registry";
import { getNodeSpec } from "@/constant/canvas";
import { buildNodeMenu, countByKind, filterByKind } from "@/lib/canvas/node-menu-tree";
import { NodeKindSwitch, skillSource, useNodeMenuKind } from "@/components/canvas/node-kind-switch";
import { CanvasNodeType, type ConnectionHandle, type Position } from "@/types/canvas";

export type PendingConnectionCreate = {
    connection: ConnectionHandle;
    position: Position;
};

export function ConnectionCreateMenu({
    pending,
    scale = 1,
    onCreate,
    onClose,
}: {
    pending: PendingConnectionCreate;
    scale?: number;
    onCreate: (type: CanvasNodeType.Image | CanvasNodeType.Text | CanvasNodeType.Config | CanvasNodeType.Video | CanvasNodeType.Audio | CanvasNodeType.Codex) => void;
    onClose: () => void;
}) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const { t } = useTranslation();
    return (
        <div
            className="glass absolute z-[120] w-[240px] rounded-2xl p-2"
            data-connection-create-menu
            style={{ left: pending.position.x, top: pending.position.y, transform: `scale(${1 / scale})`, transformOrigin: "top left", color: theme.node.text }}
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
        >
            <div className="mb-1.5 flex items-center justify-between px-1">
                <span className="text-sm font-medium" style={{ color: theme.node.muted }}>
                    {t("canvas.createMenu.fromNode")}
                </span>
                <button type="button" className="grid size-7 place-items-center rounded-lg text-base opacity-55 transition hover:bg-white/10 hover:opacity-100" onClick={onClose} aria-label={t("canvas.createMenu.close")}>
                    ×
                </button>
            </div>
            <div className="grid gap-0.5">
                <ConnectionCreateOption theme={theme} icon={<List className="size-4" />} title={t("canvas.createMenu.text")} description={t("canvas.createMenu.textDescription")} onClick={() => onCreate(CanvasNodeType.Text)} />
                <ConnectionCreateOption theme={theme} icon={<ImageIcon className="size-4" />} title={t("canvas.createMenu.image")} onClick={() => onCreate(CanvasNodeType.Image)} />
                <ConnectionCreateOption theme={theme} icon={<Video className="size-4" />} title={t("canvas.createMenu.video")} onClick={() => onCreate(CanvasNodeType.Video)} />
                <ConnectionCreateOption theme={theme} icon={<Music2 className="size-4" />} title={t("canvas.createMenu.audio")} onClick={() => onCreate(CanvasNodeType.Audio)} />
                <ConnectionCreateOption theme={theme} icon={<Settings2 className="size-4" />} title={t("canvas.createMenu.config")} description={t("canvas.createMenu.configDescription")} onClick={() => onCreate(CanvasNodeType.Config)} />
                <ConnectionCreateOption theme={theme} icon={<CodexLogo className="size-4" />} title="Codex" description={t("canvas.codexNode.emptyText")} onClick={() => onCreate(CanvasNodeType.Codex)} />
            </div>
        </div>
    );
}

/** `kind="skill"`: a Skill node — its icon sits on a dashed tile instead of the solid one prompt nodes use, and `description` is the author line. */
export function ConnectionCreateOption({ theme, icon, title, description, onClick, kind, hint }: { theme: (typeof canvasThemes)[keyof typeof canvasThemes]; icon: React.ReactNode; title: string; description?: string; onClick?: () => void; kind?: "prompt" | "skill"; hint?: string }) {
    return (
        <button
            type="button"
            className="flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1 text-left transition"
            style={{ color: theme.node.text }}
            title={hint}
            onClick={onClick}
            onMouseEnter={(event) => (event.currentTarget.style.background = theme.node.fill)}
            onMouseLeave={(event) => (event.currentTarget.style.background = "transparent")}
        >
            <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${kind === "skill" ? "border border-dashed" : ""}`} style={kind === "skill" ? { borderColor: theme.node.activeStroke, color: theme.node.muted } : { background: theme.node.fill, color: theme.node.muted }}>
                {icon}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium leading-4">{title}</span>
                {description ? (
                    <span className={`mt-0.5 block truncate text-[11px] leading-4 ${kind === "skill" ? "font-mono" : ""}`} style={{ color: theme.node.muted }}>
                        {description}
                    </span>
                ) : null}
            </span>
        </button>
    );
}

export function NodeCreateMenu({ position, scale = 1, onCreate, onClose }: { position: Position; scale?: number; onCreate: (type: string) => void; onClose: () => void }) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const { t } = useTranslation();
    useNodeRegistryVersion();
    const menuRef = useRef<HTMLDivElement>(null);
    // Extension categories start collapsed; the node list stays short however many packs exist.
    const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
    const toggleCategory = (key: string) => setOpenCategories((current) => { const next = new Set(current); if (!next.delete(key)) next.add(key); return next; });
    const allDefinitions = listNodeDefinitions().filter((def) => def.showInCreateMenu !== false);
    const [kind, setKind] = useNodeMenuKind();
    // Built-in nodes stay on both pages; the switch only chooses between the prompt and Skill extension nodes.
    const definitions = filterByKind(allDefinitions, kind);
    const tree = buildNodeMenu(definitions, (def) => getNodeSpec(def.type).title);
    const firstGroup = tree.findIndex((entry) => entry.group);
    const hasExtensions = countByKind(allDefinitions, "prompt") + countByKind(allDefinitions, "skill") > 0;
    const kindSwitch = <NodeKindSwitch kind={kind} onChange={setKind} defs={allDefinitions} />;
    // Close automatically when clicking outside the menu.
    useEffect(() => {
        const handlePointerDown = (event: PointerEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) onClose();
        };
        document.addEventListener("pointerdown", handlePointerDown, true);
        return () => document.removeEventListener("pointerdown", handlePointerDown, true);
    }, [onClose]);
    return (
        <div
            ref={menuRef}
            className="glass absolute z-[120] max-h-[70vh] w-[240px] overflow-y-auto rounded-2xl p-2 thin-scrollbar"
            data-canvas-no-zoom
            style={{ left: position.x, top: position.y, transform: `scale(${1 / scale})`, transformOrigin: "top left", color: theme.node.text }}
            onPointerDown={(event) => event.stopPropagation()}
        >
            <div className="mb-1.5 flex items-center justify-between px-1">
                <span className="text-sm font-medium" style={{ color: theme.node.muted }}>
                    {t("canvas.createMenu.select")}
                </span>
                <button type="button" className="grid size-7 place-items-center rounded-lg opacity-55 transition hover:opacity-100" onClick={onClose} aria-label={t("canvas.createMenu.close")}>
                    <X className="size-4" />
                </button>
            </div>
            <div className="grid gap-0.5">
                {tree.map(({ group, categories }, index) => (
                    <Fragment key={group || "_"}>
                        {group && index === firstGroup ? <div className="mt-3 border-t px-0.5 pt-3" style={{ borderColor: theme.node.stroke }}>{kindSwitch}</div> : null}
                        {group ? (
                            <div className="px-2 pb-1 pt-3 text-[11px] font-medium tracking-[0.08em]" style={{ color: theme.node.muted }}>
                                {group}
                            </div>
                        ) : null}
                        {categories.map((category) => {
                            const open = category.single || openCategories.has(`${group}/${category.key}`);
                            return (
                                <Fragment key={category.key}>
                                    {category.single ? null : (
                                        <button
                                            type="button"
                                            aria-expanded={open}
                                            className="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-[13px] font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-signal/60"
                                            style={{ color: theme.node.text }}
                                            onMouseEnter={(event) => (event.currentTarget.style.background = theme.node.fill)}
                                            onMouseLeave={(event) => (event.currentTarget.style.background = "transparent")}
                                            onClick={() => toggleCategory(`${group}/${category.key}`)}
                                        >
                                            <ChevronRight className={`size-3.5 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} style={{ color: theme.node.muted }} />
                                            <span className="flex-1">{category.name}</span>
                                            <span className="tnum text-[11px] font-normal" style={{ color: theme.node.muted }}>
                                                {category.defs.length}
                                            </span>
                                        </button>
                                    )}
                                    {open
                                        ? category.defs.map((def) => (
                                              <div key={def.type} className={category.single ? undefined : "pl-3"}>
                                                  <ConnectionCreateOption theme={theme} icon={def.icon} title={getNodeSpec(def.type).title} description={def.kind === "skill" ? skillSource(def) : def.description} hint={def.kind === "skill" ? def.description : undefined} kind={def.kind} onClick={() => onCreate(def.type)} />
                                              </div>
                                          ))
                                        : null}
                                </Fragment>
                            );
                        })}
                    </Fragment>
                ))}
                {hasExtensions && firstGroup < 0 ? (
                    <div className="mt-3 space-y-2 border-t px-0.5 pt-3" style={{ borderColor: theme.node.stroke }}>
                        {kindSwitch}
                        <p className="px-2 py-1 text-[11px]" style={{ color: theme.node.muted }}>{t("canvas.createMenu.kindEmpty")}</p>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
