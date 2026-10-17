import localforage from "localforage";

export const SHARED_LOCAL_STORAGE_KEYS = [
    "infinite-canvas:ai_config_store",
    "infinite-canvas:prompt_source_store_v2",
    "infinite-canvas:theme_store",
    "infinite-canvas:locale",
    "canvas-image-quick-tools-v7",
    "canvas-agent-model",
    "canvas-agent-reasoning-effort",
    "canvas-agent-permission-mode",
] as const;

export const SHARED_INDEXED_DB_STORES = ["app_state", "image_files", "media_files", "image_generation_logs", "video_generation_logs"] as const;
export type ServerEntry = { key: string; kind: "json" | "blob"; value?: unknown; mime?: string; size?: number; updatedAt: number };
type Callback<T> = (error: unknown, value: T) => void;

function endpoint(store: string, key?: string) {
    return `/api/kv/${encodeURIComponent(store)}${key === undefined ? "" : `/${encodeURIComponent(key)}`}`;
}

async function request(store: string, key?: string, options?: RequestInit) {
    const response = await fetch(endpoint(store, key), { cache: "no-store", ...options });
    if (!response.ok) throw new Error(`FrameDock storage ${response.status}: ${store}`);
    return response;
}

export async function listServerEntries(store: string): Promise<ServerEntry[]> {
    return (await (await request(store)).json()).entries;
}

export async function putServerValue(store: string, key: string, value: unknown) {
    const blob = value instanceof Blob;
    await request(store, key, {
        method: "PUT",
        headers: blob ? { "x-kv-kind": "blob", "Content-Type": value.type || "application/octet-stream" } : { "Content-Type": "application/json" },
        body: blob ? value : JSON.stringify({ value: value === undefined ? null : value }),
    });
}

async function getServerValue<T>(store: string, key: string): Promise<T | null> {
    const response = await fetch(endpoint(store, key), { cache: "no-store" });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`FrameDock storage ${response.status}: ${store}`);
    if (response.headers.get("x-kv-kind") === "blob") return (await response.blob()) as T;
    return (await response.json()).value as T;
}

function withCallback<T>(promise: Promise<T>, callback?: Callback<T>): Promise<T> {
    if (callback) promise.then((value) => callback(null, value), (error) => callback(error, undefined as T));
    return promise;
}

function storeName(instance: LocalForage) {
    return instance.config("storeName") as string;
}

// localForage's public declarations omit null for key() and undefined for iterate().
// Keep the runtime contract of its built-in drivers, including early iteration exit.
export const framedockServerDriver: LocalForageDriver = {
    _driver: "framedockServer",
    _support: true,
    _initStorage() {
        return Promise.resolve();
    },
    getItem<T>(this: LocalForage, key: string, callback?: Callback<T | null>) {
        return withCallback(getServerValue<T>(storeName(this), String(key)), callback);
    },
    setItem<T>(this: LocalForage, key: string, value: T, callback?: Callback<T>) {
        const storedValue: T = value === undefined ? (null as T) : value;
        return withCallback<T>(putServerValue(storeName(this), String(key), storedValue).then((): T => storedValue), callback);
    },
    removeItem(this: LocalForage, key: string, callback?: (error: unknown) => void) {
        return withCallback(request(storeName(this), String(key), { method: "DELETE" }).then(() => undefined), callback);
    },
    clear(this: LocalForage, callback?: (error: unknown) => void) {
        return withCallback(request(storeName(this), undefined, { method: "DELETE" }).then(() => undefined), callback);
    },
    keys(this: LocalForage, callback?: Callback<string[]>) {
        return withCallback(listServerEntries(storeName(this)).then((entries) => entries.map((entry) => entry.key)), callback);
    },
    length(this: LocalForage, callback?: Callback<number>) {
        return withCallback(listServerEntries(storeName(this)).then((entries) => entries.length), callback);
    },
    key(this: LocalForage, index: number, callback?: Callback<string>) {
        return withCallback(listServerEntries(storeName(this)).then((entries) => (entries[index]?.key ?? null) as unknown as string), callback);
    },
    iterate<T, U>(this: LocalForage, iterator: (value: T, key: string, iterationNumber: number) => U, callback?: Callback<U>) {
        const promise = listServerEntries(storeName(this)).then((entries) => {
            for (const [index, entry] of entries.entries()) {
                const value = entry.kind === "blob" ? new Blob([], { type: entry.mime }) : entry.value;
                const result = iterator(value as T, entry.key, index + 1);
                if (result !== undefined) return result;
            }
            return undefined as U;
        });
        return withCallback(promise, callback);
    },
};

export function createSharedStore(options: { name?: string; storeName: string }) {
    const store = localforage.createInstance({ ...options, driver: "framedockServer" });
    // Setting the default instance driver alone does not change new instances.
    void store.setDriver("framedockServer");
    return store;
}

export function mirrorSharedLocalStorage() {
    const whitelist = new Set<string>(SHARED_LOCAL_STORAGE_KEYS);
    const originalSet = Storage.prototype.setItem;
    const originalRemove = Storage.prototype.removeItem;
    let pending = Promise.resolve();
    const enqueue = (action: () => Promise<unknown>) => {
        pending = pending.then(action).then(() => undefined).catch((error) => console.error("FrameDock 配置保存失败", error));
    };
    Storage.prototype.setItem = function (key, value) {
        originalSet.call(this, key, value);
        const normalizedKey = String(key);
        if (this === window.localStorage && whitelist.has(normalizedKey)) {
            enqueue(() => putServerValue("local_storage", normalizedKey, String(value)));
        }
    };
    Storage.prototype.removeItem = function (key) {
        originalRemove.call(this, key);
        const normalizedKey = String(key);
        if (this === window.localStorage && whitelist.has(normalizedKey)) {
            enqueue(() => request("local_storage", normalizedKey, { method: "DELETE" }));
        }
    };
}
