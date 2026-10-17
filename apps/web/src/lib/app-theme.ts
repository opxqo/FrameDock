import type { ThemeConfig } from "antd";
import { theme as antdTheme } from "antd";

// FrameDock: antd mirrors the CSS tokens in styles/globals.css (control-room charcoal + signal amber).
// antd derives its palettes from hex, so the OKLCH tokens are written here as their sRGB equivalents.
const palette = {
    light: {
        signal: "#df8623",
        signalHover: "#e99a3f",
        onSignal: "#25170c",
        bg: "#f5f7f9",
        container: "#fcfdff",
        elevated: "#fcfdff",
        text: "#13161b",
        textSecondary: "#595e64",
        border: "rgba(19, 22, 27, 0.11)",
        borderSecondary: "rgba(19, 22, 27, 0.07)",
        fill: "rgba(19, 22, 27, 0.06)",
        hover: "rgba(19, 22, 27, 0.05)",
        selected: "rgba(223, 134, 35, 0.12)",
        selectedHover: "rgba(223, 134, 35, 0.18)",
        error: "#d6403e",
        success: "#2f9e5f",
        warning: "#df8623",
        shadow: "0 2px 4px rgba(19, 22, 27, 0.06), 0 12px 32px -8px rgba(19, 22, 27, 0.18)",
    },
    dark: {
        signal: "#f7ad44",
        signalHover: "#fcbe62",
        onSignal: "#25170c",
        bg: "#121519",
        container: "#191c20",
        elevated: "#1f2328",
        text: "#f0f2f4",
        textSecondary: "#a0a5ac",
        border: "rgba(240, 242, 244, 0.1)",
        borderSecondary: "rgba(240, 242, 244, 0.06)",
        fill: "rgba(240, 242, 244, 0.08)",
        hover: "rgba(240, 242, 244, 0.06)",
        selected: "rgba(247, 173, 68, 0.14)",
        selectedHover: "rgba(247, 173, 68, 0.2)",
        error: "#f75d59",
        success: "#52cd86",
        warning: "#f7ad44",
        shadow: "0 2px 6px rgba(4, 6, 10, 0.4), 0 16px 40px -10px rgba(4, 6, 10, 0.65)",
    },
};

const FONT_FAMILY = '"Geist Variable", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif';
const FONT_FAMILY_CODE = '"Geist Mono Variable", ui-monospace, "SF Mono", Menlo, monospace';

export function getAntThemeConfig(dark: boolean): ThemeConfig {
    const color = dark ? palette.dark : palette.light;

    return {
        algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        cssVar: { key: dark ? "framedock-dark" : "framedock-light" },
        token: {
            colorPrimary: color.signal,
            colorInfo: color.signal,
            // Links stay neutral; the accent is reserved for primary actions, selection and focus.
            colorLink: color.text,
            colorLinkHover: color.signal,
            colorLinkActive: color.signal,
            colorError: color.error,
            colorSuccess: color.success,
            colorWarning: color.warning,
            colorTextLightSolid: color.onSignal,
            colorBgBase: color.bg,
            colorBgLayout: color.bg,
            colorBgContainer: color.container,
            colorBgElevated: color.elevated,
            colorText: color.text,
            colorTextSecondary: color.textSecondary,
            colorBorder: color.border,
            colorBorderSecondary: color.borderSecondary,
            colorFillSecondary: color.fill,
            controlItemBgHover: color.hover,
            controlItemBgActive: color.selected,
            controlItemBgActiveHover: color.selectedHover,
            fontFamily: FONT_FAMILY,
            fontFamilyCode: FONT_FAMILY_CODE,
            fontSize: 14,
            borderRadius: 8,
            borderRadiusSM: 6,
            borderRadiusLG: 10,
            borderRadiusXS: 4,
            controlHeight: 32,
            controlHeightSM: 26,
            controlHeightLG: 38,
            boxShadow: color.shadow,
            boxShadowSecondary: color.shadow,
            motionDurationFast: "0.12s",
            motionDurationMid: "0.18s",
            motionDurationSlow: "0.24s",
            wireframe: false,
        },
        components: {
            Button: {
                primaryShadow: "none",
                defaultShadow: "none",
                dangerShadow: "none",
                fontWeight: 500,
            },
            Dropdown: {
                colorBgElevated: color.elevated,
                colorText: color.text,
                controlItemBgHover: color.hover,
                controlItemBgActive: color.selected,
                controlItemBgActiveHover: color.selectedHover,
            },
            Menu: {
                popupBg: color.elevated,
                itemActiveBg: color.selected,
                itemHoverBg: color.hover,
                itemSelectedBg: color.selected,
                itemSelectedColor: color.text,
                darkPopupBg: palette.dark.elevated,
                darkItemHoverBg: palette.dark.hover,
                darkItemSelectedBg: palette.dark.selected,
                darkItemSelectedColor: palette.dark.text,
            },
            Modal: {
                contentBg: color.elevated,
                headerBg: color.elevated,
                footerBg: color.elevated,
            },
            Popover: {
                colorBgElevated: color.elevated,
            },
            Segmented: {
                itemSelectedBg: dark ? "#2a2e34" : "#ffffff",
                trackBg: color.fill,
            },
            Select: {
                optionActiveBg: color.hover,
                optionSelectedBg: color.selected,
                optionSelectedColor: color.text,
            },
            Switch: {
                handleShadow: "none",
            },
            Table: {
                rowSelectedBg: color.selected,
                rowSelectedHoverBg: color.selectedHover,
                headerBg: color.container,
            },
            Tabs: {
                itemSelectedColor: color.text,
                inkBarColor: color.signal,
                itemHoverColor: color.text,
            },
            Tag: {
                defaultBg: color.fill,
            },
            Tooltip: {
                colorBgSpotlight: dark ? "#2a2e34" : "#13161b",
            },
        },
    };
}
