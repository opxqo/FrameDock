import { expect, test } from "bun:test";
import { findYfaiModel } from "../src/lib/yfai-catalog";
const { yfaiBalanceIssue, yfaiPromptIssue } = await import("../src/lib/yfai-preflight");

const mj = findYfaiModel("yfai::mj_imagine")!;

test("a prompt over the model's limit is reported with its length and the limit", () => {
    const issue = yfaiPromptIssue(mj, "字".repeat(1500));
    expect(issue).toContain("1500");
    expect(issue).toContain("1024");
    expect(yfaiPromptIssue(mj, "字".repeat(1024))).toBeUndefined();
});

test("a model without a limit never reports a prompt problem", () => {
    const unlimited = { ...mj, max_prompt_chars: undefined };
    expect(yfaiPromptIssue(unlimited, "x".repeat(100_000))).toBeUndefined();
});

test("a run that needs more than the spendable balance says how much is missing", () => {
    const issue = yfaiBalanceIssue(0.2, 0.76);
    expect(issue).toContain("0.2");
    expect(issue).toContain("0.76");
    expect(issue).toContain("0.56");
    expect(yfaiBalanceIssue(5, 0.76)).toBeUndefined();
});

test("an unreadable balance never blocks a run", () => {
    expect(yfaiBalanceIssue(undefined, 100)).toBeUndefined();
});

const { parseYfaiAvailableCredits } = await import("../src/lib/yfai-balance");
test("the balance parser reads the live response shape and the documented one", () => {
    expect(parseYfaiAvailableCredits({ credits: { available: 10.139105, balance: 10.139105, frozen: 0 } })).toBe(10.139105);
    expect(parseYfaiAvailableCredits({ credits: { available_balance: 3 } })).toBe(3);
    expect(parseYfaiAvailableCredits({ credits: {} })).toBeUndefined();
    expect(parseYfaiAvailableCredits(undefined)).toBeUndefined();
});
