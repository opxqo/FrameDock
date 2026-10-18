"use strict";
function _define_property(obj, key, value) { if (key in obj) {
    Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true });
}
else {
    obj[key] = value;
} return obj; }
function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];
    for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
        }
    }
} return target; }; return _extends.apply(this, arguments); }
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
(self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([[5102], { 6775: (e, t, n) => { n.d(t, { A: () => r, _: () => o }); var a = n(98242); let s = { requestId: 0, campaignId: null }, i = new Set, r = { request(e) { for (let t of (s = { requestId: s.requestId + 1, campaignId: null != e ? e : null }, i))
                t(); }, subscribe: e => (i.add(e), () => { i.delete(e); }), getSnapshot: () => s }; function o() { return (0, a.useSyncExternalStore)(r.subscribe, r.getSnapshot, r.getSnapshot); } }, 6928: (e, t, n) => { n.d(t, { T: () => s, Z: () => i }); var a = n(88617); function s(e) { return a.FH.getPage("/api/v1/announcements", { params: e }); } async function i() { try {
            let e = await a.FH.get("/api/v1/announcements/latest-release");
            return null != e ? e : null;
        }
        catch (e) {
            return null;
        } } }, 8315: (e, t, n) => { n.d(t, { H7: () => v, JW: () => S, VR: () => l, Zc: () => k, _: () => m, cz: () => u, fs: () => d, hX: () => h, ij: () => b, kR: () => w, pz: () => c, x8: () => y, xl: () => p }); var a = n(15241); let s = "tokengo:share_task_prompted"; function i(e, t) { let { starts_at: n, ends_at: a } = e.campaign; return !(n && new Date(n).getTime() > t.getTime() || a && new Date(a).getTime() <= t.getTime()); } function r(e) { return null === e.remaining_claims || e.remaining_claims > 0; } function o(e) { return !e.read_only; } function l(e) { let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : new Date; return !!o(e) && "active" === e.campaign.status && !!i(e, t) && !!r(e) && null === e.mine; } let c = 3; function u(e) { if (!o(e))
            return !1; let t = e.mine; return !!t && "rejected" === t.status && "active" === e.campaign.status && t.resubmit_count < c; } function d(e) { let t = e.mine; return !!t && "rejected" === t.status && "active" === e.campaign.status && t.resubmit_count >= c; } function m(e) { let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : new Date; if (!o(e))
            return !1; let n = e.mine; return !!n && "expired" === n.status && "active" === e.campaign.status && !!i(e, t) && !!r(e) && n.claim_count < 3; } function h(e) { let t = e.mine; return !!t && "expired" === t.status && "active" === e.campaign.status && t.claim_count >= 3; } function p(e) { let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : new Date; if (!o(e))
            return !1; let n = e.mine; return !(!n || "claimed" !== n.status || n.claim_expires_at && new Date(n.claim_expires_at).getTime() <= t.getTime()); } function g(e) { let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : new Date; return l(e, t) || m(e, t) || u(e) || p(e, t); } let f = ["/admin", "/reseller"]; function v(e) { if (!e)
            return !1; let t = (0, a.a)(e); return f.some(e => t === e || t.startsWith("".concat(e, "/"))); } function w(e, t) { let n = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : new Date; if (!e || 0 === e.length)
            return null; for (let a of e)
            if (a.campaign.id !== t && g(a, n))
                return a; return null; } function k(e, t) { return !!e && !!(t && t.length > 0); } function b(e) { let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : new Date; return !!e && e.some(e => g(e, t)); } function y() { try {
            return window.sessionStorage.getItem(s);
        }
        catch (e) {
            return null;
        } } function S(e) { try {
            window.sessionStorage.setItem(s, e);
        }
        catch (e) { } } }, 15241: (e, t, n) => { n.d(t, { Cs: () => m, Pg: () => h, RG: () => u, Vk: () => g, a: () => r, fM: () => d, h4: () => s, k5: () => o, kT: () => p, s4: () => c, tk: () => l }); let a = /^\/[a-z]{2}(?:-[A-Z]{2})?(?=\/|$)/, s = !1, i = [{ id: "chat", href: "/chat", kind: "media", status: "production", matchPaths: ["/chat"], showInSidebar: !1, showInPalette: !1, showInAgentHub: !1 }, { id: "image", href: "/image", kind: "media", status: "production", matchPaths: ["/image"], showInSidebar: !1, showInPalette: !1, showInAgentHub: !1 }, { id: "video", href: "/video", kind: "media", status: "production", matchPaths: ["/video"], showInSidebar: !1, showInPalette: !1, showInAgentHub: !1 }, { id: "audio", href: "/audio", kind: "media", status: "production", matchPaths: ["/audio"], showInSidebar: !1, showInPalette: !1, showInAgentHub: !1 }, { id: "agent-hub", href: "/agents", kind: "hub", status: "production", matchPaths: ["/agents"], showInSidebar: !1, showInPalette: !1, showInAgentHub: !1 }, { id: "general-agent-chat", href: "/agents/chat", kind: "agent", status: "production", matchPaths: ["/agents/chat"], showInSidebar: !1, showInPalette: !1, showInAgentHub: !1 }, { id: "inspiration", href: "/inspiration", kind: "deep-route", status: "production", matchPaths: ["/inspiration"], showInSidebar: !1, showInPalette: !1, showInAgentHub: !1 }, { id: "ai-comic", href: "/agents/comic", kind: "agent", status: "production", matchPaths: ["/agents/comic"], showInSidebar: !0, showInPalette: !0, showInAgentHub: !0 }, { id: "infinite-canvas", href: "/agents/canvas-v2", kind: "agent", status: "production", matchPaths: ["/agents/canvas-v2", "/canvas-v2", "/canvas"], showInSidebar: !0, showInPalette: !0, showInAgentHub: !0 }, { id: "ecommerce-suite", href: "/agents/ecommerce", kind: "agent", status: "production", matchPaths: ["/agents/ecommerce"], showInSidebar: !0, showInPalette: !0, showInAgentHub: !0 }, { id: "ecommerce-suite-v3", href: "/agents/ecommerce-v3", kind: "agent", status: "production", matchPaths: ["/agents/ecommerce-v3"], showInSidebar: !0, showInPalette: !0, showInAgentHub: !1, collapseSidebarOnEnter: !0 }, { id: "doc-qa", href: "/agents/doc-qa", kind: "agent", status: "production", matchPaths: ["/agents/doc-qa"], showInSidebar: !1, showInPalette: !0, showInAgentHub: !0 }, { id: "ai-clip", href: "/clip", kind: "deep-route", status: "production", matchPaths: ["/clip"], showInSidebar: !0, showInPalette: !0, showInAgentHub: !0, maintenanceMessage: "未来即将开放，敬请期待", openSwitch: "clip_entry_enabled" }, { id: "ai-ppt", href: "/agents/ppt", kind: "agent", status: "production", matchPaths: ["/agents/ppt"], showInSidebar: !0, showInPalette: !0, showInAgentHub: !0 }, { id: "web-analyst", href: "/agents/web-analyst", kind: "agent", status: "production", matchPaths: ["/agents/web-analyst"], showInSidebar: !1, showInPalette: !0, showInAgentHub: !0 }, { id: "api-interface", href: "/api", kind: "deep-route", status: "blocked", blockedReason: "功能未开放，暂时隐藏", matchPaths: ["/api", "/developer-api"], showInSidebar: !1, showInPalette: !1, showInAgentHub: !1 }, { id: "openclaw", href: "/openclaw", kind: "deep-route", status: "blocked", blockedReason: "功能未开放，暂时隐藏", matchPaths: ["/openclaw"], showInSidebar: !1, showInPalette: !1, showInAgentHub: !1 }, { id: "smart-multiframe", href: "/agents/multiframe", kind: "agent", status: "production", matchPaths: ["/agents/multiframe", "/multiframe"], showInSidebar: !0, showInPalette: !0, showInAgentHub: !0 }, { id: "ai-remake", href: "/agents/remake", kind: "agent", status: "production", matchPaths: ["/agents/remake"], showInSidebar: !0, showInPalette: !0, showInAgentHub: !0 }, { id: "ai-digital-human", href: "/agents/digital-human", kind: "agent", status: "production", matchPaths: ["/agents/digital-human"], showInSidebar: !0, showInPalette: !0, showInAgentHub: !0 }, { id: "ai-motion-remake", href: "/agents/motion-remake", kind: "agent", status: "production", matchPaths: ["/agents/motion-remake"], showInSidebar: !0, showInPalette: !0, showInAgentHub: !0 }, { id: "ai-novel", href: "/agents/novel", kind: "agent", status: "blocked", blockedReason: "产品决定暂时隐藏入口，路由保留", matchPaths: ["/agents/novel"], showInSidebar: !1, showInPalette: !1, showInAgentHub: !1 }, { id: "vibeapp", href: "/vibeapp", kind: "deep-route", status: "production", matchPaths: ["/vibeapp"], showInSidebar: !0, showInPalette: !0, showInAgentHub: !1 }, { id: "ecommerce-customer-service", href: "/agents/ecommerce?fn=operations&mode=customer-service", kind: "agent", status: "production", matchPaths: ["/agents/ecommerce"], showInSidebar: !1, showInPalette: !0, showInAgentHub: !0 }, { id: "universal-image", href: "/image", kind: "media", status: "production", matchPaths: ["/image"], showInSidebar: !1, showInPalette: !0, showInAgentHub: !0 }, { id: "ai-comic-story", href: "/video", kind: "media", status: "production", matchPaths: ["/video"], showInSidebar: !1, showInPalette: !0, showInAgentHub: !0 }, { id: "ai-comic-narrated", href: "/audio", kind: "media", status: "production", matchPaths: ["/audio"], showInSidebar: !1, showInPalette: !0, showInAgentHub: !0 }, { id: "visual-identity", href: "/agents/visual-identity", kind: "agent", status: "blocked", matchPaths: ["/agents/visual-identity"], showInSidebar: !1, showInPalette: !1, showInAgentHub: !1, blockedReason: "BE-10 cutout capability remains vendor-blocked; 2026-06-01 user decision keeps this entry hidden." }, { id: "developer-api", href: "/developer-api", kind: "legacy-alias", status: "alias", matchPaths: ["/developer-api"], showInSidebar: !1, showInPalette: !1, showInAgentHub: !1, aliasOf: "api-interface" }]; function r(e) { let t = (e.split(/[?#]/, 1)[0] || "/").replace(a, "") || "/"; return t.endsWith("/") && "/" !== t ? t.slice(0, -1) : t; } function o(e) { return i.find(t => t.id === e); } function l(e) { var t; return null == (t = o(e)) ? void 0 : t.href; } function c(e, t) { let n = o(e); if ((null == n ? void 0 : n.maintenanceMessage) && (!n.openSwitch || !0 !== t[n.openSwitch]))
            return n.maintenanceMessage; } function u(e) { return i.some(t => !0 === t.collapseSidebarOnEnter && m(t, e)); } function d(e) { let t = o(e); return !!(t && "production" === t.status && t.showInAgentHub); } function m(e, t) { let n = r(t); return e.matchPaths.some(e => n === e || n.startsWith("".concat(e, "/"))); } function h(e) { return i.some(t => m(t, e)); } function p() { return i.filter(e => "production" === e.status && e.showInSidebar); } function g() { return i.filter(e => "production" === e.status && e.showInPalette); } }, 19483: (e, t, n) => { n.d(t, { j: () => r }); var a = n(47266), s = n(98242); let i = "(prefers-reduced-motion: reduce)"; function r() { let e, t, n = (0, a.c)(2), [r, l] = (0, s.useState)(o); return n[0] === Symbol.for("react.memo_cache_sentinel") ? (e = () => { var e, t, n; let a = null == (e = (t = window).matchMedia) ? void 0 : e.call(t, i); if (!a)
            return; let s = e => l(e.matches); return null == (n = a.addEventListener) || n.call(a, "change", s), () => { var e; return null == (e = a.removeEventListener) ? void 0 : e.call(a, "change", s); }; }, t = [], n[0] = e, n[1] = t) : (e = n[0], t = n[1]), (0, s.useEffect)(e, t), r; } function o() { var e, t, n; return null != (e = null == (t = (n = window).matchMedia) ? void 0 : t.call(n, i).matches) && e; } }, 21342: (e, t, n) => { n.d(t, { Bc: () => o, ZI: () => u, k$: () => c, m_: () => l }); var a = n(31434), s = n(47266); n(98242); var i = n(18527), r = n(27746); function o(e) { let t, n, r, o = (0, s.c)(6); o[0] !== e ? ({ delayDuration: n } = e, t = _object_without_properties(e, ["delayDuration"]), e, o[0] = e, o[1] = t, o[2] = n) : (t = o[1], n = o[2]); let l = void 0 === n ? 0 : n; return o[3] !== l || o[4] !== t ? (r = (0, a.jsx)(i.Kq, _object_spread({ "data-slot": "tooltip-provider", delayDuration: l }, t)), o[3] = l, o[4] = t, o[5] = r) : r = o[5], r; } function l(e) { let t, n, r = (0, s.c)(4); return r[0] !== e ? ({} = e, t = _extends({}, e), e, r[0] = e, r[1] = t) : t = r[1], r[2] !== t ? (n = (0, a.jsx)(i.bL, _object_spread({ "data-slot": "tooltip" }, t)), r[2] = t, r[3] = n) : n = r[3], n; } function c(e) { let t, n, r = (0, s.c)(4); return r[0] !== e ? ({} = e, t = _extends({}, e), e, r[0] = e, r[1] = t) : t = r[1], r[2] !== t ? (n = (0, a.jsx)(i.l9, _object_spread({ "data-slot": "tooltip-trigger" }, t)), r[2] = t, r[3] = n) : n = r[3], n; } function u(e) { let t, n, o, l, c, u, d = (0, s.c)(12); d[0] !== e ? ({ className: n, sideOffset: l, children: t } = e, o = _object_without_properties(e, ["className", "sideOffset", "children"]), e, d[0] = e, d[1] = t, d[2] = n, d[3] = o, d[4] = l) : (t = d[1], n = d[2], o = d[3], l = d[4]); let m = void 0 === l ? 0 : l; return d[5] !== n ? (c = (0, r.cn)("workspace-picker-surface z-50 w-fit origin-(--radix-tooltip-content-transform-origin) animate-in px-3 py-1.5 text-xs text-balance fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95", n), d[5] = n, d[6] = c) : c = d[6], d[7] !== t || d[8] !== o || d[9] !== m || d[10] !== c ? (u = (0, a.jsx)(i.ZL, { children: (0, a.jsx)(i.UC, _object_spread_props(_object_spread({ "data-slot": "tooltip-content", sideOffset: m, className: c }, o), { children: t })) }), d[7] = t, d[8] = o, d[9] = m, d[10] = c, d[11] = u) : u = d[11], u; } n(75253); }, 22978: (e, t, n) => { n.d(t, { BO: () => r, Ri: () => l, mi: () => i, t2: () => o }); var a = n(12752); let s = new RegExp("^/(".concat(a.IB.map(e => e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), ")(?=/|$)")), i = "omniforge:workspace-soft-navigate"; function r(e) { return e.replace(s, "") || "/"; } function o(e) { let t = r(e); return "/chat" === t || t.startsWith("/chat/") || "/image" === t || t.startsWith("/image/") || "/video" === t || t.startsWith("/video/") || "/audio" === t || t.startsWith("/audio/"); } function l(e) { var t, n; let a, l, c, u = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}, d = r(new URL(e, window.location.origin).pathname); if (!o(d) || !o(window.location.pathname))
            return !1; let m = (t = u.locale, a = new URL(e, window.location.origin), l = s.test(a.pathname), c = window.location.pathname.match(s), !l && ((null == c ? void 0 : c[1]) || t && "zh-CN" !== t) && (a.pathname = "/".concat((null == c ? void 0 : c[1]) || t).concat(a.pathname)), "".concat(a.pathname).concat(a.search).concat(a.hash)); if ("".concat(window.location.pathname).concat(window.location.search).concat(window.location.hash) !== m) {
            let e = null != (n = window.history.state) ? n : {};
            u.replace ? window.history.replaceState(e, "", m) : window.history.pushState(e, "", m);
        } return window.dispatchEvent(new CustomEvent(i, { detail: { pathname: d } })), !0; } }, 23498: (e, t, n) => { n.r(t), n.d(t, { performLogout: () => d, subscribeAuthBroadcast: () => m }); var a = n(13062), s = n(97082), i = n(71849), r = n(61370), o = n(31894); let l = "omniforge-auth", c = "u" > typeof crypto && "randomUUID" in crypto ? crypto.randomUUID() : "".concat(Date.now(), "-").concat(Math.random().toString(36).slice(2)); async function u() { let e; try {
            let t = await fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store" });
            t.ok && (e = (await t.json()).accessToken);
        }
        catch (e) { } if (e)
            try {
                await fetch("/api/v1/users/logout", { method: "POST", credentials: "same-origin", headers: { Authorization: "Bearer ".concat(e) } });
            }
            catch (e) { } } async function d() { let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {}, { callbackUrl: t = "/login", broadcast: n = !0, reason: d, revokeServerSessions: m = !d } = e; if (d) {
            var h;
            (0, r.reportClientError)({ error: "[involuntary-logout] reason=".concat(d), page: null == (h = window.location) ? void 0 : h.pathname });
        } if (m && await u(), n && "u" > typeof BroadcastChannel)
            try {
                let e = new BroadcastChannel(l);
                e.postMessage({ type: "signout", ts: Date.now(), from: c }), e.close();
            }
            catch (e) { } (0, o.cC)(), (0, o.$b)(), (0, s.yN)(), (0, i.zc)(); try {
            await (0, a.CI)({ callbackUrl: t, redirect: !1 });
        }
        catch (e) { } window.location.assign(t); } function m(e) { if ("u" < typeof BroadcastChannel)
            return () => { }; let t = null; try {
            (t = new BroadcastChannel(l)).onmessage = t => { var n, a; (null == (n = t.data) ? void 0 : n.type) === "signout" && (null == (a = t.data) ? void 0 : a.from) !== c && e(); };
        }
        catch (e) {
            return () => { };
        } return () => { null == t || t.close(); }; } }, 26212: (e, t, n) => { n.d(t, { CY: () => l, JW: () => c, PJ: () => o, _p: () => r, xP: () => i }); let a = "tokengo:checkin_prompted"; function s() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date); } function i(e, t) { return !!e && !!e.enabled && !e.checked_in_today && !t; } function r(e, t) { return !!e && !!(null == t ? void 0 : t.enabled); } function o(e) { return !!e && e.enabled && !e.checked_in_today; } function l() { try {
            return window.sessionStorage.getItem(a) === s();
        }
        catch (e) {
            return !1;
        } } function c() { try {
            window.sessionStorage.setItem(a, s());
        }
        catch (e) { } } }, 27022: (e, t, n) => { n.d(t, { o: () => o }); var a = n(31434), s = n(47266), i = n(98242); let r = ["var(--color-primary)", "var(--color-accent-gold)", "var(--color-accent-cyan)", "var(--color-accent-rose)", "var(--color-success)"]; function o(e) { let t, n, o, c, u, d, m, h = (0, s.c)(15), { fire: p, reducedMotion: g, pieceCount: f, fallDistance: v } = e, w = void 0 === f ? 38 : f, k = void 0 === v ? 330 : v; h[0] === Symbol.for("react.memo_cache_sentinel") ? (t = [], h[0] = t) : t = h[0]; let [b, y] = (0, i.useState)(t), S = (0, i.useRef)(!1), I = (0, i.useRef)(0); return (h[1] !== k || h[2] !== p || h[3] !== w || h[4] !== g ? (n = () => { if (!p) {
            S.current = !1, y([]);
            return;
        } if (g || S.current)
            return; S.current = !0; let e = 0, t = []; for (let n = 0; n < w; n += 1) {
            let a = n % 5 == 0, s = a ? 5 + 3 * Math.random() : 3 + 4 * Math.random(), i = a ? s : 8 + 8 * Math.random(), o = 1500 + 1100 * Math.random(), l = 320 * Math.random();
            e = Math.max(e, o + l), t.push({ id: n, style: { "--ck-x": "".concat((100 * Math.random()).toFixed(1), "%"), "--ck-w": "".concat(s.toFixed(1), "px"), "--ck-h": "".concat(i.toFixed(1), "px"), "--ck-br": a ? "50%" : "1px", "--ck-c": r[n % r.length], "--ck-dx": "".concat((120 * Math.random() - 60).toFixed(0), "px"), "--ck-dy": "".concat((k + 110 * Math.random()).toFixed(0), "px"), "--ck-rot": "".concat((900 * Math.random() - 450).toFixed(0), "deg"), "--ck-dur": "".concat(o.toFixed(0), "ms"), "--ck-delay": "".concat(l.toFixed(0), "ms") } });
        } I.current = e + 250, y(t); }, o = [p, g, w, k], h[1] = k, h[2] = p, h[3] = w, h[4] = g, h[5] = n, h[6] = o) : (n = h[5], o = h[6]), (0, i.useEffect)(n, o), h[7] !== b.length ? (c = () => { if (0 === b.length)
            return; let e = setTimeout(() => y([]), I.current); return () => clearTimeout(e); }, h[7] = b.length, h[8] = c) : c = h[8], h[9] !== b ? (u = [b], h[9] = b, h[10] = u) : u = h[10], (0, i.useEffect)(c, u), 0 === b.length) ? null : (h[11] !== b ? (d = b.map(l), h[11] = b, h[12] = d) : d = h[12], h[13] !== d ? (m = (0, a.jsx)("div", { "aria-hidden": !0, className: "checkin-confetti", "data-testid": "checkin-confetti", children: d }), h[13] = d, h[14] = m) : m = h[14], m); } function l(e) { return (0, a.jsx)("i", { style: e.style }, e.id); } }, 27157: (e, t, n) => { n.d(t, { D: () => o }); var a = n(47266), s = n(10408), i = n(69112), r = n(94599); function o(e) { let t, n = (0, a.c)(2); return n[0] !== e ? (t = { queryKey: r.dJ, queryFn: l, enabled: e, staleTime: 18e5, gcTime: 36e5, retry: 1, refetchOnWindowFocus: !1 }, n[0] = e, n[1] = t) : t = n[1], (0, s.I)(t); } function l() { return i.u.listCampaigns(); } }, 31894: (e, t, n) => { n.d(t, { $b: () => c, Z5: () => l, cC: () => o }); let a = ["omniforge-", "omniforge.", "omniforge:", "chat-store", "canvas-", "omf-canvas-", "sidebar-", "workflow-", "agent-", "tanstack-", "tokengo.", "tokengo:", "pending-ecom-tasks", "ecommerce-", "comic:", "route-pin:"], s = ["omniforge.chat.model.windows."], i = "omniforge.identity.uid"; function r(e, t) { let n = []; for (let a = 0; a < e.length; a += 1) {
            let s = e.key(a);
            s && t.some(e => s.startsWith(e)) && n.push(s);
        } for (let t of n)
            e.removeItem(t); return n.length; } function o() { let e = 0; try {
            e += r(localStorage, a);
        }
        catch (e) { } try {
            e += r(sessionStorage, s);
        }
        catch (e) { } return e; } function l(e) { if (!e)
            return !1; let t = null; try {
            t = localStorage.getItem(i);
        }
        catch (e) {
            return !1;
        } if (t === e)
            return !1; let n = null !== t && t !== e; n && o(); try {
            localStorage.setItem(i, e);
        }
        catch (e) { } return n; } function c() { try {
            localStorage.removeItem(i);
        }
        catch (e) { } } }, 33113: (e, t, n) => { n.d(t, { S_: () => p, V4: () => d, uj: () => v }); var a = n(47266), s = n(98242), i = n(55093), r = n(10408), o = n(82828), l = n(29168), c = n(79212), u = n(40991); let d = ["messages", "stats", "platform", "personal"], m = ["messages", "inbox", "platform", "personal"]; function h(e) { try {
            return BigInt(e || "0");
        }
        catch (e) {
            return BigInt(0);
        } } function p(e) { var t; let n, p, v, w = (0, a.c)(8), k = null == (t = null == e ? void 0 : e.enabled) || t, b = (0, o.c)("chat.topBarIcons.mailboxUi"), y = (0, i.jE)(), S = (0, s.useRef)(null), I = (0, s.useRef)(0); w[0] !== k ? (n = { queryKey: d, queryFn: f, enabled: k, staleTime: 3e4, refetchInterval: 6e4, refetchIntervalInBackground: !1, retry: !1 }, w[0] = k, w[1] = n) : n = w[1]; let { data: H } = (0, r.I)(n); w[2] !== H || w[3] !== k || w[4] !== y || w[5] !== b ? (p = () => { if (!k) {
            S.current = null, I.current = I.current + 1;
            return;
        } if (!H)
            return; let e = h(H.next_arrival_seq), t = S.current; if (S.current = e, null === t || e <= t)
            return; let n = I.current = I.current + 1; l.l.list({ limit: 5, scope_key: "platform", mailbox_kind: "personal" }).then(e => { if (n !== I.current)
            return; y.invalidateQueries({ queryKey: m }); let a = e.items.find(e => h(e.arrival_seq) > t && h(e.latest_attention_seq) > h(e.read_attention_seq)); a && function (e, t) { let n = function (e) { for (let t of e.rendered_blocks) {
            let e = t.title || t.body || t.text;
            if ("string" == typeof e && e.trim())
                return e.trim();
        } return null; }(e); if (n) {
            var a;
            let s;
            u.o["success" === (s = null == (a = e.rendered_blocks.find(e => "string" == typeof e.tone)) ? void 0 : a.tone) || "error" === s ? s : "info" === s || "action" === s ? "info" : e.type.includes("failed") || e.type.includes("rejected") ? "error" : "generation" === e.category && e.type.includes("completed") ? "success" : "info"](n, { durationMs: 1e4, action: { label: t, onClick: () => c.A.getState().openMailbox() } });
        } }(a, b("viewDetails")); }).catch(g); }, v = [H, k, y, b], w[2] = H, w[3] = k, w[4] = y, w[5] = b, w[6] = p, w[7] = v) : (p = w[6], v = w[7]), (0, s.useEffect)(p, v); } function g() { } function f() { return l.l.stats({ scope_key: "platform", mailbox_kind: "personal" }); } function v(e) { try {
            let t = JSON.parse(e);
            if ("platform" !== t.scope_key || "personal" !== t.mailbox_kind || "string" != typeof t.version || "string" != typeof t.next_arrival_seq || "string" != typeof t.next_attention_seq || "number" != typeof t.unread_count)
                return null;
            return { scope_key: t.scope_key, mailbox_kind: t.mailbox_kind, version: t.version, next_arrival_seq: t.next_arrival_seq, next_attention_seq: t.next_attention_seq, unread_count: t.unread_count };
        }
        catch (e) {
            return null;
        } } }, 47752: (e, t, n) => { n.d(t, { El: () => s, Mp: () => i, _W: () => a }); let a = ["checkin", "status"], s = ["checkin", "summary"], i = [["billing", "wallet"], ["billing", "transactions"]]; }, 60387: (e, t, n) => { n.d(t, { k: () => s }); var a = n(88617); let s = { getStatus: () => a.FH.get("/api/v1/checkin/status"), checkin: () => a.FH.post("/api/v1/checkin"), getSummary: e => a.FH.get("/api/v1/checkin/summary", { params: e ? { month: e } : void 0 }), getAdminConfig: () => a.FH.get("/api/v1/admin/checkin/config"), saveAdminConfig: e => a.FH.put("/api/v1/admin/checkin/config", e), cancelPendingConfig: e => a.FH.delete("/api/v1/admin/checkin/pending", { body: { reason: e } }), clearTestData: e => a.FH.delete("/api/v1/admin/checkin/test-data", { body: { reason: e } }), getResellerPolicy: () => a.FH.get("/api/v1/admin/checkin/reseller-policy"), saveResellerPolicy: e => a.FH.put("/api/v1/admin/checkin/reseller-policy", e), listResellerConfigs(e) { var t; let n = new URLSearchParams; (null == e || null == (t = e.q) ? void 0 : t.trim()) && n.set("q", e.q.trim()), (null == e ? void 0 : e.limit) && n.set("limit", String(e.limit)), (null == e ? void 0 : e.offset) && n.set("offset", String(e.offset)); let s = n.toString() ? "?".concat(n) : ""; return a.FH.get("/api/v1/admin/checkin/resellers".concat(s)); }, adminSaveResellerConfig: (e, t) => a.FH.put("/api/v1/admin/checkin/resellers/".concat(e), t), getSelfResellerConfig: () => a.FH.get("/api/v1/reseller/checkin/config"), saveSelfResellerConfig: e => a.FH.put("/api/v1/reseller/checkin/config", e), switchSelfFundingMode: e => a.FH.put("/api/v1/reseller/checkin/funding-mode", e), fundSelfPool: e => a.FH.post("/api/v1/reseller/checkin/pool/fund", { amount_micro_usd: e }) }; }, 69112: (e, t, n) => { n.d(t, { u: () => i }); var a = n(88617); function s(e) { let t = new URLSearchParams; for (let [n, a] of Object.entries(e))
            void 0 !== a && "" !== a && t.set(n, String(a)); let n = t.toString(); return n ? "?".concat(n) : ""; } let i = { async listCampaigns() { var e; return null != (e = (await a.FH.get("/api/v1/share-tasks")).campaigns) ? e : []; }, getCampaign: e => a.FH.get("/api/v1/share-tasks/".concat(e)), claim: e => a.FH.post("/api/v1/share-tasks/".concat(e, "/claim")), submit: (e, t) => a.FH.post("/api/v1/share-tasks/".concat(e, "/submit"), t), async listMine() { var e; return null != (e = (await a.FH.get("/api/v1/share-tasks/mine")).submissions) ? e : []; }, requestBonus: (e, t) => a.FH.post("/api/v1/share-tasks/submissions/".concat(e, "/bonus"), t), async getDouyinAccount() { var e; return null != (e = (await a.FH.get("/api/v1/share-tasks/douyin-account")).account) ? e : null; }, resellerGetPolicy: () => a.FH.get("/api/v1/reseller/share-tasks/policy"), async resellerListTemplates() { var e; return null != (e = (await a.FH.get("/api/v1/reseller/share-tasks/templates")).templates) ? e : []; }, resellerCreateTemplate: e => a.FH.post("/api/v1/reseller/share-tasks/templates", e), resellerDeleteTemplate: e => a.FH.delete("/api/v1/reseller/share-tasks/templates/".concat(e)), async resellerListCampaigns(e) { var t; return null != (t = (await a.FH.get("/api/v1/reseller/share-tasks".concat(s({ status: e })))).campaigns) ? t : []; }, resellerGetCampaign: e => a.FH.get("/api/v1/reseller/share-tasks/".concat(e)), resellerCreateCampaign: e => a.FH.post("/api/v1/reseller/share-tasks", e), resellerUpdateCampaign: (e, t) => a.FH.put("/api/v1/reseller/share-tasks/".concat(e), t), resellerFundCampaign: (e, t) => a.FH.post("/api/v1/reseller/share-tasks/".concat(e, "/fund"), { amount_micro_usd: t }), resellerDeleteCampaign: e => a.FH.delete("/api/v1/reseller/share-tasks/".concat(e)), resellerSetStatus: (e, t, n) => a.FH.post("/api/v1/reseller/share-tasks/".concat(e, "/status"), { status: t, reason: n }), async resellerListSubmissions(e) { var t; let n = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}; return null != (t = (await a.FH.get("/api/v1/reseller/share-tasks/".concat(e, "/submissions").concat(s(n)))).submissions) ? t : []; }, resellerDecideSubmission: (e, t) => a.FH.post("/api/v1/reseller/share-tasks/submissions/".concat(e, "/decide"), t), resellerReleaseSubmission: e => a.FH.post("/api/v1/reseller/share-tasks/submissions/".concat(e, "/release")), resellerRevokeSubmission: (e, t) => a.FH.post("/api/v1/reseller/share-tasks/submissions/".concat(e, "/revoke"), { reason: t }), async resellerListBonusClaims(e) { var t; return null != (t = (await a.FH.get("/api/v1/reseller/share-tasks/bonus-claims".concat(s({ status: e })))).bonus_claims) ? t : []; }, resellerDecideBonusClaim: (e, t) => a.FH.post("/api/v1/reseller/share-tasks/bonus-claims/".concat(e, "/decide"), t), resellerGetStats: e => a.FH.get("/api/v1/reseller/share-tasks/".concat(e, "/stats")), adminGetPolicy: () => a.FH.get("/api/v1/admin/share-tasks/policy"), adminSavePolicy: e => a.FH.put("/api/v1/admin/share-tasks/policy", e), adminGetStats: () => a.FH.get("/api/v1/admin/share-tasks/stats"), async adminListTemplates() { var e; return null != (e = (await a.FH.get("/api/v1/admin/share-tasks/templates")).templates) ? e : []; }, adminCreateTemplate: e => a.FH.post("/api/v1/admin/share-tasks/templates", e), adminSetTemplateStatus: (e, t) => a.FH.post("/api/v1/admin/share-tasks/templates/".concat(e, "/status"), { status: t }), adminPinTemplate: (e, t) => a.FH.post("/api/v1/admin/share-tasks/templates/".concat(e, "/pin"), { pinned: t }), adminDeleteTemplate: e => a.FH.delete("/api/v1/admin/share-tasks/templates/".concat(e)), async adminListCampaigns() { var e; let t = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {}; return null != (e = (await a.FH.get("/api/v1/admin/share-tasks".concat(s(t)))).campaigns) ? e : []; }, adminGetCampaign: e => a.FH.get("/api/v1/admin/share-tasks/".concat(e)), adminCreateCampaign: e => a.FH.post("/api/v1/admin/share-tasks", e), adminUpdateCampaign: (e, t) => a.FH.put("/api/v1/admin/share-tasks/".concat(e), t), adminDeleteCampaign: e => a.FH.delete("/api/v1/admin/share-tasks/".concat(e)), adminSetStatus: (e, t, n) => a.FH.post("/api/v1/admin/share-tasks/".concat(e, "/status"), { status: t, reason: n }), adminLockCampaign: (e, t) => a.FH.post("/api/v1/admin/share-tasks/".concat(e, "/lock"), { reason: t }), adminUnlockCampaign: (e, t) => a.FH.post("/api/v1/admin/share-tasks/".concat(e, "/unlock"), { reason: t }), async adminListSubmissions() { var e; let t = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {}; return null != (e = (await a.FH.get("/api/v1/admin/share-tasks/submissions".concat(s(t)))).submissions) ? e : []; }, adminDecideSubmission: (e, t) => a.FH.post("/api/v1/admin/share-tasks/submissions/".concat(e, "/decide"), t), adminRevokeSubmission: (e, t) => a.FH.post("/api/v1/admin/share-tasks/submissions/".concat(e, "/revoke"), { reason: t }), adminReleaseSubmission: e => a.FH.post("/api/v1/admin/share-tasks/submissions/".concat(e, "/release")), async adminListBonusClaims(e) { var t; return null != (t = (await a.FH.get("/api/v1/admin/share-tasks/bonus-claims".concat(s({ status: e })))).bonus_claims) ? t : []; }, adminDecideBonusClaim: (e, t) => a.FH.post("/api/v1/admin/share-tasks/bonus-claims/".concat(e, "/decide"), t), adminUnbindDouyinAccount: e => a.FH.delete("/api/v1/admin/share-tasks/douyin-accounts/".concat(e)) }; }, 71849: (e, t, n) => { n.d(t, { $n: () => l, FR: () => N, GI: () => C, JS: () => O, Jy: () => F, NQ: () => H, WS: () => g, dQ: () => I, ee: () => o, gF: () => b, gR: () => R, ix: () => W, kT: () => c, xP: () => v, yN: () => u, zc: () => f }); var a = n(47266), s = n(98242), i = n(10408), r = n(6928); let o = "tokengo:seen_release_id", l = ["release-announcement", "latest"], c = 420, u = { RELEASE: 10, RESELLER_RELEASE: 20, LOGIN_COMPLIANCE: 30, ONBOARDING: 35, PLATFORM_NEWS: 40, INSTALL_REWARD: 45, CHECKIN: 50, SHARE_TASK: 55 }, d = "tokengo:auto_overlay_slot", m = null; function h() { try {
            var e;
            return null != (e = window.sessionStorage.getItem(d)) ? e : m;
        }
        catch (e) {
            return m;
        } } function p(e, t, n) { return t || null === n || n === e; } function g(e) { let t = h(); if (null !== t && t !== e)
            return !1; if (t === e)
            return !0; m = e; try {
            window.sessionStorage.setItem(d, e);
        }
        catch (e) { } return q += 1, L(), !0; } function f() { m = null; try {
            window.sessionStorage.removeItem(d);
        }
        catch (e) { } q += 1, L(); } function v() { return (0, s.useSyncExternalStore)(M, h, w); } function w() { return null; } let k = new Set; function b() { k.forEach(e => e()); } let y = !1, S = !1; function I() { y = !0, b(); } function H() { y = !1, b(); } function _() { return y; } function P() { return !1; } function x() { return S; } function F(e) { S !== e && (S = e, b()); } function C() { return (0, s.useSyncExternalStore)(A, x, P); } function A(e) { return k.add(e), () => { k.delete(e); }; } function E() { return null; } function R(e) { let t, n = (0, a.c)(2); n[0] !== e ? (t = () => (function (e) { try {
            return window.localStorage.getItem(e);
        }
        catch (e) {
            return null;
        } })(e), n[0] = e, n[1] = t) : t = n[1]; let i = t; return (0, s.useSyncExternalStore)(A, i, E); } let T = new Map, D = new Set, q = 0; function L() { D.forEach(e => e()); } function N(e, t) { let n = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : u.RELEASE, a = arguments.length > 3 && void 0 !== arguments[3] && arguments[3], s = T.get(e); t ? T.set(e, { priority: n, slotExempt: a }) : T.delete(e); let i = T.get(e); ((null == s ? void 0 : s.priority) !== (null == i ? void 0 : i.priority) || (null == s ? void 0 : s.slotExempt) !== (null == i ? void 0 : i.slotExempt)) && (q += 1, L()); } function M(e) { return D.add(e), () => { D.delete(e); }; } function j() { return q; } function B() { return 0; } function O(e, t) { var n; let c, u = (0, a.c)(2), d = void 0 === t ? {} : t; u[0] !== e ? (c = { queryKey: l, queryFn: r.Z, enabled: e, staleTime: 3e5, gcTime: 18e5, retry: 1, refetchOnWindowFocus: !1 }, u[0] = e, u[1] = c) : c = u[1]; let { data: m, isPending: h, isError: g } = (0, i.I)(c), f = R(o), w = ((0, s.useSyncExternalStore)(M, j, B), (0, s.useSyncExternalStore)(A, _, P)), k = C(), b = v(), y = d.ownKey, S = null != (n = d.priority) ? n : 1 / 0, I = Array.from(T).some(e => { let [t, n] = e; return t !== y && n.priority < S && p(t, n.slotExempt, b); }); return !e || (void 0 === y || !!p(y, !0 === d.slotExempt, b)) && !I && !w && (!!k || !h && (!!g || !m || f === m.id)); } function W(e) { let t, n = (0, a.c)(2); n[0] !== e ? (t = { queryKey: l, queryFn: r.Z, enabled: e, staleTime: 3e5, gcTime: 18e5, retry: 1, refetchOnWindowFocus: !1 }, n[0] = e, n[1] = t) : t = n[1]; let { data: c, isPending: u, isError: d } = (0, i.I)(t), m = R(o), h = (0, s.useSyncExternalStore)(A, _, P), p = C(); return !e || !h && (!!p || !u && (!!d || !c || m === c.id)); } }, 74797: (e, t, n) => { n.d(t, { v: () => c }); var a = n(31434), s = n(47266), i = n(98242), r = n(3506), o = n(10707), l = n(27746); function c(e) { let t, n, c, u, d, m, h, p, g = (0, s.c)(21), { value: f, display: v, copiedLabel: w, copyLabel: k, className: b } = e, y = void 0 === w ? "已复制" : w, [S, I] = (0, i.useState)(!1); g[0] !== f ? (t = async () => { try {
            await navigator.clipboard.writeText(f), I(!0), window.setTimeout(() => I(!1), 1600);
        }
        catch (e) { } }, g[0] = f, g[1] = t) : t = g[1]; let H = t; g[2] !== b ? (n = (0, l.cn)("group inline-flex items-center gap-1.5", b), g[2] = b, g[3] = n) : n = g[3]; let _ = null != v ? v : f; g[4] !== _ || g[5] !== f ? (c = (0, a.jsx)("span", { className: "font-mono text-xs text-muted-foreground", title: f, children: _ }), g[4] = _, g[5] = f, g[6] = c) : c = g[6]; let P = S ? y : void 0 === k ? "复制" : k; g[7] === Symbol.for("react.memo_cache_sentinel") ? (u = (0, l.cn)("inline-flex size-6 min-h-[24px] min-w-[24px] items-center justify-center rounded-lg border border-transparent text-muted-foreground/70 outline-none transition-colors duration-150", "hover:border-border hover:text-[color:var(--route-accent)]", "focus-visible:ring-2 focus-visible:ring-[color:var(--route-accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-background"), g[7] = u) : u = g[7], g[8] !== S ? (d = S ? (0, a.jsx)(r.A, { className: "size-3.5 text-success", "aria-hidden": "true" }) : (0, a.jsx)(o.A, { className: "size-3.5", "aria-hidden": "true" }), g[8] = S, g[9] = d) : d = g[9], g[10] !== H || g[11] !== P || g[12] !== d ? (m = (0, a.jsx)("button", { type: "button", onClick: H, "aria-label": P, className: u, children: d }), g[10] = H, g[11] = P, g[12] = d, g[13] = m) : m = g[13]; let x = S ? y : ""; return g[14] !== x ? (h = (0, a.jsx)("span", { "aria-live": "polite", className: "sr-only", children: x }), g[14] = x, g[15] = h) : h = g[15], g[16] !== m || g[17] !== h || g[18] !== n || g[19] !== c ? (p = (0, a.jsxs)("span", { className: n, children: [c, m, h] }), g[16] = m, g[17] = h, g[18] = n, g[19] = c, g[20] = p) : p = g[20], p; } }, 78578: (e, t, n) => { n.d(t, { CK: () => c, Rp: () => o, dQ: () => s, kg: () => r }); let a = { ease: "0.25, 0.1, 0.25, 1", "ease-in": "0.42, 0, 1, 1", "ease-out": "0, 0, 0.58, 1", "ease-in-out": "0.42, 0, 0.58, 1" }; function s(e) { let t = e.trim().match(/^(\d*\.?\d+)(ms|s)$/); if (!(null == t ? void 0 : t[1]))
            return null; let n = Number.parseFloat(t[1]); return "ms" === t[2] ? n / 1e3 : n; } function i(e, t) { var n, s; let i = e.trim(); if ("linear" === i)
            return "none"; let r = null != (n = null == (s = i.match(/^cubic-bezier\(([^)]+)\)$/)) ? void 0 : s[1]) ? n : a[i]; if (r) {
            let e = "skin-bezier-".concat(r.replace(/[^\d.]+/g, "_"));
            return t.create(e, r), e;
        } let o = i.match(/^steps\((\d+)(?:,\s*(?:end|jump-end))?\)$/); if (o) {
            let e = Number(o[1]);
            return t => t >= 1 ? 1 : Math.floor(t * e) / e;
        } return null; } function r(e) { if ("u" < typeof document)
            return { duration: null, ease: null }; let t = getComputedStyle(document.documentElement); return { duration: s(t.getPropertyValue("--skin-dur")), ease: i(t.getPropertyValue("--skin-ease"), e) }; } function o(e, t) { return null === e || t <= 0 ? 1 : e / t; } let l = { fast: .15, normal: .25, ease: "expo.out" }; function c(e) { var t, n, a, c, u; if ("u" < typeof document)
            return _object_spread({}, l); let d = getComputedStyle(document.documentElement), m = null != (t = s(d.getPropertyValue("--duration-fast"))) ? t : l.fast, h = null != (n = s(d.getPropertyValue("--duration-normal"))) ? n : l.normal, p = r(e); return { fast: m * o(p.duration, h), normal: null != (a = p.duration) ? a : h, ease: null != (c = null != (u = p.ease) ? u : i(d.getPropertyValue("--ease-out-expo"), e)) ? c : l.ease }; } }, 84129: (e, t, n) => { n.d(t, { n: () => o }); var a = n(47266), s = n(98242); let i = null, r = null; function o(e) { let t, o, u, d, m, h, p, g = (0, a.c)(10); g[0] !== e ? (t = void 0 === e ? {} : e, g[0] = e, g[1] = t) : t = g[1]; let { idle: f } = t, v = void 0 !== f && f, [w, k] = (0, s.useState)(c), b = (0, s.useRef)(!0); g[2] === Symbol.for("react.memo_cache_sentinel") ? (o = () => (b.current = !0, () => { b.current = !1; }), u = [], g[2] = o, g[3] = u) : (o = g[2], u = g[3]), (0, s.useEffect)(o, u), g[4] === Symbol.for("react.memo_cache_sentinel") ? (d = () => { (i ? Promise.resolve(i) : (null != r || (r = Promise.all([Promise.all([n.e(19701), n.e(34754)]).then(n.bind(n, 34754)), n.e(87187).then(n.bind(n, 87187))]).then(e => { let [{ gsap: t }, { CustomEase: n }] = e; return t.registerPlugin(n), i = { gsap: t, CustomEase: n }; }).catch(e => { throw r = null, e; })), r)).then(e => { b.current && k(e); }).catch(l); }, g[4] = d) : d = g[4]; let y = d; return g[5] !== v ? (m = () => { if (!v || i)
            return; let e = window; if (e.requestIdleCallback) {
            let t = e.requestIdleCallback(y, { timeout: 2e3 });
            return () => { var n; return null == (n = e.cancelIdleCallback) ? void 0 : n.call(e, t); };
        } let t = window.setTimeout(y, 2e3); return () => window.clearTimeout(t); }, h = [v, y], g[5] = v, g[6] = m, g[7] = h) : (m = g[6], h = g[7]), (0, s.useEffect)(m, h), g[8] !== w ? (p = { lib: w, prime: y }, g[8] = w, g[9] = p) : p = g[9], p; } function l() { } function c() { return i; } }, 90136: (e, t, n) => { n.d(t, { OZ: () => c, hg: () => u, sO: () => l }); var a = n(47266), s = n(98242), i = n(88617); let r = null, o = null; function l() { let e = Date.now(); return o && e - o.at < 1e4 ? Promise.resolve(o.value) : r || (r = (async () => { try {
            let e = await (0, i.Q2)(), t = new Headers;
            e && t.set("Authorization", "Bearer ".concat(e)), (0, i.qh)(t, "/api/v1/reseller/status");
            let n = await fetch("/api/v1/reseller/status", { credentials: "include", headers: t });
            if (!n.ok)
                return null;
            let a = await n.json();
            return o = { value: a, at: Date.now() }, a;
        }
        catch (e) {
            return null;
        }
        finally {
            r = null;
        } })()); } function c() { o = null; } function u(e) { var t, n; let i, r, o, c, u = (0, a.c)(8), d = void 0 === e || e; u[0] === Symbol.for("react.memo_cache_sentinel") ? (i = { data: null, resolved: !1 }, u[0] = i) : i = u[0]; let [m, h] = (0, s.useState)(i); u[1] !== d ? (r = () => { if (!d)
            return; let e = !1; return l().then(t => { var n; e || h({ data: null != (n = null == t ? void 0 : t.data) ? n : null, resolved: !0 }); }), () => { e = !0; }; }, o = [d], u[1] = d, u[2] = r, u[3] = o) : (r = u[2], o = u[3]), (0, s.useEffect)(r, o); let p = !!(null == (t = m.data) ? void 0 : t.is_reseller) || (null == (n = m.data) ? void 0 : n.status) === "active"; return u[4] !== m.data || u[5] !== m.resolved || u[6] !== p ? (c = { data: m.data, resolved: m.resolved, isReseller: p }, u[4] = m.data, u[5] = m.resolved, u[6] = p, u[7] = c) : c = u[7], c; } }, 90551: (e, t, n) => { n.d(t, { KQ: () => i, Uv: () => r, ZH: () => o }); var a = n(74201); let s = { query: "", expandedSlug: null, previewStep: null }, i = (0, a.v)(e => _object_spread_props(_object_spread({ open: !1 }, s), { openHelp: () => e(_object_spread({ open: !0 }, s)), close: () => e(_object_spread({ open: !1 }, s)), toggle: () => e(e => _object_spread({ open: !e.open }, s)), setQuery: t => e({ query: t, expandedSlug: null }), toggleEntry: t => e(e => ({ expandedSlug: e.expandedSlug === t ? null : t })), setPreviewStep: t => e({ previewStep: t }) })), r = "tokengo:open-help-center"; function o() { i.getState().openHelp(); } }, 94599: (e, t, n) => { n.d(t, { AE: () => u, L5: () => p, N4: () => s, Pq: () => g, Rg: () => l, WP: () => d, c1: () => h, dJ: () => a, fE: () => i, fQ: () => m, g9: () => v, hR: () => o, o2: () => r, oZ: () => f, sF: () => c }); let a = ["share-tasks", "campaigns"], s = ["share-tasks", "submissions", "mine"], i = ["share-tasks", "account"], r = ["reseller", "share-tasks", "campaigns"], o = ["reseller", "share-tasks", "policy"]; function l(e) { return [...r, e, "stats"]; } let c = ["reseller", "share-tasks", "submissions"], u = ["reseller", "share-tasks", "bonus-claims"], d = ["reseller", "share-tasks", "templates"], m = ["admin", "share-tasks", "templates"], h = [m, d], p = ["admin", "share-tasks", "submissions"], g = ["admin", "share-tasks", "campaigns"], f = ["admin", "share-tasks", "policy"], v = [["billing", "wallet"], ["billing", "transactions"]]; }, 97082: (e, t, n) => { function a(e) { return Math.floor((e.getTime() - 6e4 * e.getTimezoneOffset()) / 864e5); } function s(e) { let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : Date.now(), n = function (e) { let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : Date.now(); if (!e)
            return null; let n = new Date(e); return Number.isNaN(n.getTime()) ? null : a(new Date(t)) - a(n); }(e, t); return null !== n && n < 1; } n.d(t, { Nf: () => s, e_: () => r, yK: () => o, yN: () => l }); let i = "tokengo:guide_nudge_prompted"; function r() { try {
            return "1" === window.sessionStorage.getItem(i);
        }
        catch (e) {
            return !1;
        } } function o() { try {
            window.sessionStorage.setItem(i, "1");
        }
        catch (e) { } } function l() { try {
            window.sessionStorage.removeItem(i);
        }
        catch (e) { } } } }]);
