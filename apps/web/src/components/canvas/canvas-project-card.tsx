import { Check, Download, Pencil, Trash2, X } from "@/components/icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Checkbox, Input, Tooltip } from "antd";
import { useTranslation } from "react-i18next";

import { CanvasProjectPreview } from "@/components/canvas/canvas-project-preview";
import { cn } from "@/lib/utils";
import { useCanvasStore, type CanvasProject } from "@/stores/canvas/use-canvas-store";
import { useCanvasUiStore } from "@/stores/canvas/use-canvas-ui-store";
import { exportCanvasProjects } from "@/lib/canvas/canvas-export";
import { hasAgentUrlBootstrap } from "@/lib/agent/agent-url-bootstrap";

export function CanvasProjectCard({ project }: { project: CanvasProject }) {
    const { i18n, t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const renameProject = useCanvasStore((state) => state.renameProject);
    const selectedIds = useCanvasUiStore((state) => state.selectedProjectIds);
    const editingId = useCanvasUiStore((state) => state.editingProjectId);
    const editingTitle = useCanvasUiStore((state) => state.editingProjectTitle);
    const startEditing = useCanvasUiStore((state) => state.startEditingProject);
    const setEditingTitle = useCanvasUiStore((state) => state.setEditingProjectTitle);
    const stopEditing = useCanvasUiStore((state) => state.stopEditingProject);
    const toggleSelected = useCanvasUiStore((state) => state.toggleSelectedProjectId);
    const setDeleteIds = useCanvasUiStore((state) => state.setDeleteProjectIds);
    const editing = editingId === project.id;
    const selected = selectedIds.includes(project.id);
    const selecting = selectedIds.length > 0;
    const open = () => {
        const agentHash = hasAgentUrlBootstrap(window.location.hash) ? window.location.hash : "";
        navigate(`/canvas/${project.id}${searchParams.toString() ? `?${searchParams.toString()}` : ""}${agentHash}`, { replace: Boolean(agentHash) });
    };
    const saveTitle = () => {
        renameProject(project.id, editingTitle);
        stopEditing();
    };
    const activate = () => {
        if (editing) return;
        if (selecting) toggleSelected(project.id, !selected);
        else open();
    };

    return (
        <article
            className={cn(
                "group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-card transition-[border-color,box-shadow] duration-150",
                selected ? "border-foreground/50 ring-2 ring-foreground/10" : "border-border hover:border-foreground/20",
            )}
            onClick={activate}
        >
            <div className="relative aspect-[16/10] border-b border-border bg-background text-foreground">
                <CanvasProjectPreview project={project} />
                <div className={cn("absolute left-2 top-2 transition-opacity duration-150", selected || selecting ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100")} onClick={(event) => event.stopPropagation()}>
                    <Checkbox checked={selected} onChange={(event) => toggleSelected(project.id, event.target.checked)} aria-label={t("canvas.project.select", { name: project.title })} />
                </div>
            </div>
            <div className="flex min-h-14 items-center gap-2 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                    {editing ? (
                        <Input size="small" value={editingTitle} onClick={(event) => event.stopPropagation()} onChange={(event) => setEditingTitle(event.target.value)} onKeyDown={(event) => (event.key === "Enter" ? saveTitle() : event.key === "Escape" ? stopEditing() : undefined)} autoFocus />
                    ) : (
                        <h2 className="truncate text-sm font-medium">{project.title || t("canvas.project.untitled")}</h2>
                    )}
                    <p className="tnum mt-0.5 truncate text-xs text-muted-foreground">
                        {t("projects.nodes", { count: project.nodes.length })} · {formatRelative(project.updatedAt, i18n.resolvedLanguage || "zh-CN", t("projects.justNow"))}
                    </p>
                </div>
                <div className={cn("flex shrink-0 items-center transition-opacity duration-150", editing ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100")} onClick={(event) => event.stopPropagation()}>
                    {editing ? (
                        <>
                            <Button type="text" size="small" icon={<Check className="size-4" />} onClick={saveTitle} aria-label={t("canvas.project.saveName")} />
                            <Button type="text" size="small" icon={<X className="size-4" />} onClick={stopEditing} aria-label={t("canvas.project.cancelRename")} />
                        </>
                    ) : (
                        <>
                            <Tooltip title={t("canvas.project.rename")} mouseEnterDelay={0.4}>
                                <Button type="text" size="small" icon={<Pencil className="size-3.5" />} onClick={() => startEditing(project.id, project.title)} aria-label={t("canvas.project.rename")} />
                            </Tooltip>
                            <Tooltip title={t("canvas.project.export")} mouseEnterDelay={0.4}>
                                <Button type="text" size="small" icon={<Download className="size-3.5" />} onClick={() => void exportCanvasProjects([project], project.title || t("canvas.title"))} aria-label={t("canvas.project.export")} />
                            </Tooltip>
                            <Tooltip title={t("canvas.project.delete")} mouseEnterDelay={0.4}>
                                <Button type="text" size="small" icon={<Trash2 className="size-3.5" />} onClick={() => setDeleteIds([project.id])} aria-label={t("canvas.project.delete")} />
                            </Tooltip>
                        </>
                    )}
                </div>
            </div>
        </article>
    );
}

function formatRelative(value: string, locale: string, justNow: string) {
    const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
    if (!Number.isFinite(seconds)) return "";
    if (Math.abs(seconds) < 60) return justNow;
    const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    for (const [unit, size] of [["minute", 60], ["hour", 3600], ["day", 86400], ["week", 604800]] as const) {
        const next = unit === "minute" ? 3600 : unit === "hour" ? 86400 : unit === "day" ? 604800 : Number.POSITIVE_INFINITY;
        if (Math.abs(seconds) < next) return format.format(Math.round(seconds / size), unit);
    }
    return new Date(value).toLocaleDateString(locale);
}
