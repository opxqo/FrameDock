import type { ThemeConfig } from "antd";
import { theme as antdTheme } from "antd";

// FrameDock: antd mirrors the CSS tokens in styles/globals.css (updream neutrals, white as the accent).
const palette = {
    light: {
        signal: "#0a0a0a",
        signalHover: "#262626",
        onSignal: "#fafafa",
        bg: "#fafafa",
        container: "#ffffff",
        elevated: "#ffffff",
        text: "#0a0a0a",
        textSecondary: "#737373",
        border: "rgba(0, 0, 0, 0.1)",
        borderSecondary: "rgba(0, 0, 0, 0.06)",
        fill: "rgba(0, 0, 0, 0.05)",
        hover: "rgba(0, 0, 0, 0.04)",
        selected: "rgba(0, 0, 0, 0.07)",
        selectedHover: "rgba(0, 0, 0, 0.1)",
        error: "#dc2626",
        success: "#16a34a",
        warning: "#d97706",
        spotlight: "#171717",
        shadow: "0 2px 4px rgba(0, 0, 0, 0.05), 0 16px 40px -12px rgba(0, 0, 0, 0.18)",
    },
    dark: {
        signal: "#fafafa",
        signalHover: "#e5e5e5",
        onSignal: "#0a0a0a",
        bg: "#0a0a0a",
        container: "#171717",
        elevated: "#1a1a1a",
        text: "#fafafa",
        textSecondary: "#a3a3a3",
        border: "rgba(255, 255, 255, 0.1)",
        borderSecondary: "rgba(255, 255, 255, 0.06)",
        fill: "rgba(255, 255, 255, 0.07)",
        hover: "rgba(255, 255, 255, 0.06)",
        selected: "rgba(255, 255, 255, 0.1)",
        selectedHover: "rgba(255, 255, 255, 0.14)",
        error: "#f87171",
        success: "#4ade80",
        warning: "#fbbf24",
        spotlight: "#262626",
        shadow: "0 2px 6px rgba(0, 0, 0, 0.4), 0 20px 48px -12px rgba(0, 0, 0, 0.7)",
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
            // Links stay neutral and only brighten on hover; the accent is reserved for primary actions.
            colorLink: color.text,
            colorLinkHover: color.textSecondary,
            colorLinkActive: color.text,
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
            borderRadiusLG: 16,
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
                borderRadiusLG: 20,
                contentBg: color.elevated,
                headerBg: color.elevated,
                footerBg: color.elevated,
            },
            Popover: {
                colorBgElevated: color.elevated,
            },
            Segmented: {
                itemSelectedBg: dark ? "#333333" : "#ffffff",
                trackBg: color.fill,
            },
            Select: {
                optionActiveBg: color.hover,
                optionSelectedBg: color.selected,
                optionSelectedColor: color.text,
            },
            Switch: {
                handleShadow: "none",
                // The checked track is the white accent, so the handle goes dark to stay visible.
                handleBg: dark ? "#0a0a0a" : "#ffffff",
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
                colorBgSpotlight: color.spotlight,
                // The global colorTextLightSolid is the "on signal" color for primary buttons (dark in dark mode);
                // tooltips sit on a dark spotlight background and need light text instead.
                colorTextLightSolid: "#fafafa",
            },
        },
    };
}
