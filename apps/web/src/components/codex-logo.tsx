import { cn } from "@/lib/utils";

// FrameDock: Codex brand mark (LobeHub Icons, MIT; see THIRD_PARTY_NOTICES.md) used for Codex nodes.
export function CodexLogo({ className }: { className?: string }) {
    return <img src="/icons/lobehub/codex-color.svg" alt="" aria-hidden="true" draggable={false} className={cn("size-4 shrink-0 rounded-[3px]", className)} />;
}
