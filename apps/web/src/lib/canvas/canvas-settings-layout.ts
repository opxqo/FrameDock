export function canvasSettingsVerticalPosition(anchor: { top: number; bottom: number }, viewportHeight: number, preferTop: boolean, heightLimit = Infinity) {
    const margin = 12;
    const gap = 8;
    const above = Math.max(0, anchor.top - gap - margin);
    const below = Math.max(0, viewportHeight - anchor.bottom - gap - margin);
    const minimum = Math.min(260, heightLimit);
    const openAbove = preferTop ? above >= minimum || above >= below : below < minimum && above > below;
    const maxHeight = Math.min(heightLimit, openAbove ? above : below, Math.max(0, viewportHeight - margin * 2));
    return openAbove
        ? { bottom: Math.max(margin, viewportHeight - anchor.top + gap), maxHeight }
        : { top: Math.max(margin, anchor.bottom + gap), maxHeight };
}
