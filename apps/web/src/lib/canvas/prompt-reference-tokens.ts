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
 * Text a model wrote about its reference images ("图片1 是黑衣剑客"; MOKE's Seedance skills write "{{Image 1}}") becomes
 * `@[node:id]` tokens, so the prompt keeps pointing at the same images when it is sent on to another node.
 * `nodeIds` are in the order the images were sent.
 */
export function labelsToNodeTokens(text: string, nodeIds: string[]) {
    return text.replace(/@?(?:图片(\d+)|\{\{Image (\d+)\}\})(?!\d)/g, (match, chinese?: string, handle?: string) => {
        const nodeId = nodeIds[Number(chinese ?? handle) - 1];
        return nodeId ? nodeReferenceToken(nodeId) : match;
    });
}

/** Short spellings people (and prompt-writing skills) use for a reference label: "图片2" is also written "图2". */
export const referenceLabelAliases = (label: string) => {
    const number = /^图片(\d+)$/.exec(label)?.[1];
    return number ? [`图${number}`] : [];
};

/**
 * Splits a prompt into text, id tokens and — for prompts written before ids existed — plain reference labels
 * such as "图片1". Labels are matched longest first so "图片1" never splits "图片12".
 */
export function parsePromptTokens(value: string, legacyLabels: string[] = []): PromptToken[] {
    const labels = [...new Set(legacyLabels)].filter(Boolean).sort((a, b) => b.length - a.length);
    const parts = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    // (?!\d) keeps "图1" from splitting "图10".
    const pattern = new RegExp(`@\\[node:([^\\]]+)\\]${parts.length ? `|(${parts.join("|")})(?!\\d)` : ""}`, "g");
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

export type PromptSegment =
    | { type: "text"; value: string }
    | { type: "reference"; nodeId: string; label: string; kind: string; previewUrl?: string; title: string }
    | { type: "missing"; nodeId: string };

/**
 * A prompt or a generated text split for reading: plain text, references that are still inputs (with the number and
 * picture they have now) and references whose node is gone. The older handle "{{Image 2}}" is shown as "图片2".
 */
export function promptSegments(value: string, references: Array<{ nodeId: string; label: string; kind: string; previewUrl?: string; title: string; active: boolean }>): PromptSegment[] {
    const byNodeId = new Map(references.filter((item) => item.active).map((item) => [item.nodeId, item]));
    return parsePromptTokens(value).map((token): PromptSegment => {
        if (token.type === "node") {
            const reference = byNodeId.get(token.nodeId);
            return reference ? { type: "reference", nodeId: token.nodeId, label: reference.label, kind: reference.kind, previewUrl: reference.previewUrl, title: reference.title } : { type: "missing", nodeId: token.nodeId };
        }
        const text = token.type === "text" ? token.value : token.label;
        return { type: "text", value: text.replace(/\{\{Image (\d+)\}\}/g, "图片$1") };
    });
}
