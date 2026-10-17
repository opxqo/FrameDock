import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Button, Checkbox, Empty, Input, Spin } from "antd";
import { useTranslation } from "react-i18next";
import { Streamdown } from "streamdown";

import { ArrowRight, ExternalLink, Search, SkillBook } from "@/components/icons";
import { BUILTIN_SKILLS, buildSkillInstructions, mokeSourceUrl, type CanvasSkill } from "@/lib/skills/skills";
import { cn } from "@/lib/utils";
import { getMokeSkill, readableSkillFiles, readMokeSkillFile, searchMokeSkills, type MokeSkillSummary } from "@/services/api/moke";
import { usePromptSourceStore } from "@/stores/use-prompt-source-store";

const CATEGORIES = ["all", "builtin", "image", "video", "text", "creative-media"] as const;
type Category = (typeof CATEGORIES)[number];

type ListItem = { key: string; source: "builtin"; skill: CanvasSkill } | { key: string; source: "moke"; summary: MokeSkillSummary };

function useDebounced<T>(value: T, delay: number) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(value), delay);
        return () => window.clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}

function stripFrontmatter(text: string) {
    return text.replace(/^---\n[\s\S]*?\n---\n?/, "").trim();
}

// FrameDock: browse built-in and MOKE skills (list on the left, details on the right). `renderAction`
// receives a resolver that assembles the selected skill (fetching MOKE files when needed).
export function SkillBrowser({ renderAction, className }: { renderAction: (resolve: () => Promise<CanvasSkill>, ready: boolean) => ReactNode; className?: string }) {
    const { t } = useTranslation();
    const mokeEnabled = usePromptSourceStore((state) => state.mokeEnabled);
    const [keyword, setKeyword] = useState("");
    const [category, setCategory] = useState<Category>("all");
    const [selectedKey, setSelectedKey] = useState<string>(BUILTIN_SKILLS[0].id);
    const query = useDebounced(keyword.trim(), 300);
    const showMoke = mokeEnabled && category !== "builtin";

    const moke = useInfiniteQuery({
        queryKey: ["moke-skills", query, category],
        queryFn: ({ pageParam, signal }) => searchMokeSkills({ query, category: category === "all" ? undefined : category, cursor: pageParam || undefined }, signal),
        initialPageParam: "",
        getNextPageParam: (page) => page.nextCursor || undefined,
        enabled: showMoke,
        staleTime: 5 * 60 * 1000,
        retry: 1,
    });

    const items = useMemo<ListItem[]>(() => {
        const needle = query.toLowerCase();
        const builtin =
            category === "all" || category === "builtin" || BUILTIN_SKILLS.some((skill) => skill.category === category)
                ? BUILTIN_SKILLS.filter((skill) => (category === "all" || category === "builtin" || skill.category === category) && (!needle || `${skill.title}${skill.summary}`.toLowerCase().includes(needle))).map((skill) => ({
                      key: skill.id,
                      source: "builtin" as const,
                      skill,
                  }))
                : [];
        const online = showMoke ? (moke.data?.pages.flatMap((page) => page.items) || []).map((summary) => ({ key: summary.id, source: "moke" as const, summary })) : [];
        return [...builtin, ...online];
    }, [category, moke.data, query, showMoke]);

    const selected = items.find((item) => item.key === selectedKey) || items[0];

    return (
        <div className={cn("grid min-h-0 gap-5 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)]", className)} data-canvas-no-zoom onWheelCapture={(event) => event.stopPropagation()}>
            <section className="flex min-h-0 flex-col">
                <Input className="!rounded-full" prefix={<Search className="size-4 text-muted-foreground" />} placeholder={t("skills.searchPlaceholder")} value={keyword} onChange={(event) => setKeyword(event.target.value)} allowClear />
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {CATEGORIES.map((item) => (
                        <button
                            key={item}
                            type="button"
                            aria-pressed={category === item}
                            onClick={() => setCategory(item)}
                            className={cn("h-7 rounded-full border px-3 text-xs transition-colors", category === item ? "border-foreground/40 bg-signal/10 text-foreground" : "border-border text-muted-foreground hover:bg-accent hover:text-foreground")}
                        >
                            {t(`skills.categories.${item}`)}
                        </button>
                    ))}
                </div>
                {!mokeEnabled ? (
                    <p className="mt-3 text-xs text-muted-foreground">{t("skills.disabled")}</p>
                ) : moke.isError ? (
                    <p className="mt-3 text-xs text-destructive">{t("skills.offline", { error: moke.error instanceof Error ? moke.error.message : "" })}</p>
                ) : null}
                <div className="thin-scrollbar mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
                    {items.map((item) => {
                        const title = item.source === "builtin" ? item.skill.title : item.summary.title;
                        const summary = item.source === "builtin" ? item.skill.summary : item.summary.summary;
                        const active = selected?.key === item.key;
                        return (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => setSelectedKey(item.key)}
                                className={cn("w-full rounded-xl border px-3 py-2.5 text-left transition-colors", active ? "border-foreground/40 bg-signal/10" : "border-transparent hover:bg-accent")}
                            >
                                <span className="flex items-center gap-2">
                                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
                                    <span className="shrink-0 rounded-full border border-border px-1.5 text-[11px] leading-4 text-muted-foreground">{item.source === "builtin" ? t("skills.sourceBuiltin") : t("skills.sourceMoke")}</span>
                                </span>
                                <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground">{summary}</span>
                                {item.source === "moke" && item.summary.author?.name ? <span className="mt-1 block text-[11px] text-muted-foreground/80">{item.summary.author.name}</span> : null}
                            </button>
                        );
                    })}
                    {showMoke && moke.isLoading ? (
                        <div className="py-6 text-center">
                            <Spin size="small" />
                        </div>
                    ) : null}
                    {!items.length && !moke.isLoading ? <Empty className="!py-8" image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("skills.empty")} /> : null}
                    {showMoke && moke.hasNextPage ? (
                        <Button block type="text" className="!rounded-full" loading={moke.isFetchingNextPage} onClick={() => void moke.fetchNextPage()}>
                            {t("skills.loadMore")}
                        </Button>
                    ) : null}
                </div>
            </section>
            <section className="flex min-h-0 flex-col rounded-[20px] border border-border p-4">
                {selected ? (
                    selected.source === "builtin" ? (
                        <BuiltinDetail skill={selected.skill} renderAction={renderAction} />
                    ) : (
                        <MokeDetail summary={selected.summary} renderAction={renderAction} />
                    )
                ) : (
                    <p className="m-auto text-sm text-muted-foreground">{t("skills.selectHint")}</p>
                )}
            </section>
        </div>
    );
}

function DetailHeader({ title, summary, meta }: { title: string; summary: string; meta: ReactNode }) {
    return (
        <header className="shrink-0">
            <div className="flex items-center gap-2">
                <SkillBook className="size-5 text-muted-foreground" />
                <h3 className="min-w-0 flex-1 truncate text-base font-semibold">{title}</h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{summary}</p>
            <div className="mt-2 text-xs text-muted-foreground">{meta}</div>
        </header>
    );
}

function BuiltinDetail({ skill, renderAction }: { skill: CanvasSkill; renderAction: (resolve: () => Promise<CanvasSkill>, ready: boolean) => ReactNode }) {
    const { t } = useTranslation();
    return (
        <>
            <DetailHeader title={skill.title} summary={skill.summary} meta={t("skills.builtinRights")} />
            <pre className="thin-scrollbar mt-4 min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap rounded-xl bg-muted px-3 py-2.5 font-sans text-[13px] leading-6">{skill.instructions}</pre>
            <footer className="mt-4 flex shrink-0 justify-end gap-2">{renderAction(async () => skill, true)}</footer>
        </>
    );
}

function MokeDetail({ summary, renderAction }: { summary: MokeSkillSummary; renderAction: (resolve: () => Promise<CanvasSkill>, ready: boolean) => ReactNode }) {
    const { t } = useTranslation();
    const [checked, setChecked] = useState<string[]>([]);
    const detail = useQuery({ queryKey: ["moke-skill", summary.id, summary.version], queryFn: ({ signal }) => getMokeSkill(summary.id, summary.version, signal), staleTime: Infinity });
    const files = detail.data ? readableSkillFiles(detail.data) : [];
    const main = files.find((file) => file.path === "SKILL.md") || files[0];
    const mainText = useQuery({ queryKey: ["moke-skill-file", summary.id, summary.version, main?.path], queryFn: ({ signal }) => readMokeSkillFile(summary.id, summary.version, main!.path, signal), enabled: Boolean(main), staleTime: Infinity });
    const sourceUrl = mokeSourceUrl(summary.source?.page);

    useEffect(() => setChecked([]), [summary.id]);

    const resolve = async (): Promise<CanvasSkill> => {
        const extra = await Promise.all(checked.map(async (path) => ({ path, text: await readMokeSkillFile(summary.id, summary.version, path) })));
        const base = main ? [{ path: main.path, text: mainText.data ?? (await readMokeSkillFile(summary.id, summary.version, main.path)) }] : [];
        return {
            id: summary.id,
            source: "moke",
            title: summary.title,
            summary: summary.summary,
            category: summary.category,
            version: summary.version,
            author: summary.author?.name,
            sourceUrl,
            instructions: buildSkillInstructions({ title: summary.title, author: summary.author?.name, sourceUrl }, [...base, ...extra]),
        };
    };

    return (
        <>
            <DetailHeader
                title={summary.title}
                summary={summary.summary}
                meta={
                    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>{t("skills.rights", { author: summary.author?.name || "—" })}</span>
                        {sourceUrl ? (
                            <a href={sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 !text-foreground hover:!underline">
                                {t("skills.openSource")}
                                <ExternalLink className="size-3" />
                            </a>
                        ) : null}
                    </span>
                }
            />
            <div className="thin-scrollbar mt-4 min-h-0 flex-1 overflow-y-auto rounded-xl bg-muted px-4 py-3">
                {detail.isError || mainText.isError ? (
                    <p className="text-sm text-destructive">{t("skills.loadFailed", { error: ((detail.error || mainText.error) as Error)?.message || "" })}</p>
                ) : mainText.data ? (
                    <Streamdown className="agent-streamdown text-[13px] leading-6">{stripFrontmatter(mainText.data)}</Streamdown>
                ) : (
                    <div className="py-10 text-center">
                        <Spin size="small" />
                    </div>
                )}
            </div>
            {files.length > 1 ? (
                <div className="mt-3 shrink-0">
                    <div className="text-xs font-medium">{t("skills.files")}</div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t("skills.filesHint")}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        {files
                            .filter((file) => file !== main)
                            .map((file) => (
                                <Checkbox key={file.path} checked={checked.includes(file.path)} onChange={(event) => setChecked((paths) => (event.target.checked ? [...paths, file.path] : paths.filter((path) => path !== file.path)))}>
                                    <span className="font-mono text-xs">{file.path}</span>
                                </Checkbox>
                            ))}
                    </div>
                </div>
            ) : null}
            <footer className="mt-4 flex shrink-0 justify-end gap-2">{renderAction(resolve, Boolean(mainText.data))}</footer>
        </>
    );
}

export function SkillAttachButton({ resolve, ready, onAttach }: { resolve: () => Promise<CanvasSkill>; ready: boolean; onAttach: (skill: CanvasSkill) => void }) {
    const { t } = useTranslation();
    const [busy, setBusy] = useState(false);
    return (
        <Button
            type="primary"
            className="!rounded-full"
            disabled={!ready}
            loading={busy}
            icon={<ArrowRight className="size-4" />}
            iconPlacement="end"
            onClick={async () => {
                setBusy(true);
                try {
                    onAttach(await resolve());
                } finally {
                    setBusy(false);
                }
            }}
        >
            {t("skills.attach")}
        </Button>
    );
}
