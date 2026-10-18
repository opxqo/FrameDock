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
(self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([[14184], { 1558: (e, t, r) => {
            "use strict";
            r.d(t, { KF: () => s, hM: () => n, jz: () => l, o3: () => a });
            let a = ["today", "yesterday", "last7", "last30", "thisMonth", "lastMonth", "all"];
            function n(e) { let t = e => String(e).padStart(2, "0"); return "".concat(e.getFullYear(), "-").concat(t(e.getMonth() + 1), "-").concat(t(e.getDate())); }
            function l(e) { let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : new Date, r = t.getFullYear(), a = t.getMonth(), l = t.getDate(), s = e => n(new Date(r, a, l + e)); switch (e) {
                case "today": return { from: s(0), to: s(0) };
                case "yesterday": return { from: s(-1), to: s(-1) };
                case "last7": return { from: s(-6), to: s(0) };
                case "last30": return { from: s(-29), to: s(0) };
                case "thisMonth": return { from: n(new Date(r, a, 1)), to: s(0) };
                case "lastMonth": return { from: n(new Date(r, a - 1, 1)), to: n(new Date(r, a, 0)) };
                case "all": return { from: "", to: "" };
            } }
            function s(e, t) { let r = (e, t) => { let r = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e); if (!r)
                return; let [, a, n, l] = r; return (t ? new Date(Number(a), Number(n) - 1, Number(l), 23, 59, 59, 999) : new Date(Number(a), Number(n) - 1, Number(l), 0, 0, 0, 0)).toISOString(); }; return { start_at: r(e, !1), end_at: r(t, !0) }; }
        }, 1916: (e, t, r) => {
            "use strict";
            r.d(t, { oi: () => d, tQ: () => o });
            var a = r(47266), n = r(10408), l = r(12836), s = r(69939);
            function i(e) { return "error" === e.state.status && 2e4; }
            function o(e, t) { var r; let o, d, m, p = (0, a.c)(8), g = null != e ? e : "all"; p[0] !== g ? (o = ["logical-models", g], p[0] = g, p[1] = o) : o = p[1], p[2] !== e ? (d = () => (0, l.T9)(e), p[2] = e, p[3] = d) : d = p[3]; let h = null == (r = null == t ? void 0 : t.enabled) || r; return p[4] !== o || p[5] !== d || p[6] !== h ? (m = { queryKey: o, queryFn: d, staleTime: 3e4, placeholderData: c, select: s.GI, retry: 4, retryDelay: u, refetchInterval: i, refetchOnReconnect: !0, enabled: h }, p[4] = o, p[5] = d, p[6] = h, p[7] = m) : m = p[7], (0, n.I)(m); }
            function u(e) { return Math.min(1e3 * 2 ** e, 8e3); }
            function c(e) { return e; }
            function d(e, t) { if (t)
                return e.find(e => e.id === t); }
        }, 2552: (e, t, r) => {
            "use strict";
            r.d(t, { S$: () => c, Sr: () => d, oG: () => s, qU: () => n, vy: () => l, xb: () => i });
            var a = r(69939);
            let n = ["", "chat", "image", "video", "audio"], l = "__other__";
            function s(e) { var t, r; return null != (t = null != (r = e.category) ? r : e.type) ? t : "chat"; }
            function i(e) { var t; return null != (t = (0, a.T5)(e.id)) ? t : l; }
            function o(e, t) { var r; let a = new Map; for (let n of e)
                a.set(t(n), (null != (r = a.get(t(n))) ? r : 0) + 1); return [...a.entries()].map(e => { let [t, r] = e; return { value: t, count: r }; }).sort((e, t) => t.count - e.count || e.value.localeCompare(t.value)); }
            function u(e) { return e.trim().toLowerCase(); }
            function c(e, t, r) { var a, n; let l, c = t.query.trim().toLowerCase(), d = c ? e.filter(e => [e.id, e.public_id, e.display_name, e.display_name_zh, e.display_name_en, e.description, e.description_zh, e.description_en].filter(Boolean).join(" ").toLowerCase().includes(c)) : [...e], m = e => !t.task || s(e) === t.task, p = o(d.filter(m), i).map(e => _object_spread_props(_object_spread({}, e), { label: r(e.value) })), g = function (e, t) { let r = u(e); if (!r)
                return null; let a = t.filter(e => u(e.label) === r), n = a.length ? a : t.filter(e => u(e.label).includes(r)); return { term: e.trim(), keys: new Set(n.map(e => e.value)), matched: n }; }(t.brandTerm, p), h = e => null === g || g.keys.has(i(e)), f = (a = d.filter(e => m(e) && h(e)), n = t.sort, l = [...a], "name" === n ? l.sort((e, t) => (e.display_name || e.id).localeCompare(t.display_name || t.id)) : l); return { items: f, taskFacets: o(d.filter(h), s), brandFacets: p, brandMatch: g, brandCount: new Set(f.map(i)).size }; }
            function d(e, t) { var r, a; let n = null == e ? void 0 : e.trim(); return !n || n.length > 128 ? null : null != (r = null == (a = t.find(e => e.id === n || e.public_id === n)) ? void 0 : a.id) ? r : null; }
        }, 10408: (e, t, r) => {
            "use strict";
            r.d(t, { I: () => l });
            var a = r(59719), n = r(23831);
            function l(e, t) { return (0, n.t)(e, a.$, t); }
        }, 14718: (e, t, r) => {
            "use strict";
            r.d(t, { A: () => i });
            var a = r(98242), n = r(27540);
            let l = e => { let t = e.replace(/^([A-Z])|[\s-_]+(\w)/g, (e, t, r) => r ? r.toUpperCase() : t.toLowerCase()); return t.charAt(0).toUpperCase() + t.slice(1); };
            var s = r(95766);
            let i = (e, t) => { let r = (0, a.forwardRef)((r, i) => { let { className: o } = r, u = _object_without_properties(r, ["className"]); return (0, a.createElement)(s.default, _object_spread({ ref: i, iconNode: t, className: (0, n.z)("lucide-".concat(l(e).replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()), "lucide-".concat(e), o) }, u)); }); return r.displayName = l(e), r; };
        }, 17047: (e, t, r) => {
            "use strict";
            r.d(t, { J: () => u });
            var a = r(31434), n = r(47266), l = r(18195), s = r(27978), i = r(69939);
            let o = 20 / 36;
            function u(e) { let t, r = (0, n.c)(5), { modelId: u, size: c } = e, d = void 0 === c ? 36 : c; if (r[0] !== u || r[1] !== d) {
                let e, n = (0, i.Fs)(u, s.T_), c = Math.round(d * o);
                r[3] !== d ? (e = { width: d, height: d }, r[3] = d, r[4] = e) : e = r[4], t = (0, a.jsx)("span", { "aria-hidden": !0, "data-testid": "model-card-icon", style: e, className: "grid shrink-0 place-items-center overflow-hidden rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--color-foreground)_7%,transparent)]", children: n ? (0, a.jsx)("img", { src: n, alt: "", loading: "lazy", decoding: "async", "data-light-invert-icon": (0, i.$A)(n) ? "true" : void 0, style: { width: c, height: c }, className: "object-contain" }) : (0, a.jsx)(l.A, { style: { width: Math.round(.8 * c), height: Math.round(.8 * c) }, className: "text-muted-foreground" }) }), r[0] = u, r[1] = d, r[2] = t;
            }
            else
                t = r[2]; return t; }
        }, 17330: (e, t, r) => {
            "use strict";
            r.d(t, { A: () => a });
            let a = (0, r(14718).A)("download", [["path", { d: "M12 15V3", key: "m9g1x1" }], ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }], ["path", { d: "m7 10 5 5 5-5", key: "brsn70" }]]);
        }, 18195: (e, t, r) => {
            "use strict";
            r.d(t, { A: () => a });
            let a = (0, r(14718).A)("bot", [["path", { d: "M12 8V4H8", key: "hb8ula" }], ["rect", { width: "16", height: "12", x: "4", y: "8", rx: "2", key: "enze0r" }], ["path", { d: "M2 14h2", key: "vft8re" }], ["path", { d: "M20 14h2", key: "4cs60a" }], ["path", { d: "M15 13v2", key: "1xurst" }], ["path", { d: "M9 13v2", key: "rq6x2g" }]]);
        }, 18715: (e, t, r) => {
            "use strict";
            r.d(t, { A: () => a });
            let a = (0, r(14718).A)("boxes", [["path", { d: "M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z", key: "lc1i9w" }], ["path", { d: "m7 16.5-4.74-2.85", key: "1o9zyk" }], ["path", { d: "m7 16.5 5-3", key: "va8pkn" }], ["path", { d: "M7 16.5v5.17", key: "jnp8gn" }], ["path", { d: "M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z", key: "8zsnat" }], ["path", { d: "m17 16.5-5-3", key: "8arw3v" }], ["path", { d: "m17 16.5 4.74-2.85", key: "8rfmw" }], ["path", { d: "M17 16.5v5.17", key: "k6z78m" }], ["path", { d: "M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z", key: "1xygjf" }], ["path", { d: "M12 8 7.26 5.15", key: "1vbdud" }], ["path", { d: "m12 8 4.74-2.85", key: "3rx089" }], ["path", { d: "M12 13.5V8", key: "1io7kd" }]]);
        }, 27540: (e, t, r) => {
            "use strict";
            r.d(t, { z: () => a });
            let a = function () { for (var e = arguments.length, t = Array(e), r = 0; r < e; r++)
                t[r] = arguments[r]; return t.filter((e, t, r) => !!e && "" !== e.trim() && r.indexOf(e) === t).join(" ").trim(); };
        }, 27746: (e, t, r) => {
            "use strict";
            r.d(t, { cn: () => l });
            var a = r(40726), n = r(55485);
            function l() { for (var e = arguments.length, t = Array(e), r = 0; r < e; r++)
                t[r] = arguments[r]; return (0, n.QP)((0, a.$)(t)); }
        }, 27978: (e, t, r) => {
            "use strict";
            r.d(t, { T_: () => d });
            var a, n, l, s, i = r(47738);
            let o = "TokenGo", u = null != (a = i.env.NEXT_PUBLIC_APP_ROOT_DOMAIN) ? a : "token6688.com", c = null != (n = i.env.NEXT_PUBLIC_APP_URL) ? n : "https://".concat(u), d = "/brand/logo-mark-192.webp";
            ({ name: o, rootDomain: u, appURL: c, apiURL: "", emailFromName: o, emailFromAddress: null != (l = i.env.NEXT_PUBLIC_EMAIL_FROM) ? l : "noreply@tokengo.love", supportHandle: null != (s = i.env.NEXT_PUBLIC_SUPPORT_HANDLE) ? s : "@".concat(o, "Support"), communityCode: "".concat(o, "-Community"), copyright: "© ".concat(new Date().getFullYear(), " ").concat(o) }).name;
        }, 29693: (e, t, r) => {
            "use strict";
            r.d(t, { A: () => a });
            let a = (0, r(14718).A)("chart-pie", [["path", { d: "M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z", key: "pzmjnu" }], ["path", { d: "M21.21 15.89A10 10 0 1 1 8 2.83", key: "k2fpak" }]]);
        }, 38693: (e, t, r) => {
            "use strict";
            r.d(t, { I: () => l });
            var a = r(31434), n = r(47266);
            function l(e) { let t, r, l = (0, n.c)(10), { value: s, options: i, onChange: o, label: u } = e; if (l[0] !== o || l[1] !== i || l[2] !== s) {
                let e;
                l[4] !== o || l[5] !== s ? (e = e => (0, a.jsx)("button", { type: "button", role: "tab", "aria-selected": e.id === s, onClick: () => o(e.id), children: e.label }, e.id || "__all"), l[4] = o, l[5] = s, l[6] = e) : e = l[6], t = i.map(e), l[0] = o, l[1] = i, l[2] = s, l[3] = t;
            }
            else
                t = l[3]; return l[7] !== u || l[8] !== t ? (r = (0, a.jsx)("div", { role: "tablist", "aria-label": u, className: "omni-seg is-scroll", children: t }), l[7] = u, l[8] = t, l[9] = r) : r = l[9], r; }
        }, 42354: (e, t, r) => {
            "use strict";
            r.d(t, { IC: () => s, by: () => o, pQ: () => u, vy: () => i });
            var a = r(69939), n = r(68867), l = r(2552);
            function s(e) { var t; return (null == (t = e.public_id) ? void 0 : t.trim()) || e.id; }
            function i(e, t) { let r = e.trim().toLowerCase(); if (!r)
                return e; let a = t.find(e => { var t; return e.id.trim().toLowerCase() === r || (null == (t = e.public_id) ? void 0 : t.trim().toLowerCase()) === r; }); return a ? s(a) : e; }
            function o(e, t, r) { let i = s(e), o = (0, l.xb)(e); return { name: (0, n.i)(e, t) || i, publicId: i, brandKey: o, brandLabel: o === l.vy ? r : (0, a.xr)(o, t) }; }
            function u(e, t) { var r, a; let n = e => "string" == typeof e && e ? i(e, t) : e, l = n(e.model), s = n(null == (r = e.metadata) ? void 0 : r.model); return l === e.model && s === (null == (a = e.metadata) ? void 0 : a.model) ? e : _object_spread(_object_spread_props(_object_spread({}, e), { model: l }), e.metadata ? { metadata: _object_spread_props(_object_spread({}, e.metadata), { model: s }) } : {}); }
        }, 47266: (e, t, r) => {
            "use strict";
            e.exports = r(86884);
        }, 49584: (e, t, r) => {
            "use strict";
            r.d(t, { A: () => a });
            let a = (0, r(14718).A)("trophy", [["path", { d: "M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978", key: "1n3hpd" }], ["path", { d: "M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978", key: "rfe1zi" }], ["path", { d: "M18 9h1.5a1 1 0 0 0 0-5H18", key: "7xy6bh" }], ["path", { d: "M4 22h16", key: "57wxv0" }], ["path", { d: "M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z", key: "1mhfuq" }], ["path", { d: "M6 9H4.5a1 1 0 0 1 0-5H6", key: "tex48p" }]]);
        }, 49880: (e, t, r) => {
            "use strict";
            r.d(t, { default: () => l });
            var a = r(49136), n = r(31434);
            function l(e) { let { locale: t } = e, r = _object_without_properties(e, ["locale"]); if (!t)
                throw Error(void 0); return (0, n.jsx)(a.Dk, _object_spread({ locale: t }, r)); }
        }, 54719: (e, t, r) => {
            "use strict";
            r.d(t, { O_: () => p, Ol: () => s.Ol, XA: () => m, XJ: () => u, Yn: () => i, a$: () => o, cp: () => g, dB: () => c, js: () => d });
            var a = r(88617), n = r(77648), l = r(85998), s = r(71814);
            function i(e) { let t = e / 1048576; return !Number.isFinite(t) || t <= 0 ? "0" : t >= 10 ? t.toFixed(1) : t >= .01 ? t.toFixed(2) : "<0.01"; }
            function o(e) { return e.slice(0, 8); }
            function u(e) { var t; let r = null == (t = e.metadata) ? void 0 : t.request_id; return "string" == typeof r && "" !== r ? r : null; }
            function c(e) { var t, r; let a = null != (t = e.reference_id) ? t : ""; if (!a.startsWith("checkin-milestone:"))
                return null; let n = Number.parseInt(null != (r = a.split(":")[2]) ? r : "", 10); return Number.isFinite(n) && n > 0 ? n : null; }
            function d(e) { var t; let r = null != (t = e.reference_id) ? t : ""; return r.startsWith("checkin-budget:") ? "draw" : r.startsWith("checkin-budget-refund:") ? "refund" : r.startsWith("checkin-budget-revert:") ? "revert" : r.startsWith("checkin-pool:") ? "pool" : null; }
            function m(e) { return "unfreeze" === e.type && "refunded" !== p(e); }
            function p(e) { var t, r, a, n, l, s, i, o, c; switch (e.type) {
                case "usage": return e.call_interrupted ? "interrupted" : "success";
                case "subscription": return "success";
                case "checkin_bonus": return "credited";
                case "checkin_subsidy": return Number.parseFloat(String(null != (t = e.amount) ? t : "0")) > 0 ? "credited" : "success";
                case "refund": return "refunded";
                case "adjustment":
                    if (Number.parseFloat(String(null != (r = e.amount) ? r : "0")) > 0 && ((null == (a = e.description) ? void 0 : a.includes("goodwill")) || (null == (n = e.description_friendly) ? void 0 : n.includes("退"))))
                        return "refunded";
                    return null;
                case "unfreeze": return null != u(e) || (null == (l = e.description_friendly) ? void 0 : l.includes("退款")) || (null == (s = e.description) ? void 0 : s.includes("(refund)")) || (null == (i = e.description) ? void 0 : i.includes("failed/no-bill freeze")) || (null == (o = e.description) ? void 0 : o.includes("orphan-freeze backstop")) || (null == (c = e.description) ? void 0 : c.includes("expire-release")) ? "refunded" : "unfrozen";
                case "freeze":
                    if (e.reconcile_pending)
                        return "reconciling";
                    return e.freeze_resolved ? "unfrozen" : "generating";
                default: return null;
            } }
            let g = { getWallet: () => a.FH.get("/api/v1/billing/balance"), getReclaimableFreeze: () => a.FH.get("/api/v1/billing/reclaimable-freeze"), reclaimFreeze: () => a.FH.post("/api/v1/billing/reclaim-freeze"), getTeamAllocationSourceWallet: () => a.FH.get("/api/v1/billing/team/source-balance"), allocateToTeam: (e, t, r) => a.FH.post("/api/v1/billing/team/allocate", _object_spread({ team_id: e, amount: t }, r ? { order_id: r } : {})), reclaimFromTeam: (e, t, r) => a.FH.post("/api/v1/billing/team/reclaim", _object_spread({ team_id: e, amount: t }, r ? { order_id: r } : {})), getTopupPresets: () => a.FH.get("/api/v1/billing/topup/presets"), getSummary() { let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {}; return a.FH.get("/api/v1/billing/summary", { params: e }); }, getApiKeyUsage: e => a.FH.get("/api/v1/billing/api-key-usage", { params: e }), getAvailableProviders: () => a.FH.get("/api/v1/billing/providers"), getCheckoutOptions: () => a.FH.get("/api/v1/billing/checkout-options"), getUsageStats() { let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : 7; return a.FH.get("/api/v1/billing/usage", { params: (0, l.JP)(e) }); }, getUsageRange: (e, t) => a.FH.get("/api/v1/billing/usage", { params: { start: e, end: t } }), getUsageBuckets: (e, t, r) => a.FH.get("/api/v1/billing/usage", { params: { start: e, end: t, granularity: r } }), listCalls() { let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {}; return a.FH.get("/api/v1/billing/calls", { params: e }); }, getCallDetail: e => a.FH.get("/api/v1/billing/calls/".concat(encodeURIComponent(e))), getCallsSummary() { let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {}; return a.FH.get("/api/v1/billing/call-summary", { params: e }); }, listTransactions: e => a.FH.getPage("/api/v1/billing/transactions", { params: e }), exportTransactions: e => a.FH.get("/api/v1/billing/transactions/export", { params: e }), createTopup: e => a.FH.post("/api/v1/billing/topup", _object_spread({ provider: e.provider, amount: function (e) { let t = e.trim(); if (!t)
                        return 0; let r = Number.parseFloat(t); return !Number.isFinite(r) || r <= 0 ? 0 : Math.round(r / (0, n.il)() * 1e6); }(e.amount), origin: window.location.origin }, void 0 !== e.activity_tier_cny ? { activity_tier_cny: e.activity_tier_cny } : {})), redeemCode: e => a.FH.post("/api/v1/billing/redeem", { code: e }), listPublicModels: () => a.FH.get("/api/v1/billing/pricing") };
        }, 59309: (e, t, r) => {
            "use strict";
            r.d(t, { A: () => a });
            let a = (0, r(14718).A)("gauge", [["path", { d: "m12 14 4-4", key: "9kzdfg" }], ["path", { d: "M3.34 19a10 10 0 1 1 17.32 0", key: "19p75a" }]]);
        }, 68735: (e, t, r) => {
            "use strict";
            r.d(t, { ConsoleUsage: () => K });
            var a = r(31434), n = r(47266), l = r(98242), s = r(72504), i = r(10408), o = r(82828), u = r(17330), c = r(91178), d = r(98512), m = r(59309), p = r(18715), g = r(19939), h = r(29693), f = r(49584), x = r(54719), v = r(77648), b = r(79986), y = r(1916), N = r(42354), w = r(27746), k = r(70073), j = r(38693), _ = r(39281), F = r(27836), M = r(88082), S = r(85998);
            let A = [{ id: "24h", days: 1, granularity: "hour" }, { id: "7d", days: 7, granularity: "day" }, { id: "30d", days: 30, granularity: "day" }, { id: "90d", days: 90, granularity: "week" }], C = A[1];
            function D(e) { let t = e => String(e).padStart(2, "0"); return "".concat(e.getFullYear(), "-").concat(t(e.getMonth() + 1), "-").concat(t(e.getDate())); }
            function L(e, t, r) { let a = arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : new Date, n = e => { let t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e); return t ? new Date(Number(t[1]), Number(t[2]) - 1, Number(t[3])) : null; }, l = n(e), s = n(t); if (!l || !s || l > s)
                return []; let i = e => String(e).padStart(2, "0"), o = []; if ("hour" === r) {
                let e = D(l), t = (0, S.IB)(a), r = t.date === e ? t.hour : 23;
                for (let t = 0; t <= r; t++)
                    o.push("".concat(e, " ").concat(i(t), ":00"));
                return o;
            } if ("week" === r) {
                let e = e => { let t = new Date(e.getFullYear(), e.getMonth(), e.getDate()); return t.setDate(t.getDate() - (t.getDay() + 6) % 7), t; };
                for (let t = e(l), r = e(s); t <= r; t.setDate(t.getDate() + 7))
                    o.push(D(t));
                return o;
            } for (let e = new Date(l); e <= s; e.setDate(e.getDate() + 1))
                o.push(D(e)); return o; }
            var q = r(35501), H = r(17047);
            let T = "__other__";
            function z(e) { let t = "number" == typeof e ? e : Number.parseFloat(String(null != e ? e : "")); return Number.isFinite(t) ? t : 0; }
            function I(e) { let t = new Set, r = 0, a = 0; for (let n of null != e ? e : [])
                r += z(n.request_count), a += z(n.total_cost), t.add(n.model || ""); return { requests: r, cost: a, models: t.size }; }
            function P(e) { return e.requests > 0 ? e.cost / e.requests : null; }
            function U(e) { let t = new Map; for (let a of null != e ? e : []) {
                var r;
                let e = a.model || "", n = null != (r = t.get(e)) ? r : { model: e, requests: 0, cost: 0 };
                n.requests += z(a.request_count), n.cost += z(a.total_cost), t.set(e, n);
            } return [...t.values()].sort((e, t) => t.cost - e.cost || t.requests - e.requests); }
            function O(e) { let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : 5; return e.filter(e => e.cost > 0).sort((e, t) => t.cost - e.cost).slice(0, t).map(e => e.model); }
            function E(e, t) { let r = new Map; for (let t of null != e ? e : []) {
                var a;
                let e = null != (a = r.get(t.date)) ? a : { requests: 0, cost: 0, models: new Set };
                e.requests += z(t.request_count), e.cost += z(t.total_cost), e.models.add(t.model || ""), r.set(t.date, e);
            } return t.map(e => { var t, a, n; let l = r.get(e); return { bucket: e, requests: null != (t = null == l ? void 0 : l.requests) ? t : 0, cost: null != (a = null == l ? void 0 : l.cost) ? a : 0, models: null != (n = null == l ? void 0 : l.models.size) ? n : 0 }; }); }
            function R(e) { let t, r, l, s, i = (0, n.c)(9), { share: o } = e, u = 100 * Math.max(0, Math.min(1, o)), c = "".concat(u, "%"); return i[0] !== c ? (t = (0, a.jsx)("div", { className: "h-1.5 w-full min-w-[56px] overflow-hidden rounded-full bg-muted", children: (0, a.jsx)("div", { "data-testid": "rank-share-fill", className: "h-full rounded-full bg-primary", style: { width: c } }) }), i[0] = c, i[1] = t) : t = i[1], i[2] !== u ? (r = u.toFixed(1), i[2] = u, i[3] = r) : r = i[3], i[4] !== r ? (l = (0, a.jsxs)("span", { className: "w-12 shrink-0 text-right text-[12px] tabular-nums text-muted-foreground", children: [r, "%"] }), i[4] = r, i[5] = l) : l = i[5], i[6] !== t || i[7] !== l ? (s = (0, a.jsxs)("div", { className: "flex items-center gap-2", children: [t, l] }), i[6] = t, i[7] = l, i[8] = s) : s = i[8], s; }
            function W(e) { let t, r, l, s, i, u, c, d, m, p, g, h, f, x, v, b, y, N, w, k, j, F, S = (0, n.c)(62), { rows: A, totals: C, metric: D, labelOf: L, formatCost: q, unit: z } = e, I = (0, o.c)("console"); if (S[0] === Symbol.for("react.memo_cache_sentinel") ? (t = (0, a.jsx)("th", { className: "whitespace-nowrap py-2 text-[12px] font-medium text-muted-foreground w-10 pl-1", children: "#" }), S[0] = t) : t = S[0], S[1] !== I ? (r = I("usage.rank.colModel"), S[1] = I, S[2] = r) : r = S[2], S[3] !== r ? (l = (0, a.jsx)("th", { className: "whitespace-nowrap py-2 text-[12px] font-medium text-muted-foreground", children: r }), S[3] = r, S[4] = l) : l = S[4], S[5] !== I ? (s = I("usage.rank.colCalls"), S[5] = I, S[6] = s) : s = S[6], S[7] !== s ? (i = (0, a.jsx)("th", { className: "whitespace-nowrap py-2 text-[12px] font-medium text-muted-foreground text-right", children: s }), S[7] = s, S[8] = i) : i = S[8], S[9] !== I ? (u = I("usage.rank.colShare"), S[9] = I, S[10] = u) : u = S[10], S[11] !== u ? (c = (0, a.jsx)("th", { className: "whitespace-nowrap py-2 text-[12px] font-medium text-muted-foreground w-[150px] pl-4", children: u }), S[11] = u, S[12] = c) : c = S[12], S[13] !== I ? (d = I("usage.rank.colCost"), S[13] = I, S[14] = d) : d = S[14], S[15] !== z ? (m = (0, a.jsxs)("span", { className: "font-normal", children: ["(", z, ")"] }), S[15] = z, S[16] = m) : m = S[16], S[17] !== d || S[18] !== m ? (p = (0, a.jsxs)("th", { className: "whitespace-nowrap py-2 text-[12px] font-medium text-muted-foreground text-right", children: [d, " ", m] }), S[17] = d, S[18] = m, S[19] = p) : p = S[19], S[20] !== I ? (g = I("usage.rank.colShare"), S[20] = I, S[21] = g) : g = S[21], S[22] !== g ? (h = (0, a.jsx)("th", { className: "whitespace-nowrap py-2 text-[12px] font-medium text-muted-foreground w-[150px] pl-4", children: g }), S[22] = g, S[23] = h) : h = S[23], S[24] !== I ? (f = I("usage.rank.colAvg"), S[24] = I, S[25] = f) : f = S[25], S[26] !== I ? (x = I("usage.perCall"), S[26] = I, S[27] = x) : x = S[27], S[28] !== x || S[29] !== z ? (v = (0, a.jsxs)("span", { className: "font-normal", children: ["(", z, x, ")"] }), S[28] = x, S[29] = z, S[30] = v) : v = S[30], S[31] !== f || S[32] !== v ? (b = (0, a.jsxs)("th", { className: "whitespace-nowrap py-2 text-[12px] font-medium text-muted-foreground text-right", children: [f, " ", v] }), S[31] = f, S[32] = v, S[33] = b) : b = S[33], S[34] !== I ? (y = I("usage.rank.colVsPrev"), S[34] = I, S[35] = y) : y = S[35], S[36] !== y ? (N = (0, a.jsx)("th", { className: "whitespace-nowrap py-2 text-[12px] font-medium text-muted-foreground pr-1 text-right", children: y }), S[36] = y, S[37] = N) : N = S[37], S[38] !== p || S[39] !== h || S[40] !== b || S[41] !== N || S[42] !== l || S[43] !== i || S[44] !== c ? (w = (0, a.jsx)("thead", { children: (0, a.jsxs)("tr", { className: "border-b border-border", children: [t, l, i, c, p, h, b, N] }) }), S[38] = p, S[39] = h, S[40] = b, S[41] = N, S[42] = l, S[43] = i, S[44] = c, S[45] = w) : w = S[45], S[46] !== q || S[47] !== L || S[48] !== D || S[49] !== A || S[50] !== C) {
                let e;
                S[52] !== q || S[53] !== L || S[54] !== D || S[55] !== C ? (e = (e, t) => { let r = e.model === T, n = P(e), l = null === e.prevValue ? null : (0, M.u5)(e[D], e.prevValue); return (0, a.jsxs)("tr", { "data-testid": "rank-row", className: "border-b border-border/50 last:border-0", children: [(0, a.jsx)("td", { className: "py-2.5 align-middle tabular-nums pl-1 text-muted-foreground", children: r ? "" : t + 1 }), (0, a.jsx)("td", { className: "py-2.5 align-middle tabular-nums", children: (0, a.jsxs)("span", { className: "flex min-w-0 items-center gap-2.5", children: [r || !e.model ? (0, a.jsx)("span", { className: "h-6 w-6 shrink-0", "aria-hidden": !0 }) : (0, a.jsx)(H.J, { modelId: e.model, size: 24 }), (0, a.jsx)("span", { "data-testid": "rank-model", className: r ? "text-muted-foreground" : "truncate font-mono text-[12.5px] text-foreground", children: L(e.model) })] }) }), (0, a.jsx)("td", { className: "py-2.5 align-middle tabular-nums text-right text-foreground", children: e.requests.toLocaleString() }), (0, a.jsx)("td", { className: "py-2.5 align-middle tabular-nums pl-4", children: (0, a.jsx)(R, { share: C.requests > 0 ? e.requests / C.requests : 0 }) }), (0, a.jsx)("td", { className: "py-2.5 align-middle tabular-nums text-right text-foreground", children: q(e.cost) }), (0, a.jsx)("td", { className: "py-2.5 align-middle tabular-nums pl-4", children: (0, a.jsx)(R, { share: C.cost > 0 ? e.cost / C.cost : 0 }) }), (0, a.jsx)("td", { className: "py-2.5 align-middle tabular-nums text-right text-muted-foreground", children: null === n ? "—" : q(n) }), (0, a.jsx)("td", { "data-testid": "rank-vs-prev", className: "py-2.5 align-middle tabular-nums pr-1 text-right text-[12px] text-muted-foreground", children: null === l ? "—" : (0, a.jsx)(_.rL, { change: l, vsLabel: "", noPrevLabel: "—" }) })] }, e.model); }, S[52] = q, S[53] = L, S[54] = D, S[55] = C, S[56] = e) : e = S[56], k = A.map(e), S[46] = q, S[47] = L, S[48] = D, S[49] = A, S[50] = C, S[51] = k;
            }
            else
                k = S[51]; return S[57] !== k ? (j = (0, a.jsx)("tbody", { children: k }), S[57] = k, S[58] = j) : j = S[58], S[59] !== w || S[60] !== j ? (F = (0, a.jsx)("div", { className: "overflow-x-auto", children: (0, a.jsxs)("table", { className: "w-full min-w-[860px] text-left text-[13px]", children: [w, j] }) }), S[59] = w, S[60] = j, S[61] = F) : F = S[61], F; }
            function $(e) { let t, r, l, s, i, o, u, c, d, m, p = (0, n.c)(29), { icon: g, label: h, value: f, unit: x, sub: v, change: b, spark: y, loading: N, testId: w } = e; p[0] !== g ? (t = (0, a.jsx)("span", { className: "grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-md)] bg-primary/10 text-primary", children: (0, a.jsx)(g, { className: "h-4 w-4", "aria-hidden": !0 }) }), p[0] = g, p[1] = t) : t = p[1], p[2] !== h ? (r = (0, a.jsx)("span", { className: "truncate text-[13px] text-muted-foreground", children: h }), p[2] = h, p[3] = r) : r = p[3], p[4] !== t || p[5] !== r ? (l = (0, a.jsxs)("div", { className: "flex items-center gap-2.5", children: [t, r] }), p[4] = t, p[5] = r, p[6] = l) : l = p[6], p[7] !== N || p[8] !== x || p[9] !== f ? (s = N ? (0, a.jsx)("div", { className: "mt-3 h-8 w-28 animate-pulse rounded-[var(--radius-md)] bg-muted", "aria-hidden": !0 }) : (0, a.jsxs)("div", { className: "mt-3 whitespace-nowrap font-[family-name:var(--font-display)] text-[26px] font-semibold leading-8 tracking-[-0.01em] text-foreground tabular-nums", children: [f, x ? (0, a.jsx)("span", { className: "ml-1 text-[13px] font-medium text-muted-foreground", children: x }) : null] }), p[7] = N, p[8] = x, p[9] = f, p[10] = s) : s = p[10], p[11] !== v ? (i = v ? (0, a.jsx)("div", { className: "truncate", children: v }) : null, p[11] = v, p[12] = i) : i = p[12]; let k = N ? " " : b; return p[13] !== k ? (o = (0, a.jsx)("div", { className: "truncate", children: k }), p[13] = k, p[14] = o) : o = p[14], p[15] !== i || p[16] !== o ? (u = (0, a.jsxs)("div", { className: "min-w-0 space-y-0.5 text-[12px] leading-5 text-muted-foreground", children: [i, o] }), p[15] = i, p[16] = o, p[17] = u) : u = p[17], p[18] !== N || p[19] !== y ? (c = N ? null : (0, a.jsx)(_.uM, { values: y, className: "h-7 w-20 shrink-0" }), p[18] = N, p[19] = y, p[20] = c) : c = p[20], p[21] !== u || p[22] !== c ? (d = (0, a.jsxs)("div", { className: "mt-1.5 flex items-end justify-between gap-3", children: [u, c] }), p[21] = u, p[22] = c, p[23] = d) : d = p[23], p[24] !== d || p[25] !== l || p[26] !== s || p[27] !== w ? (m = (0, a.jsxs)("section", { "data-testid": w, className: "min-w-0 rounded-[var(--radius-xl)] border border-border/60 bg-card p-5", children: [l, s, d] }), p[24] = d, p[25] = l, p[26] = s, p[27] = w, p[28] = m) : m = p[28], m; }
            let B = "inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-control)] border px-3 text-[12.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-40";
            function V(e) { let t, r, l, s = (0, n.c)(12), { delta: i, hasPrev: o, vsLabel: u, noPrevLabel: c, flatLabel: d } = e; if (!o) {
                let e;
                return s[0] !== c ? (e = (0, a.jsx)("span", { children: c }), s[0] = c, s[1] = e) : e = s[1], e;
            } if (0 === i) {
                let e;
                return s[2] !== d ? (e = (0, a.jsx)("span", { children: d }), s[2] = d, s[3] = e) : e = s[3], e;
            } let m = i > 0 ? "text-[var(--color-success)]" : "text-[var(--color-destructive)]"; return s[4] !== i ? (t = i > 0 ? "+".concat(i) : "−".concat(Math.abs(i)), s[4] = i, s[5] = t) : t = s[5], s[6] !== m || s[7] !== t ? (r = (0, a.jsx)("span", { className: m, children: t }), s[6] = m, s[7] = t, s[8] = r) : r = s[8], s[9] !== r || s[10] !== u ? (l = (0, a.jsxs)("span", { className: "whitespace-nowrap", children: [r, " ", u] }), s[9] = r, s[10] = u, s[11] = l) : l = s[11], l; }
            function K() { var e, t, r, H, R, K, en, el; let es, ei, eo, eu, ec, ed, em, ep, eg, eh, ef, ex, ev, eb, ey, eN, ew, ek, ej, e_, eF, eM, eS, eA, eC, eD, eL, eq, eH, eT, ez, eI, eP, eU, eO, eE, eR, eW, e$, eB, eV, eK, eX, eJ, eY, eZ, eG, eQ, e1, e0, e2, e4, e5, e3, e6, e8, e7, e9, te, tt, tr, ta, tn, tl, ts, ti, to = (0, n.c)(273), tu = (0, o.c)("console"), [tc, td] = (0, l.useState)(C.id), [tm, tp] = (0, l.useState)("cost"), tg = (0, y.tQ)(); to[0] !== tg.data ? (es = null != (r = tg.data) ? r : [], to[0] = tg.data, to[1] = es) : es = to[1]; let th = es; to[2] !== tc ? (eo = null != (H = A.find(e => e.id === tc)) ? H : C, { start: eu, end: ei } = function (e) { let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : new Date; return (0, S.JP)(e.days, t); }(eo), ec = function (e, t) { let [r, a, n] = e.start.split("-").map(Number), l = new Date(r, a - 1, n - 1); return { start: D(new Date(r, a - 1, n - Math.max(1, Math.floor(t)))), end: D(l) }; }({ start: eu, end: ei }, eo.days), to[2] = tc, to[3] = ei, to[4] = eo, to[5] = eu, to[6] = ec) : (ei = to[3], eo = to[4], eu = to[5], ec = to[6]); let tf = ec, tx = eo.granularity; to[7] !== ei || to[8] !== tx || to[9] !== eu ? (ed = { queryKey: ["billing", "usage-buckets", eu, ei, tx], queryFn: () => x.cp.getUsageBuckets(eu, ei, tx), placeholderData: s.rX, staleTime: 6e4 }, to[7] = ei, to[8] = tx, to[9] = eu, to[10] = ed) : ed = to[10]; let { data: tv, isError: tb } = (0, i.I)(ed); to[11] !== tx || to[12] !== tf.end || to[13] !== tf.start ? (em = { queryKey: ["billing", "usage-buckets", tf.start, tf.end, tx], queryFn: () => x.cp.getUsageBuckets(tf.start, tf.end, tx), placeholderData: s.rX, staleTime: 6e4 }, to[11] = tx, to[12] = tf.end, to[13] = tf.start, to[14] = em) : em = to[14]; let ty = (0, i.I)(em); to[15] !== ei || to[16] !== eu ? (ep = { queryKey: ["billing", "summary", eu, ei], queryFn: () => x.cp.getSummary({ start: eu, end: ei }), staleTime: 6e4 }, to[15] = ei, to[16] = eu, to[17] = ep) : ep = to[17]; let tN = (0, i.I)(ep), tw = void 0 === tv; if (to[18] !== tv || to[19] !== ei || to[20] !== tx || to[21] !== tf.end || to[22] !== tf.start || to[23] !== ty.data || to[24] !== tm || to[25] !== eu) {
                let e = L(eu, ei, tx), t = "hour" === tx ? function (e) { let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : new Date, r = (0, S.IB)(t).hour; return (null != e ? e : []).filter(e => { let t = Number.parseInt(e.date.slice(11, 13), 10); return !Number.isFinite(t) || t <= r; }); }(ty.data) : ty.data, r = E(tv, e), a = U(tv), n = void 0 === ty.data ? null : U(t), l = "day" === tx ? function (e) { let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : [], r = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : 7, a = [...t.slice(-(r - 1)), ...e], n = a.length - e.length; return e.map((e, t) => { let l = n + t, s = Math.max(0, l - r + 1), i = a.slice(s, l + 1); return i.reduce((e, t) => e + t, 0) / i.length; }); }(r.map(ea), E(t, L(tf.start, tf.end, tx)).map(er)) : void 0, s = O(a, 5);
                ex = r, ev = s, eb = function (e, t) { var r; let a = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : 5, n = new Map; for (let t of null != e ? e : [])
                    n.set(t.model || "", (null != (r = n.get(t.model || "")) ? r : 0) + z(t.request_count)); let l = [...n.entries()].filter(e => { let [, t] = e; return t > 0; }).sort((e, t) => t[1] - e[1]), s = "number" == typeof a ? l.slice(0, a).map(e => { let [t] = e; return t; }) : [...a], i = new Set(s), o = l.some(e => { let [t] = e; return !i.has(t); }), u = new Map(t.map((e, t) => [e, t])), c = o ? [...s, T] : s, d = new Map(c.map(e => [e, Array(t.length).fill(0)])), m = new Set(s); for (let t of null != e ? e : []) {
                    let e = u.get(t.date);
                    if (void 0 === e)
                        continue;
                    let r = m.has(t.model || "") ? t.model || "" : T, a = d.get(r);
                    a && (a[e] += z(t.request_count));
                } return c.map(e => ({ key: e, values: d.get(e) })); }(tv, e, s), ey = l, to[34] !== tv ? (eN = I(tv), to[34] = tv, to[35] = eN) : eN = to[35], eg = void 0 === ty.data ? null : I(t), eh = function (e, t) { let r = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : null, a = arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : 10, n = new Map((null != r ? r : []).map(e => [e.model, e[t]])), l = [...e].sort((e, r) => r[t] - e[t] || r.cost - e.cost), s = l.slice(0, a).map(e => { var t, a; return _object_spread_props(_object_spread({}, e), { prevValue: (t = e.model, null === r ? null : null != (a = n.get(t)) ? a : 0) }); }); if (l.length <= a)
                    return s; let i = l.slice(a), o = (null != r ? r : []).reduce((e, r) => e + r[t], 0), u = s.reduce((e, t) => { var r; return e + (null != (r = t.prevValue) ? r : 0); }, 0); return [...s, { model: T, requests: i.reduce((e, t) => e + t.requests, 0), cost: i.reduce((e, t) => e + t.cost, 0), prevValue: null === r ? null : Math.max(0, o - u) }]; }(a, tm, n, 10), ef = function (e) { let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : 5, r = "number" == typeof t ? O(e, t) : t, a = e.filter(e => e.cost > 0), n = a.reduce((e, t) => e + t.cost, 0), l = new Map(a.map(e => [e.model, e.cost])), s = r.filter(e => { var t; return (null != (t = l.get(e)) ? t : 0) > 0; }).map(e => ({ model: e, value: l.get(e) })), i = new Set(r), o = a.filter(e => !i.has(e.model)).reduce((e, t) => e + t.cost, 0); return { slices: (o > 0 ? [...s, { model: T, value: o }] : s).map(e => _object_spread_props(_object_spread({}, e), { share: n > 0 ? e.value / n : 0 })), total: n }; }(a, s), to[18] = tv, to[19] = ei, to[20] = tx, to[21] = tf.end, to[22] = tf.start, to[23] = ty.data, to[24] = tm, to[25] = eu, to[26] = eg, to[27] = eh, to[28] = ef, to[29] = ex, to[30] = ev, to[31] = eb, to[32] = ey, to[33] = eN;
            }
            else
                eg = to[26], eh = to[27], ef = to[28], ex = to[29], ev = to[30], eb = to[31], ey = to[32], eN = to[33]; to[36] !== eg || to[37] !== eh || to[38] !== ef || to[39] !== ex || to[40] !== ev || to[41] !== eb || to[42] !== ey || to[43] !== eN ? (ew = { series: ex, colorKeys: ev, stack: eb, average: ey, totals: eN, prevTotals: eg, ranking: eh, share: ef }, to[36] = eg, to[37] = eh, to[38] = ef, to[39] = ex, to[40] = ev, to[41] = eb, to[42] = ey, to[43] = eN, to[44] = ew) : ew = to[44]; let tk = ew; to[45] !== th || to[46] !== tu ? (ek = e => e === T ? tu("usage.other") : e ? (0, N.vy)(e, th) : tu("usage.unknownModel"), to[45] = th, to[46] = tu, to[47] = ek) : ek = to[47]; let tj = ek, t_ = et; to[48] !== tu ? (ej = (e, t) => (0, a.jsx)(_.rL, { change: null !== e && null !== t ? (0, M.u5)(e, t) : null, vsLabel: tu("usage.vsPrev"), noPrevLabel: tu("usage.noPrev") }), to[48] = tu, to[49] = ej) : ej = to[49]; let tF = ej; if (to[50] !== th || to[51] !== tF || to[52] !== tv || to[53] !== ei || to[54] !== tw || to[55] !== tc || to[56] !== eu || to[57] !== tN.data || to[58] !== tu || to[59] !== tk.prevTotals || to[60] !== tk.series || to[61] !== tk.totals) {
                let e, t, r, n, l, s, i, o, p, g, h, f, x, y, j, _, F, M, S, C, D, L, q = P(tk.totals), H = tk.prevTotals ? P(tk.prevTotals) : null;
                to[75] !== th || to[76] !== tv || to[77] !== ei || to[78] !== eu || to[79] !== tu ? (e = () => { let e = [...null != tv ? tv : []].sort(ee); (0, b.t)("usage-".concat(eu, "-").concat(ei, ".csv"), [[tu("usage.csv.time"), tu("usage.csv.model"), tu("usage.csv.calls"), tu("usage.csv.cost")], ...e.map(e => { let t = "number" == typeof e.total_cost ? e.total_cost : Number.parseFloat(String(e.total_cost)); return [e.date, (e.model ? (0, N.vy)(e.model, th) : "") || tu("usage.unknownModel"), String(e.request_count), Number.isFinite(t) ? (0, v.FD)(t / 1e6).toFixed(4) : ""]; })]); }, to[75] = th, to[76] = tv, to[77] = ei, to[78] = eu, to[79] = tu, to[80] = e) : e = to[80];
                let T = e;
                to[81] !== ei || to[82] !== eu ? (t = eu === ei ? eu : "".concat(eu.slice(5), " – ").concat(ei.slice(5)), to[81] = ei, to[82] = eu, to[83] = t) : t = to[83];
                let z = t;
                eF = k.$D, to[84] !== tu ? (r = tu("usage.title"), to[84] = tu, to[85] = r) : r = to[85], to[86] !== tu ? (n = tu("usage.subtitle"), to[86] = tu, to[87] = n) : n = to[87], to[88] !== tc || to[89] !== tu ? (l = A.map(e => (0, a.jsx)("button", { type: "button", onClick: () => td(e.id), "aria-pressed": e.id === tc, className: (0, w.cn)(B, e.id === tc ? "border-primary/40 bg-primary/10 font-medium text-primary" : "border-border bg-muted/50 text-foreground hover:bg-muted"), children: tu("usage.range.".concat(e.id)) }, e.id)), to[88] = tc, to[89] = tu, to[90] = l) : l = to[90], to[91] !== z ? (s = (0, a.jsx)("span", { "data-testid": "usage-range-text", className: "px-1 text-[12.5px] tabular-nums text-muted-foreground", children: z }), to[91] = z, to[92] = s) : s = to[92], to[93] !== tv || to[94] !== tw ? (i = tw || 0 === (null != tv ? tv : []).length, to[93] = tv, to[94] = tw, to[95] = i) : i = to[95], to[96] === Symbol.for("react.memo_cache_sentinel") ? (o = (0, w.cn)(B, "border-border text-foreground hover:bg-muted"), p = (0, a.jsx)(u.A, { className: "h-3.5 w-3.5", "aria-hidden": !0 }), to[96] = o, to[97] = p) : (o = to[96], p = to[97]), to[98] !== tu ? (g = tu("usage.exportCsv"), to[98] = tu, to[99] = g) : g = to[99], to[100] !== T || to[101] !== i || to[102] !== g ? (h = (0, a.jsxs)("button", { type: "button", onClick: T, disabled: i, className: o, children: [p, g] }), to[100] = T, to[101] = i, to[102] = g, to[103] = h) : h = to[103], to[104] !== l || to[105] !== s || to[106] !== h ? (f = (0, a.jsxs)("div", { className: "flex flex-wrap items-center gap-2", children: [l, s, h] }), to[104] = l, to[105] = s, to[106] = h, to[107] = f) : f = to[107], to[108] !== r || to[109] !== n || to[110] !== f ? (eI = (0, a.jsx)(k.s3, { title: r, description: n, action: f }), to[108] = r, to[109] = n, to[110] = f, to[111] = eI) : eI = to[111], ez = "space-y-4 pt-6 [--usage-mix-to:var(--color-foreground)]", eq = "grid gap-4 sm:grid-cols-2 xl:grid-cols-4", to[112] !== tu ? (x = tu("usage.card.calls"), to[112] = tu, to[113] = x) : x = to[113], to[114] !== tk.totals.requests ? (y = tk.totals.requests.toLocaleString(), to[114] = tk.totals.requests, to[115] = y) : y = to[115], to[116] !== tN.data || to[117] !== tu ? (j = tN.data ? tu("usage.card.success", { n: tN.data.success_count.toLocaleString() }) : void 0, to[116] = tN.data, to[117] = tu, to[118] = j) : j = to[118];
                let I = null != (R = null == (en = tk.prevTotals) ? void 0 : en.requests) ? R : null;
                to[119] !== tF || to[120] !== I || to[121] !== tk.totals.requests ? (_ = tF(tk.totals.requests, I), to[119] = tF, to[120] = I, to[121] = tk.totals.requests, to[122] = _) : _ = to[122], to[123] !== tk.series ? (F = tk.series.map(Q), to[123] = tk.series, to[124] = F) : F = to[124], to[125] !== tw || to[126] !== x || to[127] !== y || to[128] !== j || to[129] !== _ || to[130] !== F ? (eH = (0, a.jsx)($, { testId: "usage-card-calls", icon: c.A, label: x, value: y, sub: j, change: _, spark: F, loading: tw }), to[125] = tw, to[126] = x, to[127] = y, to[128] = j, to[129] = _, to[130] = F, to[131] = eH) : eH = to[131], to[132] !== tu ? (M = tu("usage.card.cost"), to[132] = tu, to[133] = M) : M = to[133], to[134] !== tk.totals.cost ? (S = t_(tk.totals.cost), to[134] = tk.totals.cost, to[135] = S) : S = to[135], to[136] !== tu ? (C = tu("unit"), to[136] = tu, to[137] = C) : C = to[137];
                let U = null != (K = null == (el = tk.prevTotals) ? void 0 : el.cost) ? K : null;
                to[138] !== tF || to[139] !== U || to[140] !== tk.totals.cost ? (D = tF(tk.totals.cost, U), to[138] = tF, to[139] = U, to[140] = tk.totals.cost, to[141] = D) : D = to[141], to[142] !== tk.series ? (L = tk.series.map(G), to[142] = tk.series, to[143] = L) : L = to[143], to[144] !== tw || to[145] !== M || to[146] !== S || to[147] !== C || to[148] !== D || to[149] !== L ? (eT = (0, a.jsx)($, { testId: "usage-card-cost", icon: d.A, label: M, value: S, unit: C, change: D, spark: L, loading: tw }), to[144] = tw, to[145] = M, to[146] = S, to[147] = C, to[148] = D, to[149] = L, to[150] = eT) : eT = to[150], e_ = $, eM = "usage-card-avg", eS = m.A, to[151] !== tu ? (eA = tu("usage.card.avgPerCall"), to[151] = tu, to[152] = eA) : eA = to[152], eC = null === q ? "—" : t_(q), eD = null === q ? void 0 : "".concat(tu("unit")).concat(tu("usage.perCall")), eL = tF(q, H), to[50] = th, to[51] = tF, to[52] = tv, to[53] = ei, to[54] = tw, to[55] = tc, to[56] = eu, to[57] = tN.data, to[58] = tu, to[59] = tk.prevTotals, to[60] = tk.series, to[61] = tk.totals, to[62] = e_, to[63] = eF, to[64] = eM, to[65] = eS, to[66] = eA, to[67] = eC, to[68] = eD, to[69] = eL, to[70] = eq, to[71] = eH, to[72] = eT, to[73] = ez, to[74] = eI;
            }
            else
                e_ = to[62], eF = to[63], eM = to[64], eS = to[65], eA = to[66], eC = to[67], eD = to[68], eL = to[69], eq = to[70], eH = to[71], eT = to[72], ez = to[73], eI = to[74]; to[153] !== tk.series ? (eP = tk.series.map(Z), to[153] = tk.series, to[154] = eP) : eP = to[154], to[155] !== e_ || to[156] !== tw || to[157] !== eM || to[158] !== eS || to[159] !== eA || to[160] !== eC || to[161] !== eD || to[162] !== eL || to[163] !== eP ? (eU = (0, a.jsx)(e_, { testId: eM, icon: eS, label: eA, value: eC, unit: eD, change: eL, spark: eP, loading: tw }), to[155] = e_, to[156] = tw, to[157] = eM, to[158] = eS, to[159] = eA, to[160] = eC, to[161] = eD, to[162] = eL, to[163] = eP, to[164] = eU) : eU = to[164], to[165] !== tu ? (eO = tu("usage.modelsUsed"), to[165] = tu, to[166] = eO) : eO = to[166], to[167] !== tk.totals.models ? (eE = tk.totals.models.toLocaleString(), to[167] = tk.totals.models, to[168] = eE) : eE = to[168]; let tM = tk.totals.models - (null != (e = null == (t = tk.prevTotals) ? void 0 : t.models) ? e : 0), tS = null !== tk.prevTotals && tk.prevTotals.models > 0; return to[169] !== tu ? (eR = tu("usage.vsPrev"), to[169] = tu, to[170] = eR) : eR = to[170], to[171] !== tu ? (eW = tu("usage.noPrev"), to[171] = tu, to[172] = eW) : eW = to[172], to[173] !== tu ? (e$ = tu("usage.flat"), to[173] = tu, to[174] = e$) : e$ = to[174], to[175] !== tM || to[176] !== tS || to[177] !== eR || to[178] !== eW || to[179] !== e$ ? (eB = (0, a.jsx)(V, { delta: tM, hasPrev: tS, vsLabel: eR, noPrevLabel: eW, flatLabel: e$ }), to[175] = tM, to[176] = tS, to[177] = eR, to[178] = eW, to[179] = e$, to[180] = eB) : eB = to[180], to[181] !== tk.series ? (eV = tk.series.map(Y), to[181] = tk.series, to[182] = eV) : eV = to[182], to[183] !== tw || to[184] !== eO || to[185] !== eE || to[186] !== eB || to[187] !== eV ? (eK = (0, a.jsx)($, { testId: "usage-card-models", icon: p.A, label: eO, value: eE, change: eB, spark: eV, loading: tw }), to[183] = tw, to[184] = eO, to[185] = eE, to[186] = eB, to[187] = eV, to[188] = eK) : eK = to[188], to[189] !== eq || to[190] !== eH || to[191] !== eT || to[192] !== eU || to[193] !== eK ? (eX = (0, a.jsxs)("div", { className: eq, children: [eH, eT, eU, eK] }), to[189] = eq, to[190] = eH, to[191] = eT, to[192] = eU, to[193] = eK, to[194] = eX) : eX = to[194], to[195] !== tu ? (eJ = tu("usage.trend.title"), to[195] = tu, to[196] = eJ) : eJ = to[196], to[197] !== tx || to[198] !== tu ? (eY = tu("usage.trend.subtitle", { granularity: tu("usage.granularity.".concat(tx)) }), to[197] = tx, to[198] = tu, to[199] = eY) : eY = to[199], to[200] !== tx || to[201] !== tb || to[202] !== tj || to[203] !== tw || to[204] !== tu || to[205] !== tk.average || to[206] !== tk.series || to[207] !== tk.stack ? (eZ = tb ? (0, a.jsx)("p", { className: "py-12 text-center text-[13px] text-muted-foreground", children: tu("usage.loadFailed") }) : tw ? (0, a.jsx)("p", { className: "py-12 text-center text-[13px] text-muted-foreground", children: tu("usage.loading") }) : (0, a.jsx)(F.N, { points: tk.series.map(J), series: tk.stack.map(e => ({ key: e.key, label: tj(e.key), values: e.values })), average: tk.average, averageLabel: tu("usage.trend.average"), xLabel: "hour" === tx ? X : void 0, callsLabel: e => tu("usage.trend.calls", { n: e.toLocaleString() }), costLabel: e => "".concat((0, v.Ef)(e), " ").concat(tu("unit")), emptyLabel: tu("usage.empty"), ariaLabel: tu("usage.trend.title") }), to[200] = tx, to[201] = tb, to[202] = tj, to[203] = tw, to[204] = tu, to[205] = tk.average, to[206] = tk.series, to[207] = tk.stack, to[208] = eZ) : eZ = to[208], to[209] !== eJ || to[210] !== eY || to[211] !== eZ ? (eG = (0, a.jsx)(_.Hh, { className: "xl:col-span-7", icon: g.A, title: eJ, subtitle: eY, "data-testid": "usage-trend", children: eZ }), to[209] = eJ, to[210] = eY, to[211] = eZ, to[212] = eG) : eG = to[212], to[213] !== tu ? (eQ = tu("usage.dist.title"), to[213] = tu, to[214] = eQ) : eQ = to[214], to[215] !== tu ? (e1 = tu("usage.dist.subtitle"), to[215] = tu, to[216] = e1) : e1 = to[216], to[217] !== tj || to[218] !== tw || to[219] !== tu || to[220] !== tk.colorKeys || to[221] !== tk.share ? (e0 = tw ? (0, a.jsx)("p", { className: "py-12 text-center text-[13px] text-muted-foreground", children: tu("usage.loading") }) : (0, a.jsx)(q.W, { slices: tk.share.slices, centerValue: t_(tk.share.total), centerLabel: "".concat(tu("usage.dist.totalCost"), " (").concat(tu("unit"), ")"), labelOf: tj, valueOf: t_, colorOf: e => { var t; let r; return (0, q.w)((t = tk.colorKeys, -1 === (r = t.indexOf(e)) ? t.length : r)); }, emptyLabel: tu("usage.empty"), ariaLabel: tu("usage.dist.title") }), to[217] = tj, to[218] = tw, to[219] = tu, to[220] = tk.colorKeys, to[221] = tk.share, to[222] = e0) : e0 = to[222], to[223] !== eQ || to[224] !== e1 || to[225] !== e0 ? (e2 = (0, a.jsx)(_.Hh, { className: "xl:col-span-5", icon: h.A, title: eQ, subtitle: e1, "data-testid": "usage-share", children: e0 }), to[223] = eQ, to[224] = e1, to[225] = e0, to[226] = e2) : e2 = to[226], to[227] !== eG || to[228] !== e2 ? (e4 = (0, a.jsxs)("div", { className: "grid gap-4 xl:grid-cols-12", children: [eG, e2] }), to[227] = eG, to[228] = e2, to[229] = e4) : e4 = to[229], to[230] !== tu ? (e5 = tu("usage.rank.title"), to[230] = tu, to[231] = e5) : e5 = to[231], to[232] !== tu ? (e3 = tu("usage.rank.subtitle", { n: 10 }), to[232] = tu, to[233] = e3) : e3 = to[233], to[234] !== tu ? (e6 = tu("usage.rankMetricLabel"), to[234] = tu, to[235] = e6) : e6 = to[235], to[236] === Symbol.for("react.memo_cache_sentinel") ? (e8 = e => tp(e), to[236] = e8) : e8 = to[236], to[237] !== tu ? (e7 = tu("usage.rankMetric.cost"), to[237] = tu, to[238] = e7) : e7 = to[238], to[239] !== e7 ? (e9 = { id: "cost", label: e7 }, to[239] = e7, to[240] = e9) : e9 = to[240], to[241] !== tu ? (te = tu("usage.rankMetric.requests"), to[241] = tu, to[242] = te) : te = to[242], to[243] !== te ? (tt = { id: "requests", label: te }, to[243] = te, to[244] = tt) : tt = to[244], to[245] !== e9 || to[246] !== tt ? (tr = [e9, tt], to[245] = e9, to[246] = tt, to[247] = tr) : tr = to[247], to[248] !== tm || to[249] !== e6 || to[250] !== tr ? (ta = (0, a.jsx)(j.I, { label: e6, value: tm, onChange: e8, options: tr }), to[248] = tm, to[249] = e6, to[250] = tr, to[251] = ta) : ta = to[251], to[252] !== tj || to[253] !== tw || to[254] !== tm || to[255] !== tu || to[256] !== tk.ranking || to[257] !== tk.totals ? (tn = tw ? (0, a.jsx)("p", { className: "py-8 text-center text-[13px] text-muted-foreground", children: tu("usage.loading") }) : 0 === tk.ranking.length ? (0, a.jsx)("p", { className: "py-8 text-center text-[13px] text-muted-foreground", children: tu("usage.empty") }) : (0, a.jsx)(W, { rows: tk.ranking, totals: tk.totals, metric: tm, labelOf: tj, formatCost: t_, unit: tu("unit") }), to[252] = tj, to[253] = tw, to[254] = tm, to[255] = tu, to[256] = tk.ranking, to[257] = tk.totals, to[258] = tn) : tn = to[258], to[259] !== e5 || to[260] !== e3 || to[261] !== ta || to[262] !== tn ? (tl = (0, a.jsx)(_.Hh, { icon: f.A, title: e5, subtitle: e3, action: ta, "data-testid": "usage-rank", children: tn }), to[259] = e5, to[260] = e3, to[261] = ta, to[262] = tn, to[263] = tl) : tl = to[263], to[264] !== ez || to[265] !== eX || to[266] !== e4 || to[267] !== tl ? (ts = (0, a.jsxs)("div", { className: ez, children: [eX, e4, tl] }), to[264] = ez, to[265] = eX, to[266] = e4, to[267] = tl, to[268] = ts) : ts = to[268], to[269] !== eF || to[270] !== eI || to[271] !== ts ? (ti = (0, a.jsxs)(eF, { children: [eI, ts] }), to[269] = eF, to[270] = eI, to[271] = ts, to[272] = ti) : ti = to[272], ti; }
            function X(e) { return e.slice(11, 16); }
            function J(e) { return { date: e.bucket, calls: e.requests, cost: e.cost / 1e6 }; }
            function Y(e) { return e.models; }
            function Z(e) { return e.requests > 0 ? e.cost / e.requests : 0; }
            function G(e) { return e.cost; }
            function Q(e) { return e.requests; }
            function ee(e, t) { return e.date.localeCompare(t.date) || e.model.localeCompare(t.model); }
            function et(e) { return (0, v.Ef)(e / 1e6); }
            function er(e) { return e.requests; }
            function ea(e) { return e.requests; }
        }, 68867: (e, t, r) => {
            "use strict";
            function a(e, t) { let r = t.toLowerCase().startsWith("zh") ? e.display_name_zh || e.display_name || e.display_name_en : e.display_name_en || e.display_name || e.display_name_zh; return null != r ? r : ""; }
            r.d(t, { i: () => a });
        }, 70073: (e, t, r) => {
            "use strict";
            r.d(t, { $D: () => i, So: () => c, W: () => m, hm: () => u, s3: () => o });
            var a = r(31434), n = r(47266), l = r(98242), s = r(27746);
            function i(e) { let t, r = (0, n.c)(2), { children: l } = e; return r[0] !== l ? (t = (0, a.jsx)("div", { className: "pb-24", children: l }), r[0] = l, r[1] = t) : t = r[1], t; }
            function o(e) { let t, r, l, s, i = (0, n.c)(10), { title: o, description: u, action: c } = e; return i[0] !== o ? (t = (0, a.jsx)("h1", { className: "font-[family-name:var(--font-display)] text-[24px] font-bold leading-[1.2] tracking-[-0.03em] text-foreground", children: o }), i[0] = o, i[1] = t) : t = i[1], i[2] !== u ? (r = u ? (0, a.jsx)("p", { className: "mt-2.5 max-w-[64ch] text-[13.5px] leading-7 text-muted-foreground", children: u }) : null, i[2] = u, i[3] = r) : r = i[3], i[4] !== t || i[5] !== r ? (l = (0, a.jsxs)("div", { className: "min-w-[260px] flex-1", children: [t, r] }), i[4] = t, i[5] = r, i[6] = l) : l = i[6], i[7] !== c || i[8] !== l ? (s = (0, a.jsxs)("div", { className: "flex flex-wrap items-end gap-6 pb-1", children: [l, c] }), i[7] = c, i[8] = l, i[9] = s) : s = i[9], s; }
            function u(e) { let t, r, l, i = (0, n.c)(10), { title: o, hint: u, action: c, children: d, className: m } = e; return i[0] !== m ? (t = (0, s.cn)("border-t border-border/40 py-8 first:border-t-0", m), i[0] = m, i[1] = t) : t = i[1], i[2] !== c || i[3] !== u || i[4] !== o ? (r = o ? (0, a.jsxs)("div", { className: "mb-5 flex flex-wrap items-baseline gap-3", children: [(0, a.jsx)("h2", { className: "font-[family-name:var(--font-display)] text-[15px] font-semibold tracking-[-0.01em] text-foreground", children: o }), u ? (0, a.jsx)("span", { className: "text-xs text-muted-foreground", children: u }) : null, c ? (0, a.jsx)("div", { className: "ml-auto", children: c }) : null] }) : null, i[2] = c, i[3] = u, i[4] = o, i[5] = r) : r = i[5], i[6] !== d || i[7] !== t || i[8] !== r ? (l = (0, a.jsxs)("section", { className: t, children: [r, d] }), i[6] = d, i[7] = t, i[8] = r, i[9] = l) : l = i[9], l; }
            function c(e) { let t, r, s, i = (0, n.c)(6), { children: o } = e; return i[0] !== o ? (t = "grid grid-cols-2 border-y border-border/40 md:grid-cols-4", r = l.Children.toArray(o).map(d), i[0] = o, i[1] = t, i[2] = r) : (t = i[1], r = i[2]), i[3] !== t || i[4] !== r ? (s = (0, a.jsx)("div", { className: t, children: r }), i[3] = t, i[4] = r, i[5] = s) : s = i[5], s; }
            function d(e, t) { return (0, a.jsx)("div", { className: (0, s.cn)("border-border/40 px-5 py-4", t > 0 && "md:border-l", t % 4 == 0 && "md:pl-0", t % 2 == 1 && "max-md:border-l", t % 2 == 0 && "max-md:pl-0", t >= 2 && "max-md:border-t"), children: e }, t); }
            function m(e) { let t, r, l, s, i, o, u = (0, n.c)(17), { label: c, value: d, unit: m, note: p, loading: g } = e; return u[0] !== c ? (t = (0, a.jsx)("div", { className: "mb-1.5 text-[11.5px] tracking-[0.05em] text-muted-foreground", children: c }), u[0] = c, u[1] = t) : t = u[1], u[2] !== g || u[3] !== d ? (r = g ? (0, a.jsx)("span", { className: "text-muted-foreground", children: "—" }) : (0, a.jsx)("bdi", { dir: "ltr", children: d }), u[2] = g, u[3] = d, u[4] = r) : r = u[4], u[5] !== g || u[6] !== m ? (l = m && !g ? (0, a.jsx)("em", { className: "ml-1.5 text-[0.52em] font-medium not-italic text-muted-foreground", children: m }) : null, u[5] = g, u[6] = m, u[7] = l) : l = u[7], u[8] !== r || u[9] !== l ? (s = (0, a.jsxs)("div", { className: "font-[family-name:var(--font-display)] text-[25px] font-bold leading-[1.1] tracking-[-0.025em] text-foreground tabular-nums", children: [r, l] }), u[8] = r, u[9] = l, u[10] = s) : s = u[10], u[11] !== p ? (i = p ? (0, a.jsx)("div", { className: "mt-1 text-[11.5px] text-muted-foreground", children: p }) : null, u[11] = p, u[12] = i) : i = u[12], u[13] !== t || u[14] !== s || u[15] !== i ? (o = (0, a.jsxs)("div", { children: [t, s, i] }), u[13] = t, u[14] = s, u[15] = i, u[16] = o) : o = u[16], o; }
        }, 71814: (e, t, r) => {
            "use strict";
            r.d(t, { HA: () => d, Jf: () => c, Kt: () => i, Ol: () => s, RN: () => x, UK: () => l, d$: () => g, dh: () => p, eX: () => v, g3: () => m, gm: () => u, mn: () => o, mq: () => f, nB: () => h, op: () => n });
            var a = r(77648);
            function n(e) { if (null == e || "" === e)
                return 0; let t = "number" == typeof e ? e : Number.parseFloat(String(e).trim().replace(/[$,\s]/g, "")); return Number.isFinite(t) ? Math.abs(t) : 0; }
            function l(e) { return (0, a.H6)(n(e)); }
            function s(e) { if (null == e || "" === e)
                return (0, a.H6)(0); let t = "number" == typeof e ? e : Number.parseFloat(String(e)); return Number.isFinite(t) ? (0, a.H6)(Math.abs(t) / 1e6) : (0, a.H6)(0); }
            function i(e) { if (null == e || "" === e)
                return (0, a.H6)(0); let t = "number" == typeof e ? e : Number.parseFloat(String(e)); return Number.isFinite(t) ? (0, a.H6)(t / 1e6) : (0, a.H6)(0); }
            function o(e) { if (null == e || "" === e)
                return (0, a.H6)(0); let t = "number" == typeof e ? e : Number.parseFloat(String(e).trim().replace(/[$,\s]/g, "")); return Number.isFinite(t) ? (0, a.H6)(t) : (0, a.H6)(0); }
            function u(e) { return "number" != typeof e || !Number.isFinite(e) || e <= 0 ? "#—" : "#".concat(e); }
            function c(e, t) { let r = null == e ? void 0 : e.trim(); return r || ("number" == typeof t && Number.isFinite(t) && t > 0 ? "用户".concat(t) : "用户"); }
            function d(e, t) { let r = (null == e ? void 0 : e.trim()) || "用户"; return "number" == typeof t && Number.isFinite(t) && t > 0 ? "".concat(r, " #").concat(t) : r; }
            function m(e) { let t = (null != e ? e : "").trim().toLowerCase(); return !!t && (t.endsWith("@users.omniforge.ai") || t.endsWith("@team.local")); }
            function p(e) { let t = (null != e ? e : "").trim(); if (!t)
                return ""; let r = t.toLowerCase().match(/^phone-(\d+)@users\.omniforge\.ai$/); return r ? "手机 ".concat(r[1]) : m(t) ? t.split("@")[0] : t; }
            function g(e) { if (!e)
                return "—"; let t = new Date(e); return Number.isNaN(t.getTime()) ? e : t.toISOString().slice(0, 10); }
            function h(e) { let t = new Date(e); if (Number.isNaN(t.getTime()))
                return "—"; let r = e => String(e).padStart(2, "0"); return "".concat(r(t.getMonth() + 1), "-").concat(r(t.getDate()), " ").concat(r(t.getHours()), ":").concat(r(t.getMinutes())); }
            function f(e, t) { let r = e instanceof Date ? e : new Date(e); if (!Number.isFinite(r.getTime()))
                return ""; try {
                return new Intl.DateTimeFormat(t, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(r);
            }
            catch (e) {
                return r.toISOString();
            } }
            function x(e) { let t = (e || "").trim(); return t.length <= 4 ? t : t.length <= 8 ? "".concat(t.slice(0, 2), "****").concat(t.slice(-2)) : "".concat(t.slice(0, 3), "****").concat(t.slice(-4)); }
            function v(e) { return e >= 1e3 ? "".concat((e / 1e3).toFixed(1), "k") : String(e); }
        }, 79986: (e, t, r) => {
            "use strict";
            r.d(t, { t: () => l });
            let a = /^[\s]*[=+\-@]/, n = /^-\d+(\.\d+)?$/;
            function l(e, t) { let r, l = new Blob(["\uFEFF" + (r = e => { let t = a.test(e) && !n.test(e) ? "'".concat(e) : e; return '"'.concat(t.replace(/"/g, '""'), '"'); }, t.map(e => e.map(r).join(",")).join("\r\n"))], { type: "text/csv;charset=utf-8" }), s = URL.createObjectURL(l), i = document.createElement("a"); i.href = s, i.download = e, i.click(), URL.revokeObjectURL(s); }
        }, 82828: (e, t, r) => {
            "use strict";
            r.d(t, { c: () => l, k: () => s });
            var a = r(49136);
            function n(e, t) { return (...e) => { try {
                return t(...e);
            }
            catch (unused) {
                throw Error(void 0);
            } }; }
            let l = n(0, a.c3), s = n(0, a.kc);
        }, 85998: (e, t, r) => {
            "use strict";
            r.d(t, { IB: () => l, JP: () => i, oC: () => o });
            var a = r(1558);
            let n = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" });
            function l() { let e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : new Date, t = {}; for (let r of n.formatToParts(e))
                t[r.type] = r.value; return { date: "".concat(t.year, "-").concat(t.month, "-").concat(t.day), hour: Number(t.hour) }; }
            function s(e) { let [t, r, a] = l(e).date.split("-").map(Number); return new Date(t, r - 1, a, 12); }
            function i(e) { let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : new Date, r = s(t), n = new Date(r); return n.setDate(n.getDate() - (Math.max(1, Math.floor(e)) - 1)), { start: (0, a.hM)(n), end: (0, a.hM)(r) }; }
            function o(e) { let t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : new Date; return (0, a.jz)(e, s(t)); }
        }, 86884: (e, t, r) => {
            "use strict";
            var a = r(98242).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
            t.c = function (e) { return a.H.useMemoCache(e); };
        }, 91178: (e, t, r) => {
            "use strict";
            r.d(t, { A: () => a });
            let a = (0, r(14718).A)("hash", [["line", { x1: "4", x2: "20", y1: "9", y2: "9", key: "4lhtct" }], ["line", { x1: "4", x2: "20", y1: "15", y2: "15", key: "vyu0kd" }], ["line", { x1: "10", x2: "8", y1: "3", y2: "21", key: "1ggp8o" }], ["line", { x1: "16", x2: "14", y1: "3", y2: "21", key: "weycgp" }]]);
        }, 94847: (e, t, r) => { Promise.resolve().then(r.bind(r, 49880)), Promise.resolve().then(r.bind(r, 68735)); }, 95766: (e, t, r) => {
            "use strict";
            r.d(t, { default: () => i });
            var a = r(98242), n = { xmlns: "http://www.w3.org/2000/svg", width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }, l = r(27540);
            let s = (0, a.createContext)({}), i = (0, a.forwardRef)((e, t) => { var r, i, o; let { color: u, size: c, strokeWidth: d, absoluteStrokeWidth: m, className: p = "", children: g, iconNode: h } = e, f = _object_without_properties(e, ["color", "size", "strokeWidth", "absoluteStrokeWidth", "className", "children", "iconNode"]), { size: x = 24, strokeWidth: v = 2, absoluteStrokeWidth: b = !1, color: y = "currentColor", className: N = "" } = null != (r = (0, a.useContext)(s)) ? r : {}, w = (null != m ? m : b) ? 24 * Number(null != d ? d : v) / Number(null != c ? c : x) : null != d ? d : v; return (0, a.createElement)("svg", _object_spread(_object_spread_props(_object_spread({ ref: t }, n), { width: null != (i = null != c ? c : x) ? i : n.width, height: null != (o = null != c ? c : x) ? o : n.height, stroke: null != u ? u : y, strokeWidth: w, className: (0, l.z)("lucide", N, p) }), !g && !(e => { for (let t in e)
                if (t.startsWith("aria-") || "role" === t || "title" === t)
                    return !0; return !1; })(f) && { "aria-hidden": "true" }, f), [...h.map(e => { let [t, r] = e; return (0, a.createElement)(t, r); }), ...Array.isArray(g) ? g : [g]]); });
        } }, e => { e.O(0, [49136, 28976, 9517, 88617, 77648, 75515, 23810, 82302, 2293, 77358], () => e(e.s = 94847)), _N_E = e.O(); }]);
