import type { ReactNode } from "react";
import { CostEstimate } from "@/components/autodl-price";
import { generationCostParams } from "@/lib/autodl-pricing";
import { Image as ImageIcon, LoaderCircle, MessageSquare, Music2, Play, Settings2, Square, Video } from "@/components/icons";
import { Button, Segmented } from "antd";
import { useTranslation } from "react-i18next";

import { ModelPicker } from "@/components/model-picker";
import { CanvasSkillPicker } from "./canvas-skill-picker";
import { defaultConfig, resolveModelForCapability, useConfigStore, useEffectiveConfig, type AiConfig } from "@/stores/use-config-store";
import { canvasThemes } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";
import { CanvasImageSettingsPopover } from "./canvas-image-settings-popover";
import { CanvasAudioSettingsPopover, type CanvasAudioSettingKey } from "./canvas-audio-settings-popover";
import { CanvasVideoSettingsPopover } from "./canvas-video-settings-popover";
import { CanvasTextSettingsPopover } from "./canvas-text-settings-popover";
import type { CanvasGenerationMode, CanvasNodeData, CanvasNodeMetadata } from "@/types/canvas";

type CanvasConfigNodePanelProps = {
    node: CanvasNodeData;
    isRunning: boolean;
    inputSummary: { textCount: number; imageCount: number; videoCount: number; audioCount: number };
    onConfigChange: (nodeId: string, patch: Partial<CanvasNodeMetadata>) => void;
    onGenerate: (nodeId: string) => void;
    onStop: (nodeId: string) => void;
    onComposerToggle: () => void;
};

export function CanvasConfigNodePanel({ node, isRunning, inputSummary, onConfigChange, onGenerate, onStop, onComposerToggle }: CanvasConfigNodePanelProps) {
    const { t } = useTranslation();
    const globalConfig = useEffectiveConfig();
    const openConfigDialog = useConfigStore((state) => state.openConfigDialog);
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const mode = node.metadata?.generationMode || "image";
    const config = buildNodeConfig(globalConfig, node, mode);
    const hasAnyInput = Boolean(inputSummary.textCount || inputSummary.imageCount || inputSummary.videoCount || inputSummary.audioCount);
    const hasComposerContent = Boolean((node.metadata?.composerContent ?? node.metadata?.prompt ?? "").trim());
    const canGenerate = hasComposerContent || (mode === "audio" ? inputSummary.textCount > 0 : hasAnyInput);

    const inputs = [
        { label: t("canvas.configNode.prompt"), count: inputSummary.textCount },
        { label: t("canvas.configNode.references"), count: inputSummary.imageCount },
        { label: t("canvas.configNode.videoReferences"), count: inputSummary.videoCount },
        { label: t("canvas.configNode.audioReferences"), count: inputSummary.audioCount },
    ];

    return (
        <div className="flex h-full w-full cursor-move flex-col gap-2 p-3 text-sm" style={{ color: theme.node.text }} onWheel={(event) => event.stopPropagation()}>
            <div className="cursor-default" onMouseDown={(event) => event.stopPropagation()}>
                <Segmented
                    block
                    size="small"
                    className="canvas-config-mode"
                    value={mode}
                    onChange={(value) => onConfigChange(node.id, { generationMode: value as CanvasGenerationMode })}
                    options={[
                        { value: "image", label: <ModeLabel icon={<ImageIcon className="size-3.5" />} text={t("canvas.configNode.image")} /> },
                        { value: "text", label: <ModeLabel icon={<MessageSquare className="size-3.5" />} text={t("canvas.configNode.text")} /> },
                        { value: "video", label: <ModeLabel icon={<Video className="size-3.5" />} text={t("canvas.configNode.video")} /> },
                        { value: "audio", label: <ModeLabel icon={<Music2 className="size-3.5" />} text={t("canvas.configNode.audio")} /> },
                    ]}
                />
            </div>

            {/* Connected inputs, read at a glance; zero counts stay quiet. */}
            <div className="flex min-w-0 items-center gap-2">
                <div className="tnum flex min-w-0 flex-1 flex-wrap gap-x-2.5 gap-y-0.5 text-xs">
                    {inputs.map((input) => (
                        <span key={input.label} style={{ color: input.count ? theme.node.text : theme.node.faint }}>
                            {input.label} {input.count}
                        </span>
                    ))}
                </div>
                {mode === "text" ? (
                    <div className="shrink-0" onMouseDown={(event) => event.stopPropagation()}>
                        <CanvasSkillPicker compact skill={node.metadata?.skill} onChange={(skill) => onConfigChange(node.id, { skill })} />
                    </div>
                ) : null}
                <button type="button" className="inline-flex h-6 shrink-0 cursor-pointer items-center gap-1 rounded-md px-1.5 text-xs transition-colors hover:bg-accent" style={{ color: theme.node.muted }} onMouseDown={(event) => event.stopPropagation()} onClick={onComposerToggle}>
                    <Settings2 className="size-3.5" />
                    {t("canvas.configNode.compose")}
                </button>
            </div>

            <div className="grid min-w-0 cursor-default grid-cols-[minmax(0,1fr)_148px] items-center gap-2" onMouseDown={(event) => event.stopPropagation()}>
                <ModelPicker className="canvas-compact-control h-10" config={config} value={config.model} onChange={(model) => onConfigChange(node.id, { model })} capability={mode} onMissingConfig={() => openConfigDialog(true)} fullWidth />
                {mode === "video" ? (
                    <CanvasVideoSettingsPopover config={config} placement="topRight" buttonClassName="canvas-compact-control !h-10 !w-full !justify-start !rounded-lg !px-2" onConfigChange={(key, value) => onConfigChange(node.id, videoConfigPatch(key, value))} />
                ) : mode === "image" ? (
                    <CanvasImageSettingsPopover config={config} placement="topRight" autoAdjustOverflow={false} buttonClassName="canvas-compact-control !h-10 !w-full !justify-start !rounded-lg !px-2" onConfigChange={(key, value) => onConfigChange(node.id, key === "count" ? { count: Number(value) || 1 } : { [key]: value })} />
                ) : mode === "audio" ? (
                    <CanvasAudioSettingsPopover config={config} placement="topRight" buttonClassName="canvas-compact-control !h-10 !w-full !justify-start !rounded-lg !px-2" onConfigChange={(key, value) => onConfigChange(node.id, audioConfigPatch(key, value))} />
                ) : (
                    <CanvasTextSettingsPopover config={config} count={node.metadata?.textCount || 1} placement="topRight" buttonClassName="canvas-compact-control !h-10 !w-full !justify-start !rounded-lg !px-2" onConfigChange={(_, value) => onConfigChange(node.id, { reasoningEffort: value })} onCountChange={(textCount) => onConfigChange(node.id, { textCount })} />
                )}
            </div>

            <CostEstimate model={config.model} params={generationCostParams(config, mode === "video" ? inputSummary.imageCount > 0 : false, inputSummary.videoCount > 0)} className="-mt-0.5 text-xs" />

            <Button
                type="primary"
                className="mt-auto !h-9 !w-full !cursor-pointer !rounded-full"
                danger={isRunning}
                disabled={!isRunning && !canGenerate}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={() => (isRunning ? onStop(node.id) : onGenerate(node.id))}
            >
                <span className="inline-flex items-center gap-1.5">
                    {isRunning ? (
                        <>
                            <LoaderCircle className="size-4 animate-spin" />
                            <Square className="size-3.5 fill-current" />
                            <span>{t("canvas.configNode.stop")}</span>
                        </>
                    ) : (
                        <>
                            <Play className="size-4" />
                            <span>{t("canvas.configNode.generate")}</span>
                        </>
                    )}
                </span>
            </Button>
        </div>
    );
}

function ModeLabel({ icon, text }: { icon: ReactNode; text: string }) {
    return (
        <span className="inline-flex items-center gap-1">
            {icon}
            {text}
        </span>
    );
}

function buildNodeConfig(globalConfig: AiConfig, node: CanvasNodeData, mode: CanvasGenerationMode): AiConfig {
    return {
        ...globalConfig,
        model: resolveModelForCapability(globalConfig, node.metadata?.model, mode),
        reasoningEffort: node.metadata?.reasoningEffort || globalConfig.reasoningEffort || defaultConfig.reasoningEffort,
        quality: node.metadata?.quality || globalConfig.quality || defaultConfig.quality,
        size: node.metadata?.size || globalConfig.size || defaultConfig.size,
        background: node.metadata?.background ?? globalConfig.background ?? defaultConfig.background,
        videoSeconds: node.metadata?.seconds || globalConfig.videoSeconds || defaultConfig.videoSeconds,
        vquality: node.metadata?.vquality || globalConfig.vquality || defaultConfig.vquality,
        videoGenerateAudio: node.metadata?.generateAudio || globalConfig.videoGenerateAudio || defaultConfig.videoGenerateAudio,
        videoWatermark: node.metadata?.watermark || globalConfig.videoWatermark || defaultConfig.videoWatermark,
        videoMode: node.metadata?.videoMode || globalConfig.videoMode || defaultConfig.videoMode,
        audioVoice: node.metadata?.audioVoice || globalConfig.audioVoice || defaultConfig.audioVoice,
        audioFormat: node.metadata?.audioFormat || globalConfig.audioFormat || defaultConfig.audioFormat,
        audioSpeed: node.metadata?.audioSpeed || globalConfig.audioSpeed || defaultConfig.audioSpeed,
        audioInstructions: node.metadata?.audioInstructions || globalConfig.audioInstructions || defaultConfig.audioInstructions,
        count: String(node.metadata?.count || (mode === "image" ? globalConfig.canvasImageCount || globalConfig.count : globalConfig.count) || defaultConfig.count),
    };
}

function videoConfigPatch(key: keyof AiConfig, value: string) {
    if (key === "videoSeconds") return { seconds: value };
    if (key === "videoGenerateAudio") return { generateAudio: value };
    if (key === "videoWatermark") return { watermark: value };
    if (key === "videoMode") return { videoMode: value };
    return { [key]: value };
}

function audioConfigPatch(key: CanvasAudioSettingKey, value: string) {
    if (key === "audioVoice") return { audioVoice: value };
    if (key === "audioFormat") return { audioFormat: value };
    if (key === "audioSpeed") return { audioSpeed: value };
    return { audioInstructions: value };
}
