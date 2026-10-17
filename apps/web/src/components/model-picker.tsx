import { useEffect, useId, useMemo, useState } from "react";
import { Cpu } from "lucide-react";
import { findAutodlModel } from "@/lib/autodl-catalog";
import { useTranslation } from "react-i18next";

import i18n from "@/i18n";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { modelOptionLabel, modelOptionName, selectableModelsByCapability, type AiConfig, type ModelCapability } from "@/stores/use-config-store";

type ModelPickerProps = {
    config: AiConfig;
    value?: string;
    onChange: (model: string) => void;
    capability?: ModelCapability;
    className?: string;
    fullWidth?: boolean;
    placeholder?: string;
    onMissingConfig?: () => void;
};

export function ModelPicker({ config, value, onChange, capability, className, fullWidth = false, placeholder, onMissingConfig }: ModelPickerProps) {
    const { t } = useTranslation();
    const pickerId = useId();
    const [open, setOpen] = useState(false);
    const options = useMemo(() => Array.from(new Set([...(config.channelMode === "local" && !capability ? [value] : []), ...selectableModelsByCapability(config, capability)].filter((model): model is string => Boolean(model)))), [capability, config, value]);
    const current = value || "";
    const pickerPlaceholder = placeholder || t("settingsPanels.model.select");

    useEffect(() => {
        const closeOtherPicker = (event: Event) => {
            if ((event as CustomEvent<string>).detail !== pickerId) setOpen(false);
        };
        window.addEventListener("model-picker-open", closeOtherPicker);
        return () => window.removeEventListener("model-picker-open", closeOtherPicker);
    }, [pickerId]);

    return (
        <Select
            open={open}
            value={current}
            onOpenChange={(nextOpen) => {
                if (nextOpen && !options.length && config.channelMode === "local") onMissingConfig?.();
                if (nextOpen) window.dispatchEvent(new CustomEvent("model-picker-open", { detail: pickerId }));
                setOpen(nextOpen);
            }}
            onValueChange={onChange}
        >
            <SelectTrigger
                className={cn(
                    "canvas-composer-model-picker h-8 w-fit max-w-full gap-2 rounded-full border border-input bg-transparent px-3 text-sm font-normal shadow-sm transition-colors",
                    fullWidth ? "w-full min-w-0 justify-start" : "min-w-[9rem] justify-start",
                    "data-[state=open]:border-ring data-[state=open]:ring-2 data-[state=open]:ring-ring/20",
                    className,
                )}
                onMouseDown={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                title={current ? modelOptionLabel(config, current) : pickerPlaceholder}
            >
                <ModelIcon model={current} />
                <span className="canvas-model-picker-text min-w-0 flex-1 truncate text-left">{current ? modelOptionLabel(config, current) : pickerPlaceholder}</span>
            </SelectTrigger>
            <SelectContent
                data-canvas-no-zoom
                className="z-[1200] w-80 max-w-[calc(100vw-24px)] rounded-xl border border-border/70 bg-popover p-1 shadow-xl"
                position="popper"
                align="start"
                side="bottom"
                sideOffset={6}
                onPointerDown={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
            >
                {options.length ? (
                    options.map((model) => (
                        <SelectItem key={model} value={model} textValue={modelOptionLabel(config, model)}>
                            <ModelLabel config={config} model={model} />
                        </SelectItem>
                    ))
                ) : (
                    <SelectItem value="__empty__" disabled>
                        {emptyModelLabel(config, capability)}
                    </SelectItem>
                )}
            </SelectContent>
        </Select>
    );
}

function emptyModelLabel(config: AiConfig, capability?: ModelCapability) {
    const label = capability ? i18n.t(`settingsPanels.model.capabilities.${capability}`) : "";
    if (capability && config.models.length) return i18n.t("settingsPanels.model.assign", { capability: label });
    return config.models.length ? i18n.t("settingsPanels.model.noMatch", { capability: label }) : i18n.t("settingsPanels.model.addFirst");
}

function ModelLabel({ config, model }: { config: AiConfig; model: string }) {
    return (
        <span className="flex min-w-0 items-center gap-2">
            <ModelIcon model={model} />
            <span className="truncate">{modelOptionLabel(config, model)}</span>
            {findAutodlModel(model) ? <span className="shrink-0 text-xs opacity-50">{findAutodlModel(model)?.price}</span> : null}
        </span>
    );
}

function ModelIcon({ model }: { model: string }) {
    const icon = resolveModelIcon(modelOptionName(model));
    if (!icon) return <Cpu className="size-4 shrink-0 opacity-70" />;
    // Only monochrome logos are inverted in dark mode; brand-colored ones keep their colors.
    return <img src={`/icons/lobehub/${icon}.svg`} alt="" className={`size-4 shrink-0 ${icon.endsWith("-color") ? "" : "dark:invert"}`} />;
}

// FrameDock: logos from LobeHub Icons (@lobehub/icons-static-svg, MIT), see THIRD_PARTY_NOTICES.md.
// Order matters: more specific names (hailuo, sora, gpt-image) come before their vendors.
const MODEL_ICON_RULES: Array<[RegExp, string]> = [
    [/claude|anthropic/, "claude-color"],
    [/gemini|nano-banana|imagen|veo/, "gemini-color"],
    [/sora/, "sora-color"],
    [/gpt|openai|dall-e|o\d-/, "openai"],
    [/grok/, "grok"],
    [/deepseek/, "deepseek-color"],
    [/glm|zhipu|cogview|cogvideo/, "zhipu-color"],
    [/hailuo/, "hailuo-color"],
    [/minimax|abab/, "minimax-color"],
    [/qwen|z-image|tongyi/, "qwen-color"],
    [/^wan|wanx|wan\d/, "alibabacloud-color"],
    [/kling|kolors/, "kling-color"],
    [/seedance|seedream|doubao|jimeng/, "doubao-color"],
    [/vidu/, "vidu-color"],
    [/hunyuan|^hy\d/, "hunyuan-color"],
    [/kimi|moonshot/, "kimi-color"],
    [/midjourney|^mj/, "midjourney"],
    [/flux/, "flux"],
    [/stable|sdxl|^sd\d|stability/, "stability-color"],
];

function resolveModelIcon(model: string) {
    const name = model.toLowerCase();
    return MODEL_ICON_RULES.find(([pattern]) => pattern.test(name))?.[1] || "";
}
