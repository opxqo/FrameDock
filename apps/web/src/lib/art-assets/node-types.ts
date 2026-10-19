// FrameDock: 美术资产 node types and how they chain (pure, so the toolbar and tests can use it without the UI).

import { ART_ASSET_PACKS, artAssetNodeType } from "@/lib/art-assets/packs";

export const ART_ASSET_NODE_TYPE = "framedock:art-asset";
export const CHARACTER_MASTER_NODE_TYPE = artAssetNodeType("character", "master");
export const CHARACTER_DERIVE_NODE_TYPE = artAssetNodeType("character", "derive");

/** Which 派生 node continues from an image made by a 定稿 node (one-click derive), for every pack that has both. */
export const ART_ASSET_DERIVE_FOR: Record<string, string> = Object.fromEntries(
    ART_ASSET_PACKS.filter((pack) => pack.master && pack.derive).map((pack) => [artAssetNodeType(pack.category, "master"), artAssetNodeType(pack.category, "derive")]),
);

/** The 派生 node type for an image, when a 定稿 node made it. */
export function artAssetDeriveType(image: { metadata?: { artAssetFrom?: string } }) {
    return ART_ASSET_DERIVE_FOR[image.metadata?.artAssetFrom ?? ""];
}

type AssetNode = { id: string; type: string; metadata?: { content?: string; artAssetFrom?: string; artAsset?: { masterId?: string; useMaster?: boolean } } };

/**
 * The images a 美术资产 node has produced (connected from it, made by a node of its type), oldest first. Together
 * they are the node's asset set; one of them is its 母版.
 */
export function artAssetOutputs<T extends AssetNode>(node: AssetNode, nodes: T[], connections: Array<{ fromNodeId: string; toNodeId: string }>): T[] {
    const targets = new Set(connections.filter((connection) => connection.fromNodeId === node.id).map((connection) => connection.toNodeId));
    return nodes.filter((item) => targets.has(item.id) && item.type === "image" && item.metadata?.content && item.metadata.artAssetFrom === node.type);
}

/**
 * The 母版 a 定稿 node shares with its own later generations: the output the user picked, else its first one.
 * None when the user switched sharing off or nothing has been produced yet.
 */
export function artAssetMaster<T extends AssetNode>(node: AssetNode, nodes: T[], connections: Array<{ fromNodeId: string; toNodeId: string }>): T | undefined {
    if (node.metadata?.artAsset?.useMaster === false) return undefined;
    const outputs = artAssetOutputs(node, nodes, connections);
    return outputs.find((item) => item.id === node.metadata?.artAsset?.masterId) ?? outputs[0];
}
