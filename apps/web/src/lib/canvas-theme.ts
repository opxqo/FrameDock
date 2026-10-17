export type CanvasColorTheme = "light" | "dark";
export type CanvasBackgroundMode = "dots" | "lines" | "blank";

// FrameDock: control-room neutrals (see styles/globals.css). Media should be the brightest thing on the canvas,
// so node chrome stays close to the ground and the active stroke uses the signal amber.
export const canvasThemes = {
    light: {
        canvas: {
            background: "#eef1f4",
            dot: "rgba(19,22,27,.22)",
            line: "rgba(19,22,27,.08)",
            selectionStroke: "#df8623",
            selectionFill: "rgba(223,134,35,.08)",
        },
        node: {
            label: "#595e64",
            fill: "#e4e6ea",
            panel: "#fcfdff",
            stroke: "#d1d5d9",
            activeStroke: "#df8623",
            placeholder: "#757b83",
            text: "#13161b",
            muted: "#595e64",
            faint: "#a0a5ac",
        },
        toolbar: {
            panel: "rgba(252,253,255,.96)",
            border: "rgba(19,22,27,.11)",
            item: "#3e4349",
            itemHover: "#e9ebee",
            activeBg: "#e4e6ea",
            activeText: "#13161b",
        },
    },
    dark: {
        canvas: {
            background: "#101317",
            dot: "rgba(240,242,244,.16)",
            line: "rgba(240,242,244,.06)",
            selectionStroke: "#f7ad44",
            selectionFill: "rgba(247,173,68,.08)",
        },
        node: {
            label: "#a0a5ac",
            fill: "#1f2328",
            panel: "#191c20",
            stroke: "#2a2e34",
            activeStroke: "#f7ad44",
            placeholder: "#757b83",
            text: "#f0f2f4",
            muted: "#a0a5ac",
            faint: "#565b63",
        },
        toolbar: {
            panel: "rgba(25,28,32,.94)",
            border: "rgba(240,242,244,.09)",
            item: "#c3c8ce",
            itemHover: "#272c31",
            activeBg: "#2a2e34",
            activeText: "#f0f2f4",
        },
    },
} as const;

export type CanvasTheme = (typeof canvasThemes)[CanvasColorTheme];
