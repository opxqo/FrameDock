import { Button } from "antd";
import { KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { useConfigStore } from "@/stores/use-config-store";

/** True when at least one real (non-mock) channel has a key and models. */
export function useHasRealModels() {
    return useConfigStore((state) => state.config.channels.some((channel) => channel.id !== "mock" && channel.apiKey.trim() && channel.models.length));
}

// FrameDock: first-run guidance shown inline instead of a dialog on the first failed run.
export function SetupBanner({ className }: { className?: string }) {
    const { t } = useTranslation();
    const ready = useHasRealModels();
    const openConfigDialog = useConfigStore((state) => state.openConfigDialog);
    if (ready) return null;
    return (
        <section className={cn("flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3", className)}>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-signal/15 text-signal">
                <KeyRound className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
                <h2 className="text-sm font-medium">{t("setup.title")}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{t("setup.description")}</p>
            </div>
            <Button type="primary" onClick={() => openConfigDialog(false, "channels")}>
                {t("setup.action")}
            </Button>
        </section>
    );
}
