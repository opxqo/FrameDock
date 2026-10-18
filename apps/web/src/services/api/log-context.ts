import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";

// FrameDock API call log, browser side.
//
// Provider calls normally go through the built-in /proxy, where the server records every call in full.
// What the server cannot know is *why* a call was made (which node, which run), so every request we send
// to our own server carries an `x-framedock-ctx` header. The context is looked up by the request's
// AbortSignal — each generation already passes its own signal — so parallel generations never mix.
//
// Calls that never reach our server (proxy disabled, custom proxy, direct requests) are reported to
// /api/logs/ingest by the browser itself, so nothing goes unrecorded.

export type LogContext = {
    projectId?: string;
    nodeId?: string;
    mode?: string;
    model?: string;
    runId?: string;
    page?: string;
    label?: string;
};

const contexts = new WeakMap<AbortSignal, LogContext>();

/** Tags every request made with this signal. Calling it again merges more fields in (e.g. mode, model). */
export function attachLogContext(signal: AbortSignal, context: LogContext) {
    contexts.set(signal, { ...contexts.get(signal), ...context });
}

function pageName() {
    const first = window.location.pathname.split("/").filter(Boolean)[0];
    return first || "canvas";
}

export function logContextFor(signal?: AbortSignal | null): LogContext {
    return { page: pageName(), ...(signal ? contexts.get(signal) : undefined) };
}

function encodeContext(context: LogContext) {
    return encodeURIComponent(JSON.stringify(context));
}

function requestUid() {
    return crypto.randomUUID().slice(0, 8);
}

type Target = "proxy" | "own-api" | "external" | "ignore";

/** Where a request goes decides who records it: our proxy/API record themselves, the rest is reported by the browser. */
function classify(rawUrl: string, base?: string): Target {
    let url: URL;
    try {
        url = new URL(rawUrl, base || window.location.href);
    } catch {
        return "ignore";
    }
    if (url.origin === window.location.origin) {
        if (url.pathname.startsWith("/proxy/")) return "proxy";
        if (url.pathname.startsWith("/api/codex") || url.pathname.startsWith("/api/moke")) return "own-api";
        if (url.pathname.startsWith("/v1/")) return "external";
        return "ignore";
    }
    return /^https?:$/.test(url.protocol) ? "external" : "ignore";
}

const MAX_BODY = 1024 * 1024;
const nativeFetch = window.fetch.bind(window);

function describeBody(body: unknown): { text?: string; contentType?: string } {
    if (body == null) return {};
    if (typeof body === "string") return { text: body.slice(0, MAX_BODY) };
    if (body instanceof FormData) return { text: "[multipart form data]", contentType: "multipart/form-data" };
    if (body instanceof Blob) return { text: `[blob ${body.type || "data"} ${body.size} bytes]` };
    if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) return { text: `[binary ${(body as ArrayBuffer).byteLength} bytes]` };
    if (body instanceof URLSearchParams) return { text: body.toString() };
    try {
        return { text: JSON.stringify(body).slice(0, MAX_BODY), contentType: "application/json" };
    } catch {
        return {};
    }
}

type IngestCall = {
    method: string;
    url: string;
    status?: number;
    error?: string;
    startedAt: number;
    durationMs: number;
    reqHeaders?: Record<string, string>;
    reqBody?: string;
    reqContentType?: string;
    resHeaders?: Record<string, string>;
    resBody?: string;
    resContentType?: string;
    resSize?: number;
    context: LogContext;
    reqUid: string;
};

function report(call: IngestCall) {
    // Fire and forget: logging must never slow down or break the call it describes.
    void nativeFetch("/api/logs/ingest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(call) }).catch(() => undefined);
}

function headersToObject(headers: unknown): Record<string, string> {
    const result: Record<string, string> = {};
    if (!headers) return result;
    const source = headers instanceof Headers ? Object.fromEntries(headers.entries()) : typeof (headers as { toJSON?: unknown }).toJSON === "function" ? (headers as { toJSON: () => Record<string, unknown> }).toJSON() : (headers as Record<string, unknown>);
    for (const [key, value] of Object.entries(source)) if (value != null) result[key.toLowerCase()] = String(value);
    return result;
}

type Tracked = InternalAxiosRequestConfig & { __fd?: { startedAt: number; uid: string; context: LogContext } };

function axiosUrl(config: AxiosRequestConfig) {
    const url = config.url || "";
    if (/^https?:\/\//i.test(url) || !config.baseURL) return url;
    return `${config.baseURL.replace(/\/+$/, "")}/${url.replace(/^\/+/, "")}`;
}

function installAxios() {
    axios.interceptors.request.use(
        (config) => {
            const target = classify(axiosUrl(config));
            const tracked = config as Tracked;
            const context = logContextFor(config.signal as AbortSignal | undefined);
            const uid = requestUid();
            tracked.__fd = { startedAt: Date.now(), uid, context };
            if (target === "proxy" || target === "own-api") {
                config.headers.set("x-framedock-ctx", encodeContext(context));
                config.headers.set("x-framedock-req", uid);
            }
            return config;
        },
        undefined,
        { synchronous: true },
    );

    const finish = (config: Tracked | undefined, outcome: { status?: number; error?: string; headers?: unknown; data?: unknown }) => {
        const meta = config?.__fd;
        if (!config || !meta || classify(axiosUrl(config)) !== "external") return;
        const request = describeBody(config.data);
        const contentType = headersToObject(outcome.headers)["content-type"];
        const response = typeof outcome.data === "string" ? { text: outcome.data.slice(0, MAX_BODY) } : outcome.data instanceof Blob || outcome.data instanceof ArrayBuffer ? { text: `[binary ${contentType || "data"}]` } : describeBody(outcome.data);
        report({
            method: (config.method || "get").toUpperCase(),
            url: new URL(axiosUrl(config), window.location.href).toString(),
            status: outcome.status,
            error: outcome.error,
            startedAt: meta.startedAt,
            durationMs: Date.now() - meta.startedAt,
            reqHeaders: headersToObject(config.headers),
            reqBody: request.text,
            reqContentType: request.contentType || headersToObject(config.headers)["content-type"],
            resHeaders: headersToObject(outcome.headers),
            resBody: response.text,
            resContentType: contentType,
            context: meta.context,
            reqUid: meta.uid,
        });
    };

    axios.interceptors.response.use(
        (response) => {
            finish(response.config as Tracked, { status: response.status, headers: response.headers, data: response.data });
            return response;
        },
        (error: unknown) => {
            if (axios.isAxiosError(error)) {
                finish(error.config as Tracked | undefined, {
                    status: error.response?.status,
                    error: axios.isCancel(error) ? "已取消" : error.message,
                    headers: error.response?.headers,
                    data: error.response?.data,
                });
            }
            return Promise.reject(error);
        },
    );
}

function installFetch() {
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const isRequest = typeof Request !== "undefined" && input instanceof Request;
        const rawUrl = isRequest ? input.url : String(input);
        const target = classify(rawUrl);
        if (target === "ignore") return nativeFetch(input, init);

        const method = (init?.method || (isRequest ? input.method : "GET")).toUpperCase();
        const signal = init?.signal ?? (isRequest ? input.signal : undefined);
        const context = logContextFor(signal);
        const uid = requestUid();
        let nextInit = init;
        if ((target === "proxy" || target === "own-api") && !isRequest) {
            const headers = new Headers(init?.headers);
            headers.set("x-framedock-ctx", encodeContext(context));
            headers.set("x-framedock-req", uid);
            nextInit = { ...init, headers };
        }
        if (target !== "external") return nativeFetch(input, nextInit);

        const startedAt = Date.now();
        const request = describeBody(init?.body);
        const base = {
            method,
            url: new URL(rawUrl, window.location.href).toString(),
            startedAt,
            reqHeaders: headersToObject(new Headers(init?.headers ?? (isRequest ? input.headers : undefined))),
            reqBody: request.text,
            reqContentType: request.contentType,
            context,
            reqUid: uid,
        };
        try {
            const response = await nativeFetch(input, nextInit);
            // The body is left alone (it may be a live stream); status, headers and size are enough here.
            report({
                ...base,
                status: response.status,
                durationMs: Date.now() - startedAt,
                resHeaders: headersToObject(response.headers),
                resContentType: response.headers.get("content-type") ?? undefined,
                resSize: Number(response.headers.get("content-length")) || undefined,
            });
            return response;
        } catch (error) {
            report({ ...base, durationMs: Date.now() - startedAt, error: error instanceof DOMException && error.name === "AbortError" ? "已取消" : error instanceof Error ? error.message : String(error) });
            throw error;
        }
    };
}

let installed = false;

/** Call once at startup, before the first request. */
export function installApiLogging() {
    if (installed) return;
    installed = true;
    installAxios();
    installFetch();
}
