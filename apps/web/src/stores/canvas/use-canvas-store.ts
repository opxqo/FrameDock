import { create } from "zustand";
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware";

import { nanoid } from "nanoid";
import i18n from "@/i18n";
import { hydrationErrorMessage } from "@/lib/guarded-storage";
import { getVersionedServerValue, putVersionedServerValue } from "@/lib/server-storage";
import type { CanvasBackgroundMode } from "@/lib/canvas-theme";
import type { CanvasAssistantSession, CanvasConnection, CanvasNodeData, ViewportTransform } from "@/types/canvas";

export type CanvasProject = {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    nodes: CanvasNodeData[];
    connections: CanvasConnection[];
    chatSessions: CanvasAssistantSession[];
    activeChatId: string | null;
    backgroundMode: CanvasBackgroundMode;
    showImageInfo: boolean;
    viewport: ViewportTransform;
};

export type CanvasDeletedProject = {
    id: string;
    deletedAt: string;
};

type CanvasStore = {
    hydrated: boolean;
    hydrationError: string;
    /** Bumped whenever state written by another tab is merged in; open project pages reload on change. */
    externalRevision: number;
    projects: CanvasProject[];
    deletedProjects: CanvasDeletedProject[];
    createProject: (title?: string) => string;
    importProject: (project: Partial<CanvasProject>) => string;
    openProject: (id: string) => CanvasProject | null;
    renameProject: (id: string, title: string) => void;
    deleteProjects: (ids: string[]) => void;
    replaceProjects: (projects: CanvasProject[], deletedProjects?: CanvasDeletedProject[]) => void;
    updateProject: (id: string, patch: Partial<Pick<CanvasProject, "nodes" | "connections" | "chatSessions" | "activeChatId" | "backgroundMode" | "showImageInfo" | "viewport">>) => void;
};

const initialViewport: ViewportTransform = { x: 0, y: 0, k: 1 };
const CANVAS_STORE_KEY = "infinite-canvas:canvas_store";
type PersistedCanvasState = Pick<CanvasStore, "projects" | "deletedProjects">;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let queuedPersistState: PersistedCanvasState | null = null;

// FrameDock: the canvas store is one JSON value on the server (app_state/<CANVAS_STORE_KEY>). Several tabs may
// have it open, so every save is conditional on the version this tab last saw (If-Match). On a conflict the
// server copy is merged in project by project (the newer `updatedAt` wins, deletions are unioned) and the save
// is retried. Successful saves are announced on a BroadcastChannel so other tabs pull them right away.
// Nothing is written before hydration succeeded, so a failed startup read can never overwrite real data.
const STORAGE_STORE = "app_state";
const PERSIST_VERSION = 0;
let hydrationOk = false;
let serverVersion = 0;
let saving: Promise<void> | null = null;
let saveAgain = false;
const syncChannel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("framedock-canvas-sync");

function parseStored(value: string | null) {
    if (!value) return null;
    const parsed = JSON.parse(value) as StorageValue<PersistedCanvasState>;
    return { projects: parsed.state?.projects || [], deletedProjects: parsed.state?.deletedProjects || [] } as PersistedCanvasState;
}

/** Project-level merge: newer `updatedAt` wins (ties keep local objects, so nothing re-renders needlessly). */
export function mergeCanvasStates(local: PersistedCanvasState, remote: PersistedCanvasState): PersistedCanvasState {
    const deleted = new Map<string, CanvasDeletedProject>();
    for (const item of [...remote.deletedProjects, ...local.deletedProjects]) {
        const previous = deleted.get(item.id);
        if (!previous || previous.deletedAt < item.deletedAt) deleted.set(item.id, item);
    }
    const remoteById = new Map(remote.projects.map((project) => [project.id, project]));
    const localIds = new Set(local.projects.map((project) => project.id));
    const projects = [
        ...remote.projects.filter((project) => !localIds.has(project.id)),
        ...local.projects.map((project) => {
            const other = remoteById.get(project.id);
            return other && other.updatedAt > project.updatedAt ? other : project;
        }),
    ].filter((project) => {
        const removed = deleted.get(project.id);
        return !removed || removed.deletedAt < project.updatedAt;
    });
    return { projects, deletedProjects: [...deleted.values()] };
}

function currentPersisted(): PersistedCanvasState {
    const { projects, deletedProjects } = useCanvasStore.getState();
    return { projects, deletedProjects };
}

function applyMerged(merged: PersistedCanvasState) {
    const current = currentPersisted();
    const changed = merged.projects.length !== current.projects.length || merged.projects.some((project, index) => project !== current.projects[index]) || merged.deletedProjects.length !== current.deletedProjects.length;
    queuedPersistState = merged;
    if (changed) useCanvasStore.setState((state) => ({ ...merged, externalRevision: state.externalRevision + 1 }));
}

async function writeOnce(state: PersistedCanvasState, keepalive = false) {
    let next = state;
    for (let attempt = 0; attempt < 4; attempt += 1) {
        const result = await putVersionedServerValue(STORAGE_STORE, CANVAS_STORE_KEY, JSON.stringify({ state: next, version: PERSIST_VERSION }), serverVersion, { keepalive });
        if (result.ok) {
            serverVersion = result.version;
            syncChannel?.postMessage({ type: "saved", version: serverVersion });
            return;
        }
        // Another tab saved in between: merge its copy into ours and retry on top of its version.
        const remote = await getVersionedServerValue<string>(STORAGE_STORE, CANVAS_STORE_KEY);
        serverVersion = remote.version;
        const remoteState = parseStored(remote.value);
        next = remoteState ? mergeCanvasStates(currentPersisted(), remoteState) : currentPersisted();
        applyMerged(next);
    }
    throw new Error("canvas save kept conflicting");
}

async function runSave() {
    try {
        await writeOnce(currentPersisted());
    } catch (error) {
        console.error("FrameDock: saving the canvas failed, retrying", error);
        try {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            await writeOnce(currentPersisted());
        } catch (retryError) {
            console.error("FrameDock: saving the canvas failed", retryError);
            const { message } = await import("antd");
            message.error(i18n.t("canvas.saveFailed"));
        }
    }
}

function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        saveTimer = null;
        void flushCanvasSave();
    }, 400);
}

/** Saves pending changes now (serialised: a save requested mid-flight runs once more afterwards). */
export function flushCanvasSave(): Promise<void> {
    if (!hydrationOk) return Promise.resolve();
    if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
    }
    if (saving) {
        saveAgain = true;
        return saving;
    }
    saving = runSave().finally(() => {
        saving = null;
        if (saveAgain) {
            saveAgain = false;
            void flushCanvasSave();
        }
    });
    return saving;
}

/** Pulls the server copy (another tab saved) and merges it in. Pending local edits are kept by the merge. */
async function pullRemote() {
    if (!hydrationOk) return;
    const remote = await getVersionedServerValue<string>(STORAGE_STORE, CANVAS_STORE_KEY);
    if (remote.version <= serverVersion) return;
    const remoteState = parseStored(remote.value);
    if (!remoteState) return;
    // Our own unsaved edits must not be lost: merge, then (if anything of ours is newer) save on top.
    if (!saving) serverVersion = remote.version;
    const merged = mergeCanvasStates(currentPersisted(), remoteState);
    applyMerged(merged);
    const remoteUpdatedAt = new Map(remoteState.projects.map((project) => [project.id, project.updatedAt]));
    const oursIsNewer = merged.projects.length !== remoteState.projects.length || merged.projects.some((project) => (remoteUpdatedAt.get(project.id) ?? "") < project.updatedAt);
    if (oursIsNewer) scheduleSave();
}

if (typeof window !== "undefined") {
    syncChannel?.addEventListener("message", (event: MessageEvent<{ type?: string; version?: number }>) => {
        if (event.data?.type === "saved" && Number(event.data.version) > serverVersion) void pullRemote().catch((error) => console.error("FrameDock: canvas sync failed", error));
    });
    // Closing or reloading the tab: send what is still queued (keepalive survives the unload).
    window.addEventListener("pagehide", () => {
        if (!hydrationOk || !saveTimer) return;
        clearTimeout(saveTimer);
        saveTimer = null;
        void writeOnce(currentPersisted(), true).catch(() => undefined);
    });
    // Coming back to a tab: catch up with saves made elsewhere while it was hidden or asleep.
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") void pullRemote().catch(() => undefined);
    });
}

const canvasStorage: PersistStorage<CanvasStore> = {
    getItem: async (name) => {
        const { value, version } = await getVersionedServerValue<string>(STORAGE_STORE, name);
        serverVersion = version;
        if (!value) return null;
        const parsed = JSON.parse(value) as StorageValue<CanvasStore>;
        queuedPersistState = parsed.state as PersistedCanvasState;
        return parsed;
    },
    setItem: (_name, value) => {
        if (!hydrationOk) return;
        const nextState = value.state as PersistedCanvasState;
        if (queuedPersistState && queuedPersistState.projects === nextState.projects && queuedPersistState.deletedProjects === nextState.deletedProjects) return;
        queuedPersistState = nextState;
        scheduleSave();
    },
    removeItem: () => undefined,
};

export const useCanvasStore = create<CanvasStore>()(
    persist(
        (set, get) => ({
            hydrated: false,
            hydrationError: "",
            externalRevision: 0,
            projects: [],
            deletedProjects: [],
            createProject: (title = i18n.t("canvas.project.untitled")) => {
                const now = new Date().toISOString();
                const id = nanoid();
                const project: CanvasProject = {
                    id,
                    title,
                    createdAt: now,
                    updatedAt: now,
                    nodes: [],
                    connections: [],
                    chatSessions: [],
                    activeChatId: null,
                    backgroundMode: "dots",
                    showImageInfo: false,
                    viewport: initialViewport,
                };
                set((state) => ({ projects: [project, ...state.projects] }));
                return id;
            },
            importProject: (source) => {
                const now = new Date().toISOString();
                const project: CanvasProject = {
                    id: nanoid(),
                    title: source.title || i18n.t("canvas.project.imported"),
                    createdAt: source.createdAt || now,
                    updatedAt: now,
                    nodes: source.nodes || [],
                    connections: source.connections || [],
                    chatSessions: source.chatSessions || [],
                    activeChatId: source.activeChatId || null,
                    backgroundMode: source.backgroundMode || "dots",
                    showImageInfo: source.showImageInfo || false,
                    viewport: source.viewport || initialViewport,
                };
                set((state) => ({ projects: [project, ...state.projects] }));
                return project.id;
            },
            openProject: (id) => {
                return get().projects.find((item) => item.id === id) || null;
            },
            renameProject: (id, title) =>
                set((state) => ({
                    projects: state.projects.map((project) => (project.id === id ? { ...project, title: title.trim() || project.title, updatedAt: new Date().toISOString() } : project)),
                })),
            deleteProjects: (ids) =>
                set((state) => {
                    const now = new Date().toISOString();
                    const removing = new Set(ids);
                    const projects = state.projects.filter((project) => !removing.has(project.id));
                    const deletedProjects = [...state.deletedProjects.filter((item) => !removing.has(item.id)), ...ids.map((id) => ({ id, deletedAt: now }))];
                    return { projects, deletedProjects };
                }),
            replaceProjects: (projects, deletedProjects = []) => set({ projects, deletedProjects }),
            updateProject: (id, patch) =>
                set((state) => ({
                    projects: state.projects.map((project) => (project.id === id ? { ...project, ...patch, updatedAt: new Date().toISOString() } : project)),
                })),
        }),
        {
            name: CANVAS_STORE_KEY,
            storage: canvasStorage,
            partialize: (state) =>
                ({
                    projects: state.projects,
                    deletedProjects: state.deletedProjects,
                }) as StorageValue<CanvasStore>["state"],
            onRehydrateStorage: () => (_state, error) => {
                if (error) {
                    console.error("FrameDock: loading canvases failed; nothing will be saved until reload", error);
                    useCanvasStore.setState({ hydrationError: hydrationErrorMessage(error) });
                    return;
                }
                useCanvasStore.setState({ hydrated: true });
                hydrationOk = true;
            },
        },
    ),
);
