import { create } from "zustand";

import type { WorkflowStep, WorkflowStepOutcome } from "@/lib/canvas/workflow-runner";

// FrameDock: live state of a chain run ("运行到此处 / 运行下游"), read by the programme bar in the top bar,
// the tally lamps on nodes and the lit wire path.
export type WorkflowRunState = {
    startedAt: number;
    steps: WorkflowStep[];
    /** Every node in the run's scope, runnable or not; wires between them light up. */
    scopeNodeIds: string[];
    currentIndex: number;
    outcomes: Record<string, WorkflowStepOutcome>;
};

type WorkflowRunStore = {
    run: WorkflowRunState | null;
    start: (steps: WorkflowStep[], scopeNodeIds: string[]) => void;
    setCurrent: (index: number) => void;
    setOutcome: (nodeId: string, outcome: WorkflowStepOutcome) => void;
    finish: () => void;
};

export const useWorkflowRunStore = create<WorkflowRunStore>()((set) => ({
    run: null,
    start: (steps, scopeNodeIds) => set({ run: { startedAt: Date.now(), steps, scopeNodeIds, currentIndex: 0, outcomes: {} } }),
    setCurrent: (currentIndex) => set((state) => (state.run ? { run: { ...state.run, currentIndex } } : state)),
    setOutcome: (nodeId, outcome) => set((state) => (state.run ? { run: { ...state.run, outcomes: { ...state.run.outcomes, [nodeId]: outcome } } } : state)),
    finish: () => set({ run: null }),
}));

export type TallyState = "idle" | "queued" | "live" | "ok" | "fail" | "skipped" | "stale";

/** Tally for a node inside the current run, or undefined when the node is not part of it. */
export function runTallyFor(run: WorkflowRunState | null, nodeId: string): TallyState | undefined {
    if (!run) return undefined;
    const index = run.steps.findIndex((step) => step.nodeId === nodeId || step.targetNodeId === nodeId);
    if (index < 0) return undefined;
    const step = run.steps[index];
    const outcome = run.outcomes[step.nodeId];
    if (outcome === "success") return "ok";
    if (outcome === "failed") return "fail";
    if (outcome === "skipped" || outcome === "canceled") return "skipped";
    return index === run.currentIndex ? "live" : "queued";
}
