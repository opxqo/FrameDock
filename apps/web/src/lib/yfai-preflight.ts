import i18n from "@/i18n";
import type { YfaiModel } from "@/lib/yfai-catalog";

// FrameDock: checks that cost nothing and catch, before any task is submitted, the problems that used to show up
// only as a failed node: a prompt over the model's limit, and a balance that cannot cover what a run will hold back.

/** `warning`: worth knowing, never blocks. `blocker`: the run would very likely fail (e.g. not enough balance). */
export type PreflightIssue = { nodeId?: string; title: string; reason: string; severity: "warning" | "blocker" };

/** The message for a prompt longer than the length the catalog lists (a hint: the API does not enforce it), or undefined when it fits. */
export function yfaiPromptIssue(model: YfaiModel, prompt: string) {
    const max = model.max_prompt_chars;
    if (!max || prompt.length <= max) return undefined;
    return i18n.t("yfai.promptTooLong", { max, length: prompt.length, model: model.display_name });
}

/** The message for a run whose combined reservation exceeds the spendable balance, or undefined when it is covered. */
export function yfaiBalanceIssue(availableCredits: number | undefined, neededCredits: number) {
    if (availableCredits === undefined || neededCredits <= availableCredits) return undefined;
    const format = (value: number) => Number(value.toFixed(value < 10 ? 3 : 2)).toString();
    return i18n.t("yfai.balanceShort", { available: format(availableCredits), needed: format(neededCredits), short: format(neededCredits - availableCredits) });
}
