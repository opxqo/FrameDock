import { Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { navigationTools, type NavigationToolSlug } from "@/constant/navigation-tools";
import { AppConfigModal } from "@/components/layout/app-config-modal";
import { CommandPalette } from "@/components/layout/command-palette";
import { MobileNavDrawer } from "@/components/layout/mobile-nav-drawer";
import { UserStatusActions, iconButtonClass } from "@/components/layout/user-status-actions";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { useAgentStore } from "@/stores/use-agent-store";

export function AppTopNav() {
    const { t } = useTranslation();
    const { pathname } = useLocation();
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const autoConnectRef = useRef(false);
    const agentToken = useAgentStore((state) => state.token);
    const agentEnabled = useAgentStore((state) => state.enabled);
    const agentConnected = useAgentStore((state) => state.connected);
    const connectAgent = useAgentStore((state) => state.connectAgent);
    const hideHeader = /^\/canvas\/[^/]+/.test(pathname);
    // "/" is the project list, so it highlights the canvas destination.
    const slug = pathname.split("/").filter(Boolean)[0] || "canvas";
    const activeToolSlug = navigationTools.some((tool) => tool.slug === slug) ? (slug as NavigationToolSlug) : undefined;

    useEffect(() => {
        if (autoConnectRef.current || agentEnabled || agentConnected || !agentToken.trim()) return;
        autoConnectRef.current = true;
        connectAgent({ silent: true });
    }, [agentConnected, agentEnabled, agentToken, connectAgent]);

    return (
        <>
            {!hideHeader ? (
                <header className="sticky top-0 z-30 h-12 shrink-0 border-b border-border bg-background">
                    <div className="flex h-full items-stretch justify-between gap-4 px-3 sm:px-4">
                        <div className="flex min-w-0 items-center gap-1">
                            <button type="button" className={cn(iconButtonClass, "md:hidden")} onClick={() => setMobileNavOpen(true)} aria-label={t("topNav.openMenu")}>
                                <Menu />
                            </button>
                            <Link to="/" className="flex h-full shrink-0 items-center gap-2 pr-4 text-sm font-semibold text-foreground">
                                <span className="size-[18px] shrink-0 bg-signal" style={{ mask: "url(/logo.svg) center / contain no-repeat", WebkitMask: "url(/logo.svg) center / contain no-repeat" }} />
                                <span>FrameDock</span>
                            </Link>

                            <nav aria-label={t("topNav.navigation")} className="hide-scrollbar hidden h-12 min-w-0 items-stretch gap-1 overflow-x-auto md:flex">
                                {navigationTools.map((tool) => {
                                    const Icon = tool.icon;
                                    const active = tool.slug === activeToolSlug;
                                    return (
                                        <Link
                                            key={tool.slug}
                                            to={tool.slug === "canvas" ? "/" : `/${tool.slug}`}
                                            aria-current={active ? "page" : undefined}
                                            className={cn(
                                                "relative flex shrink-0 items-center gap-1.5 px-2.5 text-sm transition-colors duration-150 after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:rounded-full",
                                                active ? "font-medium text-foreground after:bg-signal" : "text-muted-foreground after:bg-transparent hover:text-foreground",
                                            )}
                                        >
                                            <Icon className="size-4" />
                                            <span className="truncate">{t(`navigation.${tool.slug}`)}</span>
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>

                        <div className="flex min-w-0 items-center justify-end">
                            <UserStatusActions />
                        </div>
                    </div>
                </header>
            ) : null}

            <MobileNavDrawer open={mobileNavOpen} activeToolSlug={activeToolSlug} onClose={() => setMobileNavOpen(false)} />
            <AppConfigModal />
            <CommandPalette />
        </>
    );
}
