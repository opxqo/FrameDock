import { Tooltip } from "antd";

import { ArrowUp, RefreshCw } from "@/components/icons";
import { cn } from "@/lib/utils";

export type CanvasRunState = "idle" | "regenerate" | "running";

/** Ring that turns while a run is in progress (still under reduced motion). */
export function RunningRing({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 32 32" className={cn("pointer-events-none absolute inset-0 size-full animate-spin motion-reduce:animate-none", className)} aria-hidden>
            <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1.5" />
            <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="22 70" />
        </svg>
    );
}

// FrameDock: the one generate / stop control of the canvas panels — a 32px circle. Idle ↑, regenerate ⟳,
// running = dark disc with a turning ring and a stop square (the label lives in the tooltip / aria-label).
export function CanvasRunButton({ state, disabled, onRun, onStop, label }: { state: CanvasRunState; disabled?: boolean; onRun: () => void; onStop: () => void; label: string }) {
    const running = state === "running";
    return (
        <Tooltip title={label}>
            <button
                type="button"
                aria-label={label}
                disabled={!running && disabled}
                onClick={() => (running ? onStop() : onRun())}
                className={cn(
                    "relative grid size-8 shrink-0 place-items-center rounded-full transition-[opacity,background-color] duration-150 disabled:cursor-not-allowed disabled:opacity-35",
                    running ? "bg-foreground/10 text-foreground hover:bg-foreground/15" : "bg-signal text-signal-foreground hover:opacity-85",
                )}
            >
                {running ? (
                    <>
                        <RunningRing />
                        <span className="size-2.5 rounded-[2px] bg-current" />
                    </>
                ) : state === "regenerate" ? (
                    <RefreshCw className="size-4" />
                ) : (
                    <ArrowUp className="size-4" />
                )}
            </button>
        </Tooltip>
    );
}
