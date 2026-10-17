import { useEffect, useRef, type ReactNode } from "react";
import { Bot, ChevronDown, Download, LayoutGrid, PanelLeftClose, PanelLeftOpen, Plus, Redo2, Trash2, Undo2, Upload } from "lucide-react";
import { Dropdown, Modal, Tooltip } from "antd";
import { useTranslation } from "react-i18next";
import { create } from "zustand";

import { UserStatusActions, iconButtonClass } from "@/components/layout/user-status-actions";
import { cn } from "@/lib/utils";
import { MOD_KEY } from "@/stores/use-command-store";
import { useCanvasSidePanelStore } from "@/stores/use-canvas-side-panel-store";

// FrameDock: the shortcut sheet opens from the "more" menu, ⌘K and the "?" key.
export const useShortcutSheetStore = create<{ open: boolean; setOpen: (open: boolean) => void }>()((set) => ({ open: false, setOpen: (open) => set({ open }) }));

export function CanvasTopBar({
    title,
    titleDraft,
    isTitleEditing,
    onTitleDraftChange,
    onStartTitleEditing,
    onFinishTitleEditing,
    onCancelTitleEditing,
    canUndo,
    canRedo,
    onProjects,
    onCreateProject,
    onDeleteProject,
    onExportProject,
    onImportImage,
    onOpenPlugins,
    onUndo,
    onRedo,
    programme,
    agentOpen,
    compactAgentStatus,
    onToggleAgent,
}: {
    title: string;
    titleDraft: string;
    isTitleEditing: boolean;
    onTitleDraftChange: (value: string) => void;
    onStartTitleEditing: () => void;
    onFinishTitleEditing: () => void;
    onCancelTitleEditing: () => void;
    canUndo: boolean;
    canRedo: boolean;
    onProjects: () => void;
    onCreateProject: () => void;
    onDeleteProject: () => void;
    onExportProject: () => void;
    onImportImage: () => void;
    onOpenPlugins: () => void;
    onUndo: () => void;
    onRedo: () => void;
    /** The programme bar, shown in the centre while a chain runs. */
    programme?: ReactNode;
    agentOpen: boolean;
    compactAgentStatus: { connected: boolean; enabled: boolean; activity: string };
    onToggleAgent: () => void;
}) {
    const { t } = useTranslation();
    const titleRef = useRef<HTMLDivElement>(null);
    const shortcutsOpen = useShortcutSheetStore((state) => state.open);
    const setShortcutsOpen = useShortcutSheetStore((state) => state.setOpen);
    const sidePanelOpen = useCanvasSidePanelStore((state) => state.panelOpen);
    const toggleSidePanel = useCanvasSidePanelStore((state) => state.togglePanel);
    const agentLabel = compactAgentStatus.connected ? t("canvas.agentConnected") : compactAgentStatus.enabled ? t("canvas.agentConnecting", { activity: compactAgentStatus.activity || t("canvas.connecting") }) : t("canvas.agentDisconnected");

    useEffect(() => {
        if (!isTitleEditing) return;
        const close = (event: PointerEvent) => {
            if (!titleRef.current?.contains(event.target as Node)) onFinishTitleEditing();
        };
        document.addEventListener("pointerdown", close, true);
        return () => document.removeEventListener("pointerdown", close, true);
    }, [isTitleEditing, onFinishTitleEditing]);

    return (
        <>
            <header className="absolute inset-x-0 top-0 z-50 grid h-12 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b border-border bg-background px-2">
                <div className="flex min-w-0 items-center gap-0.5">
                    <Tooltip title={sidePanelOpen ? t("canvas.collapsePanel") : t("canvas.expandPanel")} mouseEnterDelay={0.3}>
                        <button type="button" onClick={toggleSidePanel} aria-label={sidePanelOpen ? t("canvas.collapsePanel") : t("canvas.expandPanel")} aria-expanded={sidePanelOpen} className={iconButtonClass}>
                            {sidePanelOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
                        </button>
                    </Tooltip>
                    <Tooltip title={t("canvas.projects")} mouseEnterDelay={0.3}>
                        <button type="button" onClick={onProjects} aria-label={t("canvas.projects")} className={iconButtonClass}>
                            <span className="size-4 bg-signal" style={{ mask: "url(/logo.svg) center / contain no-repeat", WebkitMask: "url(/logo.svg) center / contain no-repeat" }} />
                        </button>
                    </Tooltip>
                    <span className="mx-1 text-muted-foreground/50">/</span>
                    <div ref={titleRef} className="flex min-w-0 items-center">
                        {isTitleEditing ? (
                            <input
                                autoFocus
                                value={titleDraft}
                                onChange={(event) => onTitleDraftChange(event.target.value)}
                                onBlur={onFinishTitleEditing}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") onFinishTitleEditing();
                                    if (event.key === "Escape") onCancelTitleEditing();
                                }}
                                className="h-7 w-56 rounded-md border border-ring bg-card px-2 text-sm font-medium outline-none"
                            />
                        ) : (
                            <button type="button" className="h-7 min-w-0 max-w-[280px] truncate rounded-md px-1.5 text-left text-sm font-medium transition-colors hover:bg-accent" onDoubleClick={onStartTitleEditing} title={t("canvas.renameHint")}>
                                {title}
                            </button>
                        )}
                        <Dropdown
                            trigger={["click"]}
                            menu={{
                                items: [
                                    { key: "projects", icon: <LayoutGrid className="size-4" />, label: t("canvas.projects"), onClick: onProjects },
                                    { key: "new", icon: <Plus className="size-4" />, label: t("canvas.create"), onClick: onCreateProject },
                                    { type: "divider" },
                                    { key: "import", icon: <Upload className="size-4" />, label: t("canvas.importAsset"), onClick: onImportImage },
                                    { key: "export", icon: <Download className="size-4" />, label: t("canvas.exportCurrent"), onClick: onExportProject },
                                    { type: "divider" },
                                    { key: "undo", disabled: !canUndo, icon: <Undo2 className="size-4" />, label: t("canvas.undo"), extra: <Kbd>{MOD_KEY}Z</Kbd>, onClick: onUndo },
                                    { key: "redo", disabled: !canRedo, icon: <Redo2 className="size-4" />, label: t("canvas.redo"), extra: <Kbd>{MOD_KEY}⇧Z</Kbd>, onClick: onRedo },
                                    { type: "divider" },
                                    { key: "delete", danger: true, icon: <Trash2 className="size-4" />, label: t("canvas.deleteCurrent"), onClick: onDeleteProject },
                                ],
                            }}
                        >
                            <button type="button" className={cn(iconButtonClass, "size-7")} aria-label={t("canvas.openMenu")}>
                                <ChevronDown />
                            </button>
                        </Dropdown>
                    </div>
                </div>

                <div className="flex min-w-0 justify-center">{programme}</div>

                <div className="flex min-w-0 items-center justify-end gap-1">
                    <UserStatusActions variant="canvas" onOpenShortcuts={() => setShortcutsOpen(true)} onOpenPlugins={onOpenPlugins} />
                    <Tooltip title={agentLabel} mouseEnterDelay={0.3}>
                        <button type="button" onClick={onToggleAgent} aria-pressed={agentOpen} aria-label={t("canvas.openAgent")} className={cn(iconButtonClass, "relative", agentOpen && "bg-secondary text-foreground")}>
                            <Bot />
                            <span className={cn("absolute right-1 top-1 size-1.5 rounded-full", compactAgentStatus.connected ? "bg-tally-ok" : compactAgentStatus.enabled ? "bg-tally-live" : "hidden")} />
                        </button>
                    </Tooltip>
                </div>
            </header>
            <Modal title={t("canvas.shortcuts")} open={shortcutsOpen} onCancel={() => setShortcutsOpen(false)} footer={null} centered width={640}>
                <ShortcutSheet />
            </Modal>
        </>
    );
}

function Kbd({ children }: { children: ReactNode }) {
    return <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-surface px-1 font-mono text-[11px] leading-none text-muted-foreground">{children}</kbd>;
}

function ShortcutSheet() {
    const { t } = useTranslation();
    const groups: Array<{ title: string; rows: Array<[string[], string]> }> = [
        {
            title: t("canvas.shortcutGroups.run"),
            rows: [
                [[MOD_KEY, "↵"], t("canvas.workflow.runUpstream")],
                [[MOD_KEY, "⇧", "↵"], t("canvas.workflow.runDownstream")],
                [[MOD_KEY, "K"], t("palette.title")],
            ],
        },
        {
            title: t("canvas.shortcutGroups.view"),
            rows: [
                [["V"], t("canvas.toolbar.select")],
                [["H"], t("canvas.toolbar.pan")],
                [["Space", t("canvas.shortcut.drag")], t("canvas.shortcut.toggleTool")],
                [[t("canvas.shortcut.wheel")], t("canvas.shortcut.zoom")],
                [["⇧", "1"], t("canvas.shortcutGroups.fit")],
                [[MOD_KEY, "0"], t("canvas.resetView")],
                [["F"], t("canvas.toolbar.focus")],
            ],
        },
        {
            title: t("canvas.shortcutGroups.edit"),
            rows: [
                [[t("canvas.shortcut.drag")], t("canvas.shortcut.boxSelect")],
                [["⇧", t("canvas.shortcut.click")], t("canvas.shortcut.addSelection")],
                [[MOD_KEY, "A"], t("canvas.shortcut.selectAll")],
                [[MOD_KEY, "C / V"], t("canvas.shortcut.copyPaste")],
                [[MOD_KEY, "G"], t("canvas.shortcut.group")],
                [[MOD_KEY, "⇧", "G"], t("canvas.shortcut.ungroup")],
                [[MOD_KEY, "Z"], t("canvas.undo")],
                [[MOD_KEY, "⇧", "Z"], t("canvas.redo")],
                [["Delete"], t("canvas.shortcut.delete")],
                [["Esc"], t("canvas.shortcut.escape")],
                [["?"], t("canvas.shortcuts")],
            ],
        },
    ];
    return (
        <div className="gap-8 pt-2 sm:columns-2">
            {groups.map((group) => (
                <section key={group.title} className="mb-5 break-inside-avoid">
                    <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">{group.title}</h3>
                    <dl className="divide-y divide-border">
                        {group.rows.map(([keys, label]) => (
                            <div key={label + keys.join()} className="flex items-center justify-between gap-4 py-1.5 text-sm">
                                <dt className="min-w-0 truncate">{label}</dt>
                                <dd className="flex shrink-0 items-center gap-1">
                                    {keys.map((key) => (
                                        <Kbd key={key}>{key.replace(/\+$/, "")}</Kbd>
                                    ))}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </section>
            ))}
        </div>
    );
}
