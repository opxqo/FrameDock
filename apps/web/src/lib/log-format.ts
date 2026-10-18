import type { LogDetail, LogRow } from "@/services/api/logs";

export function formatDuration(ms: number | null | undefined) {
    if (ms == null) return "—";
    if (ms < 1000) return `${ms} ms`;
    if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`;
    return `${Math.floor(ms / 60_000)} 分 ${Math.round((ms % 60_000) / 1000)} 秒`;
}

export function formatBytes(bytes: number | null | undefined) {
    if (bytes == null) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export type StatusTone = "ok" | "warn" | "fail" | "pending";

/** One label and colour for how a call ended (HTTP status, connection failure, interruption, still running). */
export function statusInfo(row: Pick<LogRow, "state" | "status">): { label: string; tone: StatusTone } {
    if (row.state === "pending") return { label: "进行中", tone: "pending" };
    if (row.state === "interrupted") return { label: "中断", tone: "fail" };
    if (row.state === "error" && !row.status) return { label: "失败", tone: "fail" };
    if (row.status == null) return { label: "—", tone: "warn" };
    if (row.status >= 500) return { label: String(row.status), tone: "fail" };
    if (row.status >= 400) return { label: String(row.status), tone: "warn" };
    return { label: String(row.status), tone: row.state === "error" ? "warn" : "ok" };
}

function shellQuote(value: string) {
    return `'${value.replace(/'/g, `'\\''`)}'`;
}

const SKIP_HEADERS = new Set(["host", "content-length", "connection", "accept-encoding", "user-agent", "origin", "referer"]);

/** curl command for a logged call. Secrets were redacted when stored, so they become placeholders here. */
export function buildCurl(log: LogDetail) {
    const url = log.url.replace(/=(?:%5B|\[)redacted[^&#]*/gi, "=<YOUR_KEY>");
    const parts = [`curl -X ${log.method} ${shellQuote(url)}`];
    let headers: Record<string, string> = {};
    try {
        headers = log.req_headers ? (JSON.parse(log.req_headers) as Record<string, string>) : {};
    } catch {
        // headers stay empty
    }
    for (const [name, value] of Object.entries(headers)) {
        if (SKIP_HEADERS.has(name)) continue;
        parts.push(`-H ${shellQuote(`${name}: ${/\[redacted/i.test(value) ? value.replace(/\[redacted[^\]]*\]/gi, "<YOUR_KEY>") : value}`)}`);
    }
    if (log.req_body && !log.req_truncated && !log.req_body.startsWith("<binary") && !log.req_body.startsWith('{\n  "multipart"')) {
        parts.push(`--data-raw ${shellQuote(log.req_body)}`);
    }
    return parts.join(" \\\n  ");
}
