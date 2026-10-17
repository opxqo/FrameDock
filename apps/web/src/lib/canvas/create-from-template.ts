import i18n from "@/i18n";
import { buildCanvasTemplate, type CanvasTemplateId } from "@/lib/canvas/canvas-templates";
import { createCanvasNode } from "@/lib/canvas/canvas-node-factory";
import { useCanvasStore } from "@/stores/canvas/use-canvas-store";

/** Creates a project from a workflow template, framed so the whole graph is in view; returns its id. */
export function createProjectFromTemplate(id: CanvasTemplateId) {
    const graph = buildCanvasTemplate(id, (key, options) => i18n.t(key, options), createCanvasNode);
    const minX = Math.min(...graph.nodes.map((node) => node.position.x));
    const minY = Math.min(...graph.nodes.map((node) => node.position.y));
    const maxX = Math.max(...graph.nodes.map((node) => node.position.x + node.width));
    const maxY = Math.max(...graph.nodes.map((node) => node.position.y + node.height));
    // Leave room for the side panel, rail, top capsules and bottom dock.
    const width = Math.max(480, window.innerWidth - 280 - 160);
    const height = Math.max(360, window.innerHeight - 220);
    const k = Math.min(1, width / (maxX - minX), height / (maxY - minY));
    const viewport = { k, x: 120 + (width - (maxX - minX) * k) / 2 - minX * k, y: 110 + (height - (maxY - minY) * k) / 2 - minY * k };
    return useCanvasStore.getState().importProject({ title: graph.title, nodes: graph.nodes, connections: graph.connections, viewport });
}
