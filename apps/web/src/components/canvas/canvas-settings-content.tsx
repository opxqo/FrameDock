import type { ReactNode } from "react";
import { ConfigProvider } from "antd";

// Keep dropdowns inside the popover's outside-click boundary, but outside its
// scrolling content so menus can extend beyond the visible form without clipping.
export function CanvasSettingsContent({ children }: { children: ReactNode }) {
    return <ConfigProvider getPopupContainer={(trigger) => trigger?.closest<HTMLElement>("[data-canvas-settings-popover]") || document.body}>
        <div style={{ maxHeight: "inherit", overflowY: "auto", padding: 18, borderRadius: "inherit" }}>
            {children}
        </div>
    </ConfigProvider>;
}
