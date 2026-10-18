import { readablePrompt } from "@/lib/canvas/prompt-reference-tokens";
import { CanvasNodeType, type CanvasNodeData } from "@/types/canvas";

/**
 * FrameDock: what a text node passes downstream. Its own content first; a prompt-only text node (one used to
 * write a prompt for an image/video) passes its prompt. A generated text node that failed or is still running
 * passes nothing — its `prompt` holds the request (including upstream text), not a result.
 */
export function textNodeOutput(node: CanvasNodeData) {
    if (node.type !== CanvasNodeType.Text) return "";
    const content = node.metadata?.content;
    if (content) return content;
    const status = node.metadata?.status;
    // A prompt may hold reference tokens (@[node:id]); downstream nodes get readable text, never raw tokens.
    return status === "error" || status === "loading" ? "" : readablePrompt(node.metadata?.prompt || "", []);
}
