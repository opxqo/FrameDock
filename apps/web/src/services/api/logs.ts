// FrameDock: client for the API call log (apps/server/src/logs.ts). Bodies come back already redacted.

export type LogSource = "proxy" | "browser" | "codex" | "moke";
export type LogState = "pending" | "done" | "error" | "interrupted";

export type LogRow = {
    id: number;
    ts: number;
    state: LogState;
    source: LogSource;
    method: string;
    url: string;
    host: string;
    path: string;
    provider: string;
    model: string | null;
    status: number | null;
    error: string | null;
    duration_ms: number | null;
    total_ms: number | null;
    req_size: number | null;
    res_size: number | null;
    res_type: string | null;
    project_id: string | null;
    node_id: string | null;
    mode: string | null;
    run_id: string | null;
    page: string | null;
    poll: number;
};

export type LogDetail = LogRow & {
    req_headers: string | null;
    req_body: string | null;
    req_truncated: number;
    res_headers: string | null;
    res_body: string | null;
    res_truncated: number;
    req_uid: string | null;
    extra: string | null;
};

export type LogFilters = {
    status?: "ok" | "failed" | "pending" | "";
    source?: string;
    provider?: string;
    q?: string;
    node?: string;
    project?: string;
    run?: string;
    since?: number;
    hidePoll?: boolean;
};

export type LogSettings = { retentionDays: number; maxRows: number; maxDbMb: number; bodyLimit: number; logResponseBody: boolean };

export type LogStats = {
    last24h: { ok?: number; failed?: number; pending?: number };
    byProvider: Array<{ provider: string; n: number; failed: number }>;
    rows: number;
    bytes: number;
};

function queryString(filters: LogFilters, extra: Record<string, string | number> = {}) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
        if (value === undefined || value === "" || value === false) continue;
        params.set(key, value === true ? "1" : String(value));
    }
    for (const [key, value] of Object.entries(extra)) params.set(key, String(value));
    const text = params.toString();
    return text ? `?${text}` : "";
}

async function json<T>(response: Response): Promise<T> {
    if (!response.ok) throw new Error(`日志服务返回 ${response.status}`);
    return (await response.json()) as T;
}

export async function fetchLogs(filters: LogFilters, page: number, pageSize: number, signal?: AbortSignal) {
    return json<{ items: LogRow[]; total: number }>(await fetch(`/api/logs${queryString(filters, { page, pageSize })}`, { signal, cache: "no-store" }));
}

export async function fetchLog(id: number) {
    return json<LogDetail>(await fetch(`/api/logs/${id}`, { cache: "no-store" }));
}

export async function fetchLogStats() {
    return json<LogStats>(await fetch("/api/logs/stats", { cache: "no-store" }));
}

export async function fetchLogSettings() {
    return json<LogSettings>(await fetch("/api/logs/settings", { cache: "no-store" }));
}

export async function saveLogSettings(settings: Partial<LogSettings>) {
    return json<LogSettings>(await fetch("/api/logs/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) }));
}

/** Deletes the rows matching `filters`, or everything with `{ all: true }`. */
export async function deleteLogs(filters: LogFilters | "all") {
    const query = filters === "all" ? "?all=1" : queryString(filters);
    return json<{ deleted: number }>(await fetch(`/api/logs${query}`, { method: "DELETE" }));
}

export async function deleteLog(id: number) {
    return json<{ deleted: number }>(await fetch(`/api/logs/${id}`, { method: "DELETE" }));
}

export function logExportUrl(filters: LogFilters) {
    return `/api/logs/export${queryString(filters)}`;
}
