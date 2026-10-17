export type CanvasColorTheme = "light" | "dark";
export type CanvasBackgroundMode = "dots" | "lines" | "blank";

// FrameDock: updream neutrals (see styles/globals.css). Media is the brightest thing on the canvas, so node
// chrome stays close to the ground; selection is white, never a hue.
export const canvasThemes = {
    light: {
        canvas: {
            background: "#f5f5f5",
            dot: "rgba(0,0,0,.18)",
            line: "rgba(0,0,0,.06)",
            selectionStroke: "rgba(0,0,0,.55)",
            selectionFill: "rgba(0,0,0,.04)",
        },
        node: {
            label: "#525252",
            fill: "#e5e5e5",
            panel: "#ffffff",
            stroke: "rgba(0,0,0,.06)",
            activeStroke: "rgba(0,0,0,.55)",
            placeholder: "#737373",
            text: "#0a0a0a",
            muted: "#737373",
            faint: "#a3a3a3",
        },
        edge: {
            stroke: "#a3a3a3",
            selected: "#404040",
        },
        toolbar: {
            panel: "rgba(255,255,255,.78)",
            border: "rgba(0,0,0,.08)",
            item: "#404040",
            itemHover: "rgba(0,0,0,.05)",
            activeBg: "rgba(0,0,0,.06)",
            activeText: "#0a0a0a",
        },
    },
    dark: {
        canvas: {
            background: "#0a0a0a",
            dot: "rgba(255,255,255,.14)",
            line: "rgba(255,255,255,.05)",
            selectionStroke: "rgba(255,255,255,.5)",
            selectionFill: "rgba(255,255,255,.04)",
        },
        node: {
            label: "#e5e5e5",
            fill: "#262626",
            panel: "#171717",
            stroke: "rgba(255,255,255,.06)",
            activeStroke: "rgba(255,255,255,.5)",
            placeholder: "#737373",
            text: "#fafafa",
            muted: "#a3a3a3",
            faint: "#525252",
        },
        edge: {
            stroke: "#525252",
            selected: "#a3a3a3",
        },
        toolbar: {
            panel: "rgba(23,23,23,.75)",
            border: "rgba(255,255,255,.08)",
            item: "#d4d4d4",
            itemHover: "rgba(255,255,255,.08)",
            activeBg: "rgba(255,255,255,.1)",
            activeText: "#fafafa",
        },
    },
} as const;

export type CanvasTheme = (typeof canvasThemes)[CanvasColorTheme];
