import { useEffect, useId, useMemo, useState } from "react";
import { ModelPrice } from "@/components/autodl-price";
import { Brush, Cpu } from "@/components/icons";
import { useTranslation } from "react-i18next";

import i18n from "@/i18n";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger } from "@/components/ui/select";
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
                {options.length > GROUP_THRESHOLD ? (
                    // FrameDock: long lists (e.g. all AutoDL models) are grouped by vendor.
                    groupByVendor(options).map(([vendor, models]) => (
                        <SelectGroup key={vendor}>
                            <SelectLabel>{vendor}</SelectLabel>
                            {models.map((model) => (
                                <SelectItem key={model} value={model} textValue={modelOptionLabel(config, model)}>
                                    <ModelLabel config={config} model={model} />
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    ))
                ) : options.length ? (
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
            <ModelPrice model={model} className="text-xs opacity-60" />
        </span>
    );
}

const GROUP_THRESHOLD = 12;

function groupByVendor(models: string[]) {
    const groups = new Map<string, string[]>();
    models.forEach((model) => {
        const vendor = resolveModelVendor(modelOptionName(model));
        groups.set(vendor, [...(groups.get(vendor) || []), model]);
    });
    return Array.from(groups.entries());
}

export function ModelIcon({ model }: { model: string }) {
    const name = modelOptionName(model);
    if (name === "face-repaint") return <Brush className="size-4 shrink-0" />;
    const icon = resolveModelIcon(name);
    if (!icon) return <Cpu className="size-4 shrink-0 opacity-70" />;
    // Only monochrome logos are inverted in dark mode; brand-colored ones keep their colors.
    return <img src={`/icons/lobehub/${icon}.svg`} alt="" className={`size-4 shrink-0 ${icon.endsWith("-color") ? "" : "dark:invert"}`} />;
}

// FrameDock: logos from LobeHub Icons (@lobehub/icons-static-svg, MIT), see THIRD_PARTY_NOTICES.md.
// Order matters: more specific names (hailuo, sora, gpt-image) come before their vendors.
const MODEL_ICON_RULES: Array<[RegExp, string, string]> = [
    [/claude|anthropic/, "claude-color", "Anthropic"],
    [/gemini|nano-banana|imagen|veo/, "gemini-color", "Google"],
    [/sora/, "sora-color", "OpenAI"],
    [/gpt|openai|dall-e|o\d-|^whisper|^codex-auto-review$/, "openai", "OpenAI"],
    [/grok/, "grok", "xAI"],
    [/deepseek/, "deepseek-color", "DeepSeek"],
    [/glm|zhipu|cogview|cogvideo/, "zhipu-color", "智谱"],
    [/hailuo/, "hailuo-color", "MiniMax"],
    [/minimax|abab|^speech-|^voice-(?:design|clone)$/, "minimax-color", "MiniMax"],
    [/qwen|z-image|tongyi|qwq/, "qwen-color", "通义"],
    [/^wan|wanx|wan\d|^aliyun-/, "alibabacloud-color", "通义万相"],
    [/kling|kolors/, "kling-color", "可灵"],
    [/seedance|seedream|doubao|jimeng/, "doubao-color", "字节跳动"],
    [/vidu/, "vidu-color", "Vidu"],
    [/hunyuan|^hy\d/, "hunyuan-color", "腾讯混元"],
    [/kimi|moonshot/, "kimi-color", "月之暗面"],
    [/midjourney|^mj/, "midjourney", "Midjourney"],
    [/flux/, "flux", "Black Forest Labs"],
    [/pixverse/, "pixverse-color", "PixVerse"],
    [/happyhorse/, "happyhorse", "HappyHorse"],
    [/^music$|suno/, "suno", "Suno"],
    [/^omni-flash/, "gemini-color", "Google"],
    [/^face-repaint$/, "", "人像工具"],
    [/stable|sdxl|^sd\d|stability/, "stability-color", "Stability"],
];

export function resolveModelIcon(model: string) {
    const name = model.toLowerCase();
    return MODEL_ICON_RULES.find(([pattern]) => pattern.test(name))?.[1] || "";
}

/** Vendor label used to group long model lists; unknown names fall into "其他". */
export function resolveModelVendor(model: string) {
    const name = model.toLowerCase();
    return MODEL_ICON_RULES.find(([pattern]) => pattern.test(name))?.[2] || "其他";
}
