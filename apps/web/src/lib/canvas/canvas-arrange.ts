import { CanvasNodeType, type CanvasNodeData, type Position } from "@/types/canvas";

// FrameDock: tidy a selection into a row, a column or a grid. The block keeps its top-left corner and the
// nodes keep their current reading order. Group frames and nodes inside groups are left alone (a group would
// no longer wrap its members), so only free-standing nodes take part.

export type ArrangeMode = "row" | "column" | "grid";

export const ARRANGE_GAP = 24;

export function arrangeableNodes(nodes: CanvasNodeData[]) {
    return nodes.filter((node) => node.type !== CanvasNodeType.Group && !node.metadata?.groupId);
}

/** New top-left positions for the given nodes (only those that move are returned). */
export function arrangeNodes(nodes: CanvasNodeData[], mode: ArrangeMode, gap = ARRANGE_GAP): Map<string, Position> {
    const result = new Map<string, Position>();
    if (nodes.length < 2) return result;
    const originX = Math.min(...nodes.map((node) => node.position.x));
    const originY = Math.min(...nodes.map((node) => node.position.y));
    // Reading order: top to bottom, then left to right (rows are bucketed by half a node height).
    const byReading = [...nodes].sort((a, b) => (Math.abs(a.position.y - b.position.y) > Math.min(a.height, b.height) / 2 ? a.position.y - b.position.y : a.position.x - b.position.x));

    if (mode === "row") {
        let x = originX;
        for (const node of [...nodes].sort((a, b) => a.position.x - b.position.x)) {
            result.set(node.id, { x, y: originY });
            x += node.width + gap;
        }
    } else if (mode === "column") {
        let y = originY;
        for (const node of [...nodes].sort((a, b) => a.position.y - b.position.y)) {
            result.set(node.id, { x: originX, y });
            y += node.height + gap;
        }
    } else {
        const columns = Math.ceil(Math.sqrt(nodes.length));
        const rows = Math.ceil(nodes.length / columns);
        const columnWidths = Array.from({ length: columns }, (_, column) => Math.max(...byReading.filter((_, index) => index % columns === column).map((node) => node.width)));
        const rowHeights = Array.from({ length: rows }, (_, row) => Math.max(...byReading.slice(row * columns, row * columns + columns).map((node) => node.height)));
        byReading.forEach((node, index) => {
            const column = index % columns;
            const row = Math.floor(index / columns);
            result.set(node.id, {
                x: originX + columnWidths.slice(0, column).reduce((sum, width) => sum + width + gap, 0),
                y: originY + rowHeights.slice(0, row).reduce((sum, height) => sum + height + gap, 0),
            });
        });
    }
    return result;
}
