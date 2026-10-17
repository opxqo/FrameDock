import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { App, Button, Dropdown, Input, Space } from "antd";
import { ChevronDown, Download, FileUp, Plus, Search, TemplateFlow } from "@/components/icons";
import { CANVAS_TEMPLATES, type CanvasTemplateId } from "@/lib/canvas/canvas-templates";
import { createProjectFromTemplate } from "@/lib/canvas/create-from-template";
import { useTranslation } from "react-i18next";

import { readZip } from "@/lib/zip";
import { setMediaBlob } from "@/services/file-storage";
import { setImageBlob } from "@/services/image-storage";
import { CanvasDeleteProjectsDialog } from "@/components/canvas/canvas-delete-projects-dialog";
import { CanvasProjectCard } from "@/components/canvas/canvas-project-card";
import { SetupBanner } from "@/components/layout/setup-banner";
import type { CanvasExportFile } from "@/types/canvas-export";
import { useCanvasStore } from "@/stores/canvas/use-canvas-store";
import { useCanvasUiStore } from "@/stores/canvas/use-canvas-ui-store";
import { exportCanvasProjects } from "@/lib/canvas/canvas-export";
import { hasAgentUrlBootstrap } from "@/lib/agent/agent-url-bootstrap";

export default function CanvasPage() {
    const { message } = App.useApp();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const inputRef = useRef<HTMLInputElement>(null);
    const autoOpenRef = useRef(false);
    const hydrated = useCanvasStore((state) => state.hydrated);
    const projects = useCanvasStore((state) => state.projects);
    const createProject = useCanvasStore((state) => state.createProject);
    const importProject = useCanvasStore((state) => state.importProject);
    const selectedIds = useCanvasUiStore((state) => state.selectedProjectIds);
    const setDeleteIds = useCanvasUiStore((state) => state.setDeleteProjectIds);
    const [keyword, setKeyword] = useState("");
    // Most recently edited first: the list is where work resumes.
    const sortedProjects = useMemo(() => [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [projects]);
    const visibleProjects = keyword.trim() ? sortedProjects.filter((project) => project.title.toLowerCase().includes(keyword.trim().toLowerCase())) : sortedProjects;

    const mode = searchParams.get("mode");
    const agentMode = mode === "new" || mode === "recent" || mode === "choose";
    const agentQuery = agentMode ? `?${searchParams.toString()}` : "";
    const enterProject = (id: string) => {
        const agentHash = hasAgentUrlBootstrap(window.location.hash) ? window.location.hash : "";
        navigate(`/canvas/${id}${agentQuery}${agentHash}`, { replace: Boolean(agentHash) });
    };
    const createAndEnter = () => enterProject(createProject(t("canvas.defaultTitle", { count: projects.length + 1 })));
    const createFromTemplate = (id: CanvasTemplateId) => {
        const templateTitle = t(CANVAS_TEMPLATES.find((item) => item.id === id)!.titleKey);
        enterProject(createProjectFromTemplate(id));
        message.success(t("templates.created", { name: templateTitle }));
    };
    const templateMenu = {
        items: CANVAS_TEMPLATES.map((template) => ({
            key: template.id,
            icon: <TemplateFlow className="size-4" />,
            label: (
                <span className="block py-0.5">
                    <span className="block text-sm">{t(template.titleKey)}</span>
                    <span className="block text-xs text-muted-foreground">{t(template.descriptionKey)}</span>
                </span>
            ),
            onClick: () => createFromTemplate(template.id),
        })),
    };
    const importCanvas = async (file?: File) => {
        if (!file) return;
        try {
            const zip = await readZip(file);
            const projectFile = zip.get("projects.json");
            if (!projectFile) throw new Error("missing projects.json");
            const data = JSON.parse(await projectFile.text()) as CanvasExportFile;
            await Promise.all(
                data.projects.flatMap((project) =>
                    project.files.map(async (item) => {
                        const blob = zip.get(item.path);
                        if (!blob) return;
                        const typedBlob = blob.type ? blob : blob.slice(0, blob.size, item.mimeType);
                        await (item.storageKey.startsWith("image:") ? setImageBlob(item.storageKey, typedBlob) : setMediaBlob(item.storageKey, typedBlob));
                    }),
                ),
            );
            data.projects.forEach((item) => importProject(item.project));
            message.success(t("canvas.imported", { count: data.projects.length }));
        } catch {
            message.error(t("canvas.importFailed"));
        } finally {
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    useEffect(() => {
        if (!hydrated || autoOpenRef.current || (mode !== "new" && mode !== "recent")) return;
        autoOpenRef.current = true;
        enterProject(mode === "new" ? createProject(t("canvas.defaultTitle", { count: projects.length + 1 })) : projects[0]?.id || createProject(t("canvas.defaultTitle", { count: projects.length + 1 })));
    }, [createProject, hydrated, mode, projects, t]);

    if (hydrated && (mode === "new" || mode === "recent")) return <main className="flex h-full items-center justify-center bg-background text-sm text-stone-500">{t("canvas.opening")}</main>;

    return (
        <main className="h-full overflow-auto bg-background text-foreground">
            <div className="flex w-full flex-col gap-5 px-4 py-5">
                <header className="flex flex-wrap items-center gap-3">
                    <h1 className="text-xl font-semibold">{t("projects.title")}</h1>
                    {hydrated && projects.length ? <span className="tnum text-sm text-muted-foreground">{t("projects.count", { count: projects.length })}</span> : null}
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                        {selectedIds.length ? (
                            <>
                                <span className="tnum text-sm text-muted-foreground">{t("canvas.sidePanel.selected", { count: selectedIds.length })}</span>
                                <Button disabled={!hydrated} icon={<Download className="size-4" />} onClick={() => void exportCanvasProjects(projects.filter((project) => selectedIds.includes(project.id)), `${t("canvas.title")}-${selectedIds.length}`)}>
                                    {t("canvas.exportSelected")}
                                </Button>
                                <Button danger disabled={!hydrated} onClick={() => setDeleteIds(selectedIds)}>
                                    {t("canvas.deleteSelected")}
                                </Button>
                            </>
                        ) : projects.length ? (
                            <Input allowClear prefix={<Search className="size-3.5 text-muted-foreground" />} placeholder={t("projects.search")} value={keyword} onChange={(event) => setKeyword(event.target.value)} className="!w-56" />
                        ) : null}
                        <Button disabled={!hydrated} icon={<FileUp className="size-4" />} onClick={() => inputRef.current?.click()}>
                            {t("canvas.import")}
                        </Button>
                        <Space.Compact>
                            <Button disabled={!hydrated} type="primary" icon={<Plus className="size-4" />} onClick={createAndEnter}>
                                {t("canvas.create")}
                            </Button>
                            <Dropdown disabled={!hydrated} menu={templateMenu} placement="bottomRight" trigger={["click"]}>
                                <Button type="primary" icon={<ChevronDown className="size-4" />} aria-label={t("templates.menu")} title={t("templates.menu")} className="!border-l-signal-foreground/15" />
                            </Dropdown>
                        </Space.Compact>
                    </div>
                </header>

                <SetupBanner />

                {!hydrated ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 min-[1900px]:grid-cols-5" aria-busy>
                        {Array.from({ length: 4 }, (_, index) => (
                            <div key={index} className="overflow-hidden rounded-[20px] border border-border bg-card">
                                <div className="aspect-[16/10] animate-pulse bg-secondary/60" />
                                <div className="space-y-2 px-3 py-3">
                                    <div className="h-3.5 w-1/2 animate-pulse rounded bg-secondary" />
                                    <div className="h-3 w-1/3 animate-pulse rounded bg-secondary/70" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : visibleProjects.length ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 min-[1900px]:grid-cols-5">
                        {visibleProjects.map((project) => (
                            <CanvasProjectCard key={project.id} project={project} />
                        ))}
                    </div>
                ) : projects.length ? (
                    <p className="py-16 text-center text-sm text-muted-foreground">{t("projects.noMatch", { keyword: keyword.trim() })}</p>
                ) : (
                    <section className="grid gap-8 rounded-[20px] border border-border bg-card p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-center">
                        <div>
                            <h2 className="text-lg font-semibold">{t("projects.emptyTitle")}</h2>
                            <ol className="mt-4 space-y-3">
                                {(t("projects.emptySteps", { returnObjects: true }) as string[]).map((step, index) => (
                                    <li key={step} className="flex gap-3 text-sm text-muted-foreground">
                                        <span className="tnum flex size-5 shrink-0 items-center justify-center rounded-full border border-border font-mono text-xs text-foreground">{index + 1}</span>
                                        <span className="pt-px">{step}</span>
                                    </li>
                                ))}
                            </ol>
                            <div className="mt-6 flex flex-wrap gap-2">
                                <Button type="primary" icon={<Plus className="size-4" />} onClick={createAndEnter}>
                                    {t("canvas.create")}
                                </Button>
                                <Button icon={<FileUp className="size-4" />} onClick={() => inputRef.current?.click()}>
                                    {t("canvas.import")}
                                </Button>
                            </div>
                            <div className="mt-6">
                                <div className="mb-2 text-xs font-medium text-muted-foreground">{t("templates.menu")}</div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {CANVAS_TEMPLATES.map((template) => (
                                        <button key={template.id} type="button" onClick={() => createFromTemplate(template.id)} className="flex items-start gap-2.5 rounded-2xl border border-border px-3 py-2.5 text-left transition-colors hover:bg-accent">
                                            <TemplateFlow className="mt-0.5 size-4 text-muted-foreground" />
                                            <span className="min-w-0">
                                                <span className="block text-sm font-medium">{t(template.titleKey)}</span>
                                                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{t(template.descriptionKey)}</span>
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <EmptyChainDiagram />
                    </section>
                )}
            </div>

            <input ref={inputRef} type="file" accept="application/zip,.zip" className="hidden" onChange={(event) => void importCanvas(event.target.files?.[0])} />
            <CanvasDeleteProjectsDialog />
        </main>
    );
}

/** A text → image → video chain, drawn with the canvas' own vocabulary: node boxes, tally lamps and wires. */
function EmptyChainDiagram() {
    const { t } = useTranslation();
    const steps = [
        { label: t("canvas.nodeTypes.text"), lamp: "bg-tally-ok" },
        { label: t("canvas.nodeTypes.image"), lamp: "bg-tally-ok" },
        { label: t("canvas.nodeTypes.video"), lamp: "bg-tally-live animate-pulse" },
    ];
    return (
        <div className="flex items-center justify-center gap-0 rounded-md border border-border bg-background px-4 py-10" aria-hidden>
            {steps.map((step, index) => (
                <div key={step.label} className="flex items-center">
                    {index ? <span className={index === 2 ? "h-0.5 w-8 bg-tally-live sm:w-12" : "h-px w-8 bg-muted-foreground/40 sm:w-12"} /> : null}
                    <div className="flex h-16 w-20 flex-col justify-between rounded-md border border-border bg-card p-2 sm:w-24">
                        <span className={`size-2 rounded-full ${step.lamp}`} />
                        <span className="text-xs text-muted-foreground">{step.label}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
