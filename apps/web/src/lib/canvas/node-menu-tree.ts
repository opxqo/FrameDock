// FrameDock: the extension nodes as a menu tree — 大类 (group) → 分类 (category) → 节点. Packs add dozens of nodes, so the
// menus show one level at a time instead of one long list. Pure, so it can be tested without the UI.

export type MenuDef = { type: string; group?: string; subgroup?: string; kind?: "prompt" | "skill" };
export type MenuKind = "prompt" | "skill";
export type MenuCategory<T> = {
    /** Stable key within its group. */
    key: string;
    name: string;
    defs: T[];
    /** A category made of one node that is named like it (分镜, 图像处理): the row stands for that node. */
    single: boolean;
};
export type MenuGroup<T> = { group: string; categories: MenuCategory<T>[] };

/** Groups keep registration order, ungrouped nodes come first; inside a group, nodes with the same subgroup share a category. */
export function buildNodeMenu<T extends MenuDef>(defs: T[], titleOf: (def: T) => string): Array<MenuGroup<T>> {
    const groups = new Map<string, Map<string, MenuCategory<T>>>();
    for (const def of defs) {
        const groupName = def.group ?? "";
        const categories = groups.get(groupName) ?? new Map<string, MenuCategory<T>>();
        const name = def.subgroup ?? titleOf(def);
        const existing = categories.get(name);
        if (existing) existing.defs.push(def);
        else categories.set(name, { key: name, name, defs: [def], single: !def.subgroup });
        groups.set(groupName, categories);
    }
    return [...groups]
        .sort(([a], [b]) => (a ? 1 : 0) - (b ? 1 : 0))
        .map(([group, categories]) => ({ group, categories: [...categories.values()] }));
}

/** The category a cascading menu opens first: the first one that is not a single node, else the first. */
export function defaultCategory<T>(groups: Array<MenuGroup<T>>) {
    const all = groups.flatMap((group) => group.categories);
    return all.find((category) => !category.single) ?? all[0];
}

/**
 * The nodes shown under one of the menu's two pages (提示词 | Skill). Only grouped extension nodes belong to a page;
 * built-in nodes (文本, 图片, 视频 …) have no group and stay on both.
 */
export function filterByKind<T extends MenuDef>(defs: T[], kind: MenuKind): T[] {
    return defs.filter((def) => !def.group || (def.kind ?? "prompt") === kind);
}

/** How many grouped nodes a page holds, so a menu can say when a page is empty. */
export const countByKind = <T extends MenuDef>(defs: T[], kind: MenuKind) => defs.filter((def) => def.group && (def.kind ?? "prompt") === kind).length;
