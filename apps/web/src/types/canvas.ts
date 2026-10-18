import type { CanvasSkill } from "@/lib/skills/skills";

export type Position = {
    x: number;
    y: number;
};

export type ViewportTransform = {
    x: number;
    y: number;
    k: number;
};

export enum CanvasNodeType {
    Image = "image",
    Text = "text",
    Config = "config",
    Video = "video",
    Audio = "audio",
    Group = "group",
    // FrameDock: runs the local Codex CLI and outputs text or an image.
    Codex = "codex",
}

// Node types are open strings: built-ins use CanvasNodeType and plugins use "<pluginId>:<name>".
export type CanvasNodeTypeId = CanvasNodeType | (string & {});

export type CanvasNodeStatus = "idle" | "success" | "loading" | "error";
export type CanvasGenerationMode = "text" | "image" | "video" | "audio";
export type CanvasImageGenerationType = "generation" | "edit";

export type CanvasNodeImage = {
    id: string;
    status: CanvasNodeStatus;
    errorDetails?: string;
    content: string;
    storageKey?: string;
    naturalWidth: number;
    naturalHeight: number;
    bytes: number;
    mimeType: string;
};

export type CanvasNodeText = {
    id: string;
    status: CanvasNodeStatus;
    errorDetails?: string;
    content: string;
};

export type CanvasNodeMetadata = {
    /** FrameDock: skill snapshot used as the system prompt when this node generates text. */
    skill?: CanvasSkill;
    content?: string;
    composerContent?: string;
    prompt?: string;
    status?: CanvasNodeStatus;
    errorDetails?: string;
    fontSize?: number;
    generationMode?: CanvasGenerationMode;
    generationType?: CanvasImageGenerationType;
    model?: string;
    reasoningEffort?: "auto" | "low" | "medium" | "high" | "xhigh";
    size?: string;
    quality?: string;
    background?: string;
    count?: number;
    textCount?: number;
    texts?: CanvasNodeText[];
    primaryTextId?: string;
    seconds?: string;
    vquality?: string;
    generateAudio?: string;
    watermark?: string;
    videoMode?: string;
    audioVoice?: string;
    audioFormat?: string;
    audioSpeed?: string;
    audioInstructions?: string;
    references?: string[];
    naturalWidth?: number;
    naturalHeight?: number;
    freeResize?: boolean;
    images?: CanvasNodeImage[];
    primaryImageId?: string;
    storageKey?: string;
    mimeType?: string;
    bytes?: number;
    durationMs?: number;
    videoTaskId?: string;
    videoTaskProvider?: "openai" | "gemini" | "minimax" | "kling" | "ark" | "wan";
    groupId?: string;
    // FrameDock Codex node.
    codexMode?: "text" | "image";
    codexEffort?: string;
    codexActivity?: string;
    codexModel?: string;
    /** Set on image nodes produced by a Codex node, so re-runs write back into the same image node. */
    codexSourceId?: string;
    /** FrameDock: signature of the inputs this result was generated from (lib/canvas/canvas-staleness.ts). */
    inputHash?: string;
    /** FrameDock: when the current result finished generating (ISO). */
    generatedAt?: string;
    /** FrameDock: earlier results of this node, newest first (lib/canvas/canvas-history.ts). */
    history?: CanvasNodeVersion[];
    interactive?: boolean; // Plugin node interaction/move state; see CanvasNodeDefinition.interactionToggle.
};

export type CanvasNodeData = {
    id: string;
    type: CanvasNodeTypeId;
    title: string;
    position: Position;
    width: number;
    height: number;
    metadata?: CanvasNodeMetadata;
};

/** FrameDock: an earlier result of a node. Media are referenced by storageKey; text is kept inline. */
export type CanvasNodeVersion = {
    id: string;
    kind: "image" | "video" | "text";
    createdAt: string;
    storageKey?: string;
    content?: string;
    naturalWidth?: number;
    naturalHeight?: number;
    bytes?: number;
    mimeType?: string;
    prompt?: string;
    model?: string;
    inputHash?: string;
};

/** FrameDock: what an input means to a video generation (unset = by connection order). */
export type CanvasConnectionRole = "first" | "last" | "reference";

export type CanvasConnection = {
    id: string;
    fromNodeId: string;
    toNodeId: string;
    role?: CanvasConnectionRole;
};

export type CanvasAssistantReference = {
    id: string;
    type: CanvasNodeTypeId;
    title: string;
    dataUrl?: string;
    storageKey?: string;
    text?: string;
};

export type CanvasAssistantImage = {
    id: string;
    dataUrl: string;
    storageKey?: string;
    prompt: string;
};

export type CanvasAssistantMessage = {
    id: string;
    role: "user" | "assistant" | "system" | "tool" | "error";
    title?: string;
    text: string;
    meta?: string;
    detail?: unknown;
    references?: CanvasAssistantReference[];
};

export type CanvasAssistantSession = {
    id: string;
    title: string;
    messages: CanvasAssistantMessage[];
    createdAt: string;
    updatedAt: string;
};

export type ConnectionHandle = {
    nodeId: string;
    handleType: "source" | "target";
};

export type SelectionBox = {
    startWorldX: number;
    startWorldY: number;
    currentWorldX: number;
    currentWorldY: number;
    additive: boolean;
    initialSelectedNodeIds: string[];
};

export type ContextMenuState =
    | {
          type: "node";
          x: number;
          y: number;
          nodeId: string;
      }
    | {
          type: "connection";
          x: number;
          y: number;
          connectionId: string;
      }
    | {
          /** Empty canvas; `position` is the canvas-space point that was clicked. */
          type: "canvas";
          x: number;
          y: number;
          position: Position;
      };
