import { Tooltip } from "antd";
import { Coins } from "lucide-react";

import { cn } from "@/lib/utils";
import { describeAutodlPrice, estimateAutodlCost, formatQuote, type CostParams, type PriceLabel } from "@/lib/autodl-pricing";

// FrameDock: member price first, original price struck through next to it (AutoDL pricing).
export function PriceText({ label, className }: { label: PriceLabel | null; className?: string }) {
    if (!label) return null;
    const content = (
        <span className={cn("tnum inline-flex shrink-0 items-baseline gap-1 whitespace-nowrap", className)}>
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

/** Estimated cost of the next generation with the current settings, shown as a compact coin badge. */
export function CostEstimate({ model, params, className }: { model: string; params: CostParams; className?: string }) {
    const label = formatQuote(estimateAutodlCost(model, params));
    if (!label) return null;
    const title = ["预计本次费用（会员价）", label.original ? `原价 ${label.original}` : "", label.note || ""].filter(Boolean).join("；");
    return (
        <Tooltip title={title}>
            <span className={cn("tnum inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground", className)}>
                <Coins className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="font-medium text-foreground">{label.member}</span>
                {label.original ? <span className="line-through opacity-60">{label.original}</span> : null}
            </span>
        </Tooltip>
    );
}
