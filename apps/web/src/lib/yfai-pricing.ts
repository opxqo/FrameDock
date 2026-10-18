import type { PriceLabel } from "./autodl-pricing";
export type YfaiPrice = { price: number; max?: number; freeze?: number };
let prices: Record<string, YfaiPrice> = {};
export function setLiveYfaiPrices(value?: Record<string, YfaiPrice>) { prices = value || {}; }
export function describeYfaiPrice(model: string): PriceLabel | null {
    if (!model.startsWith("yfai::")) return null;
    const quote = prices[model.slice(6)];
    if (!quote || !Number.isFinite(quote.price)) return null;
    return { member: `≈ ¥${Number(quote.price.toFixed(quote.price < 1 ? 3 : 2))}/次`, approximate: true, note: "YFAI · 默认参数估价 / Default parameters; actual cost depends on parameters and references" };
}

/** Default-parameter estimate for a model id (without the `yfai::` prefix): what YFAI would hold back while the task runs. */
export function getYfaiQuote(modelId: string): YfaiPrice | undefined { return prices[modelId.replace(/^yfai::/, "")]; }
