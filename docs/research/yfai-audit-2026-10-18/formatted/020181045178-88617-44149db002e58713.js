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
(self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([[88617], { 1299: (t, e, n) => { n.d(e, { GJ: () => u, LR: () => s, PX: () => l, Qo: () => d, UL: () => o, k1: () => c, m_: () => r }); let o = 864e5, r = 200; function a(t) { return "".concat("omniforge.workspace.task-history.", "v").concat(1, ".").concat(t); } function i() { try {
            let t = "__omniforge_probe__";
            return window.localStorage.setItem(t, "1"), window.localStorage.removeItem(t), !0;
        }
        catch (t) {
            return !1;
        } } function s(t, e) { let n = Date.now(); return t.filter(t => { if ("failed" !== t.status)
            return !0; let o = Date.parse(t.createdAt); return !!Number.isNaN(o) || n - o < e; }); } function c(t, e) { return t.length <= e ? t : [...t].sort((t, e) => { let n = Date.parse(t.createdAt); return Date.parse(e.createdAt) - n; }).slice(0, e); } function u(t) { if (!i())
            return null; try {
            let e = window.localStorage.getItem(a(t));
            if (!e)
                return null;
            let n = JSON.parse(e);
            if (!n || 1 !== n.version || !Array.isArray(n.items))
                return null;
            return n.items;
        }
        catch (t) {
            return null;
        } } function l(t, e) { if (!i())
            return !1; let n = { version: 1, savedAt: new Date().toISOString(), items: e }, o = a(t); try {
            return window.localStorage.setItem(o, JSON.stringify(n)), !0;
        }
        catch (t) {
            for (let t of [100, 50, 20])
                try {
                    let n = c(e, t);
                    return window.localStorage.setItem(o, JSON.stringify({ version: 1, savedAt: new Date().toISOString(), items: n })), !0;
                }
                catch (t) { }
            try {
                window.localStorage.removeItem(o);
            }
            catch (t) { }
            return !1;
        } } function d(t) { if (i())
            try {
                window.localStorage.removeItem(a(t));
            }
            catch (t) { } } }, 4984: (t, e, n) => { n.d(e, { N: () => r }); class o extends Error {
            constructor(t) { super("response body not received within ".concat(Math.round(t / 1e3), "s")), this.name = "DeadlineExceededError"; }
        } function r(t, e) { let n; return Promise.race([t, new Promise((t, r) => { n = setTimeout(() => r(new o(e)), e); })]).finally(() => clearTimeout(n)); } }, 73397: (t, e, n) => { n.d(e, { BQ: () => i, F2: () => T, G9: () => s, KS: () => r, L9: () => P, PE: () => E, Qu: () => h, iB: () => O, k: () => f, kw: () => a, l1: () => d, m$: () => k, ng: () => b, ry: () => A, ti: () => c, zq: () => _ }); let o = "tokengo.guestPreview", r = "tokengo:guest-login-required", a = "tokengo:guest-login-cancelled"; function i() { try {
            window.sessionStorage.setItem(o, "1");
        }
        catch (t) { } } function s() { try {
            window.sessionStorage.removeItem(o);
        }
        catch (t) { } } function c() { try {
            return "1" === window.sessionStorage.getItem(o);
        }
        catch (t) {
            return !1;
        } } let u = new Set(["/chat", "/image", "/video", "/audio", "/agents", "/agents/chat", "/agents/comic", "/agents/comic/assets", "/agents/canvas-v2", "/agents/comic/projects", "/canvas", "/canvas-v2", "/multiframe", "/agents/ecommerce", "/agents/ecommerce-v3", "/agents/multiframe", "/agents/ppt", "/agents/ppt-v2", "/agents/doc-qa", "/agents/web-analyst", "/agents/visual-identity", "/clip", "/square", "/inspiration", "/skills", "/vibeapp", "/vibeapp/studio", "/cli", "/openclaw"]), l = /^\/[a-z]{2}(?:-[A-Z]{2})?(?=\/|$)/; function d(t) { return t.replace(l, "").replace(/\/+$/, "") || "/"; } function f(t) { var e, n; return null != (e = null == (n = l.exec(t)) ? void 0 : n[0]) ? e : ""; } function h(t) { return !!t && u.has(d(t)); } let w = ["/api/v1/public/", "/api/v1/announcements", "/api/v1/gallery/", "/api/v1/voice-library/presets", "/v1/media/capabilities", "/api/v1/faq/", "/api/guide/texts/"], p = new Set(["/api/version", "/api/v1/config/install-reward"]), m = new Set(["/api/v1/client-vitals"]), y = new Set(["/api/v1/pricing-estimate", "/api/v1/media/expiry-status", "/api/v1/multiframe/duration-plan", "/api/v1/client-errors"]), v = !1, g = new Set; function E() { return v; } function T(t) { return g.add(t), () => g.delete(t); } class b extends Error {
            constructor(t, e) { super(S || (("u" > typeof document ? document.documentElement.lang : "").toLowerCase().startsWith("zh") ? "登录后可查看" : "Sign in to view")), this.method = t, this.path = e, this.code = "GUEST_PREVIEW_BLOCKED", this.status = 0, this.name = "GuestPreviewBlockedError"; }
        } let S = null; function k(t) { S = t || null; } function A(t) { return t instanceof b || "object" == typeof t && null !== t && "GUEST_PREVIEW_BLOCKED" === t.code; } function _() { window.dispatchEvent(new Event(r)); } function O(t, e) { if (!v)
            return; let n = function (t) { try {
            return new URL(t, "http://local").pathname;
        }
        catch (e) {
            return t;
        } }(e); if (!(n.startsWith("/api/") || n.startsWith("/v1/")) || function (t, e) { if (e.startsWith("/api/auth/"))
            return !0; let n = (null != t ? t : "GET").toUpperCase(); return !!("POST" === n && m.has(e)) || ("GET" === n || "HEAD" === n) && (!!p.has(e) || w.some(t => e.startsWith(t))); }(t, n))
            return; let o = (null != t ? t : "GET").toUpperCase(); throw window.dispatchEvent(new CustomEvent("tokengo:guest-request-blocked", { detail: { method: o, path: n } })), "GET" === o || "HEAD" === o || y.has(n) || _(), new b(o, n); } let D = null; function P(t) { if (t !== v)
            if (v = t, queueMicrotask(() => { for (let t of g)
                t(); }), t) {
                let t = D = window.fetch;
                window.fetch = (e, n) => { let o = "string" == typeof e ? e : e instanceof URL ? e.toString() : e.url; if ((() => { try {
                    return new URL(o, window.location.href).origin === window.location.origin;
                }
                catch (t) {
                    return !0;
                } })())
                    try {
                        O((null == n ? void 0 : n.method) ? n.method : "u" > typeof Request && e instanceof Request ? e.method : "GET", o);
                    }
                    catch (t) {
                        return Promise.reject(t);
                    } return t(e, n); };
            }
            else
                D && (window.fetch = D, D = null); } }, 73461: (t, e, n) => { n.d(e, { L$: () => c, OU: () => f, UN: () => d, X8: () => u, im: () => s }); let o = "tokengo.fallback.dismissed", r = 0, a = 0, i = null; function s() { r += 1; } function c() { r = 0; } function u() { try {
            window.sessionStorage.setItem(o, "1");
        }
        catch (t) { } } async function l(t) { if (!t)
            return !1; let e = Date.now(); if (i)
            return i; if (e - a < 3e4)
            return !1; a = e; let n = new AbortController, o = setTimeout(() => n.abort(), 5e3); return i = fetch("https://".concat(t, "/brand/favicon.ico?probe=").concat(e), { mode: "no-cors", cache: "no-store", signal: n.signal, credentials: "omit" }).then(() => !0).catch(() => !1).finally(() => { clearTimeout(o), i = null; }); } async function d(t) { if (!t || function () { try {
            return "1" === window.sessionStorage.getItem(o);
        }
        catch (t) {
            return !1;
        } }())
            return !1; let e = window.location.hostname.toLowerCase(), n = t.toLowerCase(); if (e === n)
            return !1; let r = n.slice(n.indexOf(".") + 1); return !(r && (e === r || e.endsWith("." + r))) && l(t); } function f(t) { let { pathname: e, search: n, hash: o } = window.location; return "https://".concat(t).concat(e).concat(n).concat(o); } }, 84447: (t, e, n) => { n.d(e, { dn: () => i, m3: () => c, yA: () => s }); let o = new Set, r = new Map; function a(t) { for (let e of [...o, ...r.values()])
            try {
                e(t);
            }
            catch (t) {
                console.error("[api-failure-events] listener failed", t);
            } } function i(t, e) { return r.set(t, e), () => { r.get(t) === e && r.delete(t); }; } function s(t, e) { a({ type: "http_failure", error: t, status: e }); } function c(t) { return "run_failed" === t.type && (a({ type: "run_failed", event: t }), !0); } }, 88617: (t, e, n) => { n.d(e, { hD: () => u, lr: () => R, FH: () => X, gc: () => l, qh: () => M, Ni: () => Q, u9: () => _, $H: () => C, wH: () => A, df: () => W, BK: () => x, jA: () => P, ap: () => L, Q2: () => D, Gj: () => k }); var o = n(84447), r = n(4984), a = n(73397), i = n(1299), s = n(73461); let c = "x-session-refresh"; n(47738); class u extends Error {
            constructor(t, e, n, o) { super(t), this.status = e, this.code = n, this.detail = o, this.name = "ApiError"; }
        } function l(t) { var e; if (!(t instanceof u))
            return; let n = null == (e = t.detail) ? void 0 : e.code; return "string" == typeof n && n ? n : void 0; } function d(t, e) { let n = t.trim(); if (!n)
            throw new u("Empty JSON response (HTTP ".concat(e, ")"), e); try {
            return JSON.parse(n);
        }
        catch (t) {
            throw new u("Malformed JSON response (HTTP ".concat(e, ")"), e);
        } } let f = null, h = 0, w = null, p = null, m = !1, y = null; async function v() { return h = 0, O(); } let g = 0; function E() { null !== w && Date.now() >= w - 24e4 && v().catch(() => { }); } let T = null, b = !1, S = /^\/api\/v1\/voices\/[^/?#]+$/; function k(t) { b = t; } function A() { return b; } async function _(t, e, n) { var o; let r = new AbortController, a = !1, i = setTimeout(() => { a = !0, r.abort(); }, n), s = null != (o = e.signal) ? o : void 0, c = () => r.abort(); s && (s.aborted ? r.abort() : s.addEventListener("abort", c, { once: !0 })); try {
            return await fetch(t, _object_spread_props(_object_spread({}, e), { signal: r.signal }));
        }
        catch (t) {
            if (a)
                throw new u("请求超时 (".concat(Math.round(n / 1e3), " 秒)，请检查网络后重试"), 0, "REQUEST_TIMEOUT");
            throw t;
        }
        finally {
            clearTimeout(i), s && s.removeEventListener("abort", c);
        } } async function O() { let t = Date.now(); if (t - h < 6e4 && (null === w || !(t >= w - 3e4)))
            return f; T || (T = _("/api/auth/session", { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json", [c]: "1" } }, 15e3).then(async (t) => { var e; if (!t.ok)
            return { definitive: !1, token: null }; let n = await (0, r.N)(t.json(), 15e3); return { definitive: !0, token: null != (e = null == n ? void 0 : n.accessToken) ? e : null, expiresAt: "number" == typeof (null == n ? void 0 : n.accessTokenExpiresAt) ? n.accessTokenExpiresAt : null }; }).catch(() => ({ definitive: !1, token: null })).finally(() => { T = null; })); let e = await T; return e.definitive && (f = e.token, h = t, !function (t) { if (p && (clearTimeout(p), p = null), !t)
            return; let e = Date.now(); if (e >= t)
            return; let n = t - 24e4 + 3e4 * Math.random() - e; p = setTimeout(() => { p = null, y = t, v().catch(() => { }); }, y !== t && n > 0 ? n : 6e4); }(w = "number" == typeof e.expiresAt ? e.expiresAt : null), e.token && (m || (m = !0, window.addEventListener("focus", E), window.addEventListener("online", E), document.addEventListener("visibilitychange", () => { "visible" === document.visibilityState && E(); })))), e.token; } async function D() { var t; let e; return null != (t = await O()) ? t : (e = document.cookie.match(/(?:^|;\s*)session-token=([^;]*)/)) ? decodeURIComponent(e[1]) : null; } async function P() { if ((0, a.PE)())
            throw (0, a.zq)(), new a.ng("AUTH", "requireAuthToken"); let t = await D(); if (!t)
            throw Error("登录凭证获取超时，请重试"); return t; } let N = !1, I = 0, U = 0; function j(t) { Promise.all([n.e(9517), n.e(13062), n.e(23498)]).then(n.bind(n, 23498)).then(e => { let { performLogout: n } = e; n({ callbackUrl: "/login", reason: t }).catch(() => { window.location.href = "/login"; }); }); } async function x(t, e, n) { if (401 !== t.status)
            return t; let o = n.get("Authorization"); if (!o) {
            let o = Date.now();
            if (o - g < 6e4)
                return t;
            g = o;
            let r = await v().catch(() => null);
            if (!r)
                return t;
            n.set("Authorization", "Bearer ".concat(r));
            let a = await e();
            return 401 === a.status && C(), a;
        } let r = await v().catch(() => null); if (!r || "Bearer ".concat(r) === o)
            return C(), t; n.set("Authorization", "Bearer ".concat(r)); let a = await e(); return 401 === a.status && C(), a; } function C() { let t = Date.now(); if (t - U > 1e4 ? (U = t, I = 1) : I += 1, I >= 3) {
            N || (N = !0, j("burst_401_x".concat(I)));
            return;
        } N || (N = !0, B(), (async () => { try {
            let t = await _("/api/auth/session", { cache: "no-store", headers: { [c]: "rejected" } }, 15e3), e = await (0, r.N)(t.json(), 15e3);
            if ((null == e ? void 0 : e.error) === "refresh_failed" || (null == e ? void 0 : e.error) === "refresh_replay")
                return void j(e.error);
            if (null == e ? void 0 : e.accessToken) {
                I = 0, U = 0, N = !1;
                return;
            }
            j("session_empty");
        }
        catch (t) {
            N = !1;
        } })()); } function L() { I = 0, U = 0, N = !1, b = !1, B(), (0, i.Qo)("image"), (0, i.Qo)("video"), (0, i.Qo)("audio"); } function B() { f = null, h = 0, T = null, w = null, y = null, g = 0, p && (clearTimeout(p), p = null); } function G(t, e) { let n = new URL(t, "http://localhost"); if (e)
            for (let [t, o] of Object.entries(e))
                void 0 !== o && n.searchParams.set(t, String(o)); return "".concat(n.pathname).concat(n.search); } let R = new Set([502, 503, 504]); function q(t) { return new Promise(e => setTimeout(e, t)); } let H = [400, 900, 1500]; function J(t) { return (!(t instanceof DOMException) || "AbortError" !== t.name) && !!(t instanceof u && "REQUEST_TIMEOUT" === t.code || t instanceof TypeError); } async function z(t, e, n, o, r) { var a; let i, c = !(arguments.length > 5) || void 0 === arguments[5] || arguments[5], l = 0, d = c && ("GET" === (i = (o || "GET").toUpperCase()) || "HEAD" === i || "POST" === i && /\/regen-|\/batch-generate-images|\/poll|\/refresh/i.test(r)); for (;;) {
            let i;
            try {
                i = await _(t, e, n);
            }
            catch (t) {
                if (d && l < 3 && J(t)) {
                    let e = null != (a = H[l]) ? a : 1500;
                    if ("u" > typeof console) {
                        let n = t instanceof u ? t.code : null == t ? void 0 : t.name;
                        console.warn("[api] connect-retry on ".concat(o || "GET", " ").concat(r, " (").concat(null != n ? n : "?", "), retry ").concat(l + 1, "/").concat(3, " in ").concat(e, "ms"));
                    }
                    await q(e), l++;
                    continue;
                }
                throw J(t) && (0, s.im)(), t;
            }
            if ((0, s.L$)(), !d || l >= 3 || !R.has(i.status))
                return i;
            let c = function (t) { var e; return null != (e = [1e3, 3e3, 7e3][t]) ? e : 7e3; }(l);
            "u" > typeof console && console.warn("[api] transient ".concat(i.status, " on ").concat(o || "GET", " ").concat(r, ", retry ").concat(l + 1, "/").concat(3, " in ").concat(c, "ms")), await q(c), l++;
        } } function M(t, e) { if ("u" > typeof document && "string" == typeof e) {
            if (e.includes("/api/v1/reseller/")) {
                let e = document.cookie.match(/(?:^|;\s*)impersonate_reseller_id=([^;]+)/);
                e && e[1] && t.set("X-Impersonate-Reseller-ID", e[1]);
            }
            if (e.includes("/api/v1/")) {
                let e = document.cookie.match(/(?:^|;\s*)impersonate_user_id=([^;]+)/);
                e && e[1] && t.set("X-Impersonate-User-ID", e[1]);
            }
        } } function Q() { if ("u" < typeof document)
            return ""; let t = document.cookie.match(/(?:^|;\s*)impersonate_user_id=([^;]+)/); return t && t[1] ? t[1] : ""; } function W() { return !("u" < typeof document) && /(?:^|;\s*)impersonate_reseller_id=([^;]+)/.test(document.cookie); } async function $(t) { let e = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}, { body: n, params: r, headers: i, timeoutMs: s, transientRetry: c } = e, l = _object_without_properties(e, ["body", "params", "headers", "timeoutMs", "transientRetry"]); (0, a.iB)(l.method, t); let f = null != s ? s : 1e4, h = new Headers(i), w = await D(); w && h.set("Authorization", "Bearer ".concat(w)), M(h, t); let p = "u" > typeof FormData && n instanceof FormData; void 0 === n || p || h.has("Content-Type") || h.set("Content-Type", "application/json"); let m = G(t, r), y = () => z(m, _object_spread_props(_object_spread({}, l), { headers: h, body: void 0 === n ? void 0 : p ? n : JSON.stringify(n) }), f, l.method, "string" == typeof t ? t : "", !1 !== c), v = await x(await y(), y, h); if (204 === v.status)
            return; let g = v.headers.get("content-type") || ""; if (!g.includes("application/json"))
            throw new u("Expected JSON response but received ".concat(g || "unknown content-type", " (HTTP ").concat(v.status, ")"), v.status); let E = d(await v.text(), v.status), T = null !== E && "object" == typeof E && "success" in E; if (!v.ok) {
            var b;
            let t, e = T ? void 0 : function (t) { let e = null == t ? void 0 : t.error; if (!e || "object" != typeof e)
                return; let { message: n, code: o } = e; if ("string" == typeof n && n.trim())
                return _object_spread({ message: n.trim() }, "string" == typeof o && o ? { code: o } : {}); }(E), n = T ? E.error || "Request failed with status ".concat(v.status) : null != (b = null == e ? void 0 : e.message) ? b : "Request failed with status ".concat(v.status);
            if (T && null !== E && "object" == typeof E) {
                let e = {};
                for (let t of (E.data && "object" == typeof E.data && !Array.isArray(E.data) && Object.assign(e, E.data), Object.keys(E)))
                    "success" !== t && "data" !== t && "error" !== t && (e[t] = E[t]);
                Object.keys(e).length > 0 && (t = e);
            }
            throw (0, o.yA)(n, v.status), new u(n, v.status, null == e ? void 0 : e.code, t);
        } if (T) {
            if (!E.success)
                throw (0, o.yA)(E.error, v.status), new u(E.error || "Request failed with status ".concat(v.status), v.status);
            return E.data;
        } return E; } async function F(t) { let e = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}, { body: n, params: r, headers: i, timeoutMs: s, transientRetry: c } = e, l = _object_without_properties(e, ["body", "params", "headers", "timeoutMs", "transientRetry"]); (0, a.iB)(l.method, t); let d = new Headers(i), f = await D(); f && d.set("Authorization", "Bearer ".concat(f)), M(d, t); let h = G(t, r), w = () => z(h, _object_spread_props(_object_spread({}, l), { headers: d, body: void 0 !== n ? JSON.stringify(n) : void 0 }), null != s ? s : 1e4, l.method, "string" == typeof t ? t : "", !1 !== c), p = await x(await w(), w, d); if (!p.ok) {
            let t = "Request failed with status ".concat(p.status);
            try {
                let e = await p.text(), n = JSON.parse(e);
                (null == n ? void 0 : n.error) && (t = n.error);
            }
            catch (t) { }
            throw (0, o.yA)(t, p.status), new u(t, p.status);
        } return p.blob(); } async function K(t) { var e, n; let r = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}, { body: i, params: s, headers: c, timeoutMs: l, transientRetry: f } = r, h = _object_without_properties(r, ["body", "params", "headers", "timeoutMs", "transientRetry"]); (0, a.iB)(h.method, t); let w = new Headers(c), p = await D(); p && w.set("Authorization", "Bearer ".concat(p)), M(w, t), void 0 === i || w.has("Content-Type") || w.set("Content-Type", "application/json"); let m = G(t, s), y = () => z(m, _object_spread_props(_object_spread({}, h), { headers: w, body: void 0 !== i ? JSON.stringify(i) : void 0 }), null != l ? l : 1e4, h.method, "string" == typeof t ? t : "", !1 !== f), v = await x(await y(), y, w), g = v.headers.get("content-type") || ""; if (!g.includes("application/json"))
            throw new u("Expected JSON response but received ".concat(g || "unknown content-type", " (HTTP ").concat(v.status, ")"), v.status); let E = d(await v.text(), v.status); if (!v.ok || !E.success)
            throw (0, o.yA)(E.error, v.status), new u(E.error || "Request failed with status ".concat(v.status), v.status); return { data: null != (e = E.data) ? e : [], meta: null != (n = E.meta) ? n : { page: 1, total: Array.isArray(E.data) ? E.data.length : 0 } }; } let X = { get: (t, e) => $(t, _object_spread_props(_object_spread({}, e), { method: "GET" })), getPage: (t, e) => K(t, _object_spread_props(_object_spread({}, e), { method: "GET" })), getBlob: (t, e) => F(t, _object_spread_props(_object_spread({}, e), { method: "GET" })), postBlob: (t, e, n) => F(t, _object_spread_props(_object_spread({}, n), { method: "POST", body: e })), post: (t, e, n) => $(t, _object_spread_props(_object_spread({}, n), { method: "POST", body: e })), postForm: (t, e, n) => $(t, _object_spread_props(_object_spread({}, n), { method: "POST", body: e })), put: (t, e, n) => $(t, _object_spread_props(_object_spread({}, n), { method: "PUT", body: e })), patch: (t, e, n) => $(t, _object_spread_props(_object_spread({}, n), { method: "PATCH", body: e })), delete: (t, e) => b && !S.test(t) ? Promise.reject(new u("子账户无删除权限，请使用主账号操作", 403, "SUB_ACCOUNT_NO_DELETE")) : $(t, _object_spread_props(_object_spread({}, e), { method: "DELETE" })) }; } }]);
