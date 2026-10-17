import type { MouseEvent as ReactMouseEvent } from "react";

import { canvasThemes } from "@/lib/canvas-theme";
import { runTallyFor, useWorkflowRunStore } from "@/stores/canvas/use-workflow-run-store";
import { useThemeStore } from "@/stores/use-theme-store";

type WireRunState = "none" | "path" | "flow" | "ok" | "fail";

// FrameDock signature: during a chain run the wires in scope light up, and the wire feeding the running
// node carries a moving signal.
function useWireRunState(fromId: string, toId: string): WireRunState {
    return useWorkflowRunStore((state) => {
        const run = state.run;
        if (!run || !run.scopeNodeIds.includes(fromId) || !run.scopeNodeIds.includes(toId)) return "none";
        const tally = runTallyFor(run, toId);
        if (tally === "live") return "flow";
        if (tally === "ok") return "ok";
        if (tally === "fail" || tally === "skipped") return "fail";
        return "path";
    });
}

const WIRE_STROKE: Record<Exclude<WireRunState, "none">, string> = { path: "var(--tally-live)", flow: "var(--tally-live)", ok: "var(--tally-ok)", fail: "var(--tally-fail)" };
import type { CanvasConnection, CanvasNodeData, ConnectionHandle, Position } from "@/types/canvas";

export function ConnectionPath({
    connection,
    from,
    to,
    active,
    onSelect,
    onContextMenu,
}: {
    connection: CanvasConnection;
    from: CanvasNodeData;
    to: CanvasNodeData;
    active: boolean;
    onSelect: () => void;
    onContextMenu?: (event: ReactMouseEvent<SVGPathElement>) => void;
}) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const startX = from.position.x + from.width;
    const startY = from.position.y + from.height / 2;
    const endX = to.position.x;
    const endY = to.position.y + to.height / 2;
    const dx = Math.abs(endX - startX);
    const curvature = Math.max(dx * 0.5, 50);
    const pathD = `M ${startX} ${startY} C ${startX + curvature} ${startY}, ${endX - curvature} ${endY}, ${endX} ${endY}`;
    const runState = useWireRunState(from.id, to.id);

    return (
        <g>
            <path
                data-connection-id={connection.id}
                d={pathD}
                stroke="transparent"
                strokeWidth="16"
                fill="none"
                style={{ cursor: "pointer", pointerEvents: "stroke" }}
                onClick={(event) => {
                    event.stopPropagation();
                    onSelect();
                }}
                onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onContextMenu?.(event);
                }}
            />
            <path
                d={pathD}
                stroke={runState !== "none" ? WIRE_STROKE[runState] : active ? theme.node.activeStroke : theme.node.muted}
                strokeWidth={active || runState === "flow" ? 2.5 : 1.75}
                strokeOpacity={active || runState === "flow" ? 1 : runState === "path" ? 0.45 : runState === "none" ? 0.6 : 0.8}
                fill="none"
                style={{ pointerEvents: "none" }}
            />
            {runState === "flow" ? <path d={pathD} stroke="var(--tally-live)" strokeWidth={2.5} strokeLinecap="round" strokeDasharray="2 14" fill="none" className="canvas-wire-flow" style={{ pointerEvents: "none" }} /> : null}
        </g>
    );
}

export function ActiveConnectionPath({ node, handle, mouseWorld, target }: { node?: CanvasNodeData; handle: ConnectionHandle; mouseWorld: Position; target?: CanvasNodeData }) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    if (!node) return null;

    const startX = handle.handleType === "source" ? node.position.x + node.width : mouseWorld.x;
    const startY = handle.handleType === "source" ? node.position.y + node.height / 2 : mouseWorld.y;
    const endX = handle.handleType === "source" ? mouseWorld.x : node.position.x;
    const endY = handle.handleType === "source" ? mouseWorld.y : node.position.y + node.height / 2;
    const snappedStartX = handle.handleType === "target" && target ? target.position.x + target.width : startX;
    const snappedStartY = handle.handleType === "target" && target ? target.position.y + target.height / 2 : startY;
    const snappedEndX = handle.handleType === "source" && target ? target.position.x : endX;
    const snappedEndY = handle.handleType === "source" && target ? target.position.y + target.height / 2 : endY;
    const distance = Math.abs(snappedEndX - snappedStartX);
    const pathD = `M ${snappedStartX} ${snappedStartY} C ${snappedStartX + distance * 0.5} ${snappedStartY}, ${snappedEndX - distance * 0.5} ${snappedEndY}, ${snappedEndX} ${snappedEndY}`;

    return <path d={pathD} stroke={theme.node.activeStroke} strokeWidth="2" fill="none" strokeDasharray="5,5" />;
}
