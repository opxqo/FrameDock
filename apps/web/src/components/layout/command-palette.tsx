import { Command } from "cmdk";
import { Bot, FileText, Images, ImagePlus, Languages, LayoutGrid, Moon, Plus, Search, Settings2, Sun, Video } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { changeAppLocale, type AppLocale } from "@/i18n";
import { useAgentStore } from "@/stores/use-agent-store";
import { useCanvasStore } from "@/stores/canvas/use-canvas-store";
import { useCommandStore, type PaletteCommand } from "@/stores/use-command-store";
import { useConfigStore } from "@/stores/use-config-store";
import { useThemeStore } from "@/stores/use-theme-store";

const ICON = "size-4 shrink-0 text-muted-foreground";

// FrameDock: ⌘K / Ctrl+K palette. Global commands live here; pages add theirs through useCommandStore.
export function CommandPalette() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const open = useCommandStore((state) => state.open);
    const setOpen = useCommandStore((state) => state.setOpen);
    const sources = useCommandStore((state) => state.sources);
    const projects = useCanvasStore((state) => state.projects);
    const createProject = useCanvasStore((state) => state.createProject);
    const theme = useThemeStore((state) => state.theme);
    const setTheme = useThemeStore((state) => state.setTheme);
    const openConfigDialog = useConfigStore((state) => state.openConfigDialog);
    const toggleAgent = useAgentStore((state) => state.togglePanel);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k") {
                event.preventDefault();
                setOpen(!useCommandStore.getState().open);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [setOpen]);

    const commands = useMemo<PaletteCommand[]>(() => {
        const locale = i18n.resolvedLanguage as AppLocale;
        const nextLocale = locale === "zh-CN" ? "en-US" : "zh-CN";
        const go = t("palette.groups.go");
        const create = t("palette.groups.create");
        const recent = t("palette.groups.recent");
        const prefs = t("palette.groups.preferences");
        return [
            { id: "new-canvas", group: create, label: t("palette.newCanvas"), icon: <Plus className={ICON} />, keywords: ["new", "create", "canvas", "xinjian"], run: () => navigate(`/canvas/${createProject(t("canvas.defaultTitle", { count: projects.length + 1 }))}`) },
            ...projects.slice(0, 6).map((project) => ({ id: `project-${project.id}`, group: recent, label: project.title || t("canvas.project.untitled"), icon: <LayoutGrid className={ICON} />, keywords: ["open", "project"], run: () => navigate(`/canvas/${project.id}`) })),
            { id: "go-projects", group: go, label: t("navigation.canvas"), icon: <LayoutGrid className={ICON} />, keywords: ["projects", "canvas", "home"], run: () => navigate("/") },
            { id: "go-image", group: go, label: t("navigation.image"), icon: <ImagePlus className={ICON} />, keywords: ["image", "workbench"], run: () => navigate("/image") },
            { id: "go-video", group: go, label: t("navigation.video"), icon: <Video className={ICON} />, keywords: ["video", "workbench"], run: () => navigate("/video") },
            { id: "go-assets", group: go, label: t("navigation.assets"), icon: <Images className={ICON} />, keywords: ["assets", "library"], run: () => navigate("/assets") },
            { id: "go-prompts", group: go, label: t("navigation.prompts"), icon: <FileText className={ICON} />, keywords: ["prompts"], run: () => navigate("/prompts") },
            { id: "go-config", group: go, label: t("palette.openSettings"), icon: <Settings2 className={ICON} />, keywords: ["settings", "config", "api key", "autodl", "model"], run: () => openConfigDialog(false) },
            { id: "toggle-theme", group: prefs, label: t(theme === "dark" ? "topNav.lightTheme" : "topNav.darkTheme"), icon: theme === "dark" ? <Sun className={ICON} /> : <Moon className={ICON} />, keywords: ["theme", "dark", "light"], run: () => setTheme(theme === "dark" ? "light" : "dark") },
            { id: "toggle-locale", group: prefs, label: t("topNav.switchLanguage", { language: t(nextLocale === "zh-CN" ? "locale.zhCN" : "locale.enUS") }), icon: <Languages className={ICON} />, keywords: ["language", "english", "chinese"], run: () => void changeAppLocale(nextLocale) },
            { id: "toggle-agent", group: prefs, label: t("topNav.openAgent"), icon: <Bot className={ICON} />, keywords: ["agent", "codex"], run: toggleAgent },
        ];
    }, [createProject, i18n.resolvedLanguage, navigate, openConfigDialog, projects, setTheme, t, theme, toggleAgent]);

    // Page commands first: they are about what the user is looking at.
    const all = [...Object.values(sources).flat(), ...commands];
    const groups = Array.from(new Set(all.map((command) => command.group)));
    const run = (command: PaletteCommand) => {
        setOpen(false);
        command.run();
    };

    return (
        <Command.Dialog
            open={open}
            onOpenChange={setOpen}
            label={t("palette.title")}
            loop
            overlayClassName="fixed inset-0 z-[1250] bg-black/40"
            contentClassName="fixed left-1/2 top-[14vh] z-[1251] w-[min(560px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-float"
        >
            <div className="flex items-center gap-2 border-b border-border px-3">
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <Command.Input placeholder={t("palette.placeholder")} className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            </div>
            <Command.List className="max-h-[min(420px,60vh)] overflow-y-auto p-1.5">
                <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">{t("palette.empty")}</Command.Empty>
                {groups.map((group) => (
                    <Command.Group key={group} heading={group} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground">
                        {all
                            .filter((command) => command.group === group)
                            .map((command) => (
                                <Command.Item
                                    key={command.id}
                                    value={`${command.id} ${command.label}`}
                                    keywords={command.keywords}
                                    onSelect={() => run(command)}
                                    className="flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 text-sm data-[selected=true]:bg-accent"
                                >
                                    {command.icon}
                                    <span className="min-w-0 flex-1 truncate">{command.label}</span>
                                    {command.shortcut ? <kbd className="font-mono text-xs text-muted-foreground">{command.shortcut}</kbd> : null}
                                </Command.Item>
                            ))}
                    </Command.Group>
                ))}
            </Command.List>
            <div className="flex items-center gap-3 border-t border-border px-3 py-2 text-xs text-muted-foreground">
                <span><kbd className="font-mono">↑↓</kbd> {t("palette.hintMove")}</span>
                <span><kbd className="font-mono">↵</kbd> {t("palette.hintRun")}</span>
                <span><kbd className="font-mono">Esc</kbd> {t("palette.hintClose")}</span>
            </div>
        </Command.Dialog>
    );
}
