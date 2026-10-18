import { BookOpen, Copy, Download, FolderPlus, Plus, Search, SkillBook, Star, Upload } from "@/components/icons";
import { type ReactNode, type UIEvent, useEffect, useMemo, useState } from "react";
import { App, Button, Empty, Input, Segmented, Spin, Tag } from "antd";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import { PromptCard } from "@/components/prompts/prompt-card";
import { PromptEditorModal } from "@/components/prompts/prompt-editor-modal";
import { PromptRecipesBrowser } from "@/components/prompts/prompt-recipes-browser";
import { SkillBrowser } from "@/components/skills/skill-browser";
import type { CanvasSkill } from "@/lib/skills/skills";
import { usePromptList } from "@/components/prompts/use-prompt-list";
import { PromptDetailDialog } from "./components/prompt-detail-dialog";
import { useCopyText } from "@/hooks/use-copy-text";
import { cn } from "@/lib/utils";
import { downloadLibrary, pickLibraryFile, type LibraryType } from "@/lib/library-io";
import { useAssetStore } from "@/stores/use-asset-store";
import { sortLibraryPrompts, usePromptLibraryStore, type LibraryPrompt, type LibraryPromptDraft } from "@/stores/use-prompt-library-store";
import { useSkillLibraryStore } from "@/stores/use-skill-library-store";
import { ALL_PROMPTS_OPTION, LOCAL_PROMPT_SOURCE_ID, localPromptCategory, type Prompt } from "@/services/api/prompts";

const TABS = ["mine", "mySkills", "prompts", "recipes", "skills"] as const;
type Tab = (typeof TABS)[number];

export default function PromptsPage() {
    const { message } = App.useApp();
    const { t } = useTranslation();
    const [titleKeyword, setTitleKeyword] = useState("");
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState(ALL_PROMPTS_OPTION);
    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const tabParam = searchParams.get("tab") as Tab | null;
    const tab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : "mine";
    const setTab = (next: Tab) => setSearchParams(next === "mine" ? {} : { tab: next }, { replace: true });
    // undefined → editor closed; null → create; an item → edit.
    const [editingPrompt, setEditingPrompt] = useState<LibraryPrompt | null | undefined>(undefined);
    const [promptInitial, setPromptInitial] = useState<Partial<LibraryPromptDraft> | undefined>(undefined);
    const addAsset = useAssetStore((state) => state.addAsset);
    const libraryPrompts = usePromptLibraryStore((state) => state.items);
    const importPrompts = usePromptLibraryStore((state) => state.importItems);
    const localSkills = useSkillLibraryStore((state) => state.items);
    const importSkills = useSkillLibraryStore((state) => state.importItems);
    const addLocalSkill = useSkillLibraryStore((state) => state.add);
    const copyText = useCopyText();
    const { query, items: promptItems, tags: promptTags, categories: promptCategoryOptions, total: totalPrompts } = usePromptList({ keyword: titleKeyword, tags: selectedTags, category: selectedCategory, includeLocal: false, enabled: tab === "prompts" });

    // ⌘K "新建提示词" / "新建 Skill" land here with ?new=1 (the skill browser reads it on mount).
    const [skillCreateNonce, setSkillCreateNonce] = useState(0);
    useEffect(() => {
        if (searchParams.get("new") !== "1") return;
        if (tab === "mine") openPromptEditor(null);
        if (tab === "mySkills") setSkillCreateNonce((value) => value + 1);
        const next = new URLSearchParams(searchParams);
        next.delete("new");
        setSearchParams(next, { replace: true });
    }, [searchParams, setSearchParams]);

    function openPromptEditor(item: LibraryPrompt | null, initial?: Partial<LibraryPromptDraft>) {
        setPromptInitial(initial);
        setEditingPrompt(item);
    }

    const savePromptToMine = (item: Prompt) => {
        openPromptEditor(null, { title: item.title, prompt: item.prompt, description: item.description, tags: item.tags, coverUrl: item.coverUrl });
    };

    const saveSkillToMine = (skill: CanvasSkill) => {
        addLocalSkill({ title: skill.title, summary: skill.summary, category: ["text", "image", "video"].includes(skill.category) ? skill.category : "text", instructions: skill.instructions });
        message.success(t("skills.mine.savedToMine", { name: skill.title }));
    };

    const exportLibrary = (type: LibraryType) => {
        const items = type === "prompts" ? libraryPrompts : localSkills;
        if (!items.length) return message.info(t("prompts.mine.nothingToExport"));
        downloadLibrary(type, items);
    };

    const importLibrary = async (type: LibraryType) => {
        try {
            const items = await pickLibraryFile(type);
            if (!items.length) return;
            const count = type === "prompts" ? importPrompts(items) : importSkills(items);
            if (count) message.success(t("prompts.mine.imported", { count }));
            else message.warning(t("prompts.mine.importEmpty"));
        } catch (error) {
            message.error(t("prompts.mine.importFailed", { error: error instanceof Error ? error.message : String(error) }));
        }
    };

    const libraryActions = (type: LibraryType) => (
        <div className="ml-auto flex items-center gap-2">
            <Button className="!rounded-full" icon={<Upload className="size-4" />} onClick={() => void importLibrary(type)}>
                {t("prompts.mine.import")}
            </Button>
            <Button className="!rounded-full" icon={<Download className="size-4" />} onClick={() => exportLibrary(type)}>
                {t("prompts.mine.export")}
            </Button>
            {type === "prompts" ? (
                <Button type="primary" className="!rounded-full" icon={<Plus className="size-4" />} onClick={() => openPromptEditor(null)}>
                    {t("prompts.mine.create")}
                </Button>
            ) : null}
        </div>
    );

    useEffect(() => {
        if (query.isError) message.error(query.error instanceof Error ? query.error.message : t("prompts.loadFailed"));
    }, [message, query.error, query.isError, t]);

    const toggleTag = (tag: string) => {
        if (tag === ALL_PROMPTS_OPTION) return setSelectedTags([]);
        setSelectedTags((items) => (items.includes(tag) ? items.filter((item) => item !== tag) : [...items, tag]));
    };

    const savePromptAsset = (item: Prompt) => {
        addAsset({ kind: "text", title: item.title, coverUrl: item.coverUrl, tags: item.tags, source: item.category, data: { content: item.prompt }, metadata: { source: "prompt-library", promptId: item.id, githubUrl: item.githubUrl } });
        message.success(t("common.addedToAssets"));
    };

    const saveSkillAsset = (skill: CanvasSkill) => {
        addAsset({ kind: "text", title: skill.title, coverUrl: "", tags: ["Skill"], source: skill.source === "moke" ? "MOKE AIGC" : "FrameDock", data: { content: skill.instructions }, metadata: { source: "skill", skillId: skill.id, version: skill.version, sourceUrl: skill.sourceUrl } });
        message.success(t("skills.saved"));
    };

    const handleListScroll = (event: UIEvent<HTMLDivElement>) => {
        if (tab !== "prompts") return;
        const target = event.currentTarget;
        if (query.hasNextPage && !query.isFetchingNextPage && target.scrollTop + target.clientHeight >= target.scrollHeight - 160) void query.fetchNextPage();
    };

    return (
        <div className="flex h-full flex-col overflow-hidden bg-background text-stone-800 dark:text-stone-100">
            <main className="min-h-0 flex-1 overflow-y-auto bg-background px-4 py-5" onScroll={handleListScroll}>
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-xl font-semibold">{t("prompts.title")}</h1>
                        <Segmented value={tab} onChange={(value) => setTab(value as Tab)} options={TABS.map((value) => ({ value, label: t(`prompts.tabs.${value}`) }))} />
                        {tab === "prompts" ? <p className="tnum text-sm text-muted-foreground">{t("prompts.total", { count: totalPrompts })}</p> : null}
                        {tab === "mine" ? libraryActions("prompts") : tab === "mySkills" ? libraryActions("skills") : null}
                    </div>
                    {tab === "mine" ? (
                        <MyPrompts items={libraryPrompts} onOpen={(item) => openPromptEditor(item)} onCreate={() => openPromptEditor(null)} onCopy={(item) => copyText(item.prompt, t("common.promptCopied"))} />
                    ) : tab === "mySkills" ? (
                        <SkillBrowser
                            key={`mine-${skillCreateNonce}`}
                            initialCategory="mine"
                            startCreating={skillCreateNonce > 0}
                            className="mt-5 h-[calc(100dvh-10rem)]"
                            renderAction={(resolve, ready) => (
                                <Button className="!rounded-full" disabled={!ready} icon={<Copy className="size-4" />} onClick={async () => copyText((await resolve()).instructions, t("skills.copied"))}>
                                    {t("skills.copy")}
                                </Button>
                            )}
                        />
                    ) : tab === "recipes" ? (
                        <div className="mt-5">
                            <PromptRecipesBrowser />
                        </div>
                    ) : tab === "skills" ? (
                        <SkillBrowser
                            key="market"
                            className="mt-5 h-[calc(100dvh-10rem)]"
                            renderAction={(resolve, ready) => (
                                <>
                                    <Button className="!rounded-full" disabled={!ready} icon={<SkillBook className="size-4" />} onClick={async () => saveSkillToMine(await resolve())}>
                                        {t("skills.mine.saveToMine")}
                                    </Button>
                                    <Button className="!rounded-full" disabled={!ready} icon={<Copy className="size-4" />} onClick={async () => copyText((await resolve()).instructions, t("skills.copied"))}>
                                        {t("skills.copy")}
                                    </Button>
                                    <Button type="primary" className="!rounded-full" disabled={!ready} icon={<FolderPlus className="size-4" />} onClick={async () => saveSkillAsset(await resolve())}>
                                        {t("skills.saveAsset")}
                                    </Button>
                                </>
                            )}
                        />
                    ) : (
                    <div className="mt-5 grid items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6">
                        <aside className="thin-scrollbar max-h-72 overflow-y-auto border-b border-stone-200 pb-5 lg:sticky lg:top-0 lg:max-h-[calc(100dvh-6rem)] lg:border-b-0 lg:border-r lg:pb-8 lg:pr-5 dark:border-stone-800">
                            <PromptFilter label={t("prompts.category")} options={promptCategoryOptions} selected={selectedCategory} onChange={setSelectedCategory} />
                            <div className="mt-6">
                                <div className="mb-2 text-xs font-medium text-muted-foreground">{t("prompts.tags")}</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {promptTags.map((tag) => {
                                        const active = tag === ALL_PROMPTS_OPTION ? selectedTags.length === 0 : selectedTags.includes(tag);
                                        return <Tag.CheckableTag key={tag} checked={active} className={cn("prompt-filter-tag", active && "is-active")} onChange={() => toggleTag(tag)}>{tag === ALL_PROMPTS_OPTION ? t("common.all") : tag}</Tag.CheckableTag>;
                                    })}
                                </div>
                            </div>
                        </aside>
                        <section className="min-w-0">
                            <Input size="large" prefix={<Search className="size-4 text-stone-400" />} value={titleKeyword} placeholder={t("prompts.search")} onChange={(event) => setTitleKeyword(event.target.value)} />
                            {query.isLoading ? <div className="flex h-60 items-center justify-center"><Spin /></div> : null}
                            {!query.isLoading ? <div className="mt-5"><PromptGrid items={promptItems} onOpen={setSelectedPrompt} renderActions={(item) => <Button type="text" size="small" icon={<BookOpen className="size-3.5" />} onClick={() => savePromptToMine(item)}>{t("prompts.mine.saveToMine")}</Button>} onCopy={(item) => copyText(item.prompt, t("common.promptCopied"))} emptyText={t("prompts.empty")} /></div> : null}
                            <div className="mt-6 text-center text-xs text-stone-500 dark:text-stone-400">{query.isFetchingNextPage ? t("prompts.loading") : query.hasNextPage ? t("prompts.loadMore") : promptItems.length > 0 ? t("prompts.end") : null}</div>
                        </section>
                    </div>
                    )}
                </div>
            </main>

            <PromptDetailDialog prompt={selectedPrompt} onClose={() => setSelectedPrompt(null)} onCopy={(prompt) => copyText(prompt, t("common.promptCopied"))} onSaveAsset={savePromptAsset} onSaveMine={(item) => { setSelectedPrompt(null); savePromptToMine(item); }} />
            <PromptEditorModal prompt={editingPrompt} initial={promptInitial} onClose={() => setEditingPrompt(undefined)} />
        </div>
    );
}

function PromptFilter({ label, options, selected, onChange }: { label: string; options: string[]; selected: string; onChange: (value: string) => void }) {
    const { t } = useTranslation();
    return <div><div className="mb-2 text-xs font-medium text-muted-foreground">{label}</div><div className="flex flex-wrap gap-1.5">{options.map((option) => <Tag.CheckableTag key={option} checked={selected === option} className={cn("prompt-filter-tag", selected === option && "is-active")} onChange={() => onChange(option)}>{option === ALL_PROMPTS_OPTION ? t("common.all") : option}</Tag.CheckableTag>)}</div></div>;
}

function PromptGrid({ items, onOpen, onCopy, renderActions, emptyText }: { items: Prompt[]; onOpen: (item: Prompt) => void; onCopy: (item: Prompt) => void; renderActions: (item: Prompt) => ReactNode; emptyText: string }) {
    return <div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{items.map((item) => <PromptCard key={`${item.sourceId}:${item.id}`} item={item} onOpen={() => onOpen(item)} onCopy={() => onCopy(item)} extraAction={renderActions(item)} />)}</div>{items.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} className="py-16" /> : null}</div>;
}

function toPrompt(item: LibraryPrompt): Prompt {
    return { ...item, referenceImageUrls: [], preview: "", sourceId: LOCAL_PROMPT_SOURCE_ID, category: localPromptCategory(), githubUrl: "" };
}

// FrameDock: the user's own prompts — search, favourites filter, and a card grid; clicking a card edits it.
function MyPrompts({ items, onOpen, onCreate, onCopy }: { items: LibraryPrompt[]; onOpen: (item: LibraryPrompt) => void; onCreate: () => void; onCopy: (item: LibraryPrompt) => void }) {
    const { t } = useTranslation();
    const toggleFavorite = usePromptLibraryStore((state) => state.toggleFavorite);
    const [keyword, setKeyword] = useState("");
    const [favoritesOnly, setFavoritesOnly] = useState(false);
    const [tag, setTag] = useState(ALL_PROMPTS_OPTION);
    const tags = useMemo(() => Array.from(new Set(items.flatMap((item) => item.tags))), [items]);
    const visible = useMemo(() => {
        const needle = keyword.trim().toLowerCase();
        return sortLibraryPrompts(items).filter(
            (item) => (!favoritesOnly || item.favorite) && (tag === ALL_PROMPTS_OPTION || item.tags.includes(tag)) && (!needle || [item.title, item.prompt, item.description, ...item.tags].join(" ").toLowerCase().includes(needle)),
        );
    }, [favoritesOnly, items, keyword, tag]);

    if (!items.length) {
        return (
            <Empty className="py-20" image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("prompts.mine.empty")}>
                <Button type="primary" className="!rounded-full" icon={<Plus className="size-4" />} onClick={onCreate}>
                    {t("prompts.mine.create")}
                </Button>
            </Empty>
        );
    }

    return (
        <div className="mt-5">
            <div className="flex flex-wrap items-center gap-2">
                <Input className="max-w-md !rounded-full" prefix={<Search className="size-4 text-muted-foreground" />} value={keyword} placeholder={t("prompts.search")} onChange={(event) => setKeyword(event.target.value)} allowClear />
                <Tag.CheckableTag checked={favoritesOnly} className={cn("prompt-filter-tag", favoritesOnly && "is-active")} onChange={setFavoritesOnly}>
                    <span className="inline-flex items-center gap-1">
                        <Star className="inline size-3.5" />
                        {t("prompts.mine.favoritesOnly")}
                    </span>
                </Tag.CheckableTag>
                {tags.length ? (
                    <>
                        <span className="mx-1 h-4 w-px bg-border" />
                        {[ALL_PROMPTS_OPTION, ...tags].map((option) => (
                            <Tag.CheckableTag key={option} checked={tag === option} className={cn("prompt-filter-tag", tag === option && "is-active")} onChange={() => setTag(option)}>
                                {option === ALL_PROMPTS_OPTION ? t("common.all") : option}
                            </Tag.CheckableTag>
                        ))}
                    </>
                ) : null}
                <span className="tnum ml-auto text-sm text-muted-foreground">{t("prompts.total", { count: visible.length })}</span>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {visible.map((item) => (
                    <PromptCard key={item.id} item={toPrompt(item)} onOpen={() => onOpen(item)} onCopy={() => onCopy(item)} favorite={item.favorite} onToggleFavorite={() => toggleFavorite(item.id)} />
                ))}
            </div>
            {!visible.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("prompts.empty")} className="py-16" /> : null}
        </div>
    );
}
