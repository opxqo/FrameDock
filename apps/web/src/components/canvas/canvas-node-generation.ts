import type { AiTextMessage } from "@/services/api/image";
import { textNodeOutput } from "@/lib/canvas/text-output";
import i18n from "@/i18n";
import { imageReferenceLabel } from "@/lib/image-reference-prompt";
import type { ReferenceImage } from "@/types/image";
import type { ReferenceAudio, ReferenceVideo } from "@/types/media";
import { CanvasNodeType, type CanvasConnection, type CanvasConnectionRole, type CanvasNodeData } from "@/types/canvas";
import { getGenerationResourceNodes, getGroupResourceNodes, hasOwnImage, inputRoles, sortByConnectionRole } from "@/lib/canvas/canvas-resource-references";
import { referencedNodeIds, resolvePromptReferences } from "@/lib/canvas/prompt-reference-tokens";
import { getNodeDefinition } from "@/lib/canvas/node-registry";

export type NodeGenerationContext = {
    prompt: string;
    referenceImages: ReferenceImage[];
    referenceVideos: ReferenceVideo[];
    referenceAudios: ReferenceAudio[];
    textCount: number;
    imageCount: number;
    videoCount: number;
    audioCount: number;
};

type NodeGenerationResourceInput = {
    nodeId: string;
    type: "text" | "image" | "video" | "audio";
    title: string;
    text?: string;
    image?: ReferenceImage;
    video?: ReferenceVideo;
    audio?: ReferenceAudio;
};

type NodeGenerationGroupInput = {
    nodeId: string;
    type: "group";
    title: string;
    children: NodeGenerationResourceInput[];
};

export type NodeGenerationInput = NodeGenerationResourceInput | NodeGenerationGroupInput;

export type NodeGenerationOptions = {
    /** Send the node's own picture first (generating from an image node that already has one). */
    includeOwnImage?: boolean;
};

export function buildNodeGenerationContext(nodeId: string, nodes: CanvasNodeData[], connections: CanvasConnection[], prompt: string, options: NodeGenerationOptions = {}): NodeGenerationContext {
    const inputs = buildNodeGenerationInputs(nodeId, nodes, connections);
    const sourceNode = nodes.find((node) => node.id === nodeId);
    // Composer mode picks inputs by @mention; without any mention it falls back to using every input
    // (the panel counts all connected inputs, so silently dropping them was surprising).
    if (sourceNode?.type === CanvasNodeType.Config && Boolean(sourceNode.metadata?.composerContent?.trim()) && /@\[node:[^\]]+\]/.test(prompt)) {
        return buildComposerGenerationContext(inputs, prompt);
    }

    const resourceInputs = flattenGenerationInputs(inputs);
    // FrameDock: an explicit reference to the node's own picture also sends it, even when the caller would not have.
    const ownImage = sourceNode && hasOwnImage(sourceNode) && (options.includeOwnImage || referencedNodeIds(prompt).includes(nodeId)) ? readReferenceImage(sourceNode) : null;
    if (ownImage && !resourceInputs.some((input) => input.nodeId === nodeId)) resourceInputs.unshift({ nodeId, type: "image", title: sourceNode?.title || "", image: ownImage });

    // Number every resource in send order, then turn the prompt's @[node:id] tokens into those numbers.
    const counts = { image: 0, video: 0, audio: 0, text: 0 };
    const labelByNodeId = new Map<string, string>();
    for (const input of resourceInputs) {
        const label = generationLabel(input.type, counts[input.type]++);
        if (!labelByNodeId.has(input.nodeId)) labelByNodeId.set(input.nodeId, input.type === "text" ? `【${label}】` : label);
    }
    const resolved = resolvePromptReferences(prompt, labelByNodeId);
    if (resolved.unresolved.length) {
        const names = resolved.unresolved.map((id) => nodes.find((node) => node.id === id)?.title || i18n.t("canvas.references.deletedNode"));
        throw new Error(i18n.t("canvas.references.unresolved", { names: names.map((name) => `「${name}」`).join("、") }));
    }

    let textIndex = 0;
    const upstreamText = resourceInputs.flatMap((input) => (input.text ? [textBlock(generationLabel("text", textIndex++), input.text)] : [])).join("\n\n");
    const referenceImages = resourceInputs.map((input) => input.image).filter((image): image is ReferenceImage => Boolean(image));
    const referenceVideos = resourceInputs.map((input) => input.video).filter((video): video is ReferenceVideo => Boolean(video));
    const referenceAudios = resourceInputs.map((input) => input.audio).filter((audio): audio is ReferenceAudio => Boolean(audio));

    return {
        prompt: upstreamText ? `${resolved.text}\n\n${upstreamText}` : resolved.text,
        referenceImages,
        referenceVideos,
        referenceAudios,
        textCount: resourceInputs.filter((input) => input.type === "text").length,
        imageCount: referenceImages.length,
        videoCount: referenceVideos.length,
        audioCount: referenceAudios.length,
    };
}

function buildComposerGenerationContext(inputs: NodeGenerationInput[], prompt: string): NodeGenerationContext {
    const inputByNodeId = new Map(inputs.map((input) => [input.nodeId, input]));
    const selectedInputs: NodeGenerationResourceInput[] = [];
    const labelByNodeId = new Map<string, string>();
    const textBlocks: string[] = [];
    const counts = { image: 0, video: 0, audio: 0, text: 0 };
    let hasToken = false;
    let lastIndex = 0;
    let nextPrompt = "";

    for (const match of prompt.matchAll(/@\[node:([^\]]+)\]/g)) {
        if (match.index === undefined) continue;
        hasToken = true;
        nextPrompt += prompt.slice(lastIndex, match.index);
        const input = inputByNodeId.get(match[1]);
        if (input) {
            const labels = flattenGenerationInputs([input]).map((resource) => {
                let label = labelByNodeId.get(resource.nodeId);
                if (!label) {
                    label = generationLabel(resource.type, counts[resource.type]++);
                    labelByNodeId.set(resource.nodeId, label);
                    if (resource.type === "text") textBlocks.push(textBlock(label, resource.text || ""));
                    else selectedInputs.push(resource);
                }
                return resource.type === "text" ? `【${label}】` : label;
            });
            nextPrompt += labels.join("、");
        }
        lastIndex = match.index + match[0].length;
    }

    nextPrompt += prompt.slice(lastIndex);
    if (textBlocks.length) nextPrompt = `${nextPrompt.trim()}\n\n${textBlocks.join("\n\n")}`;
    const referenceImages = selectedInputs.map((input) => input.image).filter((image): image is ReferenceImage => Boolean(image));
    const referenceVideos = selectedInputs.map((input) => input.video).filter((video): video is ReferenceVideo => Boolean(video));
    const referenceAudios = selectedInputs.map((input) => input.audio).filter((audio): audio is ReferenceAudio => Boolean(audio));

    if (!hasToken) {
        return {
            prompt,
            referenceImages: [],
            referenceVideos: [],
            referenceAudios: [],
            textCount: 0,
            imageCount: 0,
            videoCount: 0,
            audioCount: 0,
        };
    }

    return {
        prompt: nextPrompt,
        referenceImages,
        referenceVideos,
        referenceAudios,
        textCount: counts.text,
        imageCount: referenceImages.length,
        videoCount: referenceVideos.length,
        audioCount: referenceAudios.length,
    };
}

export function buildNodeGenerationInputs(nodeId: string, nodes: CanvasNodeData[], connections: CanvasConnection[]): NodeGenerationInput[] {
    // FrameDock: connection roles (first/last frame, reference) travel with the images and order the inputs —
    // the same ordering the prompt's reference labels use (canvas-resource-references.ts).
    const resourceNodes = getGenerationResourceNodes(nodeId, nodes, connections);
    const roleOf = inputRoles(nodeId, resourceNodes, nodes, connections);
    const withRole = (input: NodeGenerationResourceInput, role: CanvasConnectionRole | undefined): NodeGenerationResourceInput => (role && input.image ? { ...input, image: { ...input.image, role } } : input);
    return sortByConnectionRole(resourceNodes, roleOf)
        .flatMap((node): NodeGenerationInput[] => {
            const role = roleOf.get(node.id);
            if (node.type === CanvasNodeType.Group) {
                const children = getGroupResourceNodes(node.id, nodes)
                    .flatMap(readNodeGenerationResource)
                    .map((input) => withRole(input, role));
                return children.length ? [{ nodeId: node.id, type: "group", title: node.title, children }] : [];
            }
            return readNodeGenerationResource(node).map((input) => withRole(input, role));
        });
}

function flattenGenerationInputs(inputs: NodeGenerationInput[]) {
    const resources = inputs.flatMap((input) => (input.type === "group" ? input.children : [input]));
    return [...new Map(resources.map((input) => [input.nodeId, input])).values()];
}

function readNodeGenerationResource(node: CanvasNodeData): NodeGenerationResourceInput[] {
    const image = readReferenceImage(node);
    if (image) return [{ nodeId: node.id, type: "image", title: node.title, image }];
    const video = readReferenceVideo(node);
    if (video) return [{ nodeId: node.id, type: "video", title: node.title, video }];
    const audio = readReferenceAudio(node);
    if (audio) return [{ nodeId: node.id, type: "audio", title: node.title, audio }];
    const resource = getNodeDefinition(node.type)?.resource?.(node);
    if (resource?.kind === "image" && resource.url) return [{ nodeId: node.id, type: "image", title: node.title, image: { id: node.id, name: `${node.title || node.id}.png`, type: node.metadata?.mimeType || "image/png", dataUrl: resource.url, storageKey: node.metadata?.storageKey } }];
    if (resource?.kind === "video" && resource.url) return [{ nodeId: node.id, type: "video", title: node.title, video: { id: node.id, name: `${node.title || node.id}.mp4`, type: node.metadata?.mimeType || "video/mp4", url: resource.url, storageKey: node.metadata?.storageKey } }];
    if (resource?.kind === "audio" && resource.url) return [{ nodeId: node.id, type: "audio", title: node.title, audio: { id: node.id, name: `${node.title || node.id}.mp3`, type: node.metadata?.mimeType || "audio/mpeg", url: resource.url, storageKey: node.metadata?.storageKey } }];
    if (resource?.kind === "text" && resource.text) return [{ nodeId: node.id, type: "text", title: node.title, text: resource.text }];
    const text = readNodeTextInput(node);
    return text ? [{ nodeId: node.id, type: "text", title: node.title, text }] : [];
}

export function buildNodeResponseMessages(context: NodeGenerationContext): AiTextMessage[] {
    if (!context.referenceImages.length) {
        return [{ role: "user", content: context.prompt }];
    }

    return [
        {
            role: "user",
            content: [{ type: "text" as const, text: context.prompt }, ...context.referenceImages.map((image) => ({ type: "image_url" as const, image_url: { url: image.dataUrl } }))],
        },
    ];
}

export async function hydrateNodeGenerationContext(context: NodeGenerationContext) {
    const { imageToDataUrl } = await import("@/services/image-storage");
    return { ...context, referenceImages: await Promise.all(context.referenceImages.map(async (image) => ({ ...image, dataUrl: await imageToDataUrl(image) }))) };
}

function readNodeTextInput(node: CanvasNodeData) {
    if (node.type === CanvasNodeType.Text) return textNodeOutput(node);
    return node.metadata?.prompt || "";
}

function textBlock(label: string, text: string) {
    return `【${label}】\n${text}`;
}

function generationLabel(type: NodeGenerationResourceInput["type"], index: number) {
    if (type === "image") return imageReferenceLabel(index);
    if (type === "video") return i18n.t("canvas.configNode.videoReferences") + ` ${index + 1}`;
    if (type === "audio") return i18n.t("canvas.configNode.audioReferences") + ` ${index + 1}`;
    return i18n.t("canvas.composer.resources.text", { index: index + 1 });
}

function readReferenceImage(node: CanvasNodeData): ReferenceImage | null {
    if (node.type !== CanvasNodeType.Image || !node.metadata?.content) return null;
    return {
        id: node.id,
        name: `${node.title || node.id}.png`,
        type: node.metadata.mimeType || "image/png",
        dataUrl: node.metadata.content,
        storageKey: node.metadata.storageKey,
    };
}

function readReferenceVideo(node: CanvasNodeData): ReferenceVideo | null {
    if (node.type !== CanvasNodeType.Video || !node.metadata?.content) return null;
    return {
        id: node.id,
        name: `${node.title || node.id}.mp4`,
        type: node.metadata.mimeType || "video/mp4",
        url: node.metadata.content,
        storageKey: node.metadata.storageKey,
        bytes: node.metadata.bytes,
        width: node.metadata.naturalWidth,
        height: node.metadata.naturalHeight,
        durationMs: node.metadata.durationMs,
    };
}

function readReferenceAudio(node: CanvasNodeData): ReferenceAudio | null {
    if (node.type !== CanvasNodeType.Audio || !node.metadata?.content) return null;
    return {
        id: node.id,
        name: `${node.title || node.id}.mp3`,
        type: node.metadata.mimeType || "audio/mpeg",
        url: node.metadata.content,
        storageKey: node.metadata.storageKey,
        durationMs: node.metadata.durationMs,
    };
}
