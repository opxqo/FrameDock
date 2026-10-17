// FrameDock: client for the backend's local Codex CLI runner (apps/server/src/codex.ts).

export type CodexStatus = { available: boolean; loggedIn: boolean; version: string };
export type CodexRunEvent = { type: "status"; text: string } | { type: "image"; dataUrl: string } | { type: "done"; text: string } | { type: "error"; message: string };
export type CodexRunRequest = { mode: "text" | "image"; prompt: string; images: string[]; effort: "low" | "medium" | "high" };

let statusCache: Promise<CodexStatus> | null = null;

/** Whether the Codex CLI is installed and logged in (cached; pass refresh to re-check). */
export function fetchCodexStatus(refresh = false): Promise<CodexStatus> {
    if (!statusCache || refresh) {
        statusCache = fetch("/api/codex/status", { cache: "no-store" })
            .then((response) => response.json() as Promise<CodexStatus>)
            .catch(() => ({ available: false, loggedIn: false, version: "" }));
    }
    return statusCache;
}

/** Runs Codex and streams its events; resolves with the final text and any generated images. */
export async function runCodex(request: CodexRunRequest, onEvent: (event: CodexRunEvent) => void, signal?: AbortSignal) {
    const response = await fetch("/api/codex/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request), signal });
    if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || `Codex 请求失败（${response.status}）`);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const images: string[] = [];
    let buffer = "";
    let text = "";
    let failure = "";
    const handle = (line: string) => {
        if (!line.trim()) return;
        const event = JSON.parse(line) as CodexRunEvent;
        if (event.type === "image") images.push(event.dataUrl);
        if (event.type === "done") text = event.text;
        if (event.type === "error") failure = event.message;
        onEvent(event);
    };
    for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        lines.forEach(handle);
    }
    handle(buffer);
    if (failure) throw new Error(failure);
    return { text, images };
}
