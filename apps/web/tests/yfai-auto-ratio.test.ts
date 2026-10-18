import { expect, test } from "bun:test";

import { resolveYfaiAutoParams, yfaiDefaults, type YfaiModel } from "../src/lib/yfai-catalog";

const model = (required: boolean) => ({ id: "mj_imagine", category: "image", param_schema: { aspect_ratio: { type: "enum", required, default: "1:1", enum: ["1:1", "16:9", "4:5"] }, count: { type: "int", default: 1 } } }) as unknown as YfaiModel;

test("ratio is never pre-filled, so the panel shows 自动", () => {
    expect(yfaiDefaults(model(true))).toEqual({ count: 1 });
});

test("required ratio follows the canvas size, else the model default; optional stays unsent", () => {
    expect(resolveYfaiAutoParams(model(true), {}, { size: "16:9" }).aspect_ratio).toBe("16:9");
    expect(resolveYfaiAutoParams(model(true), {}, { size: "auto" }).aspect_ratio).toBe("1:1");
    expect(resolveYfaiAutoParams(model(true), { aspect_ratio: "4:5" }, { size: "16:9" }).aspect_ratio).toBe("4:5");
    expect(resolveYfaiAutoParams(model(false), {}, { size: "16:9" }).aspect_ratio).toBeUndefined();
});
