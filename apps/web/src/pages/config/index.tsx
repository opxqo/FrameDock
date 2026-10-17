import { useTranslation } from "react-i18next";

import { AppConfigPanel } from "@/components/layout/app-config-modal";

export default function ConfigPage() {
    const { t } = useTranslation();

    return (
        <main className="h-full overflow-y-auto bg-background">
            <div className="mx-auto max-w-5xl px-4 py-5">
                <h1 className="mb-5 text-xl font-semibold">{t("config.title")}</h1>
                <AppConfigPanel />
            </div>
        </main>
    );
}
