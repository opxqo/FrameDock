import i18n from "@/i18n";

// FrameDock: prompts reference canvas resources by node id (`@[node:<id>]`), the same token the config-node
// composer already uses. An id keeps pointing at the same image when connections are added, removed or
// reordered; the visible number ("图片2") is worked out from the current send order only when generating.

export const NODE_REFERENCE_PATTERN = /@\[node:([^\]]+)\]/g;

export type PromptToken = { type: "text"; value: string } | { type: "node"; nodeId: string } | { type: "label"; label: string };

export const nodeReferenceToken = (nodeId: string) => `@[node:${nodeId}]`;

/** Node ids referenced by the prompt, in order of first appearance. */
export function referencedNodeIds(prompt: string) {
    return [...new Set([...prompt.matchAll(NODE_REFERENCE_PATTERN)].map((match) => match[1]!))];
}

/**
 * Splits a prompt into text, id tokens and — for prompts written before ids existed — plain reference labels
 * such as "图片1". Labels are matched longest first so "图片1" never splits "图片12".
 */
export function parsePromptTokens(value: string, legacyLabels: string[] = []): PromptToken[] {
    const labels = [...new Set(legacyLabels)].filter(Boolean).sort((a, b) => b.length - a.length);
    const parts = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const pattern = new RegExp(`@\\[node:([^\\]]+)\\]${parts.length ? `|(${parts.join("|")})` : ""}`, "g");
    const tokens: PromptToken[] = [];
    let lastIndex = 0;
    for (const match of value.matchAll(pattern)) {
        if (match.index === undefined) continue;
        if (match.index > lastIndex) tokens.push({ type: "text", value: value.slice(lastIndex, match.index) });
        tokens.push(match[1] !== undefined ? { type: "node", nodeId: match[1] } : { type: "label", label: match[0] });
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < value.length) tokens.push({ type: "text", value: value.slice(lastIndex) });
    return tokens;
}

/**
 * Replaces id tokens with the label each node has in this generation's send order. Tokens whose node is not
 * among the inputs (disconnected or deleted) are dropped from the text and returned, so the caller can stop
 * before anything is paid for.
 */
export function resolvePromptReferences(prompt: string, labelByNodeId: Map<string, string>) {
    const unresolved: string[] = [];
    const text = prompt.replace(NODE_REFERENCE_PATTERN, (_, nodeId: string) => {
        const label = labelByNodeId.get(nodeId);
        if (label !== undefined) return label;
        if (!unresolved.includes(nodeId)) unresolved.push(nodeId);
        return "";
    });
    return { text, unresolved };
}

/** A prompt for people to read: tokens become the node's label (when known) or its title. */
export function readablePrompt(prompt: string, nodes: Array<{ id: string; title?: string }>, labelByNodeId?: Map<string, string>) {
    if (!prompt.includes("@[node:")) return prompt;
    const titles = new Map(nodes.map((node) => [node.id, node.title]));
    return prompt.replace(NODE_REFERENCE_PATTERN, (_, nodeId: string) => labelByNodeId?.get(nodeId) ?? (titles.get(nodeId) ? `「${titles.get(nodeId)}」` : i18n.t("canvas.references.genericToken")));
}
