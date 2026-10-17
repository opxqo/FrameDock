import type { ReactNode } from "react";
import { create } from "zustand";

// FrameDock: global command palette (⌘K / Ctrl+K). Pages register their own commands while mounted.
export type PaletteCommand = {
    id: string;
    label: string;
    group: string;
    icon?: ReactNode;
    /** Shortcut hint shown on the right, e.g. "⌘↵". */
    shortcut?: string;
    /** Extra words matched by the search (English names, pinyin, synonyms). */
    keywords?: string[];
    run: () => void;
};

type CommandStore = {
    open: boolean;
    sources: Record<string, PaletteCommand[]>;
    setOpen: (open: boolean) => void;
    register: (source: string, commands: PaletteCommand[]) => void;
    unregister: (source: string) => void;
};

export const useCommandStore = create<CommandStore>()((set) => ({
    open: false,
    sources: {},
    setOpen: (open) => set({ open }),
    register: (source, commands) => set((state) => ({ sources: { ...state.sources, [source]: commands } })),
    unregister: (source) =>
        set((state) => {
            const { [source]: _removed, ...rest } = state.sources;
            return { sources: rest };
        }),
}));

/** Platform modifier label for shortcut hints. */
export const MOD_KEY = typeof navigator !== "undefined" && /mac|iphone|ipad/i.test(navigator.platform) ? "⌘" : "Ctrl+";
