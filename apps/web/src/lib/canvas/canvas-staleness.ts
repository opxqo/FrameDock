import { textNodeOutput } from "@/lib/canvas/text-output";
import { getGenerationResourceNodes, getGroupResourceNodes } from "@/lib/canvas/canvas-resource-references";
import { CanvasNodeType, type CanvasConnection, type CanvasNodeData } from "@/types/canvas";

// FrameDock: "stale" marks a generated result whose inputs changed after it was made. When a node finishes
// generating, a signature of everything that produced it (prompt, settings, upstream content and connection
// roles) is stored as metadata.inputHash; comparing it with the current signature tells whether a re-run
// would produce something different.

function hash(value: string) {
    let result = 0;
    for (let i = 0; i < value.length; i += 1) result = (result * 31 + value.charCodeAt(i)) | 0;
    return `${value.length}:${result}`;
}

/** Stable identity of a node's output: object URLs differ per session, so storage keys win. */
function outputFingerprint(node: CanvasNodeData, nodes: CanvasNodeData[]): string {
    if (node.type === CanvasNodeType.Group) {
        return getGroupResourceNodes(node.id, nodes)
            .map((child) => outputFingerprint(child, nodes))
            .join("|");
    }
    if (node.type === CanvasNodeType.Text) return `text:${hash(textNodeOutput(node))}`;
    const metadata = node.metadata;
    const content = metadata?.content || "";
    const media = metadata?.storageKey || (content.startsWith("blob:") ? "blob" : hash(content.slice(0, 120)));
    return `${node.type}:${media}:${metadata?.primaryImageId || ""}`;
}

/** The node whose inputs produce this node's output: a connected config/Codex generator, else the node itself. */
export function generatorOf(node: CanvasNodeData, nodes: CanvasNodeData[], connections: CanvasConnection[]) {
    const incoming = connections.find((connection) => connection.toNodeId === node.id && nodes.find((item) => item.id === connection.fromNodeId && (item.type === CanvasNodeType.Config || item.type === CanvasNodeType.Codex)));
    return (incoming && nodes.find((item) => item.id === incoming.fromNodeId)) || node;
}

export function nodeInputSignature(node: CanvasNodeData, nodes: CanvasNodeData[], connections: CanvasConnection[]) {
    const generator = generatorOf(node, nodes, connections);
    const metadata = generator.metadata;
    const own = [
        generator.type === CanvasNodeType.Config ? metadata?.generationMode : generator.type === CanvasNodeType.Codex ? metadata?.codexMode : "",
        metadata?.composerContent ?? metadata?.prompt ?? "",
        metadata?.model,
        metadata?.size,
        metadata?.count,
        metadata?.seconds,
        metadata?.vquality,
        metadata?.videoMode,
        metadata?.skill?.id,
        metadata?.codexModel,
        metadata?.codexEffort,
    ].join("\u0001");
    const roles = new Map(connections.filter((connection) => connection.toNodeId === generator.id).map((connection) => [connection.fromNodeId, connection.role || ""]));
    const inputs = getGenerationResourceNodes(generator.id, nodes, connections)
        .map((input) => `${roles.get(input.id) || ""}~${input.id}~${outputFingerprint(input, nodes)}`)
        .join("\u0002");
    return hash(`${own}\u0003${inputs}`);
}

/** Generated nodes whose recorded signature no longer matches their current inputs. */
export function computeStaleNodeIds(nodes: CanvasNodeData[], connections: CanvasConnection[]) {
    const stale = new Set<string>();
    for (const node of nodes) {
        const recorded = node.metadata?.inputHash;
        if (!recorded || node.metadata?.status !== "success") continue;
        if (nodeInputSignature(node, nodes, connections) !== recorded) stale.add(node.id);
    }
    return stale;
}
