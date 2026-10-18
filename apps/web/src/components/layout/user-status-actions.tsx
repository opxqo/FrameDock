import { GithubOutlined } from "@ant-design/icons";
import { Dropdown, Tooltip, type MenuProps } from "antd";
import { BookOpen, Bot, FileText, History, Keyboard, Languages, Moon, MoreHorizontal, Puzzle, Search, Settings2, Sun, Terminal } from "@/components/icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { VersionReleaseModal } from "@/components/layout/version-release-modal";
import { APP_VERSION, DOCS_URL } from "@/constant/env";
import { changeAppLocale, type AppLocale } from "@/i18n";
import { cn } from "@/lib/utils";
import { useAgentStore } from "@/stores/use-agent-store";
import { MOD_KEY, useCommandStore } from "@/stores/use-command-store";
import { useConfigStore } from "@/stores/use-config-store";
import { useThemeStore } from "@/stores/use-theme-store";

type UserStatusActionsProps = {
    showConfig?: boolean;
    variant?: "default" | "canvas";
    onOpenShortcuts?: () => void;
    onOpenPlugins?: () => void;
};

export const iconButtonClass =
    "inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground active:bg-secondary [&_svg]:size-[18px]";

// FrameDock: the header keeps three things — search/commands, settings, and a "more" menu that holds
// everything secondary (theme, language, agent, docs, version, upstream links).
export function UserStatusActions({ showConfig = true, variant = "default", onOpenShortcuts, onOpenPlugins }: UserStatusActionsProps) {
    const { i18n, t } = useTranslation();
    const navigate = useNavigate();
    const theme = useThemeStore((state) => state.theme);
    const setTheme = useThemeStore((state) => state.setTheme);
    const openConfigDialog = useConfigStore((state) => state.openConfigDialog);
    const setPaletteOpen = useCommandStore((state) => state.setOpen);
    const toggleAgent = useAgentStore((state) => state.togglePanel);
    const agentOpen = useAgentStore((state) => state.panelOpen);
    const [versionOpen, setVersionOpen] = useState(false);
    const locale = i18n.resolvedLanguage as AppLocale;
    const nextLocale = locale === "zh-CN" ? "en-US" : "zh-CN";

    const items: MenuProps["items"] = [
        ...(onOpenPlugins ? [{ key: "plugins", icon: <Puzzle className="size-4" />, label: t("topNav.plugins"), onClick: onOpenPlugins }] : []),
        ...(onOpenShortcuts ? [{ key: "shortcuts", icon: <Keyboard className="size-4" />, label: t("topNav.shortcuts"), extra: <kbd className="font-mono text-xs opacity-60">?</kbd>, onClick: onOpenShortcuts }] : []),
        { key: "prompts", icon: <FileText className="size-4" />, label: t("navigation.prompts"), onClick: () => navigate("/prompts") },
        { key: "logs", icon: <Terminal className="size-4" />, label: t("navigation.logs"), onClick: () => navigate("/logs") },
        { key: "agent", icon: <Bot className="size-4" />, label: t(agentOpen ? "topNav.closeAgent" : "topNav.openAgent"), onClick: toggleAgent },
        { type: "divider" },
        { key: "theme", icon: theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />, label: t(theme === "dark" ? "topNav.lightTheme" : "topNav.darkTheme"), onClick: () => setTheme(theme === "dark" ? "light" : "dark") },
        { key: "locale", icon: <Languages className="size-4" />, label: t("topNav.switchLanguage", { language: t(nextLocale === "zh-CN" ? "locale.zhCN" : "locale.enUS") }), onClick: () => void changeAppLocale(nextLocale) },
        { type: "divider" },
        { key: "docs", icon: <BookOpen className="size-4" />, label: <a href={DOCS_URL} target="_blank" rel="noopener noreferrer">{t("topNav.upstreamDocs")}</a> },
        { key: "github", icon: <GithubOutlined />, label: <a href="https://github.com/basketikun/infinite-canvas" target="_blank" rel="noopener noreferrer">{t("topNav.upstreamGithub")}</a> },
        { key: "version", icon: <History className="size-4" />, label: t("topNav.version"), extra: <span className="tnum font-mono text-xs opacity-60">{APP_VERSION}</span>, onClick: () => setVersionOpen(true) },
    ];

    return (
        <div className="inline-flex shrink-0 items-center gap-1">
            <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className={cn(
                    "hidden h-9 items-center gap-2 rounded-full pl-3 pr-2 text-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground sm:inline-flex",
                    variant === "canvas" ? "w-44" : "w-56 border border-border bg-surface",
                )}
                aria-label={t("palette.title")}
            >
                <Search className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-left">{t("palette.trigger")}</span>
                <kbd className="rounded-full px-1.5 font-mono text-[11px] leading-4 text-muted-foreground/80">{MOD_KEY}K</kbd>
            </button>
            <button type="button" className={cn(iconButtonClass, "sm:hidden")} onClick={() => setPaletteOpen(true)} aria-label={t("palette.title")}>
                <Search />
            </button>
            {showConfig ? (
                <Tooltip title={t("navigation.config")} mouseEnterDelay={0.3}>
                    <button type="button" className={iconButtonClass} onClick={() => openConfigDialog(false)} aria-label={t("navigation.config")}>
                        <Settings2 />
                    </button>
                </Tooltip>
            ) : null}
            <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight">
                <button type="button" className={iconButtonClass} aria-label={t("topNav.more")}>
                    <MoreHorizontal />
                </button>
            </Dropdown>
            <VersionReleaseModal open={versionOpen} onOpenChange={setVersionOpen} />
        </div>
    );
}
