import { expect, test } from "bun:test";
import { CanvasNodeType, type CanvasConnection, type CanvasNodeData } from "../src/types/canvas";

const { parsePromptTokens, readablePrompt, resolvePromptReferences, nodeReferenceToken, referenceLabelAliases, labelsToNodeTokens, promptSegments } = await import("../src/lib/canvas/prompt-reference-tokens");
const { buildNodeMentionReferences } = await import("../src/lib/canvas/canvas-resource-references");
const { buildNodeGenerationContext } = await import("../src/components/canvas/canvas-node-generation");
const { compileReferenceSyntax } = await import("../src/lib/reference-syntax");
const { referenceOverflowIssue } = await import("../src/lib/yfai-preflight");
const { buildYfaiInvoke } = await import("../src/services/api/yfai");
const { findYfaiModel, yfaiDefaults } = await import("../src/lib/yfai-catalog");

// Prompts point at canvas pictures by node id; the number a picture gets ("图片2") must always be the position
// it is sent in, and each model must receive its own way of writing that number.

const image = (id: string, title = id): CanvasNodeData => ({ id, type: CanvasNodeType.Image, title, position: { x: 0, y: 0 }, width: 100, height: 100, metadata: { content: `data:image/png;base64,${id}` } });
const target = (id = "target", content?: string): CanvasNodeData => ({ id, type: CanvasNodeType.Image, title: "目标", position: { x: 0, y: 0 }, width: 100, height: 100, metadata: content ? { content } : {} });
const link = (from: string, to = "target", role?: CanvasConnection["role"]): CanvasConnection => ({ id: `${from}->${to}`, fromNodeId: from, toNodeId: to, ...(role ? { role } : {}) });
const tok = nodeReferenceToken;

test("tokens round-trip, and old plain labels are still recognised", () => {
    expect(parsePromptTokens(`把 ${tok("a")} 放进 图片12 的背景`, ["图片1", "图片12"])).toEqual([
        { type: "text", value: "把 " },
        { type: "node", nodeId: "a" },
        { type: "text", value: " 放进 " },
        { type: "label", label: "图片12" },
        { type: "text", value: " 的背景" },
    ]);
    expect(resolvePromptReferences(`${tok("a")} 和 ${tok("gone")}`, new Map([["a", "图片1"]]))).toEqual({ text: "图片1 和 ", unresolved: ["gone"] });
    expect(readablePrompt(`看 ${tok("a")}`, [{ id: "a", title: "森林" }])).toBe("看 「森林」");
});

test("prompt labels follow the send order: first frame, last frame, reference, then the rest", () => {
    const nodes = [target(), image("plain"), image("ref"), image("last"), image("first")];
    const connections = [link("plain"), link("ref", "target", "reference"), link("last", "target", "last"), link("first", "target", "first")];
    const labels = buildNodeMentionReferences(nodes[0]!, nodes, connections).map((item) => [item.nodeId, item.label]);
    expect(labels).toEqual([["first", "图片1"], ["last", "图片2"], ["ref", "图片3"], ["plain", "图片4"]]);

    const context = buildNodeGenerationContext("target", nodes, connections, `把 ${tok("plain")} 的颜色用在 ${tok("first")} 上`);
    expect(context.prompt).toBe("把 图片4 的颜色用在 图片1 上");
    expect(context.referenceImages.map((item) => item.id)).toEqual(["first", "last", "ref", "plain"]);
});

test("a reference keeps pointing at the same picture when connections change", () => {
    const nodes = [target(), image("a"), image("b"), image("c")];
    const prompt = `只用 ${tok("c")} 的构图`;
    const before = buildNodeGenerationContext("target", nodes, [link("a"), link("b"), link("c")], prompt);
    expect(before.prompt).toBe("只用 图片3 的构图");
    // "a" disconnected: "c" is now sent second, and the prompt says so.
    const after = buildNodeGenerationContext("target", nodes, [link("b"), link("c")], prompt);
    expect(after.prompt).toBe("只用 图片2 的构图");
    expect(after.referenceImages[1]?.id).toBe("c");
});

test("an image node that already has a picture sends it first, and the numbers count it", () => {
    const nodes = [target("target", "data:image/png;base64,own"), image("style")];
    const connections = [link("style")];
    expect(buildNodeMentionReferences(nodes[0]!, nodes, connections).map((item) => item.nodeId)).toEqual(["target", "style"]);
    const context = buildNodeGenerationContext("target", nodes, connections, `按 ${tok("style")} 重绘 ${tok("target")}`, { includeOwnImage: true });
    expect(context.prompt).toBe("按 图片2 重绘 图片1");
    expect(context.referenceImages.map((item) => item.id)).toEqual(["target", "style"]);
});

test("a reference to a picture that is no longer connected stops the run before anything is sent", () => {
    const nodes = [target(), image("a"), image("gone", "旧森林")];
    expect(() => buildNodeGenerationContext("target", nodes, [link("a")], `参考 ${tok("gone")}`)).toThrow("旧森林");
});

test("each model gets its own reference syntax", () => {
    const counts = { images: 2, videos: 1, audios: 1 };
    expect(compileReferenceSyntax("让 图片2 里的人走进 图片1，配合 参考视频 1 的动作和 参考音频 1", "seedance-2-0-official", counts)).toBe("让 @图片2 里的人走进 @图片1，配合 @视频1 的动作和 @音频1");
    expect(compileReferenceSyntax("把 图片2 的狗放进 图片1", "flux-3", counts)).toBe("把 Image 2 的狗放进 Image 1");
    expect(compileReferenceSyntax("把 图片2 的狗放进 图片1", "kling-image-o3", counts)).toBe("把 图2 的狗放进 图1");
    expect(compileReferenceSyntax("图片1 的风格", "mj_imagine", counts)).toBe("图片1 的风格");
    // No documented syntax: numbers stay, with a legend in front.
    expect(compileReferenceSyntax("图片2 换成夜景", "gpt-image-2", counts)).toContain("参考图片编号：图片1、图片2");
    // A number beyond what is sent is not rewritten (the pre-run check reports it).
    expect(compileReferenceSyntax("图片3 的背景", "seedance-2-0-official", counts)).toBe("图片3 的背景");
    expect(compileReferenceSyntax("一只猫", "gpt-image-2", counts)).toBe("一只猫");
});

test("the pre-run check reports a picture number higher than what is sent", () => {
    expect(referenceOverflowIssue("图片1 和 图片4", 3)).toContain("图片4");
    expect(referenceOverflowIssue("图片1 和 图片3", 3)).toBeUndefined();
});

test("a Seedance request carries @图片N for the pictures it sends", () => {
    const model = findYfaiModel("yfai::seedance-2-0-official")!;
    const body = buildYfaiInvoke({ yfaiParams: "" }, model, "让 图片2 的人走进 图片1", { ...yfaiDefaults(model), mode: "reference", images: ["https://example.com/a.png", "https://example.com/b.png"] });
    expect((body.params as { prompt: string }).prompt).toBe("让 @图片2 的人走进 @图片1");
});

test("图N is another spelling of 图片N, and never splits a longer number", () => {
    expect(referenceLabelAliases("图片2")).toEqual(["图2"]);
    expect(referenceLabelAliases("视频1")).toEqual([]);
    expect(parsePromptTokens("图1（黑衣）与图10", ["图片1", "图1"])).toEqual([
        { type: "label", label: "图1" },
        { type: "text", value: "（黑衣）与图10" },
    ]);
});

test("图片N written by a model becomes the reference token of the Nth image sent", () => {
    expect(labelsToNodeTokens("图片1（黑衣剑客）对图片2；@图片3 是场景；图片4 不存在；图片10", ["a", "b", "c"])).toBe("@[node:a]（黑衣剑客）对@[node:b]；@[node:c] 是场景；图片4 不存在；图片10");
    expect(labelsToNodeTokens("{{Image 1}}（黑衣）与{{Image 2}}{{Image 3}}，{{Image 9}}", ["a", "b", "c"])).toBe("@[node:a]（黑衣）与@[node:b]@[node:c]，{{Image 9}}");
});

test("references inside an upstream text get the receiving node's numbers, and a missing one stops the run", () => {
    const text = (content: string): CanvasNodeData => ({ id: "t", type: CanvasNodeType.Text, title: "提示词", position: { x: 0, y: 0 }, width: 100, height: 100, metadata: { content } });
    const nodes = [target(), image("a"), image("b"), text(`${tok("a")} 对 ${tok("b")}`)];
    const context = buildNodeGenerationContext("target", nodes, [link("b"), link("a"), link("t")], "按下文生成");
    expect(context.prompt).toContain("图片2 对 图片1");
    expect(context.referenceImages.map((item) => item.id)).toEqual(["b", "a"]);
    expect(() => buildNodeGenerationContext("target", nodes, [link("a"), link("t")], "按下文生成")).toThrow();
});

test("a text with references is split for reading: chips for live references, a broken one for a gone node, 图片N for the old handle", () => {
    const refs = [{ nodeId: "a", label: "图片1", kind: "image", previewUrl: "blob:a", title: "黑衣", active: true }, { nodeId: "b", label: "图片2", kind: "image", title: "白衣", active: false }];
    expect(promptSegments(`${tok("a")}（黑衣）对 ${tok("b")}，{{Image 3}} 与 ${tok("gone")}`, refs)).toEqual([
        { type: "reference", nodeId: "a", label: "图片1", kind: "image", previewUrl: "blob:a", title: "黑衣" },
        { type: "text", value: "（黑衣）对 " },
        { type: "missing", nodeId: "b" },
        { type: "text", value: "，图片3 与 " },
        { type: "missing", nodeId: "gone" },
    ]);
});
