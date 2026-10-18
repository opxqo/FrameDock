"use strict";
function _define_property(obj, key, value) { if (key in obj) {
    Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true });
}
else {
    obj[key] = value;
} return obj; }
function _object_spread(target) { for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};
    var ownKeys = Object.keys(source);
    if (typeof Object.getOwnPropertySymbols === "function") {
        ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; }));
    }
    ownKeys.forEach(function (key) { _define_property(target, key, source[key]); });
} return target; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    if (enumerableOnly) {
        symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; });
    }
    keys.push.apply(keys, symbols);
} return keys; }
function _object_spread_props(target, source) { source = source != null ? source : {}; if (Object.getOwnPropertyDescriptors) {
    Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
}
else {
    ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); });
} return target; }
function _object_without_properties(source, excluded) { if (source == null)
    return {}; var target = {}, sourceKeys, key, i; if (typeof Reflect !== "undefined" && Reflect.ownKeys) {
    sourceKeys = Reflect.ownKeys(Object(source));
    for (i = 0; i < sourceKeys.length; i++) {
        key = sourceKeys[i];
        if (excluded.indexOf(key) >= 0)
            continue;
        if (!Object.prototype.propertyIsEnumerable.call(source, key))
            continue;
        target[key] = source[key];
    }
    return target;
} target = _object_without_properties_loose(source, excluded); if (Object.getOwnPropertySymbols) {
    sourceKeys = Object.getOwnPropertySymbols(source);
    for (i = 0; i < sourceKeys.length; i++) {
        key = sourceKeys[i];
        if (excluded.indexOf(key) >= 0)
            continue;
        if (!Object.prototype.propertyIsEnumerable.call(source, key))
            continue;
        target[key] = source[key];
    }
} return target; }
function _object_without_properties_loose(source, excluded) { if (source == null)
    return {}; var target = {}, sourceKeys = Object.getOwnPropertyNames(source), key, i; for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0)
        continue;
    if (!Object.prototype.propertyIsEnumerable.call(source, key))
        continue;
    target[key] = source[key];
} return target; }
(self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([[35108], { 2174: (e, t, n) => { n.d(t, { IV: () => s, QL: () => l, r4: () => o }); var r = n(14363), a = n(88617), i = n(13946); async function l(e) { try {
            return await o(e);
        }
        catch (e) {
            return [];
        } } async function o(e) { let t = await (0, a.Q2)(); if (!t) {
            let e = Error("inflight: no auth token");
            throw e.name = "AuthHttpError", e;
        } let n = await (0, a.u9)((0, r.x)("/api/v1/model-runtime/inflight"), { headers: { Authorization: "Bearer ".concat(t) }, signal: e }, i.mM); if (!n.ok) {
            let e = Error("inflight: HTTP ".concat(n.status));
            throw (401 === n.status || 403 === n.status) && (e.name = "AuthHttpError"), e;
        } let l = await n.json(); return Array.isArray(null == l ? void 0 : l.tasks) ? l.tasks : []; } function s(e, t, n, r) { if (0 === t.length)
            return e; let a = e.map(e => { if (!e.taskId)
            return e; let n = t.find(t => { var n; return t.task_id === e.taskId || (null == (n = e.taskId) ? void 0 : n.startsWith(t.task_id + "#")); }); return n && "creator" in n ? _object_spread_props(_object_spread({}, e), { creator: n.creator }) : e; }), i = t.filter(e => { let t; return e.model === n && e.task_id && (t = e.task_id, !a.some(e => { let n = e.taskId; return !!n && (n === t || n.startsWith(t + "#")); })); }).map(r); return i.length > 0 ? [...i, ...a] : a; } }, 4975: (e, t, n) => { n.d(t, { De: () => o, Xm: () => s, ki: () => l }); var r = n(88617); let a = new Map; async function i(e) { let t = await r.FH.get("/api/v1/system-prompts/".concat(encodeURIComponent(e))), n = null == t ? void 0 : t.content; if ("string" != typeof n || "" === n.trim())
            throw Error("system prompt ".concat(e, ": empty content")); return n; } async function l(e, t) { let n = a.get(e); n || (n = i(e), a.set(e, n), n.catch(() => a.delete(e))); try {
            return await n;
        }
        catch (e) {
            return t;
        } } async function o(e) { var t, n; let i = [...new Set(e.map(e => e.id).filter(e => !a.has(e)))], o = new Map; for (let e = 0; e < i.length; e += 100) {
            let n = i.slice(e, e + 100);
            try {
                let e = await r.FH.post("/api/v1/system-prompts/batch", { ids: n });
                for (let r of null != (t = null == e ? void 0 : e.prompts) ? t : [])
                    n.includes(null == r ? void 0 : r.id) && "string" == typeof r.content && "" !== r.content.trim() && (o.set(r.id, r.content), a.set(r.id, Promise.resolve(r.content)));
            }
            catch (e) { }
        } let s = new Set(i), u = new Map; for (let t of e)
            u.set(t.id, s.has(t.id) ? null != (n = o.get(t.id)) ? n : t.fallback : await l(t.id, t.fallback)); return u; } function s(e, t) { return e ? e.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, (e, n) => Object.prototype.hasOwnProperty.call(t, n) ? t[n] : e) : e; } }, 6673: (e, t, n) => { function r(e) { return new Promise((t, n) => { let r = new FileReader; r.onload = () => t(r.result), r.onerror = () => n(r.error), r.readAsDataURL(e); }); } function a(e, t) { var n, r; let a = e.indexOf(","), l = a >= 0 ? e.slice(0, a) : e, o = a >= 0 ? e.slice(a + 1) : ""; if (!o)
            throw Error("dataURL is empty (canvas produced no image data)"); if (!/;base64$/i.test(l))
            throw Error("dataURL is not base64-encoded"); let s = null != (n = null == (r = l.match(/^data:([^;,]+)/i)) ? void 0 : r[1]) ? n : "image/jpeg"; return new File([i(o)], t, { type: s }); } function i(e) { let t = atob(e), n = new Uint8Array(t.length); for (let e = 0; e < t.length; e++)
            n[e] = t.charCodeAt(e); return n; } function l(e) { let t = e.replace(/-/g, "+").replace(/_/g, "/"); return i(t.padEnd(4 * Math.ceil(t.length / 4), "=")); } async function o(e, t) { if (!e.startsWith("blob:"))
            throw Error("not a blob: URL"); let n = await (await fetch(e)).blob(); return new File([n], t, { type: n.type || "image/png" }); } async function s(e) { var t; let r = d(t = new Uint8Array(await e.arrayBuffer()), [239, 187, 191]) ? u("utf-8", t.subarray(3)) : d(t, [255, 254, 0, 0]) || d(t, [0, 0, 254, 255]) ? null : d(t, [255, 254]) ? u("utf-16le", t.subarray(2)) : d(t, [254, 255]) ? u("utf-16be", t.subarray(2)) : u("utf-8", t); if (null !== r)
            return r; let { decodeTextFileOnServer: a } = await Promise.all([n.e(88617), n.e(4204)]).then(n.bind(n, 4204)); return a(e); } function u(e, t) { try {
            return new TextDecoder(e, { fatal: !0, ignoreBOM: !0 }).decode(t);
        }
        catch (e) {
            return null;
        } } function d(e, t) { return t.length <= e.length && t.every((t, n) => e[n] === t); } n.d(t, { CQ: () => o, KQ: () => r, Qv: () => s, bX: () => a, rf: () => l }); }, 6838: (e, t, n) => { n.d(t, { j_: () => P, qH: () => J, iu: () => H, Di: () => L, DX: () => U, t8: () => I.t, i3: () => j, tD: () => G, PE: () => T, zO: () => W, K6: () => X, V_: () => R, f7: () => z, mi: () => B, HO: () => $, BC: () => K, zm: () => Q, Dg: () => O, Nx: () => q, o9: () => Y }); var r = n(88617), a = n(5937), i = n(81638), l = n(6673), o = n(14363), s = n(12836), u = n(53709), d = n(40264), c = n(61683), f = n(76535), m = n(46079), p = n(58411), g = n(86357), v = n(60790), h = n(13946), y = n(72168), w = n(12813), _ = n(2174); let b = function (e) { var t, n, r, a, i, l, o; let s, u, d = null != (t = e.intervalMs) ? t : 3e3, c = null != (n = e.maxBackoffMs) ? n : 3e4, f = null != (r = e.hiddenIntervalMs) ? r : w.O, m = null != (a = e.videoFullRefreshMs) ? a : 6e4, p = null != (i = e.stalledRefreshMs) ? i : 12e4, g = null != (l = e.isHidden) ? l : w.w, v = null != (o = e.now) ? o : Date.now, h = new Map, y = new Map, _ = !1, b = 0, k = !1; function E() { if (!s && !_ && 0 !== h.size) {
            let e;
            !k && "u" > typeof document && (k = !0, document.addEventListener("visibilitychange", () => { !g() && s && (clearTimeout(s), s = void 0, E()); })), s = setTimeout(() => { s = void 0, T(); }, (e = b > 0 ? Math.min(d * 2 ** (b - 1), c) : d, (g() && (e = Math.max(e, f)), void 0 === u) ? 0 : Math.max(0, u + e - v())));
        } } function M(e) { var t, n; let r = null != (t = h.get(e)) ? t : []; for (let t of (h.delete(e), r))
            t.onAbort && (null == (n = t.signal) || n.removeEventListener("abort", t.onAbort)); return r; } function x(e, t, n) { if ("completed" === t.status || "failed" === t.status || !0 === t.is_final)
            return void y.delete(e); y.delete(e); let r = v(); if (y.set(e, { task: t, fetchedAt: r, changedAt: r, isVideo: n || "video" === t.type }), y.size > 500) {
            let e = y.keys().next().value;
            void 0 !== e && y.delete(e);
        } } function S(e) { let t = y.get(e); if (!t)
            return; let n = v(); y.set(e, _object_spread_props(_object_spread({}, t), { fetchedAt: n, changedAt: n })); } async function I(t, n, r) { let a = 1 === n.length ? n[0].signal : void 0; try {
            var i;
            let l = await e.fetchSingle(t, a);
            for (let e of (x(t, l, r || (null == (i = y.get(t)) ? void 0 : i.isVideo) === !0), n))
                e.resolve(l);
        }
        catch (e) {
            for (let r of (S(t), n))
                r.reject(e);
        } } async function T() { if (0 !== h.size) {
            _ = !0, u = v();
            try {
                let a;
                try {
                    a = await e.fetchInflight();
                }
                catch (e) {
                    for (let t of (b++, [...h.keys()]))
                        for (let n of M(t))
                            n.reject(e);
                    return;
                }
                b = 0;
                let i = new Map(a.map(e => [e.task_id, e]));
                for (let e of [...h.keys()]) {
                    var t, n, r;
                    let a = i.get(e), l = y.get(e), o = (null == a ? void 0 : a.type) === "video" || (null == l ? void 0 : l.isVideo) === !0, s = M(e);
                    if (!a || !l || A(l, o)) {
                        I(e, s, o);
                        continue;
                    }
                    let u = _object_spread_props(_object_spread({}, l.task), { status: a.status, progress: null != (t = a.progress) ? t : l.task.progress, stage: null != (n = a.stage) ? n : l.task.stage, stage_message: null != (r = a.stage_message) ? r : l.task.stage_message, is_final: !1 }), d = u.status !== l.task.status || u.progress !== l.task.progress || u.stage !== l.task.stage || u.stage_message !== l.task.stage_message;
                    for (let t of (y.set(e, _object_spread_props(_object_spread({}, l), { task: u, changedAt: d ? v() : l.changedAt })), s))
                        t.resolve(u);
                }
            }
            finally {
                _ = !1, E();
            }
        } } function A(e) { let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : e.isVideo; return t ? v() - e.fetchedAt >= m : v() - e.changedAt >= p; } async function C(t, n) { var r; let a; try {
            a = await e.fetchSingle(t, n);
        }
        catch (e) {
            throw S(t), e;
        } return x(t, a, (null == (r = y.get(t)) ? void 0 : r.isVideo) === !0), a; } return { fetch: function (e, t) { let n; return !(n = y.get(e)) || A(n) ? C(e, t) : new Promise((n, r) => { if (null == t ? void 0 : t.aborted)
                return void r(new DOMException("aborted", "AbortError")); let a = { resolve: n, reject: r, signal: t }; t && (a.onAbort = () => { let t = h.get(e); if (!t)
                return; let n = t.filter(e => e !== a); n.length > 0 ? h.set(e, n) : h.delete(e), 0 === h.size && s && (clearTimeout(s), s = void 0), queueMicrotask(() => r(new DOMException("aborted", "AbortError"))); }, t.addEventListener("abort", a.onAbort, { once: !0 })); let i = h.get(e); i ? i.push(a) : h.set(e, [a]), E(); }); }, pendingCount: () => h.size }; }({ fetchInflight: e => (0, _.r4)(e), fetchSingle: (e, t) => X(e, t) }); function k(e, t) { return b.fetch(e, t); } var E = n(9608), M = n(21047), x = n(23643), S = n(90451), I = n(16133); function T(e) { if (!e)
            return ""; let t = "string" == typeof e ? e : e instanceof Error ? e.message : String(e); if (t.trim().startsWith("{"))
            try {
                var n, r;
                let e = JSON.parse(t), a = (null == (n = e.error) ? void 0 : n.message) || (null == (r = e.error) ? void 0 : r.code) || e.error || e.message;
                if ("string" == typeof a && a.length > 0)
                    return a;
            }
            catch (e) { } return t; } async function A(e, t, n) { let a = new Headers(e), i = await (0, r.Q2)(); i && a.set("Authorization", "Bearer ".concat(i)); let l = (0, c.q)(t); l && a.set("X-Schedule-Strategy", l); let o = null == n ? void 0 : n.trim(); return o && a.set("X-Pin-Route", o), a; } function C(e, t) { let n = _object_spread({}, null != e ? e : {}); return (0, S.fQ)(n, t), n; } async function q(e) { var t; (0, u.M)(e.model); let n = (await (0, g.uC)({ model_id: e.model, modality: "chat", async: !0, messages: e.messages, params: e.params, strategy: e.strategy, client_request_id: (0, d.q)("wb") })).task_id; if (!n)
            throw Error("chat async invoke 未返回 task_id"); return null == (t = e.onTaskCreated) || t.call(e, n), O(n, { timeoutMs: e.timeoutMs }); } async function O(e) { var t, n, r, a, i, l, o; let s = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}, u = await (0, g.Wv)(e, { timeoutMs: null != (t = s.timeoutMs) ? t : 18e4 }); if ("failed" === u.status)
            throw Error(u.error || "chat task failed"); return (null != (n = null == (o = u.result) || null == (l = o.chat) || null == (i = l.choices) || null == (a = i[0]) || null == (r = a.message) ? void 0 : r.content) ? n : "").trim(); } async function P(e) { var t, n; return q({ model: e.model, messages: [{ role: "user", content: [{ type: "text", text: null != (t = e.instruction) ? t : "你是资深服装电商文案。看这张商品图，用一句话（60 字内）描述它的款式、版型、面料材质、颜色与核心卖点，用于增强 AI 试穿生成的保真度。直接输出描述文字，不要任何前缀、引号或解释。" }, { type: "image_url", image_url: { url: e.imageUrl } }] }], params: { max_tokens: null != (n = e.maxTokens) ? n : 200 }, timeoutMs: e.timeoutMs }); } function z(e) { let t = [], n = [], r = []; for (let a of null != e ? e : []) {
            let e = a.url || (a.b64_json ? "data:image/png;base64,".concat(a.b64_json) : "");
            e && (t.push(e), n.push(a.creation_task_id), r.push(a.original_url || void 0));
        } return { urls: t, creationKeys: n, originalUrls: r }; } function R(e) { return z(e).urls; } function D(e) { return e.surface ? e.surfaceRef ? { surface: e.surface, surface_ref: e.surfaceRef } : { surface: e.surface } : {}; } async function L(e) { var t, n, r; (0, u.M)(e.model); let a = await (0, g.uC)(_object_spread_props(_object_spread({ model_id: e.model, modality: "image", operation: "generate", client_request_id: e.clientRequestId || (0, d.q)("wb") }, D(e)), { strategy: e.strategy, lane_id: e.laneId, lane_ids: e.laneIds, channel_group_id: e.channelGroupId, params: _object_spread({ prompt: e.prompt, n: e.n }, e.size ? { size: e.size } : {}, e.quality ? { quality: e.quality } : {}, e.response_format ? { response_format: e.response_format } : {}, C(e.extra, "createImageTask")) }), { headers: e.galleryRemixToken ? { [v.T]: e.galleryRemixToken } : void 0 }), i = z((null == (t = a.result) ? void 0 : t.images) || (null == (n = a.result) ? void 0 : n.data)); return { task_id: a.task_id || a.request_id || "", status: a.status || "pending", images: i.urls, imageCreationKeys: i.creationKeys, imageOriginalUrls: i.originalUrls, model: (null == (r = a.model) ? void 0 : r.public_model) || e.model }; } async function j(e) { var t, n, r, a, i, l; (0, u.M)(e.model); let o = await G(e.source), s = C(e.extra, "editImage"), c = await (0, g.uC)(_object_spread_props(_object_spread({ model_id: e.model, modality: "image", operation: "edit", client_request_id: e.clientRequestId || (0, d.q)("wb") }, D(e)), { strategy: e.strategy, lane_id: e.laneId, lane_ids: e.laneIds, attachments: [o], params: _object_spread({ prompt: e.prompt, n: null != (t = e.n) ? t : 1 }, e.size ? { size: e.size } : {}, e.mask ? { mask: e.mask } : {}, e.background ? { background: e.background } : {}, s) }), { headers: e.galleryRemixToken ? { [v.T]: e.galleryRemixToken } : void 0 }), f = c.task_id || c.request_id || ""; f && (null == (r = e.onTaskCreated) || r.call(e, f)); let m = R((null == (a = c.result) ? void 0 : a.images) || (null == (i = c.result) ? void 0 : i.data)); if (m.length)
            return m; if (!f)
            throw Error("image edit: no task_id returned"); let p = await Q(f, { timeoutMs: null != (n = e.timeoutMs) ? n : 18e4 }); if ("failed" === p.status)
            throw new h.zX(p.error || "image edit failed", f); return R(null == (l = p.result) ? void 0 : l.images); } async function N(e, t) { if (!(t <= 0))
            try {
                var n, r;
                let a = await (0, s.T9)();
                return (0, p.LS)(null == (r = a.find(t => t.id === e)) || null == (n = r.param_schema) ? void 0 : n.mode, t);
            }
            catch (e) {
                return;
            } } async function W(e) { var t, n, r, a, i, l, o, s; if (e.resumeTaskId) {
            let t = await Q(e.resumeTaskId, _object_spread({ timeoutMs: null != (o = e.timeoutMs) ? o : 18e4 }, e.poll));
            if ("failed" === t.status)
                throw new h.zX(t.error || "image i2i failed", e.resumeTaskId);
            return R(null == (s = t.result) ? void 0 : s.images);
        } (0, u.M)(e.model); let c = await Promise.all((0, m.fZ)(e.references).map(G)), f = C(e.extra, "generateImageI2I"); if (void 0 === f.mode) {
            let t = await N(e.model, c.length);
            t && (f.mode = t);
        } let p = await (0, g.uC)(_object_spread_props(_object_spread({ model_id: e.model, modality: "image", operation: "generate", client_request_id: e.clientRequestId || (0, d.q)("wb") }, D(e)), { strategy: e.strategy, lane_id: e.laneId, lane_ids: e.laneIds, attachments: c, params: _object_spread({ prompt: e.prompt, n: null != (t = e.n) ? t : 1 }, e.size ? { size: e.size } : {}, e.aspectRatio ? { aspect_ratio: e.aspectRatio } : {}, f) }), { headers: e.galleryRemixToken ? { [v.T]: e.galleryRemixToken } : void 0 }), y = p.task_id || p.request_id || ""; y && (null == (r = e.onTaskCreated) || r.call(e, y)); let w = R((null == (a = p.result) ? void 0 : a.images) || (null == (i = p.result) ? void 0 : i.data)); if (w.length)
            return w; if (!y)
            throw Error("image i2i: no task_id returned"); let _ = await Q(y, _object_spread({ timeoutMs: null != (n = e.timeoutMs) ? n : 18e4 }, e.poll)); if ("failed" === _.status)
            throw new h.zX(_.error || "image i2i failed", y); return R(null == (l = _.result) ? void 0 : l.images); } async function U(e) { var t, n, r, a; (0, u.M)(e.model); let i = await V(e.image_url, "video-reference-start.png"), l = await V(e.end_image_url, "video-reference-end.png"), _C = C(_object_spread({ aspect_ratio: e.aspect_ratio }, e.extra || {}), "createVideoTask"), { aspect_ratio: o } = _C, s = _object_without_properties(_C, ["aspect_ratio"]), c = "string" == typeof o ? o : e.aspect_ratio, m = Array.from(new Set([...[i, l].filter(e => !!e), ...Array.isArray(null == (t = e.extra) ? void 0 : t.images) ? e.extra.images.filter(e => "string" == typeof e && e.trim().length > 0) : []])), p = _object_spread({}, s, m.length > 0 ? { images: m } : {}), h = Array.isArray(p.reference_urls) ? p.reference_urls.filter(e => "string" == typeof e && e.trim().length > 0) : [], y = h.length > 0 ? h : m, w = await (0, g.uC)(_object_spread_props(_object_spread({ model_id: e.model, modality: "video", operation: "generate", client_request_id: e.clientRequestId || (0, d.q)("wb") }, D(e)), { strategy: e.strategy, lane_id: e.laneId, lane_ids: e.laneIds, channel_group_id: e.channelGroupId, params: _object_spread(_object_spread_props(_object_spread({}, e.prompt.trim() ? { prompt: e.prompt } : {}, void 0 !== e.duration ? { duration: e.duration } : {}), { aspect_ratio: c, image_url: i, end_image_url: l, reference_urls: y.length > 0 ? y : void 0, reference_image_urls: m.length > 0 ? m : void 0, resolution: "string" == typeof p.resolution ? p.resolution : void 0, mode: "string" == typeof p.mode ? p.mode : void 0, variant: e.variant, off_peak: e.off_peak }), p) }), { headers: _object_spread({}, e.galleryRemixToken ? { [v.T]: e.galleryRemixToken } : {}) }); return { task_id: w.task_id || w.request_id || "", status: w.status || "pending", message: null == (n = w.result) ? void 0 : n.message, videoUrl: (a = w.result, (0, f.JT)(a)), model: (null == (r = w.model) ? void 0 : r.public_model) || e.model }; } async function H(e) { var t; (0, u.M)(e.model); let n = await (0, g.uC)({ model_id: e.model, modality: "audio", operation: e.operation || "generate", client_request_id: e.clientRequestId || (0, d.q)("wb"), strategy: e.strategy, lane_id: e.laneId, lane_ids: e.laneIds, params: _object_spread({ prompt: e.prompt, lyrics: e.lyrics, mode: e.mode, sample_rate: e.sample_rate, bitrate: e.bitrate }, e.extra || {}) }); return { task_id: n.task_id || "", status: n.status, message: null == (t = n.result) ? void 0 : t.message }; } async function J(e) { var t; (0, u.M)(e.model); let n = await (0, g.uC)({ model_id: e.model, modality: "audio", operation: "speech", client_request_id: e.clientRequestId || (0, d.q)("wb"), strategy: e.strategy, lane_id: e.laneId, lane_ids: e.laneIds, params: _object_spread({ input: e.input, voice: e.voice, response_format: e.response_format, speed: e.speed }, e.extra || {}) }); return { task_id: n.task_id || "", status: n.status, message: null == (t = n.result) ? void 0 : t.message }; } function B(e) { let t = null == e ? void 0 : e.toLowerCase().trim(); return "completed" === t || "complete" === t || "succeeded" === t || "success" === t || "done" === t; } async function F(e, t) { var n; let a = await A(), i = await (0, r.u9)((n = "/v1/tasks/".concat(encodeURIComponent(e)), (0, o.x)(n)), { headers: a, signal: t }, h.mM); if (!i.ok) {
            if ((0, h.jL)(i.status))
                throw new h.p3(e);
            let t = Error(await i.text());
            throw (401 === i.status || 403 === i.status) && (t.name = "AuthHttpError"), t;
        } return await i.json(); } async function Q(e, t) { var n, a, i, l; let o = await (0, h.DU)(e, k, e => "completed" === e.status || "failed" === e.status || !0 === e.is_final, { timeoutMs: null == t ? void 0 : t.timeoutMs, intervalMs: null != (n = null == t ? void 0 : t.intervalMs) ? n : 2e3, slowIntervalMs: null == t ? void 0 : t.slowIntervalMs, fastWindowMs: null == t ? void 0 : t.fastWindowMs, signal: null == t ? void 0 : t.signal, onPoll: null == t ? void 0 : t.onPoll, isFatalError: h.nE, onAuthError: () => (0, r.$H)(), earlyWake: e => (0, y.Iq)(e) }); if ("completed" === o.status) {
            let e = o.result;
            (0, E.yS)([...(null != (a = null == e ? void 0 : e.images) ? a : []).map(e => null == e ? void 0 : e.url), ...(null != (i = null == e ? void 0 : e.videos) ? i : []).flatMap(e => [null == e ? void 0 : e.url, null == e ? void 0 : e.last_frame_url]), ...(null != (l = null == e ? void 0 : e.audios) ? l : []).map(e => null == e ? void 0 : e.url)]);
        } return o; } function $(e) { return (0, h.eO)(e); } async function X(e, t) { try {
            var n, r;
            return _object_spread_props(_object_spread({}, n = await (0, g.Jw)(e, t)), { is_final: null != (r = n.is_final) ? r : "completed" === n.status || "failed" === n.status });
        }
        catch (n) {
            if (null == t ? void 0 : t.aborted)
                throw n;
            return await F(e, t);
        } } async function V(e, t) { return e ? /^data:image\/[a-z0-9.+-]+;base64,/i.test(e) ? await K(e, { trigger: "user" }) : e.startsWith("blob:") ? (await (0, a.uploadProjectFile)(await (0, l.CQ)(e, t))).url : e : e; } async function K(e, t) { var n; let r = null != (n = (0, M.Ep)(e)) ? n : e; return (0, x.DJ)(r) ? r : (0, i.QS)(r, { auth: "optional", trigger: t.trigger, timeoutMs: 12e4, signal: t.signal }); } async function G(e) { let t = e.trim(); if (/^https?:\/\//i.test(t))
            return t; if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(t)) {
            let e = (await K(t, { trigger: "user" })).trim();
            if (/^https?:\/\//i.test(e))
                return e;
        } throw Error("reference image must resolve to a stable http(s) URL"); } async function Y(e) { let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : "reference", n = await A(), a = new FormData; a.append("file", e), a.append("purpose", t); let i = () => { var e; return fetch((e = "/v1/files", (0, o.x)(e)), { method: "POST", headers: n, body: a }); }, l = await (0, r.BK)(await i(), i, n); if (!l.ok)
            throw Error(await l.text()); return await l.json(); } }, 8793: (e, t, n) => { function r(e) { if (!e)
            return ""; let t = "string" == typeof e ? e : e instanceof Error ? e.message : String(e), n = t.indexOf("{"); if (-1 === n)
            return t; try {
            let e = JSON.parse(t.slice(n)), r = e.error, a = "object" == typeof r && r ? r.detail : void 0, i = ("object" == typeof r && r && "string" == typeof r.message ? r.message : "") || ("object" == typeof a && a && "string" == typeof a.detail ? a.detail : "") || ("object" == typeof a && a && "string" == typeof a.message ? a.message : "") || ("string" == typeof a ? a : "") || ("string" == typeof r ? r : "") || ("string" == typeof e.message ? e.message : "");
            if (i)
                return i;
        }
        catch (e) { } return t; } function a(e) { if (!e || !e.includes("map["))
            return ""; let t = e.match(/\bmessage:([\s\S]*?)(?:\s+[a-z_][a-z0-9_]*:|\]|$)/); return t ? t[1].trim() : ""; } n.d(t, { N: () => a, l: () => r }); }, 12391: (e, t, n) => { n.d(t, { Ip: () => d, qr: () => f }); var r = n(28486), a = n(12836), i = n(88271), l = n(94567), o = n(11353), s = n(29417); let u = new Set; function d(e) { return u.add(e), () => u.delete(e); } function c(e) { u.forEach(t => t(e)); } async function f(e) { var t, n; if ("image" !== e.modality && "video" !== e.modality || !(0, s.J)())
            return e; let u = null == (t = e.params) ? void 0 : t.prompt; if ("string" != typeof u || !u.trim() || 625 > (0, o.hO)(u))
            return e; try {
            let t = await (0, i.Hm)(e.model_id), s = (null == (n = e.lane_ids) ? void 0 : n.length) ? new Set(e.lane_ids) : null, d = s ? t.filter(e => s.has(e.id)) : t, { willTruncate: f, cap: m } = (0, o.m0)(d, u, (0, r.Yl)((0, a.peekLogicalModel)(e.model_id)));
            if (!f || (0, o.jf)(m))
                return e;
            if ((0, o.Dw)(u, m))
                return c({ kind: "skipped", cutPercent: Math.round(100 * (0, o.XK)(u, m)) }), e;
            c({ kind: "start" });
            let p = await (0, l.Xu)(u, m);
            return c({ kind: "done", fromChars: p.fromChars, toChars: p.toChars, stillOverTarget: p.stillOverTarget, shotsVerified: p.shotsVerified }), _object_spread_props(_object_spread({}, e), { params: _object_spread_props(_object_spread({}, e.params), { prompt: p.text }) });
        }
        catch (t) {
            return c({ kind: "failed" }), e;
        } } }, 13375: (e, t, n) => { n.d(t, { $p: () => y, CG: () => g, CY: () => w, Qo: () => d, Su: () => m, _2: () => h, uu: () => v }); var r = n(8793); let a = ["提示词敏感", "内容敏感", "敏感词", "敏感内容", "涉及敏感", "敏感", "不允许生成", "禁止生成", "内容审核", "审核不通过", "未通过审核", "审核", "违反内容", "不合规内容", "内容不合规", "不合规", "违禁", "违反平台政策", "违规内容", "违规", "我不能按", "可能违反", "违反了我们", "不适当", "版权", "版权相关", "侵权", "知识产权", "受保护", "受保护知识产权", "受保护版权", "不符合平台规范", "不符合规范", "平台规范", "调整提示词", "无法创作", "无法生成", "换其他主题", "换个主题", "无法处理该内容", "内容风险", "风险内容", "拒绝生成", "真人", "人脸", "识别真人", "真实人物", "肖像"], i = ["content policy", "content_policy", "content moderation", "content review", "content_blocked", "provider_moderation", "moderation_error", "safety system", "safety", "policy violation", "prohibited content", "sensitive content", "sensitive", "not allowed to generate", "unsafe content", "identifiable real person", "non-photorealistic", "video_unsafe", "reference_image_unsafe", "image_unsafe", "_unsafe", "content blocked", "appears to be unsafe", "nsfw", "extreme_violence", "didn't pass", "flagged as", "flagged", "inappropriate", "blocked by", "invalid input detected by the third-party", "copyright", "intellectual property", "protected ip", "trademark", "protected content", "can't create", "cannot create", "unable to create", "unable to generate", "try a different", "different subject", "different topic", "not permitted", "rejected", "declined", "content restriction", "restricted content", "_filtered"]; function l(e) { if (!e)
            return ""; let t = "string" == typeof e ? e : e instanceof Error ? e.message : String(e); if (t.trim().startsWith("{"))
            try {
                let e = JSON.parse(t), n = e.error, r = ("object" == typeof n && n ? n.message || n.code : void 0) || ("string" == typeof n ? n : void 0) || e.message || "";
                "string" == typeof r && r.length > 0 && (t = r);
            }
            catch (e) { } return t; } let o = /换|更换|替换|改用|调整|修改|去掉|移除|删除|避免|遮挡|马赛克|文生|文字生成|换成|换张|换个|重新描述|重新上传/, s = /稍后重试|稍后再试|请重试|重试即可|稍候再试|待会再试|过会再试|稍后再来/, u = ["vendor rejected: content policy"]; function d(e) { let t = l(e); if (!t || v(t))
            return null; let n = (0, r.N)(t); n && (t = n); let a = t.search(/[一-鿿]/); if (a < 0)
            return null; let i = function (e) { let t = e, n = () => t.toLowerCase(); for (let e of u) {
            let r = n().indexOf(e);
            r >= 0 && (t = t.slice(0, r));
        } return t.replace(/[\s:：,，、;；-]+$/u, "").trim(); }(t.slice(a).trim()); return !i || s.test(i) && !o.test(i) ? null : i.slice(0, 200); } let c = ["肖像", "真人", "人脸", "真实人物", "真实人脸", "人物照片", "人物肖像"], f = ["identifiable real person", "real person", "real face", "human face", "portrait", "reference_image_unsafe", "image_unsafe"]; function m(e) { let t = l(e); if (!t)
            return !1; for (let e of a)
            if (t.includes(e))
                return !0; let n = t.toLowerCase(); for (let e of i)
            if (n.includes(e))
                return !0; return !1; } let p = /matched platform term:\s*\\?["“]([^"”\\\n]{1,80})\\?["”]/i, g = "继续违规可能导致账号被封禁，封禁后账户余额不予退还。"; function v(e) { return l(e).toLowerCase().includes("rejected due to content policy violation"); } function h(e) { var t; let n = p.exec(l(e)); return (null == n || null == (t = n[1]) ? void 0 : t.trim()) || null; } function y(e, t) { let n = h(e), r = n ? t("platformBlockedTerm", { term: n }) : t("platformBlocked"), a = t("violationWarning"); return /[。！？]$/.test(r) ? "".concat(r).concat(a) : "".concat(r, " ").concat(a); } function w(e, t) { var n; return v(e) ? y(e, t) : null != (n = d(e)) ? n : t(function (e) { let t = l(e); if (!t)
            return "contentPolicy"; for (let e of c)
            if (t.includes(e))
                return "portraitPolicy"; let n = t.toLowerCase(); for (let e of f)
            if (n.includes(e))
                return "portraitPolicy"; return "contentPolicy"; }(e)); } }, 13946: (e, t, n) => { n.d(t, { DU: () => w, E0: () => i, Jk: () => g, So: () => u, eO: () => d, jL: () => f, mM: () => l, nE: () => m, p3: () => c, wK: () => o, zX: () => p }); var r = n(77028), a = n(12813); let i = 81e4, l = 15e3; class o extends Error {
            constructor(e, t) { super("Task ".concat(e, " polling abandoned (轮询窗口耗尽; 规则33: 已计费任务仍在跑, 保留 taskId 续 poll, 不标失败)")), this.name = "PollAbandonedError", this.taskId = e, this.lastTask = t; }
        } class s extends Error {
            constructor(e, t) { super("Task ".concat(e, " polling stopped: auth expired (连续 401/403; 任务后端仍在跑, 重新登录后可见, 不标失败)")), this.name = "PollAuthError", this.taskId = e, this.lastTask = t; }
        } function u(e) { return e instanceof s || e instanceof Error && "PollAuthError" === e.name; } function d(e) { return e instanceof o || e instanceof Error && /polling (timed out|abandoned)|轮询窗/i.test(e.message); } class c extends Error {
            constructor(e) { super("Task ".concat(e, " gone (task store 记录已过期/不存在)")), this.name = "TaskGoneError", this.taskId = e; }
        } function f(e) { return 404 === e || 410 === e; } function m(e) { return e instanceof c || e instanceof Error && "TaskGoneError" === e.name; } class p extends Error {
            constructor(e, t) { super(e), this.name = "TaskFailedError", this.taskId = t; }
        } function g(e) { return e instanceof p || e instanceof Error && "TaskFailedError" === e.name; } class v extends Error {
            constructor(e) { super("task fetch timeout after ".concat(e, "ms")), this.name = "FetchTimeoutError"; }
        } function h(e, t) { return new Promise((n, r) => { if (null == t ? void 0 : t.aborted)
            return void r(new DOMException("aborted", "AbortError")); let a = setTimeout(() => { null == t || t.removeEventListener("abort", i), n(); }, e), i = () => { clearTimeout(a), r(new DOMException("aborted", "AbortError")); }; null == t || t.addEventListener("abort", i, { once: !0 }); }); } let y = new WeakMap; async function w(e, t, n, r) { var a; let i, l, o = ((l = y.get(t)) || (l = new Map, y.set(t, l)), l); for (let t = o.get(e); t && t !== i; t = o.get(e)) {
            i = t;
            let e = null == r ? void 0 : r.onPoll;
            e && t.subscribers.add(e);
            try {
                return await t.promise;
            }
            catch (e) {
                if (!((null == (a = null == r ? void 0 : r.signal) || !a.aborted) && e instanceof DOMException && "AbortError" === e.name))
                    throw e;
            }
            finally {
                e && t.subscribers.delete(e);
            }
        } let s = new Set, u = _(e, t, n, _object_spread_props(_object_spread({}, r), { onPoll: e => { var t; for (let n of (null == r || null == (t = r.onPoll) || t.call(r, e), s))
                n(e); } })), d = { promise: u, subscribers: s }; o.set(e, d); try {
            return await u;
        }
        finally {
            o.get(e) === d && o.delete(e);
        } } async function _(e, t, n, u) { var d, c, f, m, p, g, y, w; let _, b = null != (d = null == u ? void 0 : u.timeoutMs) ? d : i, k = null != (c = null == u ? void 0 : u.intervalMs) ? c : 2500, E = null != (f = null == u ? void 0 : u.slowIntervalMs) ? f : k, M = null != (m = null == u ? void 0 : u.fastWindowMs) ? m : 0, x = null == u ? void 0 : u.signal, S = Date.now(), I = 0; for (; Date.now() - S < b;) {
            if (null == x ? void 0 : x.aborted)
                throw new DOMException("aborted", "AbortError");
            try {
                if (_ = await function (e, t, n, r) { let a, i = new AbortController, l = () => i.abort(); n && (n.aborted ? i.abort() : n.addEventListener("abort", l, { once: !0 })); let o = new Promise((e, t) => { a = setTimeout(() => { i.abort(), t(new v(r)); }, r); }); return Promise.race([e(t, i.signal), o]).finally(() => { a && clearTimeout(a), null == n || n.removeEventListener("abort", l); }); }(t, e, x, l), I = 0, null == u || null == (g = u.onPoll) || g.call(u, _), n(_))
                    return (0, r.notifyWalletMayHaveChanged)(), _;
            }
            catch (t) {
                if ((null == x ? void 0 : x.aborted) || t instanceof DOMException && "AbortError" === t.name || (null == u || null == (y = u.isFatalError) ? void 0 : y.call(u, t)))
                    throw t;
                if (t instanceof Error ? "AuthHttpError" === t.name ? 0 : !/\b(401|403)\b|unauthorized|invalid token|token (is )?expired/i.test(t.message) : 1)
                    I = 0;
                else if (I++, null == u || null == (w = u.onAuthError) || w.call(u, t), I >= 3)
                    throw new s(e, _);
            }
            let i = Date.now() - S < M ? k : E, o = null == u ? void 0 : u.hiddenIntervalMs, d = void 0 !== o && (0, a.w)();
            d && (i = Math.max(i, o));
            let c = null == u || null == (p = u.earlyWake) ? void 0 : p.call(u, e), f = d ? function () { let e; return { promise: new Promise(t => { e = () => { (0, a.w)() || t(); }, document.addEventListener("visibilitychange", e); }), cancel: () => { e && document.removeEventListener("visibilitychange", e); } }; }() : void 0;
            try {
                let e = [null == c ? void 0 : c.promise, null == f ? void 0 : f.promise].filter(e => !!e);
                e.length > 0 ? await Promise.race([h(i, x), ...e]) : await h(i, x);
            }
            finally {
                null == c || c.cancel(), null == f || f.cancel();
            }
        } throw new o(e, _); } }, 16133: (e, t, n) => { n.d(t, { t: () => i }); var r = n(13375), a = n(91352); function i(e) { if (!e)
            return null; let t = "string" == typeof e ? e : e instanceof Error ? e.message : String(e); if (t.trim().startsWith("{"))
            try {
                var n, i;
                let e = JSON.parse(t), r = (null == (n = e.error) ? void 0 : n.message) || (null == (i = e.error) ? void 0 : i.code) || e.error || e.message || "";
                "string" == typeof r && r.length > 0 && (t = r);
            }
            catch (e) { } let l = t.toLowerCase(); return l.includes("insufficient_funds") || l.includes("insufficient_balance") || l.includes("wallet balance insufficient") || l.includes("wallet balance is insufficient") || l.includes("insufficient balance") || t.includes("余额不足") || t.includes("请充值") || (0, a.r)(l, 402) ? "insufficient_funds" : l.includes("rate limit") || l.includes("rate_limited") || (0, a.r)(l, 429) ? "rate_limited" : t.includes("负载已饱和") || l.includes("overloaded") || l.includes("all vendors failed") || l.includes("all_vendors_failed") || l.includes("upstream_outage") || l.includes("yamlrunner_error") || l.includes("service unavailable") || l.includes("bad gateway") || (0, a.r)(l, 503) || (0, a.r)(l, 502) ? "overloaded" : l.includes("err_connection_refused") || l.includes("fetch failed") ? "gateway_unreachable" : (0, r.Su)(t) ? "content_policy" : null; } }, 29417: (e, t, n) => { n.d(t, { J: () => u, W: () => c }); var r = n(47266), a = n(98242); let i = "prompt-auto-compress:v1", l = new Set, o = null; function s() { if (null !== o)
            return o; try {
            o = "0" !== window.localStorage.getItem(i);
        }
        catch (e) {
            o = !0;
        } return o; } function u() { try {
            return "0" !== window.localStorage.getItem(i);
        }
        catch (e) {
            return !0;
        } } function d(e) { l.add(e); let t = e => { e.key === i && (o = null, l.forEach(e => e())); }; return window.addEventListener("storage", t), () => { l.delete(e), window.removeEventListener("storage", t); }; } function c() { let e, t = (0, r.c)(2), n = (0, a.useSyncExternalStore)(d, s, m); return t[0] !== n ? (e = [n, f], t[0] = n, t[1] = e) : e = t[1], e; } function f(e) { o = e; try {
            window.localStorage.setItem(i, e ? "1" : "0");
        }
        catch (e) { } l.forEach(e => e()); } function m() { return !0; } }, 40264: (e, t, n) => { n.d(t, { q: () => r }); function r(e) { let t = "u" > typeof crypto && "function" == typeof crypto.randomUUID ? crypto.randomUUID() : "".concat(Date.now().toString(36), "-").concat(Math.random().toString(36).slice(2, 10)); return "".concat(e, "-").concat(t); } }, 53709: (e, t, n) => { n.d(t, { $w: () => i, JQ: () => a, M: () => l }); var r = n(12836); function a(e, t) { let n = null != t ? t : e ? (0, r.peekLogicalModel)(e) : void 0; if ((null == n ? void 0 : n.deprecated) !== !0)
            return; let a = n.display_name || e || ""; return (0, r.VP)().startsWith("zh") ? "模型「".concat(a, "」已退役，请重新选择模型后再生成。") : 'Model "'.concat(a, '" is retired. Select another model before generating.'); } class i extends Error {
            constructor(...e) { super(...e), this.code = "generation.input_invalid"; }
        } function l(e) { let t = a(e); if (t)
            throw new i(t); } }, 58411: (e, t, n) => { n.d(t, { C0: () => i, LS: () => a }); let r = new Set(["text-to-image", "image-edit", "multi-reference"]); function a(e, t) { var n; if (t <= 0 || !e || "enum" !== e.type)
            return; let a = (e.options && e.options.length > 0 ? e.options.map(e => e.value) : null != (n = e.enum) ? n : []).map(e => String(e)).filter(Boolean); if (0 === a.length || !a.every(e => r.has(e)))
            return; let i = t >= 2 ? "multi-reference" : "image-edit"; return a.includes(i) ? i : void 0; } function i(e) { return null == e || "" === e || "text-to-image" === e; } }, 60790: (e, t, n) => { n.d(t, { S: () => a, T: () => r }); let r = "X-TokenGo-Gallery-Remix"; function a(e) { if (!e.expiresAt)
            return !1; let t = Date.parse(e.expiresAt); return Number.isFinite(t) && t <= Date.now(); } }, 61683: (e, t, n) => { n.d(t, { q: () => r.qP }); var r = n(40715); }, 65543: (e, t, n) => { n.d(t, { Ug: () => f, rP: () => m, xo: () => p }); var r = n(47266), a = n(98242), i = n(16133), l = n(84447), o = n(10786); let s = { isOpen: !1 }, u = 0, d = new Set; function c() { for (let e of d)
            e(); } let f = { open() { s.isOpen || (s = { isOpen: !0 }, c()); }, close() { s.isOpen && (s = { isOpen: !1 }, c()); }, subscribe: e => (d.add(e), () => d.delete(e)), getSnapshot: () => s }; function m(e, t) { if (402 !== t && "insufficient_funds" !== (0, i.t)(e))
            return !1; let n = Date.now(); return !s.isOpen && !(n - u < 6e4) && (u = n, f.open(), !0); } function p() { let e, t = (0, r.c)(2), n = (0, a.useSyncExternalStore)(f.subscribe, f.getSnapshot, f.getSnapshot); return t[0] !== n ? (e = _object_spread_props(_object_spread({}, n), { open: f.open, close: f.close }), t[0] = n, t[1] = e) : e = t[1], e; } (0, l.dn)("account:insufficient-funds-dialog", function (e) { let t, n, r; return "http_failure" === e.type ? m(e.error, e.status) : (r = "string" == typeof (null == (n = (t = e.event.payload) && "object" == typeof t ? t : void 0) ? void 0 : n.reason) ? n.reason : void 0, "insufficient_funds" === (0, o.mn)({ payload: t, code: r }) && m("insufficient_funds", 402)); }); }, 72168: (e, t, n) => { n.d(t, { Iq: () => o, Jm: () => l }); let r = new Map, a = new Map; function i(e) { for (let [t, n] of a)
            e - n >= 6e4 && a.delete(t); } function l(e) { if (!e)
            return; let t = Date.now(); i(t), a.set(e, t); let n = r.get(e); if (n)
            for (let e of [...n])
                e(); } function o(e) { let t = Date.now(); i(t); let n = a.get(e); if (void 0 !== n && t - n < 6e4)
            return a.delete(e), { promise: Promise.resolve(), cancel: () => { } }; let l = !1, o = () => { }; return { promise: new Promise(t => { var n; let a = () => { l || (l = !0, s(), t()); }, i = null != (n = r.get(e)) ? n : new Set; i.add(a), r.set(e, i); let s = () => { i.delete(a), 0 === i.size && r.delete(e); }; o = () => { l || (l = !0, s(), t()); }; }), cancel: () => o() }; } }, 76535: (e, t, n) => { n.d(t, { JT: () => i, RB: () => l }); let r = e => "string" == typeof e && e.trim() ? e.trim() : void 0; function a(e) { if (Array.isArray(e))
            for (let n of e) {
                var t;
                let e = "string" == typeof n ? r(n) : null != (t = r(null == n ? void 0 : n.url)) ? t : r(null == n ? void 0 : n.video_url);
                if (e)
                    return e;
            } } function i(e) { var t, n; if (!e)
            return; let i = null != (t = r(e.video_url)) ? t : r(e.url); if (i)
            return i; if ("string" == typeof e.output) {
            let t = r(e.output);
            if (t)
                return t;
        }
        else if (e.output) {
            let t = null != (n = r(e.output.video_url)) ? n : r(e.output.url);
            if (t)
                return t;
        } return a(e.videos); } function l(e) { var t, n; if (!e)
            return; let l = null != (t = null != (n = r(e.url)) ? n : r(e.video_url)) ? t : a(e.videos); return l || i(e.result); } }, 77028: (e, t, n) => { n.d(t, { U2: () => p, eU: () => o, jw: () => m, notifyWalletMayHaveChanged: () => d, pD: () => s, xR: () => c }); var r = n(47266), a = n(98242), i = n(55093), l = n(82078); let o = ["billing", "wallet"], s = ["subaccount", "my-quota"], u = "omniforge:wallet-may-have-changed"; function d() { window.dispatchEvent(new Event(u)); } function c(e) { return window.addEventListener(u, e), () => window.removeEventListener(u, e); } let f = "tokengo-wallet-changed"; function m() { if ("u" > typeof BroadcastChannel)
            try {
                let e = new BroadcastChannel(f);
                e.postMessage({ type: "wallet-changed" }), e.close();
            }
            catch (e) { } } function p() { let e, t, n = (0, r.c)(3), c = (0, i.jE)(); return n[0] !== c ? (e = () => { let e = !0, t = () => { (0, l.W)("wallet-balance", () => { e && (c.invalidateQueries({ queryKey: o }), c.invalidateQueries({ queryKey: s })); }, 1e3); }; window.addEventListener(u, t); let n = function (e) { let t; if ("u" < typeof BroadcastChannel)
            return () => { }; try {
            t = new BroadcastChannel(f);
        }
        catch (e) {
            return () => { };
        } return t.onmessage = t => { var n; (null == (n = t.data) ? void 0 : n.type) === "wallet-changed" && e(); }, () => t.close(); }(d); return () => { e = !1, window.removeEventListener(u, t), n(); }; }, t = [c], n[0] = c, n[1] = e, n[2] = t) : (e = n[1], t = n[2]), (0, a.useEffect)(e, t), null; } }, 82078: (e, t, n) => { n.d(t, { W: () => function e(t, n, a) { let i = r.get(t); if (i) {
                i.pending = !0, i.run = n;
                return;
            } n(); let l = { pending: !1, run: n, timer: setTimeout(() => { r.delete(t), l.pending && e(t, l.run, a); }, a) }; r.set(t, l); } }); let r = new Map; }, 86357: (e, t, n) => { n.d(t, { Jw: () => g, Wv: () => v, uC: () => m, vr: () => p }); var r = n(65543), a = n(88617), i = n(14363), l = n(61683), o = n(13946), s = n(77028), u = n(12391); function d(e) { if (!e)
            return; let t = e.trim(); return "smart" === t || "price" === t || "speed" === t || "quality" === t || "sla" === t ? (0, l.q)(t) : t; } async function c(e) { let t = new Headers(e), n = await (0, a.Q2)(); return n && t.set("Authorization", "Bearer ".concat(n)), t; } let f = new Set(["missing_api_key", "invalid_api_key"]); async function m(e, t) { let n = await (0, u.qr)(e), l = await c(null == t ? void 0 : t.headers); l.set("Content-Type", "application/json"); let o = JSON.stringify(_object_spread_props(_object_spread({}, n), { strategy: d(n.strategy) })), m = () => fetch((0, i.x)("/api/v1/model-runtime/invoke"), { method: "POST", headers: l, signal: null == t ? void 0 : t.signal, body: o }), p = await (0, a.BK)(await m(), m, l); if (401 === p.status)
            throw new a.hD(function (e) { let t = ""; try {
                var n;
                let r = JSON.parse(e);
                t = "string" == typeof (null == r || null == (n = r.error) ? void 0 : n.type) ? r.error.type : "";
            }
            catch (t) {
                return e;
            } return f.has(t) ? JSON.stringify({ error: { type: t, code: "401", message: ("u" > typeof document ? document.documentElement.lang.toLowerCase() : "").startsWith("zh") ? "登录状态已失效，请刷新页面或重新登录后再试" : "Your sign-in has expired. Please refresh the page or sign in again." } }) : e; }(await p.text()), 401); if (!p.ok) {
            let e = await p.text();
            throw (0, r.rP)(e, p.status), new a.hD(e, p.status);
        } let g = await p.text(), v = JSON.parse(g); if ((null == v ? void 0 : v.mode) === "sync" && "failed" === v.status)
            throw (0, r.rP)(g), new a.hD(g, 502); return (0, s.notifyWalletMayHaveChanged)(), v; } async function p(e, t, n) { let r = await c({ "Content-Type": "application/json", Accept: "text/event-stream" }); return fetch("/api/v1/conversations/".concat(encodeURIComponent(e), "/generate"), { method: "POST", headers: r, signal: null == n ? void 0 : n.signal, body: JSON.stringify({ model_id: t.model_id, strategy: d(t.strategy), lane_id: t.lane_id || void 0, lane_ids: t.lane_ids && t.lane_ids.length > 0 ? t.lane_ids : void 0, messages: t.messages, params: t.params, clarify_mode: t.clarify_mode || void 0, clarify_resolved: t.clarify_resolved || void 0, client_request_id: t.client_request_id || void 0 }) }); } async function g(e, t) { let n = await c(), r = await (0, a.u9)((0, i.x)("/api/v1/model-runtime/tasks/".concat(e)), { headers: n, signal: t }, o.mM); if (!r.ok) {
            if ((0, o.jL)(r.status))
                throw new o.p3(e);
            let t = Error(await r.text());
            throw (401 === r.status || 403 === r.status) && (t.name = "AuthHttpError"), t;
        } return await r.json(); } async function v(e, t) { var n, i; let l = await (0, o.DU)(e, g, e => "completed" === e.status || "failed" === e.status, { timeoutMs: null == t ? void 0 : t.timeoutMs, intervalMs: null != (n = null == t ? void 0 : t.intervalMs) ? n : 2e3, isFatalError: o.nE, onAuthError: () => (0, a.$H)() }); return "failed" === l.status && (0, r.rP)(null != (i = l.error) ? i : ""), l; } }, 90451: (e, t, n) => { n.d(t, { $z: () => d, Hn: () => a, Jy: () => i, XB: () => u, df: () => l, fQ: () => m, iw: () => c, j3: () => f, nt: () => s }), n(47266), n(98242); var r = n(76601); let a = "__tokengo_adaptive_image_size__"; function i(e, t) { return "".concat("tokengo:ec:image-size:").concat(e, ":").concat(t); } function l(e, t, n) { try {
            let l = window.localStorage.getItem(i(e, t.modelName)), o = n.options.filter(e => !(0, r.Iq)(e) && null != s(e.value)).map(e => e.value);
            return l === a || null != l && o.includes(l) ? l : a;
        }
        catch (e) {
            return a;
        } } let o = new Map; function s(e) { let t = e.trim().match(/^(\d+(?:\.\d+)?)\s*[:x×]\s*(\d+(?:\.\d+)?)$/i); if (!t)
            return null; let n = Number(t[1]), r = Number(t[2]); return n > 0 && r > 0 ? n / r : null; } function u(e) { var t; let n = null != (t = null == e ? void 0 : e.params) ? t : []; return [...n.filter(e => "aspect_ratio" === e.key), ...n.filter(e => "size" === e.key)].find(e => e.options.some(e => !(0, r.Iq)(e) && null != s(e.value))); } function d(e, t, n) { let a = e.options.filter(e => !(0, r.Iq)(e) && (!n || n.has(e.value))).map(e => ({ value: e.value, aspect: s(e.value) })).filter(e => null != e.aspect); if (0 === a.length)
            return; if (!(null != t && t > 0)) {
            var i;
            let t = a.find(t => t.value === e.default);
            return null != (i = null == t ? void 0 : t.value) ? i : a[0].value;
        } let l = a[0], o = Math.abs(Math.log(l.aspect / t)); for (let e of a.slice(1)) {
            let n = Math.abs(Math.log(e.aspect / t));
            n < o && (l = e, o = n);
        } return l.value; } function c(e) { let t = null == e ? void 0 : e.trim(); if (!t)
            return Promise.resolve(null); let n = o.get(t); if (n)
            return n; let r = new Promise(e => { let n = new window.Image, r = t => { window.clearTimeout(a), e(t); }, a = window.setTimeout(() => r(null), 15e3); n.onload = () => { r(n.naturalWidth > 0 && n.naturalHeight > 0 ? n.naturalWidth / n.naturalHeight : null); }, n.onerror = () => r(null), n.src = t; }); return o.set(t, r), r; } function f(e, t, n) { let i = arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : {}, l = _object_spread({}, null != t ? t : {}), o = Object.keys(l).filter(e => l[e] === a); if (0 === o.length)
            return l; for (let e of o)
            delete l[e]; let s = e ? (0, r.Rx)(e) : void 0, u = s ? (0, r.oz)({ schema: s.schema, values: l, context: _object_spread_props(_object_spread({}, i), { linkages: s.linkages, modelType: (null == e ? void 0 : e.modelType) || null }) }) : void 0; for (let t of o) {
            let r = null == e ? void 0 : e.params.find(e => e.key === t), a = null == u ? void 0 : u.params[t], i = a ? new Set(a.options.filter(e => e.listed && e.selectable).map(e => e.value)) : void 0, o = r ? d(r, n, i) : void 0;
            o && (l[t] = o);
        } return l; } function m(e, t) { let n = Object.keys(null != e ? e : {}).filter(t => (null == e ? void 0 : e[t]) === a); if (n.length > 0)
            throw Error("自适应尺寸未在提交前解析 (".concat(t, ": ").concat(n.join(", "), ")")); } }, 91352: (e, t, n) => { n.d(t, { r: () => r }); function r(e, t) { return new RegExp("(^|[^0-9])".concat(t, "([^0-9]|$)")).test(e); } }, 94567: (e, t, n) => { n.d(t, { Xu: () => x }); var r = n(33407), a = n(4975), i = n(6838), l = n(11353); function o() { let e = (0, r._)(["(d+)(?![d.])(?!s*(?:mm|毫米|cm|厘米|fps|帧|k\b|p\b|x\b|°|度|%|倍|个|副|面|块|张|台|只))"], ["(\\d+)(?![\\d.])(?!\\s*(?:mm|毫米|cm|厘米|fps|帧|k\\b|p\\b|x\\b|°|度|%|倍|个|副|面|块|张|台|只))"]); return o = function () { return e; }, e; } function s() { let e = (0, r._)(["([一二两三四五六七八九十]{1,3})(?=[s：:，,。．.、;；)）]】]|$)"], ["([一二两三四五六七八九十]{1,3})(?=[\\s：:，,。．.、;；)）\\]】]|$)"]); return s = function () { return e; }, e; } function u() { let e = (0, r._)(["(?:镜头|分镜|镜|\bshot)s*[#＃]?s*", ""], ["(?:镜头|分镜|镜|\\bshot)\\s*[#＃]?\\s*", ""]); return u = function () { return e; }, e; } function d() { let e = (0, r._)(["(?:场景|片段|\bscene|\bpart)s*[#＃]?s*", ""], ["(?:场景|片段|\\bscene|\\bpart)\\s*[#＃]?\\s*", ""]); return d = function () { return e; }, e; } let c = ["gemini-3.1-flash-lite", "gpt-5.4-nano", "deepseek-v4-flash"]; class f extends Error {
            constructor(e) { super(e), this.name = "CompressQualityError"; }
        } let m = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 }; function p(e) { return e.split(":").reduce((e, t) => 60 * e + Number(t), 0); } let g = String.raw(o()), v = String.raw(s()), h = "(?:".concat(g, "|").concat(v, ")"), y = /(\d+(?:\.\d+)?)\s*(?:s|秒|sec(?:onds?)?)?\s*[-–—~～至到]\s*(\d+(?:\.\d+)?)\s*(?:s|秒|sec)/gi, w = /((?:\d{1,2}:)?\d{1,2}:\d{2})(?:\.\d+)?\s*(?:-->|[-–—~～至到])\s*((?:\d{1,2}:)?\d{1,2}:\d{2})/g, _ = RegExp(String.raw(u(), h), "gi"), b = /第\s*(\d+|[一二两三四五六七八九十]{1,3})\s*个?镜/g, k = RegExp(String.raw(d(), h), "gi"); function E(e, t, n, r) { for (let l of r.matchAll(n)) {
            var a, i;
            let n = function (e) { if (/^\d+$/.test(e))
                return Number(e); let t = /^([一二两三四五六七八九])?(十)?([一二三四五六七八九])?$/.exec(e); if (!t || !e)
                return NaN; let [, n, r, a] = t; return r ? (n ? m[n] : 1) * 10 + (a ? m[a] : 0) : n && !a ? m[n] : NaN; }(null != (a = null != (i = l[1]) ? i : l[2]) ? a : "");
            Number.isFinite(n) && e.add("".concat(t, ":").concat(n));
        } } function M(e) { let t = new Set; for (let n of e.matchAll(y))
            t.add("t:".concat(Number(n[1]), "-").concat(Number(n[2]))); for (let n of e.matchAll(w))
            t.add("t:".concat(p(n[1]), "-").concat(p(n[2]))); return E(t, "s", _, e), E(t, "s", b, e), E(t, "c", k, e), t; } async function x(e, t) { var n, r; let o = e.trim(), s = (0, l.hO)(o), u = (0, l.p0)(t, o), d = await (0, a.ki)("workspace.prompt.compress", "你是提示词精简专家。用户的生成提示词超出了模型可接受长度，需要你压缩它。\n\n## 铁律（违反任何一条都算失败）\n1. **一个镜头/段落都不能少** — 原文有几镜，输出就有几镜，编号与顺序完全保持\n2. **结构记号原样保留** — 时间轴（如【0-3秒】）、镜号、@参考标记、比例/时长等参数声明，逐字不动\n3. **只压描述密度** — 合并重复修饰、删冗余套话与通用画质堆砌词，保留每镜的主体、动作、场景、镜头语言、台词\n4. **不新增内容** — 不补充原文没有的情节、道具、风格词\n5. **不做解释** — 直接输出压缩后的提示词全文，不要任何前言、说明、markdown 代码块标记\n\n## 硬指标\n原文 {{from}} 字，压缩后必须 ≤ {{target}} 字，即至少删掉 {{cut}}% 的字数。\n优先牺牲形容词密度与画质套话，绝不牺牲镜头数量与叙事完整性。\n输出前自己数一遍：如果还超过 {{target}} 字，继续删形容词再输出。"), m = async (e) => { let t = (0, l.hO)(e), n = Math.max(1, Math.round((1 - u / Math.max(t, 1)) * 100)), r = d.replaceAll("{{target}}", String(u)).replaceAll("{{from}}", String(t)).replaceAll("{{cut}}", String(n)), a = null; for (let t of c)
            try {
                let n = (await (0, i.Nx)({ model: t, messages: [{ role: "system", content: r }, { role: "user", content: e }], params: { max_tokens: Math.max(1024, Math.ceil(1.5 * u)) }, timeoutMs: 12e4 })).trim();
                if (!n)
                    throw Error("压缩返回空内容");
                let a = function (e, t, n) { let r = (0, l.hO)(t); if (r < Math.floor(.5 * n))
                    return "压缩过度：只剩 ".concat(r, " 字，目标约 ").concat(n, " 字"); let a = M(t), i = [...M(e)].filter(e => !a.has(e)); return i.length > 0 ? "压缩丢了 ".concat(i.length, " 处时间轴或镜号") : null; }(o, n, u);
                if (a)
                    throw new f(a);
                return n;
            }
            catch (e) {
                a = e;
            } throw a instanceof Error ? a : Error("提示词压缩失败"); }, p = await m(o); if (n = p, (0, l.Wf)(n, t))
            try {
                let e = await m(p);
                (0, l.dp)(e) < (0, l.dp)(p) && (p = e);
            }
            catch (e) { } return { text: p, fromChars: s, toChars: (0, l.hO)(p), stillOverTarget: (r = p, (0, l.Wf)(r, t)), shotsVerified: M(o).size > 0 }; } } }]);
