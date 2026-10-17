import type { MouseEvent as ReactMouseEvent } from "react";

import { canvasThemes } from "@/lib/canvas-theme";
import { runTallyFor, useWorkflowRunStore } from "@/stores/canvas/use-workflow-run-store";
import { useThemeStore } from "@/stores/use-theme-store";

type WireRunState = "none" | "path" | "flow" | "ok" | "fail";

// During a chain run the wires in scope light up, and the wire feeding the running node carries a comet.
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

/** updream bezier: horizontal handles of half the gap, and a minimum 80 when the target sits left of the source. */
export function wirePath(startX: number, startY: number, endX: number, endY: number) {
    const dx = endX - startX;
    const handle = dx >= 0 ? dx / 2 : Math.max(-dx / 2, 80);
    return `M ${startX} ${startY} C ${startX + handle} ${startY}, ${endX - handle} ${endY}, ${endX} ${endY}`;
}
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
    const pathD = wirePath(startX, startY, endX, endY);
    const runState = useWireRunState(from.id, to.id);

    return (
        <g>
            <path
                data-connection-id={connection.id}
                d={pathD}
                stroke="transparent"
                strokeWidth="12"
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
            {/* Widths are in world units, so they scale with zoom like updream's 2.5×zoom / 3×zoom. */}
            <path
                d={pathD}
                stroke={runState === "fail" ? "var(--tally-fail)" : active || runState === "flow" || runState === "path" ? theme.edge.selected : theme.edge.stroke}
                strokeWidth={active || runState === "flow" ? 3 : 2.5}
                strokeOpacity={runState === "fail" ? 0.7 : 1}
                strokeLinecap="round"
                fill="none"
                style={{ pointerEvents: "none", transition: "stroke 150ms ease-out" }}
            />
            {/* The comet: a bright 30% segment travelling source → target (2.5s when selected, 4s while generating). */}
            {active || runState === "flow" ? (
                <path
                    d={pathD}
                    pathLength={100}
                    stroke={theme.node.text}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeDasharray="30 70"
                    fill="none"
                    className="canvas-wire-flow"
                    style={{ pointerEvents: "none", animationDuration: runState === "flow" ? "4s" : "2.5s" }}
                />
            ) : null}
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
    const pathD = wirePath(snappedStartX, snappedStartY, snappedEndX, snappedEndY);

    return <path d={pathD} stroke={theme.edge.selected} strokeWidth="2.5" strokeLinecap="round" fill="none" strokeDasharray="6 6" />;
}
