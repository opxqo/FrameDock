import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { nanoid } from "nanoid";

import { guardWrites } from "@/lib/guarded-storage";
import { localForageStorage } from "@/lib/localforage-storage";
import { MAX_SKILL_INSTRUCTIONS, type CanvasSkill } from "@/lib/skills/skills";

// FrameDock: the user's own skills (writing instructions for text generation), edited by hand on /prompts
// and listed first in every skill picker under "我的".

export type LocalSkill = CanvasSkill & { source: "local"; createdAt: string; updatedAt: string };
export type LocalSkillDraft = Pick<CanvasSkill, "title" | "summary" | "category" | "instructions">;

type SkillLibraryStore = {
    hydrated: boolean;
    items: LocalSkill[];
    add: (draft: LocalSkillDraft) => string;
    update: (id: string, patch: Partial<LocalSkillDraft>) => void;
    remove: (id: string) => void;
    /** Merges by id: existing ids are replaced, new ones are prepended. Returns how many were imported. */
    importItems: (items: unknown[]) => number;
};

export const SKILL_LIBRARY_KEY = "framedock:skill_library";
export const LOCAL_SKILL_CATEGORIES = ["text", "image", "video"] as const;

function text(value: unknown) {
    return typeof value === "string" ? value : "";
}

/** Accepts our own export items and any CanvasSkill snapshot (built-in or MOKE skills saved to "mine"). */
export function normalizeLocalSkill(value: unknown): LocalSkill | null {
    if (!value || typeof value !== "object") return null;
    const raw = value as Record<string, unknown>;
    const instructions = text(raw.instructions).slice(0, MAX_SKILL_INSTRUCTIONS);
    const title = text(raw.title).trim();
    if (!instructions.trim() || !title) return null;
    const now = new Date().toISOString();
    const id = text(raw.id);
    return {
        id: id.startsWith("local/") ? id : `local/${nanoid()}`,
        source: "local",
        title,
        summary: text(raw.summary),
        category: (LOCAL_SKILL_CATEGORIES as readonly string[]).includes(text(raw.category)) ? text(raw.category) : "text",
        author: text(raw.author) || undefined,
        sourceUrl: text(raw.sourceUrl) || undefined,
        instructions,
        createdAt: text(raw.createdAt) || now,
        updatedAt: text(raw.updatedAt) || now,
    };
}

const libraryStorage = guardWrites<{ items: LocalSkill[] }>(createJSONStorage(() => localForageStorage)!);

export const useSkillLibraryStore = create<SkillLibraryStore>()(
    persist(
        (set) => ({
            hydrated: false,
            items: [],
            add: (draft) => {
                const now = new Date().toISOString();
                const id = `local/${nanoid()}`;
                set((state) => ({ items: [{ ...draft, id, source: "local", createdAt: now, updatedAt: now }, ...state.items] }));
                return id;
            },
            update: (id, patch) => set((state) => ({ items: state.items.map((item) => (item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item)) })),
            remove: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
            importItems: (values) => {
                const incoming = values.map(normalizeLocalSkill).filter((item): item is LocalSkill => Boolean(item));
                if (!incoming.length) return 0;
                set((state) => {
                    const byId = new Map(incoming.map((item) => [item.id, item]));
                    const kept = state.items.map((item) => byId.get(item.id) || item);
                    const added = incoming.filter((item) => !state.items.some((existing) => existing.id === item.id));
                    return { items: [...added, ...kept] };
                });
                return incoming.length;
            },
        }),
        {
            name: SKILL_LIBRARY_KEY,
            storage: libraryStorage.storage,
            partialize: (state) => ({ items: state.items }),
            onRehydrateStorage: () => (_state, error) => {
                if (error) return console.error("FrameDock: library failed to load; edits are not saved until reload", error);
                useSkillLibraryStore.setState({ hydrated: true });
                libraryStorage.allowWrites();
            },
        },
    ),
);
