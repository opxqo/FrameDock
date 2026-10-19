import { expect, test } from "bun:test";
import { ART_ASSET_CATEGORIES, ART_ASSET_TEMPLATES, artAssetTemplates, composeArtAssetPrompt, findArtAssetTemplate } from "../src/lib/art-assets/templates";
import zh from "../src/i18n/locales/zh-CN";
import en from "../src/i18n/locales/en-US";

test("every category has two templates with complete fields and translated names", () => {
    for (const category of ART_ASSET_CATEGORIES) expect(artAssetTemplates(category)).toHaveLength(2);
    expect(new Set(ART_ASSET_TEMPLATES.map((item) => item.id)).size).toBe(ART_ASSET_TEMPLATES.length);
    for (const item of ART_ASSET_TEMPLATES) {
        expect(item.prompt.length).toBeGreaterThan(60);
        expect(item.size).toMatch(/^(auto|\d+:\d+)$/);
        for (const locale of [zh, en] as Array<{ artAsset: { templates: Record<string, { title: string; summary: string }> } }>) {
            expect(locale.artAsset.templates[item.id]?.title).toBeTruthy();
            expect(locale.artAsset.templates[item.id]?.summary).toBeTruthy();
        }
    }
});

test("a description alone is enough for an image-or-text template", () => {
    const result = composeArtAssetPrompt(findArtAssetTemplate("character-turnaround"), { description: "白色猫族探险家，军绿色夹克", referenceCount: 0 });
    expect("prompt" in result && result.prompt).toContain("【补充描述】\n白色猫族探险家，军绿色夹克");
    expect("prompt" in result && result.prompt).not.toContain("参考图为准");
    expect("prompt" in result && result.prompt).toContain("浅灰背景");
});

test("references add the consistency rule; scenes keep their own background", () => {
    const result = composeArtAssetPrompt(findArtAssetTemplate("scene-clean-plate"), { description: "", referenceCount: 2 });
    expect("prompt" in result && result.prompt).toContain("严格以参考图为准");
    expect("prompt" in result && result.prompt).toContain("综合使用");
    expect("prompt" in result && result.prompt).not.toContain("浅灰背景");
    expect("prompt" in result && result.prompt).not.toContain("【补充描述】");
});

test("missing input is refused before anything is sent", () => {
    expect(composeArtAssetPrompt(findArtAssetTemplate("prop-turnaround"), { description: "  ", referenceCount: 0 })).toEqual({ error: "noInput" });
    expect(composeArtAssetPrompt(findArtAssetTemplate("costume-breakdown"), { description: "皮夹克", referenceCount: 0 })).toEqual({ error: "needsImage" });
    expect(composeArtAssetPrompt(undefined, { description: "x", referenceCount: 1 })).toEqual({ error: "noTemplate" });
});

test("a preset's ratio fills a YFAI model's ratio only when left on auto and supported", async () => {
    const { withPreferredYfaiRatio } = await import("../src/lib/yfai-catalog");
    const model = { id: "img-x", category: "image", display_name: "X", param_schema: { aspect_ratio: { type: "enum", required: false, enum: ["1:1", "16:9"] } } } as never;
    expect(JSON.parse(withPreferredYfaiRatio("", "yfai::img-x", "16:9", [model]))).toEqual({ "img-x": { aspect_ratio: "16:9" } });
    const chosen = JSON.stringify({ "img-x": { aspect_ratio: "1:1" }, other: { a: 1 } });
    expect(withPreferredYfaiRatio(chosen, "yfai::img-x", "16:9", [model])).toBe(chosen);
    expect(withPreferredYfaiRatio("", "yfai::img-x", "21:9", [model])).toBe("");
    expect(withPreferredYfaiRatio("", "yfai::img-x", "auto", [model])).toBe("");
    expect(withPreferredYfaiRatio("", "openai::gpt-image", "16:9", [model])).toBe("");
});

test("MOKE prompts are sent as written: [主体] takes the description or is dropped, options fill {{id}}", async () => {
    const { CHARACTER_PACK } = await import("../src/lib/art-assets/packs/character");
    const CHARACTER_MASTER_TEMPLATES = CHARACTER_PACK.master!.templates;
    const CHARACTER_DERIVE_TEMPLATES = CHARACTER_PACK.derive!.templates;
    const turnaround = CHARACTER_MASTER_TEMPLATES[0];
    const fromText = composeArtAssetPrompt(turnaround, { description: "白色猫族探险家", referenceCount: 0 });
    // Text only: "参考角色或 [主体]" becomes the description; with an image connected both stay.
    expect("prompt" in fromText && fromText.prompt.startsWith("以白色猫族探险家 为主体")).toBe(true);
    const fromBoth = composeArtAssetPrompt(turnaround, { description: "白色猫族探险家", referenceCount: 1 });
    expect("prompt" in fromBoth && fromBoth.prompt.startsWith("以参考角色或 白色猫族探险家 为主体")).toBe(true);
    const fromImage = composeArtAssetPrompt(turnaround, { description: "", referenceCount: 1 });
    expect("prompt" in fromImage && fromImage.prompt.startsWith("以参考角色为主体")).toBe(true);
    expect("prompt" in fromImage && fromImage.prompt).not.toContain("[主体]");

    const expressions = CHARACTER_DERIVE_TEMPLATES.find((item) => item.id === "moke-character-expressions");
    const byDefault = composeArtAssetPrompt(expressions, { description: "", referenceCount: 1 });
    expect("prompt" in byDefault && byDefault.prompt).toContain("采用头像半身特写，");
    const chosen = composeArtAssetPrompt(expressions, { description: "", referenceCount: 1, options: { range: "仅头部特写" } });
    expect("prompt" in chosen && chosen.prompt).toContain("采用仅头部特写，");
    const bogus = composeArtAssetPrompt(expressions, { description: "", referenceCount: 1, options: { range: "x" } });
    expect("prompt" in bogus && bogus.prompt).toContain("采用头像半身特写，");

    const tPose = CHARACTER_DERIVE_TEMPLATES.find((item) => item.id === "moke-character-t-pose");
    expect(composeArtAssetPrompt(tPose, { description: "强调护目镜", referenceCount: 0 })).toEqual({ error: "needsImage" });
    const withNote = composeArtAssetPrompt(tPose, { description: "强调护目镜", referenceCount: 1 });
    expect("prompt" in withNote && withNote.prompt.endsWith("【补充描述】\n强调护目镜")).toBe(true);
    expect("prompt" in withNote && withNote.prompt).not.toContain("通用要求");
});
