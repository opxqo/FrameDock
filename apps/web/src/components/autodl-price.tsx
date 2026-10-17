import { Tooltip } from "antd";

import { cn } from "@/lib/utils";
import { describeAutodlPrice, estimateAutodlCost, formatQuote, type CostParams, type PriceLabel } from "@/lib/autodl-pricing";

// FrameDock: member price first, original price struck through next to it (AutoDL pricing).
export function PriceText({ label, className, prefix }: { label: PriceLabel | null; className?: string; prefix?: string }) {
    if (!label) return null;
    const content = (
        <span className={cn("tnum inline-flex shrink-0 items-baseline gap-1 whitespace-nowrap", className)}>
            {prefix ? <span>{prefix}</span> : null}
            <span>{label.member}</span>
            {label.original ? <span className="text-[0.9em] line-through opacity-50">{label.original}</span> : null}
        </span>
    );
    const title = [label.original ? "会员价，划线为原价" : "", label.note || ""].filter(Boolean).join("；");
    return title ? <Tooltip title={title}>{content}</Tooltip> : content;
}

/** Unit price of a model, e.g. in model lists and pickers. */
export function ModelPrice({ model, className }: { model: string; className?: string }) {
    return <PriceText label={describeAutodlPrice(model)} className={className} />;
}

/** Estimated cost of the next generation with the current settings. */
export function CostEstimate({ model, params, className }: { model: string; params: CostParams; className?: string }) {
    return <PriceText label={formatQuote(estimateAutodlCost(model, params))} prefix="预计" className={className} />;
}
