import { type MouseEvent as ReactMouseEvent, useEffect, useId, useRef } from "react";
import { useTranslation } from "react-i18next";

import { canvasThemes } from "@/lib/canvas-theme";
import { runTallyFor, useWorkflowRunStore } from "@/stores/canvas/use-workflow-run-store";
import { useThemeStore } from "@/stores/use-theme-store";
import { CanvasNodeType, type CanvasConnection, type CanvasConnectionRole, type CanvasNodeData, type ConnectionHandle, type Position } from "@/types/canvas";

/** Wires whose role matters: images (or groups of them) feeding a video-mode config node. */
export function isVideoFrameInput(from: CanvasNodeData, to: CanvasNodeData) {
    return to.type === CanvasNodeType.Config && to.metadata?.generationMode === "video" && (from.type === CanvasNodeType.Image || from.type === CanvasNodeType.Group);
}

export const CONNECTION_ROLES: CanvasConnectionRole[] = ["first", "last", "reference"];

/** Click order on the wire label: auto → first → last → reference → auto. */
export function nextConnectionRole(role: CanvasConnectionRole | undefined) {
    const index = role ? CONNECTION_ROLES.indexOf(role) : -1;
    return index === CONNECTION_ROLES.length - 1 ? undefined : CONNECTION_ROLES[index + 1];
}

/** Midpoint of the wire's cubic bezier (t = 0.5). */
function wireMidpoint(startX: number, startY: number, endX: number, endY: number) {
    const dx = endX - startX;
    const handle = dx >= 0 ? dx / 2 : Math.max(-dx / 2, 80);
    return { x: (startX + 3 * (startX + handle) + 3 * (endX - handle) + endX) / 8, y: (startY + endY) / 2 };
}

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

/** A single soft trail, clipped at each port instead of wrapping onto both ends of the wire. */
function WirePulse({ d, color, running }: { d: string; color: string; running: boolean }) {
    const gradientId = useId();
    const pathRef = useRef<SVGPathElement>(null);
    const gradientRef = useRef<SVGLinearGradientElement>(null);
    const progressRef = useRef(0);

    useEffect(() => {
        const path = pathRef.current;
        const gradient = gradientRef.current;
        if (!path || !gradient) return;
        const length = path.getTotalLength();
        if (length < 1) return;

        const stops = Array.from(gradient.children);
        const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
        const duration = running ? 4000 : 2500;
        let frame = 0;
        let lastTime: number | null = null;
        let inView = false;

        const draw = () => {
            // 30% trail + 100% gap gives the tail time to leave before the next head enters.
            const head = progressRef.current * 1.3;
            const tail = head - 0.3;
            const start = Math.max(0, tail);
            const end = Math.min(1, head);
            const a = path.getPointAtLength(start * length);
            const b = path.getPointAtLength(end * length);
            gradient.setAttribute("x1", String(a.x));
            gradient.setAttribute("y1", String(a.y));
            gradient.setAttribute("x2", String(b.x + (a.x === b.x && a.y === b.y ? 0.001 : 0)));
            gradient.setAttribute("y2", String(b.y));
            // Adjust the ramp when a port clips the trail, so it doesn't brighten or flash on exit.
            stops.forEach((stop, index) => {
                const position = start + ((end - start) * index) / (stops.length - 1);
                const opacity = Math.max(0, Math.min(1, (position - tail) / 0.3));
                stop.setAttribute("stop-opacity", String(opacity * opacity));
            });
            path.setAttribute("stroke-dashoffset", String(30 - head * 100));
        };

        const tick = (time: number) => {
            if (lastTime !== null) progressRef.current = (progressRef.current + (time - lastTime) / duration) % 1;
            lastTime = time;
            draw();
            frame = requestAnimationFrame(tick);
        };
        const sync = () => {
            cancelAnimationFrame(frame);
            lastTime = null;
            if (inView && !document.hidden && !motion.matches) frame = requestAnimationFrame(tick);
        };
        const observer = new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            sync();
        });
        draw();
        observer.observe(path);
        document.addEventListener("visibilitychange", sync);
        motion.addEventListener("change", sync);
        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
            document.removeEventListener("visibilitychange", sync);
            motion.removeEventListener("change", sync);
        };
    }, [d, running]);

    return (
        <g aria-hidden="true" style={{ pointerEvents: "none" }}>
            <defs>
                <linearGradient id={gradientId} ref={gradientRef} gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor={color} stopOpacity="0" />
                    <stop offset="0.5" stopColor={color} stopOpacity="0.25" />
                    <stop offset="1" stopColor={color} />
                </linearGradient>
            </defs>
            <path ref={pathRef} d={d} pathLength={100} stroke={`url(#${gradientId})`} strokeWidth={3} strokeLinecap="round" strokeDasharray="30 100" strokeDashoffset={30} fill="none" className="canvas-wire-flow" />
        </g>
    );
}

export function ConnectionPath({
    connection,
    from,
    to,
    active,
    showRole = false,
    onSelect,
    onContextMenu,
    onRoleChange,
}: {
    connection: CanvasConnection;
    from: CanvasNodeData;
    to: CanvasNodeData;
    active: boolean;
    /** Video inputs: show the first/last/reference label on the wire. */
    showRole?: boolean;
    onSelect: () => void;
    onContextMenu?: (event: ReactMouseEvent<SVGPathElement>) => void;
    onRoleChange?: (role: CanvasConnectionRole | undefined) => void;
}) {
    const { t } = useTranslation();
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const startX = from.position.x + from.width;
    const startY = from.position.y + from.height / 2;
    const endX = to.position.x;
    const endY = to.position.y + to.height / 2;
    const pathD = wirePath(startX, startY, endX, endY);
    const runState = useWireRunState(from.id, to.id);
    const running = runState === "flow" || to.metadata?.status === "loading";
    const pulsing = runState !== "fail" && (active || running);

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
                stroke={runState === "fail" ? "var(--tally-fail)" : active || running || runState === "path" ? theme.edge.selected : theme.edge.stroke}
                strokeWidth={active || running ? 3 : 2.5}
                strokeOpacity={runState === "fail" ? 0.7 : 1}
                strokeLinecap="round"
                fill="none"
                style={{ pointerEvents: "none", transition: "stroke 150ms ease-out" }}
            />
            {pulsing ? <WirePulse d={pathD} color={theme.node.text} running={running} /> : null}
            {showRole ? <RoleLabel role={connection.role} at={wireMidpoint(startX, startY, endX, endY)} label={t(`canvas.connectionRoles.${connection.role || "auto"}`)} hint={t("canvas.connectionRoles.hint")} onClick={() => onRoleChange?.(nextConnectionRole(connection.role))} /> : null}
        </g>
    );
}

function RoleLabel({ role, at, label, hint, onClick }: { role?: CanvasConnectionRole; at: Position; label: string; hint: string; onClick: () => void }) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const width = Math.max(36, label.length * 12 + 16);
    return (
        <g
            transform={`translate(${at.x - width / 2} ${at.y - 11})`}
            style={{ cursor: "pointer", pointerEvents: "all" }}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
                event.stopPropagation();
                onClick();
            }}
        >
            <title>{hint}</title>
            <rect width={width} height={22} rx={11} fill={theme.node.panel} stroke={role ? theme.edge.selected : theme.edge.stroke} strokeWidth={1} />
            <text x={width / 2} y={15} textAnchor="middle" fontSize={12} fill={role ? theme.node.text : theme.node.muted} style={{ userSelect: "none" }}>
                {label}
            </text>
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
