# 官方预制节点（美术资产）设计说明

本文是“官方预制节点”的权威说明，记录 T019–T021 摸索出来的做法和踩过的坑。新增或修改预制节点前先读本文。

## 1. 是什么

预制节点把一组提炼好的提示词模板封装成一个画布节点。用户的使用过程是：拖出节点，在卡片上选模板，连参考图或写一句描述，然后点生成。

- 模型、比例、张数、费用估算都复用内置的图片生成面板。
- 面板里的输入框改作可选的“补充描述”。
- 结果出现在节点右侧，自动连线，标题为“类别 · 模板”，例如“人物 · 角色三视图”。

## 2. 内容来源

- **直接沿用 MOKE AIGC 提示词库**（https://www.mokeaigc.ai/cinematique.html）。分类、模板清单、提示词原文都照搬，模板上标 `source: "moke"`。这是用户的决定，项目不做商业化。
- 美术资产 46 条原文已经抓取到 `docs/research/moke-art-assets.json`：
  - `summary` 是卡片副标题，MOKE 的“可选参数”“必填”写在这里，格式为 `标签 → 取值 ｜ …`；
  - `prompt` 是“详细提示词”。
- 原文只允许修改明显的机翻错字，并在模板文件的注释里写明，同时登记到 `tests/art-asset-packs.test.ts` 的 `edited` 表。测试会逐字比对其余 MOKE 模板（空行除外）。
- MOKE 没有的内容才自己写，标 `source: "framedock"`，写法向 MOKE 看齐：一段完整、可直接发送的提示词。
- 游戏 UI 类条目（界面、Slots、LOGO、ICON 等）与视频无关，不做。

## 3. 分层

每个资产类别（人物、场景、服装、道具……）是一个“包”，最多三个节点：

| 层级 | 作用 | 输入要求 |
|---|---|---|
| 一级 · 定稿 `master` | 产出母版：从描述设计，或把一张已有图片整理成规范设定图 | 至少有一个模板可以只用文字（`input: "either"`），其余可以要求图片 |
| 二级 · 派生 `derive` | 基于母版继续加工：表情、姿势、拆解、多机位等 | 必须有图（`input: "image"`） |
| 工具 `tool` | 单步图像处理，不分层，例如细节强化、文字消除 | 必须有图 |

如何判断一条 MOKE 模板放在哪一层：
- 产出的图适合拿来当这个角色、场景、物体的“标准参考”，就放定稿；
- 只是在已有设计上做变化，就放派生；
- 与类别无关的通用处理，放工具。

## 4. 母版共用（核心机制）

- 定稿节点生成的图片会带上 `metadata.artAssetFrom = 节点类型`。从该节点连出、带这个标记的图片就是这个节点的资产，默认第一张为**母版**（`lib/art-assets/node-types.ts` 的 `artAssetMaster`）。
- 之后在同一个定稿节点切换任何模板再生成，母版都会自动作为第一张参考图发送（`useBuiltinPanel.ownReferences`），连进来的图排在后面。
- 卡片顶部显示母版缩略图：点缩略图可以换一张，“不用母版”可以关掉。
- 派生节点以上游连进来的图为准，没连图时生成会被拦下并提示，不发请求。
- 定稿结果图的工具栏上有“派生”按钮：点了会在右侧新建对应的派生节点并连好线（`ART_ASSET_DERIVE_FOR` 由包配置自动生成）。
- 同一个节点的新结果依次排在已有结果下方，不会叠在一起。

## 5. 数据格式

一个包是一个文件，放在 `apps/web/src/lib/art-assets/packs/<类别>.ts`，然后在 `lib/art-assets/packs.ts` 的 `ART_ASSET_PACKS` 里登记。节点类型、菜单分组、一键派生都会自动生成，**不需要改组件代码**。人物包（`character.ts`）和场景包（`scene.ts`）是样板。

```ts
export const SCENE_PACK: ArtAssetPack = {
    category: "scene",
    label: { zh: "场景", en: "Scene" },                 // 结果标题的前缀
    master: { title: { zh: "场景定稿", en: "Scene master" }, description: { zh: "概念图、背景提取、重组", en: "…" }, templates: MASTER },
    derive: { title: …, description: …, templates: DERIVE },
    // tool: { … }
};
```

模板（`ArtAssetTemplate`）的字段：

| 字段 | 说明 |
|---|---|
| `id` | 全局唯一。MOKE 模板用 `moke-<类别>-<英文名>`，自写的用 `<类别>-<英文名>` |
| `title` / `summary` | 中英文，`summary` 一句话 |
| `category` / `tier` | 与所在包和节点一致 |
| `input` | `"image"` 必须有图；`"either"` 图或文字都行 |
| `size` | 推荐比例，取 `lib/media-size.ts` 里的值，`"auto"` 表示跟随原图 |
| `source` | `"moke"` 或 `"framedock"` |
| `prompt` | 完整提示词，规则见下 |
| `options` | MOKE 的可选参数：`{ id, label: {zh,en}, choices: [写进提示词的值…], choiceLabels?: [按钮上的短文字…] }`，第一个为默认值 |

提示词里的两种占位：
- **`[主体]`**：MOKE 原文的写法，例如“以参考角色或 [主体] 为主体”。有描述时替换成描述；没有描述时去掉“或 [主体]”。
- **`{{id}}`**：可选参数。把 MOKE 原文里的默认值换成 `{{id}}`，例如“设计8个同系列建筑变体”改成“设计{{count}}个同系列建筑变体”，`choices: ["8","6","4"]`。

提示词里没有 `[主体]` 时，用户写的描述会以【补充描述】的形式追加在末尾。包里的模板不会再被追加任何 FrameDock 通用规则，提示词本身必须完整。

## 6. 踩过的坑（都已解决，新代码不要再犯）

| 问题 | 原因与现在的处理 |
|---|---|
| 生成后节点变成了文本节点 | 图片分支原本会把非图片的源节点转成文本节点。预制节点已排除（`project.tsx` 里 `composePrompt` 分支） |
| 出错后卡片被错误页替换，模板选不了 | 预制节点在 loading 和 error 状态下照常渲染自己的卡片，状态显示在卡片底部一行 |
| 缺少输入时节点进入错误状态 | 缺少输入只弹警告，节点状态不变 |
| 多次生成的结果叠在一起 | 新结果排在已有结果下方 |
| 图标全都一样、或与工具栏“外观”按钮重复 | 每个类别的每个层级一个专属图标：人物 身份卡/举手人像，场景 城市/旋转相机，服装 T 恤/衣架，道具 箱子/背包，工具 魔杖。映射在 `art-asset-node.tsx` 的 `ICONS` 里。新增其他类别时由 Claude 补图标，不要复用已有图标 |
| 菜单里所有节点平铺 | 菜单按“分组 → 类别小标题 → 节点”展示（`group`、`subgroup`，由包自动生成），扩展面板里还会显示每个节点的一行说明 |
| 新建菜单的说明太长，出现横向滚动条 | 菜单说明控制在 12 个字左右（测试限制为 14 个字） |
| YFAI 模型的推荐比例不生效 | YFAI 的比例在 `yfaiParams` 里。`withPreferredYfaiRatio` 在用户没选比例、而模型支持该比例时自动填入 |
| MOKE“角色三视图”的正面全身没有头 | MOKE 原文刻意“正面去头”，不是 bug。用户反馈后可以再加选项 |
| MJ 不遵守“不要文字、水印” | MJ 对自然语言否定不敏感。设定图类模板建议用 GPT Image、Seedream 等编辑能力强的模型 |
| 单元测试引入组件就报错 | bun 测试无法加载 `~icons/*`。可测的规则放在 `lib/art-assets/` 的纯函数里，测试只引入 lib |

## 7. 验证方法（不花钱）

1. `cd apps/web && bun test && pnpm typecheck`。`tests/art-asset-packs.test.ts` 会自动检查所有包：
   - id 唯一；
   - 层级与输入一致；
   - 比例合法、中英文齐全；
   - 选项与占位对应、填充后没有残留；
   - MOKE 原文逐字一致。
2. 浏览器：新建一个测试画布，在页面控制台执行下面的拦截脚本，然后在节点上点生成。脚本只拦截生成请求，免费的文件上传照常进行。

```js
window.__captured = [];
const orig = window.fetch;
window.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input.url;
  if (/model-runtime\/invoke|\/api\/jobs$|images\/generations|images\/edits/.test(url) && (init?.method || "GET").toUpperCase() === "POST") {
    window.__captured.push({ url, body: init?.body });
    return new Response(JSON.stringify({ error: "blocked by test" }), { status: 400, headers: { "content-type": "application/json" } });
  }
  return orig(input, init);
};
const O = XMLHttpRequest.prototype.open, S = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.open = function (m, u, ...r) { this.__u = u; this.__m = m; return O.call(this, m, u, ...r); };
XMLHttpRequest.prototype.send = function (b) { if (/model-runtime\/invoke|chat\/completions/.test(this.__u) && this.__m.toUpperCase() === "POST") { window.__captured.push({ url: this.__u, body: b }); this.abort(); return; } return S.call(this, b); };
// 生成后查看：JSON.parse(window.__captured[0].body).request.invoke.params
```

3. 检查拦截到的请求：
   - `params.prompt` 是模板原文，占位已填好；
   - `params.images` 带了参考图或母版；
   - `aspect_ratio` 是推荐比例。
4. 用完删除测试画布。拦截产生的失败结果节点也要删掉。
5. **付费出图必须先征得用户同意**，每个新节点最多一次。

## 8. 新增一个类别的检查清单

1. 从 `docs/research/moke-art-assets.json` 选条目，按第 3 节的规则分层。
2. 新建 `lib/art-assets/packs/<类别>.ts`，文件头注释写明来源条目编号和改动；在 `packs.ts` 里登记。
3. MOKE 原文的默认参数值换成 `{{id}}`，并配上 `options`。
4. 确认至少有一个定稿模板是 `input: "either"`。
5. 运行 `bun test`。失败信息会指出具体是哪个模板、哪一项不对。
6. 按第 7 节在浏览器里逐个节点检查。
7. 在任务卡的完成报告里列出：每条模板的来源（MOKE 编号或自写）、分层理由、对原文的改动。
