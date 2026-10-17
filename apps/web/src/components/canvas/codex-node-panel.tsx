import { useEffect, useState } from "react";
import { ArrowUp, LoaderCircle, Maximize2, Sparkles, Square } from "lucide-react";
import { Button, Modal, Segmented, Select, Tooltip } from "antd";
import { useTranslation } from "react-i18next";

import { canvasThemes } from "@/lib/canvas-theme";
import type { CanvasResourceReference } from "@/lib/canvas/canvas-resource-references";
import { fetchCodexStatus, type CodexStatus } from "@/services/api/codex";
import { useThemeStore } from "@/stores/use-theme-store";
import type { CanvasNodeData } from "@/types/canvas";
import { CanvasNodeReferenceBar } from "./canvas-node-reference-bar";
import { CanvasPromptChipInput } from "./canvas-prompt-chip-input";
import { CanvasPromptLibrary } from "./canvas-prompt-library";

type CodexNodePanelProps = {
    node: CanvasNodeData;
    nodes: CanvasNodeData[];
    connectedNodes?: CanvasNodeData[];
    mentionReferences?: CanvasResourceReference[];
    isRunning: boolean;
    onPromptChange: (nodeId: string, prompt: string) => void;
    onConfigChange: (nodeId: string, patch: Partial<CanvasNodeData["metadata"]>) => void;
    onRun: (nodeId: string, prompt: string) => void;
    onStop: (nodeId: string) => void;
    onDisconnectReference?: (fromNodeId: string, toNodeId: string) => void;
    onStartReferenceSelection?: (nodeId: string) => void;
};

// FrameDock: panel of the Codex node — same layout as the prompt panel, with output mode and reasoning effort.
export function CodexNodePanel({ node, nodes, connectedNodes = [], mentionReferences = [], isRunning, onPromptChange, onConfigChange, onRun, onStop, onDisconnectReference, onStartReferenceSelection }: CodexNodePanelProps) {
    const { t } = useTranslation();
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const mode = node.metadata?.codexMode === "image" ? "image" : "text";
    const effort = node.metadata?.codexEffort || "low";
    const [prompt, setPrompt] = useState(node.metadata?.prompt ?? "");
    const [expanded, setExpanded] = useState(false);
    const [status, setStatus] = useState<CodexStatus | null>(null);

    useEffect(() => {
        setPrompt(node.metadata?.prompt ?? "");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [node.id]);
    useEffect(() => {
        void fetchCodexStatus().then(setStatus);
    }, []);

    const updatePrompt = (value: string) => {
        setPrompt(value);
        onPromptChange(node.id, value);
    };
    const ready = status ? status.available && status.loggedIn : true;
    const submit = () => {
        const text = prompt.trim();
        if (!text || isRunning || !ready) return;
        onRun(node.id, text);
    };
    const placeholder = t(mode === "image" ? "canvas.codexNode.placeholderImage" : "canvas.codexNode.placeholderText");

    return (
        <div
            data-canvas-no-zoom
            className="relative rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-float"
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onWheel={(event) => event.stopPropagation()}
        >
            <Tooltip title={status?.version ? `${status.version} · 使用本机 Codex 登录的 ChatGPT 账号` : undefined}>
                <span className="absolute right-3 top-2.5 inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                    <Sparkles className="size-3.5" aria-hidden="true" />
                    {t("canvas.codexNode.quota")}
                </span>
            </Tooltip>
            <CanvasNodeReferenceBar nodeId={node.id} nodes={nodes} connectedNodes={connectedNodes} onDisconnect={onDisconnectReference} onStartSelection={onStartReferenceSelection} />
            {status && !ready ? (
                <div className="mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{t(status.available ? "canvas.codexNode.notLoggedIn" : "canvas.codexNode.unavailable")}</div>
            ) : null}
            <CanvasPromptChipInput
                value={prompt}
                references={mentionReferences}
                onChange={updatePrompt}
                onSubmit={submit}
                className="thin-scrollbar h-40 w-full cursor-text resize-none rounded-xl px-3 py-2 text-sm leading-5 outline-none"
                style={{ background: "transparent", color: theme.node.text }}
                placeholder={placeholder}
            />
            <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                    <Tooltip title={t("canvas.promptPanel.expandEditor")}>
                        <Button type="text" className="!h-8 !w-8 !min-w-8 shrink-0 !rounded-full !bg-transparent !p-0" style={{ color: theme.node.text }} icon={<Maximize2 className="size-3.5" />} onClick={() => setExpanded(true)} aria-label={t("canvas.promptPanel.expandEditor")} />
                    </Tooltip>
                    <CanvasPromptLibrary onSelect={updatePrompt} />
                    <Segmented
                        size="middle"
                        value={mode}
                        disabled={isRunning}
                        onChange={(value) =>
                            // Output switches type, so the previous result (text vs image) no longer applies downstream.
                            onConfigChange(node.id, { codexMode: value as "text" | "image", ...(node.metadata?.content ? { content: "", storageKey: undefined, status: "idle" as const } : {}) })
                        }
                        options={[
                            { value: "text", label: t("canvas.codexNode.modeText") },
                            { value: "image", label: t("canvas.codexNode.modeImage") },
                        ]}
                    />
                    <Tooltip title={t("canvas.codexNode.effort")}>
                        <Select
                            size="middle"
                            className="w-[84px]"
                            value={effort}
                            disabled={isRunning}
                            onChange={(value) => onConfigChange(node.id, { codexEffort: value })}
                            options={[
                                { value: "low", label: t("canvas.codexNode.effortLow") },
                                { value: "medium", label: t("canvas.codexNode.effortMedium") },
                                { value: "high", label: t("canvas.codexNode.effortHigh") },
                            ]}
                        />
                    </Tooltip>
                </div>
                <Button
                    type="primary"
                    className="!h-10 !min-w-16 shrink-0 !rounded-full !px-3"
                    danger={isRunning}
                    disabled={!isRunning && (!prompt.trim() || !ready)}
                    onClick={() => (isRunning ? onStop(node.id) : submit())}
                    aria-label={t(isRunning ? "canvas.codexNode.stop" : "canvas.codexNode.run")}
                >
                    <span className="flex items-center gap-1.5">
                        {isRunning ? (
                            <>
                                <LoaderCircle className="size-4 animate-spin" />
                                <Square className="size-3.5 fill-current" />
                                <span className="text-xs font-medium">{t("canvas.codexNode.stop")}</span>
                            </>
                        ) : (
                            <ArrowUp className="size-4" />
                        )}
                    </span>
                </Button>
            </div>
            <Modal title={t("canvas.promptPanel.editorTitle")} open={expanded} centered width={760} footer={null} onCancel={() => setExpanded(false)} destroyOnHidden>
                <div data-canvas-no-zoom className="pt-2" onWheelCapture={(event) => event.stopPropagation()}>
                    <CanvasPromptChipInput
                        value={prompt}
                        references={mentionReferences}
                        onChange={updatePrompt}
                        className="thin-scrollbar h-[52dvh] min-h-80 w-full cursor-text overflow-y-auto rounded-xl border p-4 text-[15px] leading-6 outline-none"
                        style={{ background: "transparent", borderColor: theme.toolbar.border, color: theme.node.text }}
                        placeholder={placeholder}
                    />
                </div>
            </Modal>
        </div>
    );
}
