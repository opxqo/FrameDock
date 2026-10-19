import { Segmented } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { countByKind, type MenuDef, type MenuKind } from "@/lib/canvas/node-menu-tree";
import type { CanvasNodeDefinition } from "@/types/canvas-plugin";

// FrameDock: the node menus have two pages — 提示词 (prompt-template nodes: 美术资产, 分镜, 运镜 …) and Skill (nodes built on
// MOKE skills: 动作戏导演). The switch is shared by the toolbar's extensions panel and the double-click create menu, and
// remembers the page that was last open.

const STORAGE_KEY = "framedock:node-menu-kind";

function readKind(): MenuKind {
    try {
        return localStorage.getItem(STORAGE_KEY) === "skill" ? "skill" : "prompt";
    } catch {
        return "prompt";
    }
}

export function useNodeMenuKind() {
    const [kind, setKind] = useState<MenuKind>(readKind);
    const change = (next: MenuKind) => {
        setKind(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            /* the page is only a convenience */
        }
    };
    return [kind, change] as const;
}

/** "邪恶红猴子 · MOKE": who wrote the skills a Skill node is built on. */
export const skillSource = (def: Pick<CanvasNodeDefinition, "skills">) => (def.skills?.length ? `${[...new Set(def.skills.map((skill) => skill.author))].join("、")} · MOKE` : "MOKE");

export function NodeKindSwitch({ kind, onChange, defs }: { kind: MenuKind; onChange: (kind: MenuKind) => void; defs: MenuDef[] }) {
    const { t } = useTranslation();
    // Without any extension node there is nothing to switch.
    if (!countByKind(defs, "skill") && !countByKind(defs, "prompt")) return null;
    return (
        <div onPointerDown={(event) => event.stopPropagation()}>
            <Segmented block size="small" value={kind} onChange={(next) => onChange(next as MenuKind)} options={[{ value: "prompt", label: t("canvas.createMenu.kindPrompt") }, { value: "skill", label: t("canvas.createMenu.kindSkill") }]} />
        </div>
    );
}
