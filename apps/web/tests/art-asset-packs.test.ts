import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { ART_ASSET_PACKS, ART_ASSET_TIERS, artAssetNodeType } from "../src/lib/art-assets/packs";
import { ART_ASSET_DERIVE_FOR } from "../src/lib/art-assets/node-types";
import { composeArtAssetPrompt, type ArtAssetTemplate } from "../src/lib/art-assets/templates";
import { mediaRatioOptions } from "../src/lib/media-size";

// Guards every 美术资产 pack (docs/design/preset-nodes.md). New packs and templates are checked here automatically.

const ratios = new Set<string>(mediaRatioOptions.map((item) => item.value));
const all = ART_ASSET_PACKS.flatMap((pack) => ART_ASSET_TIERS.flatMap((tier) => (pack[tier]?.templates ?? []).map((template) => ({ pack, tier, template }))));
const readMoke = (name: string) => (JSON.parse(readFileSync(new URL(`../../../docs/research/${name}`, import.meta.url), "utf8")) as { items: Array<{ prompt: string }> }).items;
const moke = [...readMoke("moke-art-assets.json"), ...readMoke("moke-storyboard.json")];
const filled = (template: ArtAssetTemplate) => composeArtAssetPrompt(template, { description: "测试主体", referenceCount: 1 });

test("template ids are unique across all packs", () => {
    const ids = all.map(({ template }) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
});

test("every node has a title, a short menu line and templates; 定稿 and 派生 come in pairs for one-click derive", () => {
    for (const pack of ART_ASSET_PACKS) {
        expect(pack.label.zh && pack.label.en).toBeTruthy();
        expect(pack.group.zh && pack.group.en).toBeTruthy();
        for (const tier of ART_ASSET_TIERS) {
            const spec = pack[tier];
            if (!spec) continue;
            expect(spec.templates.length).toBeGreaterThan(0);
            expect(spec.title.zh && spec.title.en).toBeTruthy();
            expect(spec.description.zh.length).toBeLessThanOrEqual(14);
        }
        if (pack.master && pack.derive) expect(ART_ASSET_DERIVE_FOR[artAssetNodeType(pack.category, "master")]).toBe(artAssetNodeType(pack.category, "derive"));
    }
});

test("each template matches its node: category, tier, input rule, ratio, both languages", () => {
    for (const { pack, tier, template } of all) {
        const where = `${pack.category}/${tier}/${template.id}`;
        expect([where, template.category]).toEqual([where, pack.category]);
        expect([where, template.tier]).toEqual([where, tier]);
        // 派生 and 工具 always work on an image; a 定稿 node needs at least one template that starts from text.
        if (tier !== "master") expect([where, template.input]).toEqual([where, "image"]);
        expect([where, ratios.has(template.size)]).toEqual([where, true]);
        expect([where, Boolean(template.title?.zh && template.title.en && template.summary?.zh && template.summary.en)]).toEqual([where, true]);
        expect([where, template.source === "moke" || template.source === "framedock"]).toEqual([where, true]);
    }
    for (const pack of ART_ASSET_PACKS) if (pack.master) expect([pack.category, pack.master.templates.some((template) => template.input === "either")]).toEqual([pack.category, true]);
});

test("options match the {{placeholders}} in the prompt, and nothing is left unfilled", () => {
    for (const { template } of all) {
        const placeholders = [...template.prompt.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]).sort();
        expect([template.id, placeholders]).toEqual([template.id, (template.options ?? []).map((option) => option.id).sort()]);
        for (const option of template.options ?? []) {
            expect([template.id, option.choices.length >= 2, Boolean(option.label?.zh && option.label.en)]).toEqual([template.id, true, true]);
            if (option.choiceLabels) expect([template.id, option.choiceLabels.length]).toEqual([template.id, option.choices.length]);
        }
        const result = filled(template);
        expect([template.id, "prompt" in result && !/\{\{|\[主体\]/.test(result.prompt)]).toEqual([template.id, true]);
    }
});

test("MOKE templates are MOKE's text: with the default options filled in, the prompt appears in the captured library", () => {
    // Templates whose MOKE text was edited (typo fixes, an added subject line) are listed with the reason.
    const edited: Record<string, string> = {
        "moke-character-turnaround": "added the 以参考角色或 [主体] 为主体 subject line",
        "moke-character-t-pose": "machine-translation slips corrected",
        "moke-character-breakdown": "dropped MOKE's stray leading \"/\"",
        "moke-prop-gray-model": "dropped MOKE's stray leading \"/\"",
    };
    for (const { template } of all) {
        if (template.source !== "moke" || edited[template.id]) continue;
        const defaults = Object.fromEntries((template.options ?? []).map((option) => [option.id, option.choices[0]!]));
        const text = template.prompt.replace(/\{\{(\w+)\}\}/g, (_, id: string) => defaults[id] ?? "");
        // Blank lines between MOKE's 【sections】 do not matter; every character does.
        const squash = (value: string) => value.replace(/\s*\n\s*/g, "\n").trim();
        expect([template.id, moke.some((item) => squash(item.prompt) === squash(text))]).toEqual([template.id, true]);
    }
});
