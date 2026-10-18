import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { nanoid } from "nanoid";

import { guardWrites } from "@/lib/guarded-storage";
import { localForageStorage } from "@/lib/localforage-storage";

// FrameDock: the user's own prompts, edited by hand on /prompts. Kept under its own key in the shared
// server storage (not inside the canvas store), and merged into every prompt picker as "我的提示词".

export type LibraryPrompt = {
    id: string;
    title: string;
    prompt: string;
    description: string;
    tags: string[];
    coverUrl: string;
    favorite: boolean;
    createdAt: string;
    updatedAt: string;
};

export type LibraryPromptDraft = Pick<LibraryPrompt, "title" | "prompt"> & Partial<Pick<LibraryPrompt, "description" | "tags" | "coverUrl" | "favorite">>;

type PromptLibraryStore = {
    hydrated: boolean;
    items: LibraryPrompt[];
    add: (draft: LibraryPromptDraft) => string;
    update: (id: string, patch: Partial<LibraryPromptDraft>) => void;
    remove: (id: string) => void;
    toggleFavorite: (id: string) => void;
    /** Merges by id: existing ids are replaced, new ones are prepended. Returns how many were imported. */
    importItems: (items: unknown[]) => number;
};

export const PROMPT_LIBRARY_KEY = "framedock:prompt_library";

function text(value: unknown) {
    return typeof value === "string" ? value : "";
}

/** Accepts our own export items and the RawPrompt shape used by remote prompt sources. */
export function normalizeLibraryPrompt(value: unknown): LibraryPrompt | null {
    if (!value || typeof value !== "object") return null;
    const raw = value as Record<string, unknown>;
    const prompt = text(raw.prompt) || text(raw.content);
    if (!prompt.trim()) return null;
    const now = new Date().toISOString();
    return {
        id: text(raw.id) || nanoid(),
        title: text(raw.title).trim() || prompt.trim().slice(0, 24),
        prompt,
        description: text(raw.description),
        tags: Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => typeof tag === "string" && Boolean(tag.trim())) : [],
        coverUrl: text(raw.coverUrl),
        favorite: raw.favorite === true,
        createdAt: text(raw.createdAt) || now,
        updatedAt: text(raw.updatedAt) || now,
    };
}

const libraryStorage = guardWrites<{ items: LibraryPrompt[] }>(createJSONStorage(() => localForageStorage)!);

export const usePromptLibraryStore = create<PromptLibraryStore>()(
    persist(
        (set) => ({
            hydrated: false,
            items: [],
            add: (draft) => {
                const now = new Date().toISOString();
                const id = nanoid();
                set((state) => ({ items: [{ description: "", tags: [], coverUrl: "", favorite: false, ...draft, id, createdAt: now, updatedAt: now }, ...state.items] }));
                return id;
            },
            update: (id, patch) => set((state) => ({ items: state.items.map((item) => (item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item)) })),
            remove: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
            toggleFavorite: (id) => set((state) => ({ items: state.items.map((item) => (item.id === id ? { ...item, favorite: !item.favorite } : item)) })),
            importItems: (values) => {
                const incoming = values.map(normalizeLibraryPrompt).filter((item): item is LibraryPrompt => Boolean(item));
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
            name: PROMPT_LIBRARY_KEY,
            storage: libraryStorage.storage,
            partialize: (state) => ({ items: state.items }),
            onRehydrateStorage: () => (_state, error) => {
                if (error) return console.error("FrameDock: library failed to load; edits are not saved until reload", error);
                usePromptLibraryStore.setState({ hydrated: true });
                libraryStorage.allowWrites();
            },
        },
    ),
);

/** Favourites first, then most recently edited. */
export function sortLibraryPrompts(items: LibraryPrompt[]) {
    return [...items].sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.updatedAt.localeCompare(a.updatedAt));
}
