import { expect, test } from "bun:test";
import { labStats, labToRgb, matchColors, rgbToLab, type Pixels } from "../src/lib/color-match";

// Images built from a few colours with some spread, so every channel has a real mean and deviation.
function image(colors: Array<[number, number, number]>, size = 64, alpha = 255): Pixels {
    const data = new Uint8ClampedArray(size * size * 4);
    for (let i = 0; i < size * size; i++) {
        const [r, g, b] = colors[i % colors.length]!;
        data.set([r, g, b, alpha], i * 4);
    }
    return { data, width: size, height: size };
}

const neutral = image([[120, 120, 120], [160, 160, 160], [90, 95, 100], [200, 195, 190]]);
const warmDark = image([[90, 60, 30], [120, 80, 45], [60, 40, 25], [140, 100, 60]]);

test("Lab conversion round-trips sRGB", () => {
    for (const color of [[0, 0, 0], [255, 255, 255], [200, 30, 60], [12, 140, 220]] as const) {
        expect(labToRgb(...rgbToLab(...color))).toEqual([...color]);
    }
});

test("a warm, dark image takes on the master's brightness and neutral colour", () => {
    const master = labStats(neutral);
    const result = labStats(matchColors(warmDark, master, { strength: 1, scope: "all" }));
    for (let c = 0; c < 3; c++) expect(Math.abs(result.mean[c]! - master.mean[c]!)).toBeLessThan(1);
});

test("strength 0 returns the image unchanged; half strength lands in between", () => {
    const master = labStats(neutral);
    expect(Array.from(matchColors(warmDark, master, { strength: 0, scope: "all" }).data)).toEqual(Array.from(warmDark.data));
    const before = labStats(warmDark).mean[0];
    const half = labStats(matchColors(warmDark, master, { strength: 0.5, scope: "all" })).mean[0];
    expect(half).toBeGreaterThan(Math.min(before, master.mean[0]));
    expect(half).toBeLessThan(Math.max(before, master.mean[0]));
});

test("tone-only keeps each image's lightness and changes only the colour", () => {
    const master = labStats(neutral);
    const source = labStats(warmDark);
    const result = labStats(matchColors(warmDark, master, { strength: 1, scope: "tone" }));
    expect(Math.abs(result.mean[0] - source.mean[0])).toBeLessThan(1);
    expect(Math.abs(result.mean[1] - master.mean[1])).toBeLessThan(1.5);
    expect(Math.abs(result.mean[2] - master.mean[2])).toBeLessThan(1.5);
});

test("pure black and white pixels do not skew the statistics", () => {
    const withExtremes = image([[120, 120, 120], [160, 160, 160], [90, 95, 100], [200, 195, 190], [0, 0, 0], [255, 255, 255]]);
    const clean = labStats(neutral);
    const noisy = labStats(withExtremes);
    for (let c = 0; c < 3; c++) expect(Math.abs(noisy.mean[c]! - clean.mean[c]!)).toBeLessThan(1);
});

test("transparency is kept, and transparent pixels are ignored", () => {
    const translucent = image([[90, 60, 30], [140, 100, 60]], 32, 128);
    const result = matchColors(translucent, labStats(neutral), { strength: 1, scope: "all" });
    for (let i = 3; i < result.data.length; i += 4) expect(result.data[i]).toBe(128);
    expect(labStats(image([[255, 0, 0]], 8, 0)).samples).toBe(0);
});

test("an image with nothing to measure is returned untouched", () => {
    const blank = image([[0, 0, 0]], 16);
    expect(Array.from(matchColors(blank, labStats(neutral), { strength: 1, scope: "all" }).data)).toEqual(Array.from(blank.data));
});
