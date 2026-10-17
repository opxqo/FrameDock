import { useState } from "react";
import { Button, Segmented } from "antd";
import { useTranslation } from "react-i18next";

import { Copy } from "@/components/icons";
import { useCopyText } from "@/hooks/use-copy-text";
import { PROMPT_PRESET_GROUPS, PROMPT_PRESETS, type PromptPresetGroup } from "@/lib/presets/prompt-presets";

// FrameDock: read-only view of the built-in prompt recipes on the prompts page.
export function PromptRecipesBrowser() {
    const { t, i18n } = useTranslation();
    const copyText = useCopyText();
    const [group, setGroup] = useState<PromptPresetGroup>("composition");
    const english = i18n.resolvedLanguage === "en-US";

    return (
        <div>
            <Segmented value={group} onChange={(value) => setGroup(value as PromptPresetGroup)} options={PROMPT_PRESET_GROUPS.map((item) => ({ value: item, label: t(`recipes.groups.${item}`) }))} />
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {PROMPT_PRESETS.filter((preset) => preset.group === group).map((preset) => (
                    <article key={preset.id} className="flex flex-col rounded-2xl border border-border bg-card p-4">
                        <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                                <h3 className="truncate text-sm font-semibold">{english ? preset.titleEn : preset.title}</h3>
                                <p className="mt-0.5 text-xs text-muted-foreground">{preset.summary}</p>
                            </div>
                            <Button type="text" size="small" className="!rounded-full" icon={<Copy className="size-3.5" />} onClick={() => copyText(preset.template, t("recipes.copied"))} aria-label={t("recipes.copy")} />
                        </div>
                        <p className="mt-3 flex-1 text-[13px] leading-6 text-foreground/85">{preset.template}</p>
                        <div className="mt-3 flex gap-1.5">
                            {preset.modes.map((mode) => (
                                <span key={mode} className="rounded-full border border-border px-2 text-[11px] leading-5 text-muted-foreground">
                                    {t(`recipes.modes.${mode}`)}
                                </span>
                            ))}
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}
