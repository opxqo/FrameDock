// FrameDock: split one text (a shot list, a numbered script, sections divided by ---) into separate pieces,
// one per text node.

export type TextSplitRule = "lines" | "numbered" | "divider";

const DIVIDER = /^\s*(?:-{3,}|={3,}|\*{3,}|_{3,})\s*$/;
// "镜头 3｜…", "第3镜：…", "Shot 3: …", "3. …", "3、…", "3) …", "（3）…"
const NUMBERED = /^\s*(?:镜头\s*\d+|第\s*\d+\s*[镜幕段]|shot\s*\d+|scene\s*\d+|[（(]?\d+[)）.、．])/i;

function clean(parts: string[]) {
    return parts.map((part) => part.trim()).filter(Boolean);
}

export function splitText(text: string, rule: TextSplitRule): string[] {
    const lines = text.replace(/\r\n?/g, "\n").split("\n");
    if (rule === "divider") {
        const parts: string[][] = [[]];
        for (const line of lines) {
            if (DIVIDER.test(line)) parts.push([]);
            else parts[parts.length - 1].push(line);
        }
        return clean(parts.map((part) => part.join("\n")));
    }
    if (rule === "numbered") {
        const parts: string[][] = [];
        for (const line of lines) {
            if (NUMBERED.test(line) || !parts.length) parts.push([line]);
            else parts[parts.length - 1].push(line);
        }
        return clean(parts.map((part) => part.join("\n")));
    }
    return clean(lines);
}

/** The rule that fits the text best: dividers, then numbered shots, else one piece per line. */
export function guessSplitRule(text: string): TextSplitRule {
    const lines = text.split("\n");
    if (lines.some((line) => DIVIDER.test(line))) return "divider";
    if (lines.filter((line) => NUMBERED.test(line)).length >= 2) return "numbered";
    return "lines";
}
