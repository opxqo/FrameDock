import { listServerEntries, putServerValue, SHARED_INDEXED_DB_STORES, SHARED_LOCAL_STORAGE_KEYS } from "./server-storage";

function openLegacyDatabase() {
    return new Promise<IDBDatabase | null>((resolve, reject) => {
        // Aborting creation leaves a missing legacy database untouched.
        let missing = false;
        let blocked = false;
        const request = indexedDB.open("infinite-canvas");
        request.onupgradeneeded = () => {
            missing = true;
            request.transaction?.abort();
        };
        request.onerror = () => missing ? resolve(null) : reject(request.error);
        request.onblocked = () => {
            blocked = true;
            reject(new Error("旧数据被其他页面占用，请关闭其他页面后重试"));
        };
        request.onsuccess = () => {
            if (blocked) request.result.close();
            else resolve(request.result);
        };
    });
}

function readLegacyStore(database: IDBDatabase, name: string) {
    return new Promise<{ key: string; value: unknown }[]>((resolve, reject) => {
        const records: { key: string; value: unknown }[] = [];
        const transaction = database.transaction(name, "readonly");
        transaction.oncomplete = () => resolve(records);
        transaction.onabort = () => reject(transaction.error ?? new Error(`读取旧数据失败：${name}`));
        transaction.onerror = () => reject(transaction.error);
        const request = transaction.objectStore(name).openCursor();
        request.onsuccess = () => {
            const cursor = request.result;
            if (!cursor) return;
            records.push({ key: String(cursor.key), value: cursor.value });
            cursor.continue();
        };
    });
}

export async function migrateLegacyStorage() {
    if (localStorage.getItem("framedock:migrated")) return;
    const database = await openLegacyDatabase();
    try {
        for (const name of SHARED_INDEXED_DB_STORES) {
            let uploaded = 0;
            if (database?.objectStoreNames.contains(name)) {
                const existing = new Set((await listServerEntries(name)).map((entry) => entry.key));
                const records = await readLegacyStore(database, name);
                for (const record of records) {
                    if (existing.has(record.key)) continue;
                    await putServerValue(name, record.key, record.value);
                    uploaded += 1;
                }
            }
            console.info(`[FrameDock 迁移] ${name}: 上传 ${uploaded} 条`);
        }
        const existing = new Set((await listServerEntries("local_storage")).map((entry) => entry.key));
        let uploaded = 0;
        for (const key of SHARED_LOCAL_STORAGE_KEYS) {
            const value = localStorage.getItem(key);
            if (value === null || existing.has(key)) continue;
            await putServerValue("local_storage", key, value);
            uploaded += 1;
        }
        console.info(`[FrameDock 迁移] local_storage: 上传 ${uploaded} 条`);
        localStorage.setItem("framedock:migrated", String(Date.now()));
    } finally {
        database?.close();
    }
}
