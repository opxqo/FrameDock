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
(self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([[75515], { 12836: (e, i, n) => { n.d(i, { Cf: () => m, G3: () => p, PX: () => v, T9: () => h, VP: () => c, YR: () => g, bd: () => r, peekLogicalModel: () => f }); var t = n(88617), o = n(73397); let a = "tokengo.workspace.modelCatalog.v1", r = 3e4, s = null, l = null, d = null, u = null; function c() { return window.location.pathname.split("/").filter(Boolean)[0] || "unknown"; } function p() { if ((0, o.PE)())
            return null; try {
            let e = window.sessionStorage.getItem(a);
            if (!e)
                return null;
            let i = JSON.parse(e);
            if (1 !== i.version || i.locale !== c() || "number" != typeof i.savedAt || !Array.isArray(i.models))
                return null;
            return { models: i.models.filter(e => !!(null == e ? void 0 : e.id)), fresh: Date.now() - i.savedAt < r };
        }
        catch (e) {
            return null;
        } } function m(e) { if (0 !== e.length && !(0, o.PE)())
            try {
                let i = { version: 1, locale: c(), savedAt: Date.now(), models: e };
                window.sessionStorage.setItem(a, JSON.stringify(i));
            }
            catch (e) { } } function g() { let e = p(); if (null == e ? void 0 : e.models.length)
            return e.models.map(e => { var i; return { id: e.id, public_id: e.public_id, type: e.category, category: e.category, display_name: e.display_name || e.name, display_name_en: e.display_name_en, display_name_zh: e.display_name_zh, description: e.description, description_en: e.description_en, description_zh: e.description_zh, icon_key: e.icon_key, provider: e.provider, param_schema: null != (i = e.param_schema) ? i : {}, supported_vendors: [], tags: e.tags ? Array.from(e.tags) : [], capabilities: e.capabilities ? Array.from(e.capabilities) : [e.category, ...e.tags ? Array.from(e.tags) : []], video_input_max_mb: e.video_input_max_mb, deprecated: e.deprecated, deprecation_note: e.deprecation_note, available: e.available, unavailable_reason: e.unavailable_reason, special_tier_notice: e.special_tier_notice }; }); } function v() { var e; let i = (0, o.PE)() ? null == d ? void 0 : d.models : null != (e = null == l ? void 0 : l.models) ? e : g(); return i && 0 !== i.length ? new Set(i.map(e => e.id)) : null; } function f(e) { var i; let n = (e || "").trim().toLowerCase(); if (!n)
            return; let t = (0, o.PE)() ? null == d ? void 0 : d.models : null != (i = null == l ? void 0 : l.models) ? i : g(); return null == t ? void 0 : t.find(e => { var i; return e.id.trim().toLowerCase() === n || (null == (i = e.public_id) ? void 0 : i.trim().toLowerCase()) === n; }); } async function h(e, i) { var n; if ((0, o.PE)())
            return _(e); let a = null == (n = null == i ? void 0 : i.priced) || n; if (a && !e && l && Date.now() - l.savedAt < r)
            return l.models; if (a && !e && s)
            return s; let d = (async () => { let n = new Headers({ Accept: "application/json" }), o = await (0, t.Q2)(); o && n.set("Authorization", "Bearer ".concat(o)); let r = new URLSearchParams; e && r.set("type", e), !a && (null == i ? void 0 : i.retailRmb) && r.set("with_retail_rmb", "1"); let s = a ? "/api/v1/logical-models" : "/v1/logical-models", d = r.toString() ? "".concat(s, "?").concat(r.toString()) : s, u = await (0, t.u9)(d, { headers: n }, 15e3); if (!u.ok) {
            let e = Error("fetchLogicalModels failed: ".concat(u.status));
            throw e.status = u.status, e;
        } let c = await u.json(), p = Array.isArray(c.models) ? c.models : Array.isArray(c.data) ? c.data : []; return a && !e && (l = { savedAt: Date.now(), models: p }), p; })(); return a && !e ? s = d.finally(() => { s = null; }) : d; } async function _(e) { if (!e && d && Date.now() - d.savedAt < r)
            return d.models; if (!e && u)
            return u; let i = (async () => { let i = new Headers({ Accept: "application/json" }); i.set("X-Reseller-Brand-Host", window.location.host); let n = e ? "/api/v1/public/logical-models?type=".concat(encodeURIComponent(e)) : "/api/v1/public/logical-models", o = await (0, t.u9)(n, { headers: i }, 15e3); if (!o.ok) {
            let e = Error("fetchGuestLogicalModels failed: ".concat(o.status));
            throw e.status = o.status, e;
        } let a = await o.json(), r = Array.isArray(a.models) ? a.models : []; return e || (d = { savedAt: Date.now(), models: r }), r; })(); return e ? i : u = i.finally(() => { u = null; }); } }, 31785: (e, i, n) => { n.d(i, { G: () => a }); var t = n(69939); let o = { gpt: "GT", qwen: "Qwen", tts: "TTS", xai: "GK", xhigh: "XHigh" }; function a(e) { let i = new Set, n = []; for (let f of e) {
            var a, r, s, l, d, u, c, p, m, g, v;
            let e = (f.id || "").trim();
            if (!e || i.has(e))
                continue;
            i.add(e);
            let h = (0, t.Un)(e), _ = null != (a = f.capabilities) ? a : [], y = _.includes("image") ? "image" : _.includes("video") ? "video" : _.includes("audio") ? "audio" : void 0, b = (0, t.yo)(e), w = f.health_score, x = "number" == typeof w && Number.isFinite(w) && w >= 0 && w <= 100 ? Math.round(w) : void 0, k = /^\/zh(\b|[-_/])/i.test(window.location.pathname), z = k ? f.display_name_zh || f.display_name || f.display_name_en : f.display_name_en || f.display_name || f.display_name_zh, j = k ? f.description_zh || f.description || f.description_en : f.description_en || f.description || f.description_zh, M = k ? f.input_hint_zh || f.input_hint : f.input_hint || f.input_hint_zh;
            n.push({ id: e, name: z || (null == h ? void 0 : h.displayName) || function (e) { let i = (e || "").trim(); return i ? i.split(/[-_]/g).filter(Boolean).map(e => { let i = e.toLowerCase(); if (o[i])
                    return o[i]; if (/^\d+(\.\d+)?$/.test(e))
                    return e; let n = e.match(/^([a-z]+)(\d+(?:\.\d+)?)$/i); if (n) {
                    var t;
                    let [, e, i] = n, a = null != (t = o[e.toLowerCase()]) ? t : "".concat(e.charAt(0).toUpperCase()).concat(e.slice(1));
                    return "".concat(a, " ").concat(i);
                } return e.length <= 2 ? e.toUpperCase() : "".concat(e.charAt(0).toUpperCase()).concat(e.slice(1)); }).join(" ") : "Model"; }(e), provider: (null == h ? void 0 : h.provider) || (0, t.LX)(e, null != (r = f.owned_by) ? r : "unknown"), description: j || (null == h ? void 0 : h.description) || "", category: (null == h ? void 0 : h.category) || ("string" == typeof f.category && f.category.trim() ? f.category : y || b), display_name: z || (null == h ? void 0 : h.displayName), billing_mode: "string" == typeof f.billing_mode ? f.billing_mode : void 0, billing_unit: "string" == typeof f.billing_unit ? f.billing_unit : void 0, schema_ref: "string" == typeof f.schema_ref ? f.schema_ref : void 0, execution: f.execution && "object" == typeof f.execution ? { invoke: !!f.execution.invoke, submit: !!f.execution.submit, poll: !!f.execution.poll, stream: !!f.execution.stream } : void 0, input_price: "number" == typeof f.input_price_per_million && f.input_price_per_million > 0 ? f.input_price_per_million : 0, output_price: "number" == typeof f.output_price_per_million && f.output_price_per_million > 0 ? f.output_price_per_million : 0, unit_price_micro_usd: "number" == typeof f.unit_price_micro_usd && f.unit_price_micro_usd > 0 ? f.unit_price_micro_usd : void 0, max_tokens: "number" == typeof f.context_window && (null != (s = f.context_window) ? s : 0) > 0 ? f.context_window : 128e3, enabled: !0, health_score: x, available: "boolean" == typeof f.available ? f.available : void 0, unavailable_reason: "string" == typeof f.unavailable_reason ? f.unavailable_reason : void 0, deprecated: !0 === f.deprecated || void 0, deprecation_note: "string" == typeof f.deprecation_note ? f.deprecation_note : void 0, sort_weight: "number" == typeof f.sort_weight && Number.isFinite(f.sort_weight) ? f.sort_weight : void 0, capabilities: _, video_input_max_mb: (() => { let e = f.video_input_max_mb; return "number" == typeof e && Number.isFinite(e) ? e : void 0; })(), icon_key: null != (l = f.icon_key) ? l : void 0, public_id: null != (d = f.public_id) ? d : void 0, display_name_en: null != (u = f.display_name_en) ? u : void 0, display_name_zh: null != (c = f.display_name_zh) ? c : void 0, description_en: null != (p = f.description_en) ? p : void 0, description_zh: null != (m = null != (g = f.description_zh) ? g : null == h ? void 0 : h.descriptionZh) ? m : void 0, input_hint: (null == M ? void 0 : M.trim()) || void 0, special_tier_notice: null != (v = k ? f.special_tier_notice || f.special_tier_notice_en : f.special_tier_notice_en || f.special_tier_notice) ? v : void 0, param_schema: f.param_schema, tags: Array.isArray(f.tags) ? f.tags.filter(e => "string" == typeof e) : void 0 });
        } return n; } }, 33049: (e, i, n) => { function t(e) { return !0 !== e.deprecated; } function o(e) { return e.filter(t); } n.d(i, { o: () => t, v: () => o }); }, 36177: (e, i, n) => { function t(e) { return "".concat(e, "?v=").concat("2026091301"); } n.d(i, { Ty: () => o }); let o = { openai: t("/icons/providers/sculpted/openai.svg"), anthropic: t("/icons/providers/sculpted/claude.svg"), google: t("/icons/providers/sculpted/gemini.svg"), xai: t("/icons/providers/sculpted/grok.svg"), midjourney: t("/icons/providers/sculpted/midjourney.svg"), sora: t("/icons/providers/sculpted/sora.svg"), banana: t("/icons/providers/sculpted/banana.svg"), flux: t("/icons/providers/sculpted/flux.svg") }; }, 54521: (e, i, n) => { n.d(i, { $: () => a, _: () => r }); let t = "tokengo.workspace.lastModel.v1"; function o() { try {
            let e = window.localStorage.getItem(t);
            if (!e)
                return {};
            let i = JSON.parse(e);
            if (!i || "object" != typeof i || Array.isArray(i))
                return {};
            return i;
        }
        catch (e) {
            return {};
        } } function a(e) { let i = o()[e]; return "string" == typeof i && i.length > 0 ? i : null; } function r(e, i) { if (e && i)
            try {
                let n = o();
                if (n[e] === i)
                    return;
                n[e] = i, window.localStorage.setItem(t, JSON.stringify(n));
            }
            catch (e) { } } }, 69939: (e, i, n) => { n.d(i, { $A: () => v, $L: () => K, $v: () => b, Fs: () => I, GI: () => c, GS: () => y, K2: () => x, LX: () => B, Qn: () => ee, T5: () => E, Tr: () => F, Un: () => q, by: () => _, fh: () => W, fq: () => Q, pI: () => k, pg: () => H, xr: () => R, y7: () => $, yL: () => u, yo: () => V }); var t = n(36177), o = n(54521), a = n(12836), r = n(33049), s = n(31785); let l = ["seedance-2-0-manju-special", "seedance-2-0-official", "gpt-6-astra", "gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "claude-fable-5-1", "claude-fable-5", "claude-opus-4-8", "claude-sonnet-5", "gpt-5.5", "gemini-3.1-pro", "claude-opus-4-7", "deepseek-v4-pro", "grok-4-20-non-reasoning", "doubao-seed-2-0-pro", "gemini-3.1-flash-image", "gpt-image-2", "doubao-seedream-5-0", "grok-4.2-image", "mj_imagine", "gemini-3-pro-image", "imagen-4.0", "seedance-2-0-ecom-special", "seedance-2-5-manju-special", "seedance-2-0-express-special", "seedance-2-0-promo", "seedance-2-0-special", "doubao-seedance-2-0", "sora-2-official", "grok-imagine-1.5", "grok-imagine-video", "happyhorse-1-1", "happyhorse-1-0", "veo-4-omni", "veo-3.1", "grok-video-3", "kling-v3", "sora-2", "kling-v3-omni-cankao", "viduq3", "speech-2.8", "music", "gemini-3.1-flash-tts", "tts-1-hd", "gpt-5.4", "gemini-3-pro", "gpt-5.3-codex", "gpt-5.4-mini", "gpt-5.4-nano", "gemini-3-flash", "gemini-3.1-flash-lite", "claude-sonnet-4-6", "claude-haiku-4-5", "deepseek-v4-flash", "gpt-image-2-official", "gpt-image-1.5-all", "doubao-seedream-4-5", "qwen-image-2.0", "wan2.7-image", "grok-imagine-image", "aliyun-image-superres", "doubao-seedance-2-0-fast", "doubao-seedance-1-5-pro", "kling-v3-motion-control", "minimax-hailuo-2-3", "wan2.7-video", "tts-1", "gemini-2.5-pro-tts", "gpt-4o-mini-tts"], d = new Map(l.map((e, i) => [e, i])); function u(e) { if ("number" == typeof e.sort_weight && Number.isFinite(e.sort_weight))
            return e.sort_weight; let i = d.get(e.id); return void 0 !== i ? (l.length - i) * 10 : 0; } function c(e) { return [...e].sort((e, i) => { let n = +(!1 === e.available), t = +(!1 === i.available); if (n !== t)
            return n - t; let o = u(e), a = u(i); return o !== a ? a - o : e.id.localeCompare(i.id); }); } let p = { chat: ["claude-opus-4-8", "gpt-5.5", "claude-opus-4-7", "gemini-3.1-pro", "deepseek-v4-pro"], image: ["gpt-image-2", "gemini-3.1-flash-image", "doubao-seedream-5-0", "grok-4.2-image", "gemini-3-pro-image", "mj_imagine"], video: ["veo-3.1", "veo-4-omni", "sora-2", "grok-video-3", "doubao-seedance-2-0", "viduq3"], audio: ["speech-2.8", "gemini-3.1-flash-tts", "music", "tts-1-hd"] }, m = { openai: t.Ty.openai, anthropic: t.Ty.anthropic, google: t.Ty.google, gemini: t.Ty.google, xai: t.Ty.xai, grok: t.Ty.xai, deepseek: "/icons/providers/external/deepseek.svg", alibaba: "/icons/providers/external/qwen.svg", qwen: "/icons/providers/external/qwen.svg", aliyun: "/icons/providers/external/qwen.svg", bytedance: "/icons/providers/external/doubao.svg", doubao: "/icons/providers/external/doubao.svg", jimeng: "/icons/providers/external/jimeng.svg", minimax: "/icons/providers/external/minimax.svg", hailuo: "/icons/providers/external/minimax.svg", midjourney: t.Ty.midjourney, zhipu: "/icons/providers/external/zai.svg", glm: "/icons/providers/external/zai.svg", kuaishou: "/icons/providers/external/kling.svg", kling: "/icons/providers/external/kling.svg", vidu: "/icons/providers/external/vidu-icon.svg", sora: t.Ty.sora, banana: t.Ty.banana, nano: t.Ty.banana, happyhorse: "/icons/providers/external/happyhorse.svg", suno: "/icons/providers/external/suno.svg", moonshot: "/icons/providers/external/moonshot_bai.svg", kimi: "/icons/providers/external/moonshot_bai.svg", flux: t.Ty.flux, bfl: t.Ty.flux, pixverse: "/icons/providers/external/PixVerse.svg", "face-repaint": "/icons/providers/external/face-repaint_bai.svg", "video-edit": "/icons/providers/external/video-edit.svg" }, g = e => e ? m[e.trim().toLowerCase()] : void 0; function v(e) { return !e.startsWith("/icons/providers/sculpted/") && /(?:_bai|Grok_bai|vidu|midjourney|Mj\.svg|happyhorse|suno|zai)/i.test(e); } let f = new Map, h = []; function _(e) { let i = new Map; for (let n of null != e ? e : []) {
            if (!(null == n ? void 0 : n.id))
                continue;
            let e = n.id.trim().toLowerCase();
            if (!e)
                continue;
            let t = n.category || n.type, o = "image" === t || "video" === t || "audio" === t ? t : "chat", a = T(e), r = /^\/zh(\b|[-_/])/i.test(window.location.pathname), s = r ? n.display_name_zh || n.display_name || n.display_name_en : n.display_name_en || n.display_name || n.display_name_zh, l = r ? n.description_zh || n.description || n.description_en : n.description_en || n.description || n.description_zh;
            i.set(e, { displayName: s || a, provider: n.provider || U(e) || "openai", category: o, description: l || "", descriptionZh: n.description_zh, iconSrc: g(n.icon_key) });
        } f = i, h = Array.from(i.keys()).sort((e, i) => i.length - e.length); } function y(e) { let i = "number" == typeof e ? e : null == e ? void 0 : e.health_score; if ("number" == typeof i && Number.isFinite(i) && !(i < 0) && !(i > 100))
            return Math.round(i); } function b(e) { let i = y(e); return void 0 === i ? 100 : Math.max(75, i); } let w = { "seedance-2-0-official": "站长推荐", "seedance-2-5": "站长推荐", "seedance-2-5-promo": "站长推荐", "minimax-h3": "站长推荐" }; function x(e) { if (e)
            return w[e]; } let k = new Set(["doubao-seedance-2-0-mini"]), z = /(?:dall-e|gpt-image|midjourney|^mj[-_]|imagine|stable[-\s]?diffusion|sd[-\s]?\d|flux|nano[-\s]?banana|seedream|wanx|jimeng-5|image)/i, j = /(?:sora|kling|grok-video|video|vidu|veo|seedance|jimeng-3\.5|jimeng-4|jimeng-5-video|wanx-video|wan\d|hailuo-2|MiniMax-Hailuo)/i, M = /(?:tts|speech|voice|audio|whisper|music|clone|doubao.*voice|doubao.*speech|minimax.*music)/i, A = /[�]|锟|鈥|銆|锛|鍙|妯|鐢|璇|閫|鎺|绯|鍥|浜|瑙|闀|鏇/, C = e => !!(e && A.test(e)), S = { chatgpt: "GT", gpt: "GT", claude: "CL", gemini: "GM", grok: "GK", sora: "SR", veo: "VO", flux: "FX", midjourney: "MJ", mj: "MJ", "nano-banana": "NB" }, L = /^(chatgpt|gpt|claude|gemini|grok|sora|veo|flux|midjourney|mj|nano-banana)(?=[-_]|$)/i; function T(e) { let i = (e || "").trim(); if (!i)
            return "Model"; let n = i, t = (n = (n = n.replace(/[-_]\d{6,}$/, "")).replace(L, (e, i) => { var n; return null != (n = S[i.toLowerCase()]) ? n : i; })).split(/[-_]/g).filter(Boolean), o = [], a = 0; for (; a < t.length;)
            /^\d+$/.test(t[a]) && a + 1 < t.length && /^\d+$/.test(t[a + 1]) ? (o.push("".concat(t[a], ".").concat(t[a + 1])), a += 2) : (o.push(t[a]), a += 1); return o.map(e => /^\d+(\.\d+)?$/.test(e) ? e : e.length <= 2 ? e.toUpperCase() : e[0].toUpperCase() + e.slice(1)).join(" "); } let G = { image: (e, i) => "".concat(e, " is an ").concat(i, " image model suited for high-quality visual generation and iterative art direction."), video: (e, i) => "".concat(e, " is an ").concat(i, " video model built for short-form generation, scene continuity, and production-ready motion output."), audio: (e, i) => "".concat(e, " is an ").concat(i, " audio model suited for speech, voice, and soundtrack generation workflows."), chat: (e, i) => "".concat(e, " is an ").concat(i, " reasoning and chat model designed for demanding workspace conversations and production tasks.") }; function N(e) { let i = (e || "").trim().toLowerCase(); if (!i)
            return; let n = f.get(i); if (n)
            return n; let t = h.find(e => i.includes(e)); if (!t)
            return; let o = f.get(t); if (o)
            return _object_spread_props(_object_spread({}, o), { displayName: "", description: "", descriptionZh: void 0 }); } function q(e) { let i = N(e); if (i)
            return i.displayName ? function (e, i) { if (!i)
                return; let n = C(i.displayName) ? T(e) : i.displayName, t = C(i.description) ? G[i.category](n, (i.provider || "AI").toUpperCase()) : i.description; return _object_spread_props(_object_spread({}, i), { displayName: n, description: t }); }(e, i) : i; } function $(e) { let i = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : "", n = arguments.length > 2 ? arguments[2] : void 0, t = q(e); return t ? n && n.toLowerCase().startsWith("zh") && t.descriptionZh ? t.descriptionZh : t.description || i : i; } function I(e, i) { var n; return (null == (n = N(e)) ? void 0 : n.iconSrc) || function (e) { let i = (e || "").trim().toLowerCase(); if (i) {
            if (/(nano[-_ ]?banana|banana)/.test(i))
                return m.banana;
            if (/^(qwen|wan-|wan2|wan3|wanx|tongyi)|qwen|wanx/.test(i) || /^aliyun/.test(i))
                return m.qwen;
            if (/happyhorse/.test(i))
                return m.happyhorse;
            if (/^seedance-video-edit/.test(i))
                return m["video-edit"];
            if (/^(ecom-allpurpose-video|wanneng-video)/.test(i) || /(doubao|seedream|seedance|bytedance)/.test(i))
                return m.doubao;
            if (/(glm|chatglm|zhipu)/.test(i))
                return m.glm;
            if (/(jimeng|即梦)/.test(i))
                return m.jimeng;
            if (/(kling|kwvideo|keling|可灵)/.test(i))
                return m.kling;
            if (/suno/.test(i) || /^music$/.test(i))
                return m.suno;
            if (/(kimi|moonshot)/.test(i))
                return m.moonshot;
            if (/(hailuo|minimax|speech-|music-|voice-design|voice-clone)/.test(i))
                return m.hailuo;
            if (/(face-repaint|人脸转绘)/.test(i))
                return m["face-repaint"];
            if (/(pixverse)/.test(i))
                return m.pixverse;
            if (/(vidu|viduq)/.test(i))
                return m.vidu;
            if (/(sora)/.test(i))
                return m.sora;
            if (/(grok|xai)/.test(i))
                return m.xai;
            if (/(claude|anthropic)/.test(i))
                return m.anthropic;
            if (/(gemini|gemma|veo|imagen|google)/.test(i))
                return m.google;
            if (/(deepseek)/.test(i))
                return m.deepseek;
            if (/(midjourney|mj[-_])/.test(i))
                return m.midjourney;
            if (/flux/.test(i))
                return m.flux;
            if (/(gpt|chatgpt|dall-e|tts|whisper|openai|codex)/.test(i))
                return m.openai;
        } }(e) || i; } let P = [[/(seedance-video-edit)/i, "自研"], [/(suno)/i, "Suno 音乐"], [/(happyhorse|快乐马)/i, "HappyHorse"], [/(voice-design|voice-clone|音色设计)/i, "MiniMax 海螺"], [/(claude|anthropic)/i, "CL 系列"], [/(gemini|gemma|veo|imagen|google|nano[-_ ]?banana)/i, "GM 系列"], [/(deepseek)/i, "深度求索"], [/(grok|xai)/i, "GK 系列"], [/(doubao|seedream|seedance|bytedance)/i, "火山引擎"], [/(qwen|wan-|wan2|wan3|wanx|tongyi)/i, "通义千问"], [/(kling|kwvideo|keling)/i, "可灵视频"], [/(hailuo|minimax|speech-|music-)/i, "MiniMax 海螺"], [/(face-repaint)/i, "人脸转绘"], [/(pixverse)/i, "PixVerse 视频"], [/(vidu|viduq)/i, "Vidu 视频"], [/(midjourney|mj[-_])/i, "MJ 图像"], [/(jimeng)/i, "即梦"], [/(gpt-image|dall-e)/i, "GT 图像模型"], [/(sora)/i, "SR 视频模型"], [/(tts|whisper)/i, "GT 音频模型"], [/(gpt|chatgpt|openai)/i, "GT 对话模型"]]; function F(e) { let i = "string" == typeof e ? e : "".concat(e.id || "", " ").concat(e.name || "", " ").concat(e.provider || ""); for (let [e, n] of P)
            if (e.test(i))
                return n; } let J = [[/^suno/, "suno"], [/^music$/, "suno"], [/^happyhorse/, "alibaba"], [/^voice-(design|clone)/, "minimax"], [/^sora/, "sora"], [/^(gpt|chatgpt|dall-e|o[134]|tts|whisper|text-embedding|text-moderation|omni-moderation)/, "openai"], [/^claude/, "anthropic"], [/^(gemini|gemma|veo|nano-banana|imagen)/, "google"], [/^deepseek/, "deepseek"], [/^(glm|chatglm)/, "glm"], [/^grok/, "xai"], [/^aliyun/, "aliyun"], [/^(qwen|wan-|wan2|wan3|wanx|tongyi)|wanx/, "alibaba"], [/^(ecom-allpurpose-video|wanneng-video|seedance-video-edit)/, "自研"], [/^(doubao|seedance|seedream|ud-|jimeng)/, "bytedance"], [/^(midjourney|mj-|mj_)/, "midjourney"], [/^flux/, "bfl"], [/^(kling|kwvideo)|keling/, "kuaishou"], [/^(hailuo|minimax|speech-|music-)/, "minimax"], [/^(pix|pixverse)/, "pixverse"], [/^(vidu|viduq)/, "vidu"], [/^(ernie|wenxin)/, "baidu"], [/^yi-/, "01ai"], [/^(moonshot|kimi)/, "moonshot"], [/^baichuan/, "baichuan"], [/^spark/, "iflytek"], [/^step-/, "stepfun"]]; function U(e) { for (let [i, n] of J)
            if (i.test(e))
                return n; } function B(e) { var i; let n = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : "openai", t = N(e); if (null == t ? void 0 : t.provider)
            return t.provider; let o = (e || "").toLowerCase(); return o && null != (i = U(o)) ? i : (n || "openai").toLowerCase(); } let D = { "01ai": { zh: "零一万物", en: "01.AI" }, alibaba: { zh: "阿里巴巴", en: "Alibaba" }, aliyun: { zh: "阿里云", en: "Alibaba Cloud" }, anthropic: { zh: "CL 系列", en: "CL Series" }, baichuan: { zh: "百川智能", en: "Baichuan" }, baidu: { zh: "百度", en: "Baidu" }, bfl: { zh: "FX 系列", en: "FX Series" }, bytedance: { zh: "字节跳动", en: "ByteDance" }, deepseek: { zh: "DeepSeek", en: "DeepSeek" }, glm: { zh: "智谱 AI", en: "Zhipu AI" }, google: { zh: "GM 系列", en: "GM Series" }, iflytek: { zh: "科大讯飞", en: "iFlytek" }, jimeng: { zh: "即梦", en: "Jimeng" }, kuaishou: { zh: "快手", en: "Kuaishou" }, midjourney: { zh: "MJ", en: "MJ" }, minimax: { zh: "MiniMax", en: "MiniMax" }, moonshot: { zh: "月之暗面", en: "Moonshot" }, openai: { zh: "GT 系列", en: "GT Series" }, pixverse: { zh: "PixVerse", en: "PixVerse" }, sora: { zh: "SR 系列", en: "SR Series" }, stepfun: { zh: "阶跃星辰", en: "StepFun" }, suno: { zh: "Suno", en: "Suno" }, vidu: { zh: "Vidu", en: "Vidu" }, xai: { zh: "GK 系列", en: "GK Series" }, 自研: { zh: "自研", en: "In-house" } }; function E(e) { let i = (e || "").trim().toLowerCase(); if (i)
            return U(i); } function R(e, i) { let n = (e || "").trim().toLowerCase(); if (!n || "unknown" === n)
            return ""; let t = D[n]; return t ? i.toLowerCase().startsWith("zh") ? t.zh : t.en : n.charAt(0).toUpperCase() + n.slice(1); } function V(e) { if ("string" != typeof e) {
            if ("image" === e.category || "video" === e.category || "audio" === e.category)
                return e.category;
            let i = X(e.id || e.name);
            if (i)
                return i;
            let n = N(e.id || e.name);
            return n ? n.category : e.category && "embedding" !== e.category ? e.category : V("".concat(e.id, " ").concat(e.name, " ").concat(e.provider));
        } let i = N(e); return i ? i.category : X(e) || "chat"; } function X(e) { let i = (e || "").toLowerCase(); if (i) {
            if (M.test(i))
                return "audio";
            if (j.test(i))
                return "video";
            if (z.test(i))
                return "image";
        } } function H(e) { return "image" === e ? "/image" : "video" === e ? "/video" : "audio" === e ? "/audio" : "/chat"; } function K(e) { var i; let n = (e || "").trim(); return n ? (null == (i = q(n)) ? void 0 : i.displayName) || T(n) : "Model"; } let O = new Map; function Z(e, i) { let n = O.get(i); if ((null == n ? void 0 : n.source) === e)
            return n.model; let t = JSON.stringify(e); if ((null == n ? void 0 : n.signature) === t)
            return O.set(i, _object_spread_props(_object_spread({}, n), { source: e })), n.model; let o = (0, s.G)([_object_spread_props(_object_spread({}, e), { id: i })])[0]; return O.set(i, { source: e, signature: t, model: o }), o; } function Q(e) { var i; return !!(null == e || null == (i = e.tags) ? void 0 : i.includes("asr")); } function W(e) { var i; return !!(null == e || null == (i = e.tags) ? void 0 : i.includes("voice-creation")); } function Y(e, i) { return V(e) === i && !("audio" === i && Q(e)); } function ee(e, i, n) { let t = (0, a.peekLogicalModel)(i), s = (null == t ? void 0 : t.deprecated) === !0 ? Z(t, i) : e.find(e => e.id === i); if (s && Y(s, n))
            return s; let l = (0, o.$)(n); if (l) {
            let i = (0, a.peekLogicalModel)(l), t = (null == i ? void 0 : i.deprecated) === !0 ? Z(i, l) : e.find(e => e.id === l);
            if (t && Y(t, n))
                return t;
        } let d = (0, r.v)(e); for (let e of p[n] || []) {
            let i = d.find(i => i.id === e);
            if (i)
                return i;
        } return d.find(e => Y(e, n)); } } }]);
