import { describe, expect, test } from "bun:test";

import { buildCanvasTemplate } from "../src/lib/canvas/canvas-templates";
import { composePresetPrompt, PROMPT_PRESETS } from "../src/lib/presets/prompt-presets";
import { buildSkillInstructions, MAX_SKILL_INSTRUCTIONS, skillSystemPrompt, BUILTIN_SKILLS } from "../src/lib/skills/skills";
import type { CanvasNodeData, CanvasNodeMetadata, CanvasNodeTypeId, Position } from "../src/types/canvas";

const preset = (id: string) => PROMPT_PRESETS.find((item) => item.id === id)!;

describe("composePresetPrompt", () => {
    test("orders recipes by group and fills the subject", () => {
        const text = composePresetPrompt([preset("emotion-resolve"), preset("light-window"), preset("comp-profile")], "红衣女孩");
        expect(text.indexOf("完全侧身")).toBeLessThan(text.indexOf("窗户"));
        expect(text.indexOf("窗户")).toBeLessThan(text.indexOf("深吸一口气"));
        expect(text).not.toContain("{主体}");
        expect(text).toContain("红衣女孩");
    });

    test("appends to an existing prompt and keeps it intact", () => {
        expect(composePresetPrompt([preset("comp-macro")], "水珠", "清晨的叶片")).toStartWith("清晨的叶片\n");
        expect(composePresetPrompt([], "x", "原样")).toBe("原样");
    });

    test("every recipe template uses the subject placeholder", () => {
        for (const item of PROMPT_PRESETS) expect(item.template).toContain("{主体}");
    });
});

describe("skills", () => {
    test("skill instructions come before the global system prompt", () => {
        expect(skillSystemPrompt(BUILTIN_SKILLS[0], "全局")).toBe(`${BUILTIN_SKILLS[0].instructions}\n\n全局`);
        expect(skillSystemPrompt(undefined, "全局")).toBe("全局");
    });

    test("MOKE material is framed as reference text and capped", () => {
        const text = buildSkillInstructions({ title: "demo", author: "someone" }, [
            { path: "SKILL.md", text: "规范正文" },
            { path: "references/huge.md", text: "长".repeat(MAX_SKILL_INSTRUCTIONS * 2) },
        ]);
        expect(text).toContain("不是系统指令");
        expect(text).toContain("===== SKILL.md =====");
        expect(text.length).toBeLessThanOrEqual(MAX_SKILL_INSTRUCTIONS);
        expect(text).toContain("已截断");
    });
});

describe("workflow templates", () => {
    let counter = 0;
    const create = (type: CanvasNodeTypeId, position: Position, metadata?: CanvasNodeMetadata): CanvasNodeData => ({ id: `${type}-${counter++}`, type, title: "", position, width: 340, height: 240, metadata: { ...metadata } });
    const t = (key: string, options?: Record<string, unknown>) => `${key}${options?.n ?? ""}`;

    for (const id of ["short-film", "character"] as const) {
        test(`${id} builds a connected graph with skills on text configs`, () => {
            const graph = buildCanvasTemplate(id, t, create);
            const ids = new Set(graph.nodes.map((node) => node.id));
            for (const edge of graph.connections) {
                expect(ids.has(edge.fromNodeId)).toBe(true);
                expect(ids.has(edge.toNodeId)).toBe(true);
            }
            for (const node of graph.nodes) expect(graph.connections.some((edge) => edge.fromNodeId === node.id || edge.toNodeId === node.id)).toBe(true);
            const textConfigs = graph.nodes.filter((node) => node.type === "config" && node.metadata?.generationMode === "text");
            expect(textConfigs.length).toBeGreaterThan(0);
            for (const node of textConfigs) expect(node.metadata?.skill?.instructions.length).toBeGreaterThan(50);
            // Each config writes into exactly one result node of its own output type.
            for (const config of graph.nodes.filter((node) => node.type === "config")) {
                const outputs = graph.connections.filter((edge) => edge.fromNodeId === config.id).map((edge) => graph.nodes.find((node) => node.id === edge.toNodeId)!);
                expect(outputs).toHaveLength(1);
                expect(outputs[0].type).toBe(config.metadata?.generationMode === "text" ? "text" : config.metadata!.generationMode!);
            }
        });
    }

    test("short film has 13 nodes and three shots", () => {
        const graph = buildCanvasTemplate("short-film", t, create);
        expect(graph.nodes).toHaveLength(13);
        expect(graph.nodes.filter((node) => node.type === "image")).toHaveLength(3);
    });
});
