import { CanvasNodeType, type CanvasConnection, type CanvasGenerationMode, type CanvasNodeData } from "@/types/canvas";

// FrameDock workflow runner: orders runnable nodes along connections and runs them one by one,
// skipping everything downstream of a failed node. Generation itself stays in project.tsx (handleGenerateNode).

export type WorkflowScope = "downstream" | "upstream";

export type WorkflowStep = {
    nodeId: string;
    mode: CanvasGenerationMode;
    prompt: string;
    // Existing result node a config node writes into, so downstream consumers see the new result.
    targetNodeId?: string;
};

export type WorkflowPlan = { steps: WorkflowStep[]; nodeIds: string[] } | { error: "cycle" };

export type WorkflowStepOutcome = "success" | "failed" | "skipped" | "canceled";

export type WorkflowRunResult = { outcomes: Map<string, WorkflowStepOutcome>; canceled: boolean };

const MODE_OUTPUT_TYPE: Record<CanvasGenerationMode, CanvasNodeType> = {
    image: CanvasNodeType.Image,
    video: CanvasNodeType.Video,
    audio: CanvasNodeType.Audio,
    text: CanvasNodeType.Text,
};

const IN_PLACE_MODE: Partial<Record<string, CanvasGenerationMode>> = {
    [CanvasNodeType.Image]: "image",
    [CanvasNodeType.Video]: "video",
    [CanvasNodeType.Audio]: "audio",
};

export function rawNodePrompt(node: CanvasNodeData) {
    return (node.metadata?.composerContent ?? node.metadata?.prompt ?? "").trim();
}

function reachable(startId: string, connections: CanvasConnection[], scope: WorkflowScope) {
    const seen = new Set([startId]);
    const queue = [startId];
    while (queue.length) {
        const id = queue.shift()!;
        for (const connection of connections) {
            const next = scope === "downstream" ? (connection.fromNodeId === id ? connection.toNodeId : undefined) : connection.toNodeId === id ? connection.fromNodeId : undefined;
            if (next && !seen.has(next)) {
                seen.add(next);
                queue.push(next);
            }
        }
    }
    return seen;
}

function topologicalOrder(ids: Set<string>, connections: CanvasConnection[]) {
    const edges = connections.filter((connection) => ids.has(connection.fromNodeId) && ids.has(connection.toNodeId));
    const indegree = new Map([...ids].map((id) => [id, 0]));
    for (const edge of edges) indegree.set(edge.toNodeId, (indegree.get(edge.toNodeId) || 0) + 1);
    const queue = [...ids].filter((id) => indegree.get(id) === 0);
    const order: string[] = [];
    while (queue.length) {
        const id = queue.shift()!;
        order.push(id);
        for (const edge of edges) {
            if (edge.fromNodeId !== id) continue;
            const left = (indegree.get(edge.toNodeId) || 0) - 1;
            indegree.set(edge.toNodeId, left);
            if (left === 0) queue.push(edge.toNodeId);
        }
    }
    return order.length === ids.size ? order : null;
}

// Decides whether a node generates something when the workflow runs, and how.
export function workflowStepForNode(node: CanvasNodeData, nodes: CanvasNodeData[], connections: CanvasConnection[]): WorkflowStep | null {
    if (node.type === CanvasNodeType.Config) {
        const mode = node.metadata?.generationMode || "image";
        const outputType = MODE_OUTPUT_TYPE[mode];
        // Config nodes only have outgoing connections to results they created; reuse the most recent one.
        const target = connections
            .filter((connection) => connection.fromNodeId === node.id)
            .map((connection) => nodes.find((item) => item.id === connection.toNodeId))
            .filter((item): item is CanvasNodeData => item?.type === outputType)
            .at(-1);
        return { nodeId: node.id, mode, prompt: rawNodePrompt(node), targetNodeId: target?.id };
    }
    const mode = IN_PLACE_MODE[node.type];
    if (!mode) return null;
    // Results produced by a config node are re-generated through that config node, not on their own.
    const producedByConfig = connections.some((connection) => connection.toNodeId === node.id && nodes.find((item) => item.id === connection.fromNodeId)?.type === CanvasNodeType.Config);
    const prompt = rawNodePrompt(node);
    if (producedByConfig || !prompt) return null;
    return { nodeId: node.id, mode, prompt };
}

export function planWorkflow(startId: string, nodes: CanvasNodeData[], connections: CanvasConnection[], scope: WorkflowScope): WorkflowPlan {
    const ids = reachable(startId, connections, scope);
    const order = topologicalOrder(ids, connections);
    if (!order) return { error: "cycle" };
    const steps = order.flatMap((id) => {
        const node = nodes.find((item) => item.id === id);
        const step = node ? workflowStepForNode(node, nodes, connections) : null;
        return step ? [step] : [];
    });
    return { steps, nodeIds: order };
}

export type WorkflowRunHooks = {
    generate: (step: WorkflowStep) => Promise<void>;
    // Reads the node's settled status after generate resolved ("success" | "error" | other).
    readStatus: (nodeId: string) => Promise<string | undefined>;
    isCanceled: () => boolean;
    onStep?: (step: WorkflowStep, index: number, total: number) => void;
};

export async function runWorkflowPlan(steps: WorkflowStep[], connections: CanvasConnection[], hooks: WorkflowRunHooks): Promise<WorkflowRunResult> {
    const outcomes = new Map<string, WorkflowStepOutcome>();
    const failed = new Set<string>();
    for (const [index, step] of steps.entries()) {
        if (hooks.isCanceled()) {
            steps.slice(index).forEach((item) => outcomes.set(item.nodeId, "canceled"));
            return { outcomes, canceled: true };
        }
        const ancestors = reachable(step.nodeId, connections, "upstream");
        ancestors.delete(step.nodeId);
        if ([...ancestors].some((id) => failed.has(id))) {
            outcomes.set(step.nodeId, "skipped");
            failed.add(step.nodeId);
            continue;
        }
        hooks.onStep?.(step, index, steps.length);
        try {
            await hooks.generate(step);
        } catch {
            // handleGenerateNode reports its own errors; the status check below decides the outcome.
        }
        const status = await hooks.readStatus(step.targetNodeId || step.nodeId);
        if (status === "success") {
            outcomes.set(step.nodeId, "success");
            continue;
        }
        outcomes.set(step.nodeId, hooks.isCanceled() ? "canceled" : "failed");
        failed.add(step.nodeId);
        if (step.targetNodeId) failed.add(step.targetNodeId);
    }
    return { outcomes, canceled: hooks.isCanceled() };
}
