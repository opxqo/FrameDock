/**
 * Spendable ⚡ credits from GET /v1/skills/balance. The live response carries `credits.available`, while the
 * published docs name it `available_balance`; both are accepted so a rename on either side cannot silently
 * switch the balance check off (scripts/verify-yfai.ts asserts this against the real service).
 */
export function parseYfaiAvailableCredits(payload: unknown): number | undefined {
    const credits = (payload as { credits?: { available?: unknown; available_balance?: unknown } } | undefined)?.credits;
    const value = Number(credits?.available ?? credits?.available_balance);
    return Number.isFinite(value) ? value : undefined;
}
