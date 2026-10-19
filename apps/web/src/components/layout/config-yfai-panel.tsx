import { Alert, Button, Tabs, Tag } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { ExternalLink, RefreshCw } from "@/components/icons";
import { YfaiModelList } from "@/components/layout/config-yfai";
import { ConfigYfaiLogs } from "@/components/layout/config-yfai-logs";
import { ConfigYfaiUsage } from "@/components/layout/config-yfai-usage";
import { ConfigYfaiAdjustments, ConfigYfaiWorks } from "@/components/layout/config-yfai-works";
import type { YfaiBalance } from "@/lib/yfai-account";
import { YFAI_DOCS_URL, yfaiModels, yfaiToolOnly } from "@/lib/yfai-catalog";
import { fetchYfaiBalance } from "@/services/api/yfai";
import type { AiConfig } from "@/stores/use-config-store";

// FrameDock: everything about the YFAI account in one place — balance, models, call log, ledger, recent works and
// the gateway's parameter receipts. Every read here is free; account reads are limited to 60/min by YFAI, so
// nothing polls: a tab loads when opened and on "refresh".

const YFAI_CONSOLE_URL = "https://yf.token6688.com/";
type TabKey = "works" | "usage" | "logs" | "adjustments" | "models";

export function ConfigYfaiPanel({ config, onConfigChange, onNavigate }: { config: AiConfig; onConfigChange: (config: AiConfig) => void; onNavigate: (tab: "channels" | "job-audit") => void }) {
    const { t, i18n } = useTranslation();
    const apiKey = config.channels.find((channel) => channel.id === "yfai")?.apiKey || "";
    const [tab, setTab] = useState<TabKey>("works");
    const [balance, setBalance] = useState<YfaiBalance>();
    const [balanceError, setBalanceError] = useState("");
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        if (!apiKey) return;
        setLoading(true);
        setBalanceError("");
        try {
            setBalance(await fetchYfaiBalance(apiKey));
        } catch (reason) {
            setBalanceError(reason instanceof Error ? reason.message : String(reason));
        } finally {
            setLoading(false);
        }
    }, [apiKey]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    if (!apiKey) {
        return (
            <Alert
                type="info"
                showIcon
                message={t("yfaiPanel.noKey")}
                action={
                    <Button size="small" type="primary" onClick={() => onNavigate("channels")}>
                        {t("yfaiPanel.goToKey")}
                    </Button>
                }
            />
        );
    }

    const models = yfaiModels(config.yfaiModels);
    const enabled = models.filter((model) => model.available !== false && !yfaiToolOnly(model) && config.yfaiEnabledModels.includes(model.id)).length;
    const credits = (value?: number) => (value === undefined ? "—" : value.toFixed(2));
    const syncedAt = config.yfaiSyncedAt ? new Date(config.yfaiSyncedAt).toLocaleString(i18n.resolvedLanguage, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-stone-200 px-4 py-3 dark:border-stone-800">
                <div>
                    <div className="text-xs text-stone-500">{t("yfaiPanel.balance.available")}</div>
                    <div className="tnum text-xl font-semibold">⚡{credits(balance?.available)}</div>
                </div>
                <div>
                    <div className="text-xs text-stone-500">{t("yfaiPanel.balance.frozen")}</div>
                    <div className="tnum text-sm">⚡{credits(balance?.frozen)}</div>
                </div>
                <div>
                    <div className="text-xs text-stone-500">{t("yfaiPanel.balance.total")}</div>
                    <div className="tnum text-sm">⚡{credits(balance?.total)}</div>
                </div>
                <div className="text-xs text-stone-500">
                    <div>{t("yfai.enabledCount", { count: enabled, total: models.length })}</div>
                    <div>{syncedAt ? t("yfaiPanel.syncedAt", { time: syncedAt }) : <Tag color="gold" className="!m-0">{t("yfai.notSynced")}</Tag>}</div>
                </div>
                <div className="ml-auto flex flex-wrap gap-2">
                    <Button size="small" icon={<RefreshCw className="size-3.5" />} loading={loading} onClick={() => void refresh()}>
                        {t("yfaiPanel.refresh")}
                    </Button>
                    <Button size="small" href={YFAI_CONSOLE_URL} target="_blank" icon={<ExternalLink className="size-3.5" />}>
                        {t("yfaiPanel.console")}
                    </Button>
                    <Button size="small" type="text" href={YFAI_DOCS_URL} target="_blank">
                        {t("yfai.docs")}
                    </Button>
                </div>
            </div>
            {balanceError ? <Alert type="warning" showIcon message={t("yfaiPanel.balance.failed", { error: balanceError })} /> : null}
            <Tabs
                size="small"
                activeKey={tab}
                onChange={(key) => setTab(key as TabKey)}
                destroyOnHidden
                items={[
                    { key: "works", label: t("yfaiPanel.tabs.works"), children: <ConfigYfaiWorks apiKey={apiKey} /> },
                    { key: "usage", label: t("yfaiPanel.tabs.usage"), children: <ConfigYfaiUsage apiKey={apiKey} onAudit={() => onNavigate("job-audit")} /> },
                    { key: "logs", label: t("yfaiPanel.tabs.logs"), children: <ConfigYfaiLogs /> },
                    { key: "adjustments", label: t("yfaiPanel.tabs.adjustments"), children: <ConfigYfaiAdjustments apiKey={apiKey} /> },
                    { key: "models", label: t("yfaiPanel.tabs.models"), children: <YfaiModelList config={config} onConfigChange={onConfigChange} /> },
                ]}
            />
        </div>
    );
}
