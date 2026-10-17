import { useMemo, useState } from "react";
import { Button, Input, Popover, Segmented, Tooltip } from "antd";
import { useTranslation } from "react-i18next";

import { MagicStick } from "@/components/icons";
import { canvasThemes } from "@/lib/canvas-theme";
import { composePresetPrompt, PROMPT_PRESET_GROUPS, presetsForMode, type PromptPreset, type PromptPresetGroup } from "@/lib/presets/prompt-presets";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/use-theme-store";

// FrameDock: prompt recipes — pick composition / light / performance / emotion recipes, name the subject,
// and append the composed fragment to the node prompt. Selection uses the shared 10% accent + hairline style.
export function CanvasPromptRecipes({ mode, prompt, onApply }: { mode: string; prompt: string; onApply: (prompt: string) => void }) {
    const { t, i18n } = useTranslation();
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const [open, setOpen] = useState(false);
    const [group, setGroup] = useState<PromptPresetGroup>("composition");
    const [selected, setSelected] = useState<string[]>([]);
    const [subject, setSubject] = useState("");
    const presets = useMemo(() => presetsForMode(mode), [mode]);
    const groups = PROMPT_PRESET_GROUPS.filter((item) => presets.some((preset) => preset.group === item));
    const chosen = presets.filter((preset) => selected.includes(preset.id));
    const preview = composePresetPrompt(chosen, subject);
    const english = i18n.resolvedLanguage === "en-US";

    const toggle = (preset: PromptPreset) => setSelected((ids) => (ids.includes(preset.id) ? ids.filter((id) => id !== preset.id) : [...ids, preset.id]));
    const apply = () => {
        onApply(composePresetPrompt(chosen, subject, prompt));
        setSelected([]);
        setOpen(false);
    };

    const content = (
        <div className="w-[440px]" data-canvas-no-zoom onWheelCapture={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{t("recipes.title")}</span>
                <span className="tnum font-mono text-xs text-muted-foreground">{t("recipes.selected", { count: chosen.length })}</span>
            </div>
            <Segmented block size="small" value={group} onChange={(value) => setGroup(value as PromptPresetGroup)} options={groups.map((item) => ({ value: item, label: t(`recipes.groups.${item}`) }))} />
            <div className="thin-scrollbar mt-3 grid max-h-64 grid-cols-2 gap-1.5 overflow-y-auto pr-0.5">
                {presets
                    .filter((preset) => preset.group === group)
                    .map((preset) => {
                        const active = selected.includes(preset.id);
                        return (
                            <button
                                key={preset.id}
                                type="button"
                                aria-pressed={active}
                                onClick={() => toggle(preset)}
                                className={cn("rounded-xl border px-3 py-2 text-left transition-colors duration-150", active ? "border-foreground/40 bg-signal/10" : "border-border hover:bg-accent")}
                            >
                                <span className="block truncate text-[13px] font-medium">{english ? preset.titleEn : preset.title}</span>
                                <span className="mt-0.5 line-clamp-1 block text-xs text-muted-foreground">{preset.summary}</span>
                            </button>
                        );
                    })}
            </div>
            <Input className="!mt-3 !rounded-full" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder={t("recipes.subjectPlaceholder")} allowClear />
            <div className="mt-3 min-h-16 rounded-xl border border-border px-3 py-2 text-xs leading-5" style={{ color: preview ? theme.node.text : theme.node.placeholder }}>
                {preview || t("recipes.previewEmpty")}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">{t("recipes.hint")}</span>
                <Button type="primary" className="!rounded-full" disabled={!chosen.length} onClick={apply}>
                    {t("recipes.apply")}
                </Button>
            </div>
        </div>
    );

    return (
        <Popover open={open} onOpenChange={setOpen} trigger="click" placement="top" content={content} destroyOnHidden>
            <Tooltip title={open ? undefined : t("recipes.title")}>
                <Button type="text" className="!h-8 !w-8 !min-w-8 shrink-0 !rounded-full !bg-transparent !p-0" style={{ color: theme.node.text }} icon={<MagicStick className="size-4" />} aria-label={t("recipes.title")} />
            </Tooltip>
        </Popover>
    );
}
