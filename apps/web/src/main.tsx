import localforage from "localforage";

import { framedockServerDriver, listServerEntries, mirrorSharedLocalStorage, SHARED_LOCAL_STORAGE_KEYS } from "@/lib/server-storage";
import { installApiLogging } from "@/services/api/log-context";
import { migrateLegacyStorage } from "@/lib/server-storage-migration";

function showError(message: string) {
    const root = document.getElementById("root")!;
    root.replaceChildren();
    root.style.cssText = "min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:24px;box-sizing:border-box;background:#141414;color:#f5f5f5;font-family:system-ui;text-align:center";
    const text = document.createElement("p");
    text.textContent = message;
    const retry = document.createElement("button");
    retry.textContent = "重试";
    retry.style.cssText = "padding:10px 24px;cursor:pointer";
    retry.onclick = () => window.location.reload();
    root.append(text, retry);
}

async function boot() {
    await localforage.defineDriver(framedockServerDriver);
    try {
        await listServerEntries("local_storage");
    } catch (error) {
        console.error("FrameDock 服务连接失败", error);
        showError("无法连接 FrameDock 服务，请先运行 pnpm dev");
        return;
    }
    try {
        await migrateLegacyStorage();
    } catch (error) {
        console.error("FrameDock 迁移失败，保留旧数据以便重试", error);
        showError("FrameDock 数据迁移失败，旧数据已保留，请检查服务后重试");
        return;
    }
    const entries = new Map((await listServerEntries("local_storage")).map((entry) => [entry.key, entry]));
    for (const key of SHARED_LOCAL_STORAGE_KEYS) {
        const entry = entries.get(key);
        if (entry?.kind === "json" && typeof entry.value === "string") localStorage.setItem(key, entry.value);
        else localStorage.removeItem(key);
    }
    mirrorSharedLocalStorage();
    // Every API call is recorded (server log page); this tags calls with node/run context and reports direct ones.
    installApiLogging();
    await import("./app-entry");
}

void boot().catch((error) => {
    console.error("FrameDock 启动失败", error);
    showError("无法连接 FrameDock 服务，请先运行 pnpm dev");
});
