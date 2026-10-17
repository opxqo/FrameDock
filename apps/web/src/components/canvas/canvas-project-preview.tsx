import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { previewUrlFor } from "@/services/image-storage";
import type { CanvasProject } from "@/stores/canvas/use-canvas-store";
import { CanvasNodeType } from "@/types/canvas";

const PADDING = 6; // percent of the preview box kept free around the layout

// FrameDock: a scaled schematic of the project's real layout — wires, node boxes, and image thumbnails.
export function CanvasProjectPreview({ project }: { project: CanvasProject }) {
    const { t } = useTranslation();
    const layout = useMemo(() => {
        const nodes = project.nodes.filter((node) => node.type !== CanvasNodeType.Group && node.width > 0 && node.height > 0);
        if (!nodes.length) return null;
        const minX = Math.min(...nodes.map((node) => node.position.x));
        const minY = Math.min(...nodes.map((node) => node.position.y));
        const maxX = Math.max(...nodes.map((node) => node.position.x + node.width));
        const maxY = Math.max(...nodes.map((node) => node.position.y + node.height));
        // Keep the aspect ratio: fit the layout into a 16:10 box.
        const span = Math.max((maxX - minX) / 16, (maxY - minY) / 10, 1);
        const width = span * 16;
        const height = span * 10;
        const offsetX = minX - (width - (maxX - minX)) / 2;
        const offsetY = minY - (height - (maxY - minY)) / 2;
        const scale = (100 - PADDING * 2) / 100;
        const box = (x: number, y: number, w: number, h: number) => ({
            left: PADDING + ((x - offsetX) / width) * 100 * scale,
            top: PADDING + ((y - offsetY) / height) * 100 * scale,
            width: (w / width) * 100 * scale,
            height: (h / height) * 100 * scale,
        });
        const byId = new Map(nodes.map((node) => [node.id, node]));
        const wires = project.connections.flatMap((connection) => {
            const from = byId.get(connection.fromNodeId);
            const to = byId.get(connection.toNodeId);
            if (!from || !to) return [];
            const a = box(from.position.x + from.width, from.position.y + from.height / 2, 0, 0);
            const b = box(to.position.x, to.position.y + to.height / 2, 0, 0);
            return [{ id: connection.id, x1: a.left, y1: a.top, x2: b.left, y2: b.top }];
        });
        return { nodes: nodes.slice(0, 60).map((node) => ({ node, ...box(node.position.x, node.position.y, node.width, node.height) })), wires };
    }, [project.connections, project.nodes]);

    if (!layout) {
        return <div className="flex size-full items-center justify-center text-xs text-muted-foreground">{t("projects.emptyPreview")}</div>;
    }

    return (
        <div className="relative size-full">
            <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                {layout.wires.map((wire) => (
                    <line key={wire.id} x1={wire.x1} y1={wire.y1} x2={wire.x2} y2={wire.y2} stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" className="text-muted-foreground/40" />
                ))}
            </svg>
            {layout.nodes.map(({ node, left, top, width, height }) => {
                const image = node.type === CanvasNodeType.Image ? previewUrlFor(node.metadata?.storageKey) || node.metadata?.content : undefined;
                return (
                    <div
                        key={node.id}
                        className="absolute overflow-hidden rounded-[3px] border border-border bg-secondary"
                        style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
                    >
                        {image && /^(blob:|data:|https?:|\/)/.test(image) ? <img src={image} alt="" loading="lazy" className="size-full object-cover" /> : null}
                    </div>
                );
            })}
        </div>
    );
}
