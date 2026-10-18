import { mock } from "bun:test";
// Same browser origin as the existing configuration store; no real credentials or remote calls.
if (typeof window === "undefined") Object.defineProperty(globalThis, "window", { configurable: true, value: { location: { origin: "http://localhost:5173" }, fetch: (...args: Parameters<typeof fetch>) => globalThis.fetch(...args) } });
if (typeof localStorage === "undefined") Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
mock.module("localforage", () => ({ default: {
    defineDriver: async () => {},
    createInstance: () => {
        const entries = new Map<string, unknown>();
        return { setDriver: async () => {}, getItem: async (key: string) => entries.get(key) ?? null, setItem: async (key: string, value: unknown) => { entries.set(key, value); return value; }, removeItem: async (key: string) => { entries.delete(key); }, keys: async () => [...entries.keys()], iterate: async () => {} };
    },
} }));
