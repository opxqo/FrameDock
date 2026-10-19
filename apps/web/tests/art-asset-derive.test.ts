import { expect, test } from "bun:test";
import { artAssetDeriveType, artAssetMaster, artAssetOutputs, CHARACTER_DERIVE_NODE_TYPE, CHARACTER_MASTER_NODE_TYPE } from "../src/lib/art-assets/node-types";

test("only images made by a 定稿 node offer one-click 派生, to the matching 派生 node", () => {
    expect(artAssetDeriveType({ metadata: { artAssetFrom: CHARACTER_MASTER_NODE_TYPE } })).toBe(CHARACTER_DERIVE_NODE_TYPE);
    expect(artAssetDeriveType({ metadata: { artAssetFrom: CHARACTER_DERIVE_NODE_TYPE } })).toBeUndefined();
    expect(artAssetDeriveType({ metadata: {} })).toBeUndefined();
});

test("a 定稿 node shares its first output as 母版, or the one picked, and nothing when switched off", () => {
    const node = (artAsset?: { masterId?: string; useMaster?: boolean }) => ({ id: "m", type: CHARACTER_MASTER_NODE_TYPE, metadata: { artAsset } });
    const image = (id: string, extra: Record<string, unknown> = {}) => ({ id, type: "image", metadata: { content: `/api/kv/x/${id}`, artAssetFrom: CHARACTER_MASTER_NODE_TYPE, ...extra } });
    const nodes = [image("first"), image("loading", { content: "" }), image("second"), image("manual", { artAssetFrom: undefined }), image("elsewhere")];
    const connections = ["first", "loading", "second", "manual"].map((id) => ({ fromNodeId: "m", toNodeId: id }));
    expect(artAssetOutputs(node(), nodes, connections).map((item) => item.id)).toEqual(["first", "second"]);
    expect(artAssetMaster(node(), nodes, connections)?.id).toBe("first");
    expect(artAssetMaster(node({ masterId: "second" }), nodes, connections)?.id).toBe("second");
    expect(artAssetMaster(node({ masterId: "gone" }), nodes, connections)?.id).toBe("first");
    expect(artAssetMaster(node({ useMaster: false }), nodes, connections)).toBeUndefined();
    expect(artAssetMaster(node(), nodes, [])).toBeUndefined();
});
