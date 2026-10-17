import type { StateStorage } from "zustand/middleware";
import { createSharedStore } from "./server-storage";

const store = createSharedStore({ name: "infinite-canvas", storeName: "app_state" });

export const localForageStorage: StateStorage = {
    getItem: async (name) => (await store.getItem<string>(name)) ?? null,
    setItem: async (name, value) => { await store.setItem(name, value); },
    removeItem: async (name) => { await store.removeItem(name); },
};
