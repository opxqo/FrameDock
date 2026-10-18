import { imageReferenceLabel } from "@/lib/image-reference-prompt";
import { textNodeOutput } from "@/lib/canvas/text-output";
import i18n from "@/i18n";
import { getNodeDefinition } from "@/lib/canvas/node-registry";
import { getDataUrlByteSize, readImageMeta } from "@/lib/image-utils";
import { imageToDataUrl } from "@/services/image-storage";
import { CanvasNodeType, type CanvasConnection, type CanvasConnectionRole, type CanvasNodeData } from "@/types/canvas";

export type CanvasResourceKind = "image" | "video" | "audio" | "text";

export type CanvasResourceReference = {
    id: string;
    nodeId: string;
    kind: CanvasResourceKind;
    label: string;
    title: string;
    previewUrl?: string;
    text?: string;
    active: boolean;
};

/**
 * The resources a node's prompt can reference, numbered in the order they will be sent: inputs sorted by
 * connection role (first frame, last frame, reference, then the rest), groups expanded in place, and — for an
 * image node that already has a picture — that picture first, because generating from it sends it first.
 */
export function buildNodeMentionReferences(node: CanvasNodeData, nodes: CanvasNodeData[], connections: CanvasConnection[], options: { includeOwnImage?: boolean } = {}) {
    const inputs = getGenerationResourceNodes(node.id, nodes, connections);
    const ordered = expandGroupResourceNodes(sortByConnectionRole(inputs, inputRoles(node.id, inputs, nodes, connections)), nodes);
    const resources = ordered.length ? ordered : getMentionResourceNodes(node.id, nodes, connections);
    const includeOwnImage = options.includeOwnImage ?? hasOwnImage(node);
    return labelResourceNodes(includeOwnImage && hasOwnImage(node) && !resources.some((item) => item.id === node.id) ? [node, ...resources] : resources, true);
}

export function hasOwnImage(node: CanvasNodeData | undefined) {
    return node?.type === CanvasNodeType.Image && Boolean(node.metadata?.content);
}

const ROLE_RANK: Record<CanvasConnectionRole, number> = { first: 0, last: 1, reference: 2 };

/**
 * Roles of the connections into the node whose inputs these are: this node itself or — when it borrowed a
 * config node's inputs — that config node.
 */
export function inputRoles(nodeId: string, inputNodes: CanvasNodeData[], nodes: CanvasNodeData[], connections: CanvasConnection[]) {
    const ownInputs = connections.some((connection) => connection.toNodeId === nodeId && inputNodes.some((node) => node.id === connection.fromNodeId));
    const inputsOf = ownInputs ? nodeId : connections.find((connection) => connection.fromNodeId === nodeId && nodes.find((node) => node.id === connection.toNodeId)?.type === CanvasNodeType.Config)?.toNodeId;
    const roleOf = new Map<string, CanvasConnectionRole>();
    for (const connection of connections) if (connection.role && connection.toNodeId === inputsOf) roleOf.set(connection.fromNodeId, connection.role);
    return roleOf;
}

/** Stable sort by connection role; the single ordering both the prompt labels and the request use. */
export function sortByConnectionRole<T extends { id: string }>(items: T[], roleOf: Map<string, CanvasConnectionRole>) {
    const rank = (id: string) => {
        const role = roleOf.get(id);
        return role ? ROLE_RANK[role] : 3;
    };
    return [...items].sort((a, b) => rank(a.id) - rank(b.id));
}

export function buildCanvasResourceReferences(nodes: CanvasNodeData[]) {
    return labelResourceNodes(nodes, true);
}

export async function resolveCanvasReferenceImages(references: CanvasResourceReference[], nodes: CanvasNodeData[]) {
    const nodesById = new Map(nodes.map((node) => [node.id, node]));
    return Promise.all(references.filter((reference) => reference.kind === "image").map(async (reference) => {
        const node = nodesById.get(reference.nodeId);
        if (!node) throw new Error(i18n.t("agent.composer.mentions.resourceMissing", { title: reference.title }));
        const metadata = node.metadata;
        const dataUrl = await imageToDataUrl({ storageKey: metadata?.storageKey, url: reference.previewUrl });
        if (!dataUrl.startsWith("data:image/")) throw new Error(i18n.t("agent.composer.mentions.imageReadFailed", { title: reference.title }));
        const meta = metadata?.naturalWidth && metadata.naturalHeight
            ? { width: metadata.naturalWidth, height: metadata.naturalHeight, mimeType: metadata.mimeType || dataUrl.match(/^data:([^;]+)/)?.[1] || "image/png" }
            : await readImageMeta(dataUrl);
        return {
            id: `canvas:${node.id}`,
            name: reference.title,
            type: metadata?.mimeType || meta.mimeType,
            size: metadata?.bytes || getDataUrlByteSize(dataUrl),
            width: meta.width,
            height: meta.height,
            url: reference.previewUrl || dataUrl,
            dataUrl,
        };
    }));
}

// FrameDock: a node's own upstream always comes first. Only a node without inputs of its own that feeds a config
// node (e.g. a result node regenerated in place) borrows that config node's other inputs.
export function getMentionResourceNodes(nodeId: string, nodes: CanvasNodeData[], connections: CanvasConnection[]) {
    const ownInputs = expandGroupResourceNodes(getContextInputNodes(nodeId, nodes, connections), nodes);
    if (ownInputs.length) return ownInputs;
    const configInputs = expandGroupResourceNodes(getConnectedConfigInputNodes(nodeId, nodes, connections), nodes);
    if (configInputs.length) return configInputs;
    const node = nodes.find((item) => item.id === nodeId);
    return node && isResourceNode(node) ? [node] : [];
}

export function getGenerationResourceNodes(nodeId: string, nodes: CanvasNodeData[], connections: CanvasConnection[]) {
    const ownInputs = getContextInputNodes(nodeId, nodes, connections);
    if (ownInputs.length) return ownInputs;
    return getConnectedConfigInputNodes(nodeId, nodes, connections);
}

function getContextInputNodes(nodeId: string, nodes: CanvasNodeData[], connections: CanvasConnection[]) {
    return connections
        .filter((connection) => connection.toNodeId === nodeId)
        .map((connection) => nodes.find((node) => node.id === connection.fromNodeId))
        .filter((node): node is CanvasNodeData => Boolean(node && isCanvasReferenceNode(node, nodes)));
}

function getConnectedConfigInputNodes(nodeId: string, nodes: CanvasNodeData[], connections: CanvasConnection[]) {
    const configConnection = connections.find((connection) => connection.fromNodeId === nodeId && nodes.find((node) => node.id === connection.toNodeId)?.type === CanvasNodeType.Config);
    if (!configConnection) return [];
    return getContextInputNodes(configConnection.toNodeId, nodes, connections).filter((node) => node.id !== nodeId);
}

function hasGroupResources(node: CanvasNodeData, nodes: CanvasNodeData[]) {
    return node.type === CanvasNodeType.Group && getGroupResourceNodes(node.id, nodes).length > 0;
}

export function isCanvasReferenceNode(node: CanvasNodeData, nodes: CanvasNodeData[]) {
    return isResourceNode(node) || hasGroupResources(node, nodes);
}

function expandGroupResourceNodes(inputNodes: CanvasNodeData[], nodes: CanvasNodeData[]) {
    const resources = inputNodes.flatMap((node) => (node.type === CanvasNodeType.Group ? getGroupResourceNodes(node.id, nodes) : [node]));
    return [...new Map(resources.map((node) => [node.id, node])).values()];
}

export function getGroupResourceNodes(groupId: string, nodes: CanvasNodeData[]) {
    return nodes.filter((node) => node.metadata?.groupId === groupId && isResourceNode(node));
}

function labelResourceNodes(nodes: CanvasNodeData[], active: boolean) {
    const counts: Record<CanvasResourceKind, number> = { image: 0, video: 0, audio: 0, text: 0 };
    return nodes.flatMap((node): CanvasResourceReference[] => {
        const kind = resourceKind(node);
        if (!kind) return [];
        const resource = getNodeDefinition(node.type)?.resource?.(node);
        const index = counts[kind]++;
        const label = labelForKind(kind, index);
        return [
            {
                id: node.id,
                nodeId: node.id,
                kind,
                label,
                title: node.title || label,
                previewUrl: node.metadata?.content || resource?.url,
                text: resourceText(node),
                active,
            },
        ];
    });
}

function labelForKind(kind: CanvasResourceKind, index: number) {
    if (kind === "image") return imageReferenceLabel(index);
    if (kind === "video") return i18n.t("canvas.configNode.videoReferences") + ` ${index + 1}`;
    if (kind === "audio") return i18n.t("canvas.configNode.audioReferences") + ` ${index + 1}`;
    return i18n.t("canvas.composer.resources.text", { index: index + 1 });
}

function isResourceNode(node: CanvasNodeData) {
    return Boolean(resourceKind(node));
}

function resourceText(node: CanvasNodeData): string | undefined {
    if (node.type === CanvasNodeType.Text) return textNodeOutput(node) || undefined;
    const resource = getNodeDefinition(node.type)?.resource?.(node);
    return resource?.kind === "text" ? resource.text : undefined;
}

function resourceKind(node: CanvasNodeData): CanvasResourceKind | null {
    if (node.type === CanvasNodeType.Image && node.metadata?.content) return "image";
    if (node.type === CanvasNodeType.Video && node.metadata?.content) return "video";
    if (node.type === CanvasNodeType.Audio && node.metadata?.content) return "audio";
    if (node.type === CanvasNodeType.Text) return textNodeOutput(node) ? "text" : null;
    // Plugin nodes declare their input eligibility through definition.resource.
    return getNodeDefinition(node.type)?.resource?.(node)?.kind || null;
}
