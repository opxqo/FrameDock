// FrameDock: the MOKE skills a text preset node (动作戏导演) is built on. They are read through the server's MOKE proxy
// when the node first generates (not copied into the repo: some MOKE skills ship under their author's own licence) and
// kept in memory, so later runs reuse them; the server caches the files for a week.

import { buildSkillInstructions, mokeSourceUrl, type CanvasSkill } from "@/lib/skills/skills";
import { getMokeSkill, readableSkillFiles, readMokeSkillFile } from "@/services/api/moke";

const cache = new Map<string, Promise<CanvasSkill>>();

async function fetchMokeSkill(id: string, signal?: AbortSignal): Promise<CanvasSkill> {
    const detail = await getMokeSkill(id, undefined, signal);
    const main = readableSkillFiles(detail).find((file) => file.path === "SKILL.md");
    if (!main) throw new Error(`MOKE skill ${id} has no SKILL.md`);
    const sourceUrl = mokeSourceUrl(detail.source?.page);
    const text = await readMokeSkillFile(id, detail.version, main.path, signal);
    return { id, source: "moke", title: detail.title, summary: detail.summary, category: detail.category, version: detail.version, author: detail.author?.name, sourceUrl, instructions: buildSkillInstructions({ title: detail.title, author: detail.author?.name, sourceUrl }, [{ path: main.path, text }]) };
}

/** One system prompt made of the given MOKE skills, in order. */
export function mokeSkillBundle(ids: string[], signal?: AbortSignal): Promise<CanvasSkill> {
    const key = ids.join("+");
    let bundle = cache.get(key);
    if (!bundle) {
        bundle = Promise.all(ids.map((id) => fetchMokeSkill(id, signal))).then((skills) => ({
            id: `moke-bundle/${key}`,
            source: "moke" as const,
            title: skills.map((skill) => skill.title).join(" + "),
            summary: skills.map((skill) => skill.summary).join("\n"),
            category: "creative-media",
            author: skills.map((skill) => skill.author).filter(Boolean).join("、"),
            instructions: skills.map((skill) => skill.instructions).join("\n\n"),
        }));
        // A failed read must not stay cached.
        bundle.catch(() => cache.delete(key));
        cache.set(key, bundle);
    }
    return bundle;
}
