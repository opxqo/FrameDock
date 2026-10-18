// FrameDock: outbound HTTP for the job engine. Same connection settings as proxy.ts (copied, not shared,
// so the proxy stays untouched while the call log is being built): long timeouts for slow relays, and
// HTTPS_PROXY / NO_PROXY honoured because undici's fetch ignores them by default.
import { Agent, EnvHttpProxyAgent, fetch, type RequestInit } from "undici";

export const UPSTREAM_TIMEOUT_MS = 20 * 60 * 1000;

const options = {
  headersTimeout: UPSTREAM_TIMEOUT_MS,
  bodyTimeout: UPSTREAM_TIMEOUT_MS,
  connectTimeout: 30_000,
};
const dispatcher =
  process.env.HTTPS_PROXY || process.env.https_proxy
    ? new EnvHttpProxyAgent(options)
    : new Agent(options);

export function upstreamFetch(url: string, init: RequestInit = {}) {
  return fetch(url, { ...init, dispatcher });
}
