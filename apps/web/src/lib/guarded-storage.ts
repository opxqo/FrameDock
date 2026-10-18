import type { PersistStorage } from "zustand/middleware";

// FrameDock: zustand's persist writes the store back whenever state is set — including right after a failed
// hydration, when the store still holds its empty initial state. With server storage that would replace real
// data with `[]` the moment a startup request fails (e.g. while the server restarts). This wrapper drops every
// write until the store has hydrated successfully.
export function guardWrites<T>(storage: PersistStorage<T>) {
    let ready = false;
    return {
        storage: {
            getItem: (name) => storage.getItem(name),
            setItem: (name, value) => (ready ? storage.setItem(name, value) : undefined),
            removeItem: (name) => (ready ? storage.removeItem(name) : undefined),
        } satisfies PersistStorage<T>,
        /** Call once hydration succeeded; later writes go through. */
        allowWrites: () => {
            ready = true;
        },
    };
}

export function hydrationErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error || "unknown error");
}
