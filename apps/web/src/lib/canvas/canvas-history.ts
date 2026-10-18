import { CanvasNodeType, type CanvasNodeData, type CanvasNodeVersion } from "@/types/canvas";

// FrameDock: per-node generation history. When a node starts generating again, the result it is about to
// lose is kept as a "version" (media stay in storage by storageKey, so a version costs a few bytes in the
// project). Versions can be restored from the node's history dialog; restoring swaps with the current result.

export const MAX_NODE_VERSIONS = 12;

/** Identity of a node's current output (not its look): storage key for media, the text itself for text. */
export function outputKey(node: CanvasNodeData) {
    const metadata = node.metadata;
    if (node.type === CanvasNodeType.Image || node.type === CanvasNodeType.Video) return metadata?.content ? metadata.storageKey || "" : "";
    if (node.type === CanvasNodeType.Text || (node.type === CanvasNodeType.Codex && metadata?.codexMode !== "image")) return (metadata?.content || "").trim();
    return "";
}

/** The node's current result as a version, or null when it has none worth keeping. */
export function snapshotNodeOutput(node: CanvasNodeData): CanvasNodeVersion | null {
    const metadata = node.metadata;
    const key = outputKey(node);
    if (!key || metadata?.status === "loading" || metadata?.status === "error") return null;
    const base = { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, createdAt: metadata?.generatedAt || "", prompt: metadata?.composerContent ?? metadata?.prompt, model: metadata?.model, inputHash: metadata?.inputHash };
    if (node.type === CanvasNodeType.Image) return { ...base, kind: "image", storageKey: metadata?.storageKey, naturalWidth: metadata?.naturalWidth, naturalHeight: metadata?.naturalHeight, bytes: metadata?.bytes, mimeType: metadata?.mimeType };
    if (node.type === CanvasNodeType.Video) return { ...base, kind: "video", storageKey: metadata?.storageKey, naturalWidth: metadata?.naturalWidth, naturalHeight: metadata?.naturalHeight, bytes: metadata?.bytes, mimeType: metadata?.mimeType };
    return { ...base, kind: "text", content: metadata?.content };
}

export function versionKey(version: CanvasNodeVersion) {
    return version.kind === "text" ? (version.content || "").trim() : version.storageKey || "";
}

/** Newest first, no duplicates of the same output, capped. */
export function withVersion(history: CanvasNodeVersion[] | undefined, version: CanvasNodeVersion) {
    const key = versionKey(version);
    return [version, ...(history || []).filter((item) => versionKey(item) !== key)].slice(0, MAX_NODE_VERSIONS);
}
