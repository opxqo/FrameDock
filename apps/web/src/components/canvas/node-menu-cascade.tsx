import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { ChevronRight } from "@/components/icons";
import { getNodeSpec } from "@/constant/canvas";
import { NodeKindSwitch, skillSource, useNodeMenuKind } from "@/components/canvas/node-kind-switch";
import { buildNodeMenu, defaultCategory, filterByKind, type MenuCategory } from "@/lib/canvas/node-menu-tree";
import { cn } from "@/lib/utils";
import type { CanvasNodeDefinition } from "@/types/canvas-plugin";

// FrameDock: the extension nodes as a two-column menu. Left: 大类 headings with their 分类; right: the nodes of the
// category under the pointer. Only one category is open at a time, so the menu stays the same size however many
// nodes the packs add.

const titleOf = (def: CanvasNodeDefinition) => getNodeSpec(def.type).title;

/** A Skill node's icon sits on a dashed tile and its second line names the skill authors; a prompt node has the solid tile and a one-line description. */
function NodeRow({ def, onPick }: { def: CanvasNodeDefinition; onPick: (type: string) => void }) {
    const skill = def.kind === "skill";
    return (
        <button type="button" title={skill ? def.description : undefined} className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2 py-1 text-left text-[13px] outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-signal/60" onClick={() => onPick(def.type)}>
            <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg text-base", skill ? "border border-dashed border-foreground/30" : "bg-secondary")}>{def.icon}</span>
            <span className="min-w-0 flex-1">
                <span className="block truncate font-medium leading-4">{titleOf(def)}</span>
                {skill ? <span className="mt-0.5 block truncate font-mono text-[11px] leading-4 text-muted-foreground">{skillSource(def)}</span> : def.description ? <span className="mt-0.5 block truncate text-[11px] leading-4 text-muted-foreground">{def.description}</span> : null}
            </span>
        </button>
    );
}

export function NodeMenuCascade({ defs, onPick }: { defs: CanvasNodeDefinition[]; onPick: (type: string) => void }) {
    const { t } = useTranslation();
    const [kind, setKind] = useNodeMenuKind();
    const groups = useMemo(() => buildNodeMenu(filterByKind(defs, kind), titleOf), [defs, kind]);
    const [activeKey, setActiveKey] = useState<string>();
    const fallback = defaultCategory(groups);
    const active: MenuCategory<CanvasNodeDefinition> | undefined = groups.flatMap((group) => group.categories).find((category) => `${category.key}` === activeKey) ?? fallback;

    return (
        <div className="flex max-h-[62vh] min-h-[300px] gap-3">
            <div className="flex min-h-0 w-[148px] shrink-0 flex-col gap-2">
            <NodeKindSwitch
                kind={kind}
                defs={defs}
                onChange={(next) => {
                    setKind(next);
                    setActiveKey(undefined);
                }}
            />
            <nav className="thin-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
                {groups.map(({ group, categories }) => (
                    <div key={group || "_"} className="mb-1">
                        {group ? <div className="px-2 pb-1 pt-3 text-[11px] font-medium tracking-[0.08em] text-muted-foreground/70 first:pt-1">{group}</div> : null}
                        {categories.map((category) => {
                            const isActive = category === active;
                            return (
                                <button
                                    key={category.key}
                                    type="button"
                                    aria-current={isActive ? "true" : undefined}
                                    className={cn("flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-signal/60", isActive ? "bg-accent font-medium" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground")}
                                    onMouseEnter={() => setActiveKey(category.key)}
                                    onFocus={() => setActiveKey(category.key)}
                                    onClick={() => setActiveKey(category.key)}
                                >
                                    <span className="min-w-0 flex-1 truncate">{category.name}</span>
                                    <ChevronRight className="size-3.5 shrink-0 opacity-50" />
                                </button>
                            );
                        })}
                    </div>
                ))}
            </nav>
            </div>
            <div className="thin-scrollbar min-w-0 flex-1 overflow-y-auto border-l border-border pl-3">
                {active ? (
                    <>
                        <div className="px-2 pb-1 pt-1 text-[11px] font-medium text-muted-foreground">{active.name}</div>
                        <div className="grid gap-0.5">
                            {active.defs.map((def) => (
                                <NodeRow key={def.type} def={def} onPick={onPick} />
                            ))}
                        </div>
                    </>
                ) : (
                    <p className="px-2 py-3 text-[11px] text-muted-foreground">{t("canvas.createMenu.kindEmpty")}</p>
                )}
            </div>
        </div>
    );
}
