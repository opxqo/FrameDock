import { expect, test } from "bun:test";
import { buildNodeMenu, countByKind, defaultCategory, filterByKind } from "../src/lib/canvas/node-menu-tree";

const def = (type: string, group?: string, subgroup?: string) => ({ type, group, subgroup });
const title = (item: { type: string }) => item.type;

test("nodes fall into group → category, in registration order, with ungrouped nodes first", () => {
    const tree = buildNodeMenu(
        [def("a-master", "美术资产", "人物"), def("a-derive", "美术资产", "人物"), def("s-master", "美术资产", "场景"), def("board", "镜头预演"), def("loose")],
        title,
    );
    expect(tree.map((group) => group.group)).toEqual(["", "美术资产", "镜头预演"]);
    expect(tree[1]!.categories.map((category) => [category.name, category.defs.length, category.single])).toEqual([["人物", 2, false], ["场景", 1, false]]);
    expect(tree[2]!.categories[0]).toMatchObject({ name: "board", single: true });
});

test("a cascading menu opens on the first real category, not on a single node", () => {
    const tree = buildNodeMenu([def("board", "镜头预演"), def("p1", "美术资产", "人物"), def("p2", "美术资产", "人物")], title);
    expect(defaultCategory(tree)?.name).toBe("人物");
    expect(defaultCategory(buildNodeMenu([def("only")], title))?.name).toBe("only");
    expect(defaultCategory([])).toBeUndefined();
});

test("the Skill | prompt switch only filters grouped extension nodes; built-in nodes stay on both pages", () => {
    const skill = (type: string, group: string, subgroup?: string) => ({ type, group, subgroup, kind: "skill" as const });
    const defs = [{ type: "text" }, def("p-master", "美术资产", "人物"), skill("fight", "镜头预演", "动作戏"), def("board", "镜头预演")];
    expect(filterByKind(defs, "prompt").map((item) => item.type)).toEqual(["text", "p-master", "board"]);
    expect(filterByKind(defs, "skill").map((item) => item.type)).toEqual(["text", "fight"]);
    expect([countByKind(defs, "prompt"), countByKind(defs, "skill")]).toEqual([2, 1]);
    expect(countByKind([{ type: "text" }], "prompt")).toBe(0);
});
