(self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([[75165, 94167], { 3262: () => { }, 48565: (e, t, n) => {
            "use strict";
            n.d(t, { AuthGate: () => A });
            var r = n(31434), i = n(47266), a = n(13062), s = n(98242), o = n(82828), l = n(49136), c = n(566), u = n(12752), d = n(94800), m = n(10408), h = n(95542), f = n(50586), b = n(35973), p = n(98687), v = n(13285);
            let g = "tokengo.duplicate-account-notice.dismissed";
            function x() { let e, t, n, a, l, c, u, d, p, x, j, k, w, P, _, S, N = (0, i.c)(30), { data: C } = (0, b.i)(), A = (0, o.c)("auth.duplicateAccount"), [L, E] = (0, s.useState)(!0); N[0] === Symbol.for("react.memo_cache_sentinel") ? (e = () => { E(function () { try {
                return "1" === window.localStorage.getItem(g);
            }
            catch (e) {
                return !1;
            } }()); }, t = [], N[0] = e, N[1] = t) : (e = N[0], t = N[1]), (0, s.useEffect)(e, t), N[2] !== L || N[3] !== C ? (n = function (e) { if (!e)
                return !1; let t = (e.email || "").toLowerCase(); return t.startsWith("phone-") && t.endsWith("@users.omniforge.ai") && !1 === e.is_password_set; }(C) && !L, N[2] = L, N[3] = C, N[4] = n) : n = N[4]; let I = n; N[5] === Symbol.for("react.memo_cache_sentinel") ? (a = ["user", "possible-duplicate"], N[5] = a) : a = N[5], N[6] !== I ? (l = { queryKey: a, queryFn: y, enabled: I, staleTime: 1 / 0, refetchOnWindowFocus: !1, retry: !1 }, N[6] = I, N[7] = l) : l = N[7]; let { data: T } = (0, m.I)(l); N[8] === Symbol.for("react.memo_cache_sentinel") ? (c = () => { E(!0); try {
                window.localStorage.setItem(g, "1");
            }
            catch (e) { } }, N[8] = c) : c = N[8]; let R = c; return I && (null == T ? void 0 : T.found) && T.masked_email ? (N[9] === Symbol.for("react.memo_cache_sentinel") ? (u = (0, r.jsx)(h.A, { className: "h-4 w-4 shrink-0 text-muted-foreground", "aria-hidden": "true" }), N[9] = u) : u = N[9], N[10] !== T.masked_email || N[11] !== A ? (d = A("body", { email: T.masked_email }), N[10] = T.masked_email, N[11] = A, N[12] = d) : d = N[12], N[13] !== d ? (p = (0, r.jsx)("span", { className: "min-w-0 flex-1", children: d }), N[13] = d, N[14] = p) : p = N[14], N[15] !== A ? (x = A("action"), N[15] = A, N[16] = x) : x = N[16], N[17] !== x ? (j = (0, r.jsx)(v.$, { asChild: !0, size: "sm", variant: "secondary", children: (0, r.jsx)("a", { href: "/login", children: x }) }), N[17] = x, N[18] = j) : j = N[18], N[19] !== A ? (k = A("dismiss"), N[19] = A, N[20] = k) : k = N[20], N[21] === Symbol.for("react.memo_cache_sentinel") ? (w = (0, r.jsx)(f.A, { className: "h-4 w-4", "aria-hidden": "true" }), N[21] = w) : w = N[21], N[22] !== k ? (P = (0, r.jsx)(v.$, { size: "sm", variant: "ghost", onClick: R, "aria-label": k, children: w }), N[22] = k, N[23] = P) : P = N[23], N[24] !== j || N[25] !== P ? (_ = (0, r.jsxs)("span", { className: "flex shrink-0 items-center gap-2", children: [j, P] }), N[24] = j, N[25] = P, N[26] = _) : _ = N[26], N[27] !== _ || N[28] !== p ? (S = (0, r.jsxs)("div", { role: "status", className: "flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border/60 bg-card/80 px-4 py-2.5 text-sm text-foreground", children: [u, p, _] }), N[27] = _, N[28] = p, N[29] = S) : S = N[29], S) : null; }
            function y() { return p.i.getPossibleDuplicate(); }
            var j = n(87574), k = n(66855), w = n(28839), P = n(73397);
            let _ = e => new Promise(t => { setTimeout(t, e); });
            async function S() { var e, t, n, r; let i = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {}, a = null != (e = i.fetchImpl) ? e : (e, t) => fetch(e, t), s = null != (t = i.sleep) ? t : _, o = null != (n = i.attempts) ? n : 3; for (let e = 0; e < o; e++) {
                let t = await N(a);
                if ("unknown" !== t)
                    return t;
                e < o - 1 && await s((r = e, Math.min(700 * 2 ** r, 3e3)));
            } return "unknown"; }
            async function N(e) { let t = new AbortController, n = setTimeout(() => t.abort(), 1e4); try {
                var r;
                let n = await e("/api/auth/session", { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" }, signal: t.signal });
                if (!n.ok)
                    return "unknown";
                return (r = await n.json(), "object" == typeof r && null !== r && r.user) ? "authenticated" : "anonymous";
            }
            catch (e) {
                return "unknown";
            }
            finally {
                clearTimeout(n);
            } }
            let C = (0, w.default)(() => Promise.all([n.e(61657), n.e(59347), n.e(66712), n.e(68216), n.e(44583), n.e(32181), n.e(97337)]).then(n.bind(n, 87)).then(e => e.InlineLoginHost), { loadableGenerated: { webpack: () => [87] }, ssr: !1 });
            function A(e) { let t, n, m, h, f, b, p = (0, i.c)(36), { children: v } = e, { status: g } = (0, a.wV)(), y = (0, o.c)("auth"), w = (0, l.Ym)(), _ = (0, c.usePathname)(), N = (0, c.useRouter)(), A = _ || "/", [I, T] = (0, s.useState)(!1), R = (0, s.useRef)(0), [U, q] = (0, s.useState)(0); p[0] !== A || p[1] !== w || p[2] !== _ || p[3] !== N || p[4] !== g ? (t = () => { let e; if ("unauthenticated" !== g) {
                R.current = 0, "authenticated" === g && ((0, P.G9)(), (0, P.L9)(!1), T(!1));
                return;
            } let t = !1, n = w === u.q ? "/login" : "/".concat(w, "/login"); return S().then(async (r) => { if (t)
                return; if ("anonymous" === r) {
                if ((0, P.ti)() && (0, P.Qu)(_) || (0, d.jt)(_)) {
                    (0, P.L9)(!0), T(!0);
                    return;
                }
                (0, P.L9)(!1), T(!1), N.replace("".concat(n, "?callbackUrl=").concat(encodeURIComponent(A)));
                return;
            } if ("authenticated" === r && (await (0, a.Ht)().catch(E), t))
                return; let i = R.current; !(i >= 8) && (e = setTimeout(() => { R.current = i + 1, q(L); }, Math.min(1e3 * 2 ** i, 3e4))); }), () => { t = !0, e && clearTimeout(e); }; }, p[0] = A, p[1] = w, p[2] = _, p[3] = N, p[4] = g, p[5] = t) : t = p[5], p[6] !== A || p[7] !== w || p[8] !== _ || p[9] !== U || p[10] !== N || p[11] !== g ? (n = [A, w, _, N, g, U], p[6] = A, p[7] = w, p[8] = _, p[9] = U, p[10] = N, p[11] = g, p[12] = n) : n = p[12], (0, s.useEffect)(t, n); let F = (0, s.useRef)(!1); if (p[13] === Symbol.for("react.memo_cache_sentinel") ? (m = () => (F.current = !0, () => { F.current = !1, setTimeout(() => { F.current || (0, P.L9)(!1); }, 0); }), h = [], p[13] = m, p[14] = h) : (m = p[13], h = p[14]), (0, s.useEffect)(m, h), (0, d.jt)(_) && ("authenticated" === g || I)) {
                let e, t, n = "authenticated" !== g;
                return n && (0, P.L9)(!0), p[15] !== A || p[16] !== n ? (e = n ? (0, r.jsx)(C, { callbackUrl: A }) : (0, r.jsx)(x, {}), p[15] = A, p[16] = n, p[17] = e) : e = p[17], p[18] !== v || p[19] !== n || p[20] !== e ? (t = (0, r.jsxs)(j.Qh, { value: n, children: [e, v] }), p[18] = v, p[19] = n, p[20] = e, p[21] = t) : t = p[21], t;
            } if (I && "authenticated" !== g) {
                let e;
                return (0, P.m$)(y("guestPreview.blocked")), (0, P.L9)(!0), p[22] !== A || p[23] !== v ? (e = (0, r.jsx)(j.Qh, { value: !0, children: (0, r.jsx)(k.JX, { callbackUrl: A, children: v }) }), p[22] = A, p[23] = v, p[24] = e) : e = p[24], e;
            } if ("loading" === g) {
                let e, t;
                return p[25] !== y ? (e = y("phoneLogin.loading"), p[25] = y, p[26] = e) : e = p[26], p[27] !== e ? (t = (0, r.jsx)("div", { className: "flex min-h-screen items-center justify-center bg-background", children: (0, r.jsx)("div", { className: "text-sm text-muted-foreground", children: e }) }), p[27] = e, p[28] = t) : t = p[28], t;
            } if ("unauthenticated" === g) {
                let e, t;
                return p[29] !== y ? (e = y("phoneLogin.loading"), p[29] = y, p[30] = e) : e = p[30], p[31] !== e ? (t = (0, r.jsx)("div", { className: "flex min-h-screen items-center justify-center bg-background", children: (0, r.jsx)("div", { className: "text-sm text-muted-foreground", children: e }) }), p[31] = e, p[32] = t) : t = p[32], t;
            } return p[33] === Symbol.for("react.memo_cache_sentinel") ? (f = (0, r.jsx)(x, {}), p[33] = f) : f = p[33], p[34] !== v ? (b = (0, r.jsxs)(r.Fragment, { children: [f, v] }), p[34] = v, p[35] = b) : b = p[35], b; }
            function L(e) { return e + 1; }
            function E() { return null; }
        }, 62412: (e, t, n) => {
            "use strict";
            n.d(t, { ApiPlatformSurfaceProvider: () => o, u: () => l });
            var r = n(31434), i = n(47266), a = n(98242);
            let s = (0, a.createContext)(!1);
            function o(e) { let t, n = (0, i.c)(2), { children: a } = e; return n[0] !== a ? (t = (0, r.jsx)(s.Provider, { value: !0, children: a }), n[0] = a, n[1] = t) : t = n[1], t; }
            function l() { return (0, a.useContext)(s); }
        }, 84963: (e, t, n) => { Promise.resolve().then(n.bind(n, 91062)), Promise.resolve().then(n.bind(n, 46003)), Promise.resolve().then(n.bind(n, 25037)), Promise.resolve().then(n.bind(n, 93381)), Promise.resolve().then(n.bind(n, 55529)), Promise.resolve().then(n.bind(n, 30792)), Promise.resolve().then(n.bind(n, 29156)), Promise.resolve().then(n.bind(n, 62452)), Promise.resolve().then(n.bind(n, 48689)), Promise.resolve().then(n.bind(n, 75473)), Promise.resolve().then(n.bind(n, 48565)), Promise.resolve().then(n.bind(n, 62412)), Promise.resolve().then(n.bind(n, 27021)), Promise.resolve().then(n.bind(n, 78267)), Promise.resolve().then(n.bind(n, 83774)), Promise.resolve().then(n.bind(n, 53990)), Promise.resolve().then(n.bind(n, 68853)), Promise.resolve().then(n.t.bind(n, 3262, 23)); }, 94800: (e, t, n) => {
            "use strict";
            function r(e) { return null !== i(e); }
            function i(e) { if (!e)
                return null; let t = e.split("/").filter(Boolean), n = t.indexOf("vibeapp"); return n < 0 || "app" !== t[n + 1] ? null : t[n + 2] || null; }
            function a(e, t) { let n = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : ""; return "/".concat(e).concat(s(t)).concat(n ? "#".concat(n) : ""); }
            function s(e) { return "/vibeapp/app/".concat(e); }
            n.d(t, { AG: () => r, CE: () => s, K5: () => o, Sq: () => l, jt: () => i, o6: () => a });
            let o = "app";
            function l(e, t) { let n = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : "", r = "/".concat(e, "/apps/").concat(t); return n ? "".concat(r, "?").concat("page", "=").concat(encodeURIComponent(n).replace(/%2F/gi, "/")) : r; }
        }, 95542: (e, t, n) => {
            "use strict";
            n.d(t, { A: () => r });
            let r = (0, n(14718).A)("info", [["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }], ["path", { d: "M12 16v-4", key: "1dtifu" }], ["path", { d: "M12 8h.01", key: "e9boi3" }]]);
        } }, e => { e.O(0, [11390, 5711, 21780, 63995, 49136, 28976, 9517, 49680, 65989, 83355, 13062, 5080, 17338, 18527, 11766, 30503, 256, 64132, 98535, 19107, 6377, 88617, 77648, 21047, 74899, 74838, 60385, 15531, 85497, 53652, 5102, 99394, 74284, 30726, 78267, 82302, 2293, 77358], () => e(e.s = 84963)), _N_E = e.O(); }]);
