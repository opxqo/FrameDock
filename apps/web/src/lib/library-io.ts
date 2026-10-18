// FrameDock: JSON import/export for the hand-maintained prompt and skill libraries.
// Export: { version: 1, type, exportedAt, items }. Import also accepts a bare array (e.g. a remote prompt source file).

export type LibraryType = "prompts" | "skills";

export function downloadLibrary(type: LibraryType, items: unknown[]) {
    const payload = { version: 1, type, exportedAt: new Date().toISOString(), items };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `framedock-${type}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Opens a file picker and returns the items of the chosen JSON file (empty when cancelled). */
export function pickLibraryFile(type: LibraryType): Promise<unknown[]> {
    return new Promise((resolve, reject) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json,.json";
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return resolve([]);
            try {
                const parsed: unknown = JSON.parse(await file.text());
                if (Array.isArray(parsed)) return resolve(parsed);
                const record = parsed as { type?: unknown; items?: unknown; prompts?: unknown };
                if (record && typeof record === "object") {
                    if (record.type && record.type !== type) throw new Error(`file contains ${String(record.type)}, not ${type}`);
                    const items = Array.isArray(record.items) ? record.items : Array.isArray(record.prompts) ? record.prompts : null;
                    if (items) return resolve(items);
                }
                throw new Error("no items found");
            } catch (error) {
                reject(error instanceof Error ? error : new Error(String(error)));
            }
        };
        input.click();
    });
}
