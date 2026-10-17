import type { CanvasNodeData } from "@/types/canvas";

// Alignment snapping while dragging or resizing nodes. All coordinates are world coordinates.

export const SNAP_SCREEN_THRESHOLD = 6;
export const SNAP_GUIDE_COLOR = "#f43f5e";

export type SnapRect = { left: number; top: number; right: number; bottom: number };

// A guide line: vertical when axis is "x" (at world x = `at`), horizontal when axis is "y".
export type SnapGuide = { axis: "x" | "y"; at: number; from: number; to: number };

type AxisMatch = { delta: number; at: number; targets: SnapRect[] };

export function getNodesBounds(nodes: Pick<CanvasNodeData, "position" | "width" | "height">[]): SnapRect | null {
    if (!nodes.length) return null;
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    nodes.forEach((node) => {
        left = Math.min(left, node.position.x);
        top = Math.min(top, node.position.y);
        right = Math.max(right, node.position.x + node.width);
        bottom = Math.max(bottom, node.position.y + node.height);
    });
    return { left, top, right, bottom };
}

function toRect(node: Pick<CanvasNodeData, "position" | "width" | "height">): SnapRect {
    return { left: node.position.x, top: node.position.y, right: node.position.x + node.width, bottom: node.position.y + node.height };
}

function axisLines(rect: SnapRect, axis: "x" | "y") {
    return axis === "x" ? [rect.left, (rect.left + rect.right) / 2, rect.right] : [rect.top, (rect.top + rect.bottom) / 2, rect.bottom];
}

// Finds the closest target line for any of the source lines, keeping every target that lines up at that same position.
function findAxisMatch(sourceLines: number[], targets: SnapRect[], axis: "x" | "y", threshold: number): AxisMatch | null {
    let best: AxisMatch | null = null;
    targets.forEach((target) => {
        axisLines(target, axis).forEach((line) => {
            sourceLines.forEach((source) => {
                const delta = line - source;
                if (Math.abs(delta) > threshold) return;
                if (!best || Math.abs(delta) < Math.abs(best.delta) - 0.01) {
                    best = { delta, at: line, targets: [target] };
                } else if (Math.abs(delta - best.delta) <= 0.01 && Math.abs(line - best.at) <= 0.01 && !best.targets.includes(target)) {
                    best.targets.push(target);
                }
            });
        });
    });
    return best;
}

function buildGuide(axis: "x" | "y", at: number, rect: SnapRect, targets: SnapRect[]): SnapGuide {
    const all = [rect, ...targets];
    return axis === "x"
        ? { axis, at, from: Math.min(...all.map((item) => item.top)), to: Math.max(...all.map((item) => item.bottom)) }
        : { axis, at, from: Math.min(...all.map((item) => item.left)), to: Math.max(...all.map((item) => item.right)) };
}

/**
 * Snaps a dragged bounding box (already offset by the raw dx/dy) to the edges and center lines of other nodes.
 * Returns the corrected offset and the guide lines to draw.
 */
export function computeSnap(params: { bounds: SnapRect; dx: number; dy: number; targets: Pick<CanvasNodeData, "position" | "width" | "height">[]; scale: number }) {
    const { bounds, dx, dy, scale } = params;
    const threshold = SNAP_SCREEN_THRESHOLD / scale;
    const targets = params.targets.map(toRect);
    const moved = { left: bounds.left + dx, top: bounds.top + dy, right: bounds.right + dx, bottom: bounds.bottom + dy };
    const matchX = findAxisMatch(axisLines(moved, "x"), targets, "x", threshold);
    const matchY = findAxisMatch(axisLines(moved, "y"), targets, "y", threshold);
    const snapDx = dx + (matchX?.delta || 0);
    const snapDy = dy + (matchY?.delta || 0);
    const snapped = { left: bounds.left + snapDx, top: bounds.top + snapDy, right: bounds.right + snapDx, bottom: bounds.bottom + snapDy };
    const guides: SnapGuide[] = [];
    if (matchX) guides.push(buildGuide("x", matchX.at, snapped, matchX.targets));
    if (matchY) guides.push(buildGuide("y", matchY.at, snapped, matchY.targets));
    return { dx: snapDx, dy: snapDy, guides };
}

/**
 * Snaps the moving edges of a node being resized. `moveLeft` / `moveTop` say which horizontal / vertical edge follows the pointer;
 * the opposite edge stays fixed. With `ratio` set, only the closer axis snaps and the other follows the aspect ratio.
 */
export function computeResizeSnap(params: {
    rect: SnapRect;
    moveLeft: boolean;
    moveTop: boolean;
    snapX: boolean;
    snapY: boolean;
    ratio?: number;
    minWidth?: number;
    minHeight?: number;
    targets: Pick<CanvasNodeData, "position" | "width" | "height">[];
    scale: number;
}) {
    const { moveLeft, moveTop, ratio, minWidth = 0, minHeight = 0, scale } = params;
    const threshold = SNAP_SCREEN_THRESHOLD / scale;
    const targets = params.targets.map(toRect);
    const rect = { ...params.rect };
    let matchX = params.snapX ? findAxisMatch([moveLeft ? rect.left : rect.right], targets, "x", threshold) : null;
    let matchY = params.snapY ? findAxisMatch([moveTop ? rect.top : rect.bottom], targets, "y", threshold) : null;
    if (ratio && matchX && matchY) {
        if (Math.abs(matchX.delta) <= Math.abs(matchY.delta)) matchY = null;
        else matchX = null;
    }
    if (matchX) {
        const next = moveLeft ? { ...rect, left: rect.left + matchX.delta } : { ...rect, right: rect.right + matchX.delta };
        if (next.right - next.left >= minWidth) Object.assign(rect, next);
        else matchX = null;
    }
    if (matchY) {
        const next = moveTop ? { ...rect, top: rect.top + matchY.delta } : { ...rect, bottom: rect.bottom + matchY.delta };
        if (next.bottom - next.top >= minHeight) Object.assign(rect, next);
        else matchY = null;
    }
    if (ratio && matchX) {
        const height = (rect.right - rect.left) / ratio;
        if (moveTop) rect.top = rect.bottom - height;
        else rect.bottom = rect.top + height;
    } else if (ratio && matchY) {
        const width = (rect.bottom - rect.top) * ratio;
        if (moveLeft) rect.left = rect.right - width;
        else rect.right = rect.left + width;
    }
    const guides: SnapGuide[] = [];
    if (matchX) guides.push(buildGuide("x", matchX.at, rect, matchX.targets));
    if (matchY) guides.push(buildGuide("y", matchY.at, rect, matchY.targets));
    return { rect, guides };
}
