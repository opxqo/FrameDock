import { Square } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { useWorkflowRunStore } from "@/stores/canvas/use-workflow-run-store";
import type { CanvasNodeData } from "@/types/canvas";

const SEGMENT_CLASS = {
    success: "bg-tally-ok",
    failed: "bg-tally-fail",
    skipped: "bg-tally-stale/50",
    canceled: "bg-tally-stale/50",
} as const;

// FrameDock signature: the programme bar. While a chain runs it shows one segment per step (tally colours),
// the step on air, elapsed time and the stop control, in one place at the top of the canvas.
export function CanvasProgrammeBar({ nodes, onStop, onFocusNode }: { nodes: CanvasNodeData[]; onStop: () => void; onFocusNode?: (nodeId: string) => void }) {
    const { t } = useTranslation();
    const run = useWorkflowRunStore((state) => state.run);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!run) return;
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [run]);

    if (!run) return null;
    const total = run.steps.length;
    const done = Object.keys(run.outcomes).length;
    const current = run.steps[Math.min(run.currentIndex, total - 1)];
    const currentNode = nodes.find((node) => node.id === current?.nodeId);
    const elapsed = Math.max(0, Math.floor((now - run.startedAt) / 1000));
    const clock = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

    return (
        <div role="status" aria-live="polite" className="pointer-events-auto flex h-8 min-w-0 items-center gap-3 rounded-md border border-border bg-card pl-2.5 pr-1 shadow-panel">
            <span className="size-2 shrink-0 animate-pulse rounded-full bg-tally-live" aria-hidden />
            <span className="tnum shrink-0 text-xs font-medium">{t("canvas.programme.progress", { current: Math.min(done + 1, total), total })}</span>
            <div className="hidden h-1.5 w-28 shrink-0 items-stretch gap-0.5 sm:flex" aria-hidden>
                {run.steps.map((step, index) => {
                    const outcome = run.outcomes[step.nodeId];
                    return <span key={step.nodeId} className={cn("flex-1 rounded-full", outcome ? SEGMENT_CLASS[outcome] : index === run.currentIndex ? "animate-pulse bg-tally-live" : "bg-secondary")} />;
                })}
            </div>
            {currentNode ? (
                <button type="button" className="min-w-0 max-w-48 truncate text-xs text-muted-foreground hover:text-foreground" onClick={() => onFocusNode?.(currentNode.id)} title={t("canvas.programme.focus")}>
                    {currentNode.title || t("canvas.node.untitled")}
                </button>
            ) : null}
            <span className="tnum shrink-0 font-mono text-xs text-muted-foreground">{clock}</span>
            <button type="button" onClick={onStop} className="inline-flex h-6 shrink-0 items-center gap-1 rounded px-2 text-xs font-medium text-foreground transition-colors hover:bg-accent">
                <Square className="size-3 fill-current" />
                {t("canvas.workflow.stop")}
            </button>
        </div>
    );
}
