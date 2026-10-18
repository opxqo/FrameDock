import { expect, test } from "bun:test";
import { canvasSettingsVerticalPosition } from "../src/lib/canvas/canvas-settings-layout";

test("a settings panel near the top opens below its trigger instead of outside the viewport", () => {
    const position = canvasSettingsVerticalPosition({ top: 197, bottom: 229 }, 720, true);
    expect(position.top).toBe(237);
    expect(position.top! + position.maxHeight).toBeLessThanOrEqual(708);
});

test("a settings panel near the bottom opens above its trigger", () => {
    const position = canvasSettingsVerticalPosition({ top: 650, bottom: 682 }, 720, false);
    expect(position.bottom).toBe(78);
    expect(720 - position.bottom! - position.maxHeight).toBeGreaterThanOrEqual(12);
});

test("short viewports constrain the scroll area and preserve the requested height limit", () => {
    for (const preferTop of [true, false]) {
        const position = canvasSettingsVerticalPosition({ top: 134, bottom: 166 }, 300, preferTop, 100);
        const top = position.top ?? 300 - position.bottom! - position.maxHeight;
        expect(position.maxHeight).toBeLessThanOrEqual(100);
        expect(top).toBeGreaterThanOrEqual(12);
        expect(top + position.maxHeight).toBeLessThanOrEqual(288);
    }
});
