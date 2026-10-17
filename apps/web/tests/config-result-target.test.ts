import { describe, expect, test } from "bun:test";

import { configResultTarget, workflowStepForNode } from "../src/lib/canvas/workflow-runner";
import type { CanvasConnection, CanvasNodeData } from "../src/types/canvas";

const node = (id: string, type: string, metadata: CanvasNodeData["metadata"] = {}): CanvasNodeData => ({ id, type, title: id, position: { x: 0, y: 0 }, width: 100, height: 100, metadata });
const link = (from: string, to: string): CanvasConnection => ({ id: `${from}-${to}`, fromNodeId: from, toNodeId: to });

describe("configResultTarget", () => {
    const config = node("config", "config", { generationMode: "image" });

    test("returns the connected result node of the output type", () => {
        const nodes = [config, node("img", "image"), node("next", "config")];
        expect(configResultTarget(config, "image", nodes, [link("config", "img"), link("img", "next")])?.id).toBe("img");
    });

    test("picks the most recent of several results", () => {
        const nodes = [config, node("a", "image"), node("b", "image")];
        expect(configResultTarget(config, "image", nodes, [link("config", "a"), link("config", "b")])?.id).toBe("b");
    });

    test("ignores results of another type and upstream nodes", () => {
        const nodes = [config, node("img", "image"), node("src", "text")];
        expect(configResultTarget(config, "text", nodes, [link("src", "config"), link("config", "img")])).toBeUndefined();
    });

    test("chain runs and single clicks agree", () => {
        const textConfig = node("tc", "config", { generationMode: "text", prompt: "写设定" });
        const nodes = [textConfig, node("out", "text")];
        const connections = [link("tc", "out")];
        expect(workflowStepForNode(textConfig, nodes, connections)?.targetNodeId).toBe(configResultTarget(textConfig, "text", nodes, connections)?.id);
    });
});
