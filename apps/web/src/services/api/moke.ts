// FrameDock: client for the server's read-only MOKE AIGC proxy (apps/server/src/moke.ts).

export type MokeSkillSummary = {
    id: string;
    type: "skill";
    title: string;
    summary: string;
    language: string;
    category: string;
    version: string;
    author?: { id: string; name: string };
    source?: { page?: string };
    usageRights?: string;
};

export type MokeSkillDetail = MokeSkillSummary & {
    files?: Array<{ path: string; size: number; sha256: string }>;
    restrictedFilesPresent?: boolean;
};

export type MokeSearchResult = { items: MokeSkillSummary[]; nextCursor?: string | null };

async function getJson<T>(path: string, params: Record<string, string | undefined>, signal?: AbortSignal): Promise<T> {
    const query = new URLSearchParams(Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])));
    const response = await fetch(`/api/moke${path}?${query}`, { signal });
    const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
    if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    return payload;
}

export function searchMokeSkills(params: { query?: string; category?: string; cursor?: string }, signal?: AbortSignal) {
    return getJson<MokeSearchResult>("/skills", { query: params.query, category: params.category, cursor: params.cursor, limit: "20" }, signal);
}

export function getMokeSkill(id: string, version?: string, signal?: AbortSignal) {
    return getJson<MokeSkillDetail>("/skill", { id, version }, signal);
}

export async function readMokeSkillFile(id: string, version: string, path: string, signal?: AbortSignal) {
    const payload = await getJson<{ text?: string }>("/skill/file", { id, version, path }, signal);
    return payload.text || "";
}

/** Files a skill can contribute as plain text, SKILL.md first. */
export function readableSkillFiles(detail: MokeSkillDetail) {
    return (detail.files || []).filter((file) => /\.(md|markdown|txt|ya?ml)$/i.test(file.path)).sort((a, b) => (a.path === "SKILL.md" ? -1 : b.path === "SKILL.md" ? 1 : a.path.localeCompare(b.path)));
}
