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

## 3.1 视频包（镜头预演）

包上写 `output: "video"`，节点就打开内置的**视频**面板（模型、比例、时长），结果是一个视频节点，排在节点右侧，标题为“类别 · 模板”，连续生成时依次往下排。视频包只用 `master` 一个槽位，没有母版：卡片顶部显示连进来的“参考画面”（分镜、定稿或场景图），没有图时也可以只写描述。

| 节点 | 内容来源 |
|---|---|
| 运镜 `camera` | MOKE 视频 › 摄影技法（Camera Work）里“运镜动作”组的 48 条做模板；“节奏”“质感”两个选项取自同一栏目的“节奏速度”“稳定质感”组。MOKE 的运镜条目是短语，外面的句子是 FrameDock 写的（`source: "framedock"`），短语本身逐字保留，测试会核对 |
| 动态分镜 `animatic` | MOKE 动画 › 动态分镜 8 条，原文照搬 |
| 循环动作 `loop` | MOKE 动画 › 循环 8 条，原文照搬 |

原文在 `docs/research/moke-previz.json`（还存了“动画 › 动作表演”12 条和 Camera Work 全部 289 条，以后扩展用）。MOKE 动画类原文的主体占位写作 `[Subject]`，包里统一换成 `[主体]`。MOKE 原文写了“10 秒”“8 秒”，但时长不由模板强制设置，以视频面板为准（各模型支持的时长不同，强行设置可能导致请求失败）。

只有描述、没有连图时，`参考角色或 [主体]` 这类说法会整体换成描述（“以雨夜侦探为主体”）；连了图才保留“参考…或…”。

## 3.2 文本包（动作戏导演）

包上写 `output: "text"` 和 `mokeSkills`，节点打开内置的**文本**面板，用对话模型生成，结果是右侧一个文本节点（标题“类别 · 模板”，多次生成往下排）。

- **模板就是系统提示词**：`template.prompt` 是 FrameDock 自己写的设定（战斗类型、`{{duration}}`、`{{impact}}` 和输出规则），运行时用 `artAssetSystemPrompt` 填好选项；用户的描述原样作为用户消息。
- **MOKE Skill 在运行时读取**：`mokeSkills` 里写 Skill id，节点第一次生成时用 `lib/skills/moke-skill-bundle.ts` 通过服务端代理读取 `SKILL.md` 并缓存。**不要把 Skill 原文复制进仓库**：`director-seedance-prompt` 的包内许可证禁止复制和改编；美术资产那种“原文照搬”只适用于 MOKE 提示词库。系统提示词的顺序是 Skill、模板设定、全局提示词。
- **参考图绑定**：连入的图按发送顺序编号为“图片N”，模型在结果里写“图片N”，保存时 `labelsToNodeTokens` 把它们换成 `@[node:id]`；下游节点（比如视频节点）生成时，`buildNodeGenerationContext` 会把上游文本里的引用换成它自己的编号，引用的图没有连到下游就报错、不提交、不扣费。写给节点的提示词也要用引用，不要写纯文字“图1”。
- 连入的图以 `image_url` 发给对话模型，需要选支持视觉的文本模型。
- 文本包只放 `master`，`size` 用 `"auto"`；测试里有 text 包的专项检查。

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
| 图标全都一样、或与工具栏“外观”按钮重复 | 每个类别的每个层级一个专属图标：人物 身份卡/举手人像，场景 城市/旋转相机，服装 T 恤/衣架，道具 箱子/背包，工具 魔杖，分镜 场记板，运镜 三维移动，动态分镜 播放场记板，循环动作 循环箭头。映射在 `art-asset-node.tsx` 的 `ICONS` 里。新增其他类别时由 Claude 补图标，不要复用已有图标 |
| 分镜被放进了“美术资产”大类 | 菜单有两个大类：**美术资产**（人物、场景、服装、道具、图像处理）和**镜头预演**（分镜，以后的镜头、运镜）。每个包用 `group` 声明所属大类（`lib/art-assets/groups.ts`）；新增内容先想清楚属于哪个大类 |
| 扩展节点越来越多，菜单一长串 | 菜单是三级：大类 → 分类 → 节点。工具栏的“扩展节点”是左右两栏级联（左边大类和分类，右边悬停分类的节点），新建节点菜单里分类默认折叠。树由 `lib/canvas/node-menu-tree.ts` 的 `buildNodeMenu` 从 `group`、`subgroup` 生成，新包不用改菜单代码 |
| 重新打开画布后，预制节点卡片的参考图条是空的 | 卡片在渲染时通过 `nodesRef` 读邻居节点，而这个 ref 原来在 `useLayoutEffect` 里更新，晚于子节点渲染一拍。现在在渲染时就赋值；`CanvasNode` 另有 `contextSignature` 属性，邻居变化时让预制卡片重绘 |
| 文本预制节点生成后卡片一直显示“生成中” | 文本分支原来只给配置节点回写状态；预制节点（`composePrompt`）现在也回写，取消时回到 idle |
| 想做视频类预制节点 | 不用新组件：包上加 `output: "video"`，生成走视频分支，标题、排列、`artAssetFrom` 和图片包一致（见 3.1） |
| 菜单里所有节点平铺 | 菜单按“分组 → 类别小标题 → 节点”展示（`group`、`subgroup`，由包自动生成），扩展面板里还会显示每个节点的一行说明 |
| 新建菜单的说明太长，出现横向滚动条 | 菜单说明控制在 12 个字左右（测试限制为 14 个字） |
| YFAI 模型的推荐比例不生效 | YFAI 的比例在 `yfaiParams` 里。`withPreferredYfaiRatio` 在用户没选比例、而模型支持该比例时自动填入 |
| MOKE“角色三视图”的正面全身没有头 | MOKE 原文刻意“正面去头”，不是 bug。用户反馈后可以再加选项 |
| MJ 不遵守“不要文字、水印” | MJ 对自然语言否定不敏感。设定图类模板建议用 GPT Image、Seedream 等编辑能力强的模型 |
| 单元测试引入组件就报错 | bun 测试无法加载 `~icons/*`。可测的规则放在 `lib/art-assets/` 的纯函数里，测试只引入 lib |

## 6.1 卡片界面规则（T023 重做后）

- 卡片是**一个**节点，内部不再套带边框的卡片：层次靠间距、细分隔线和选中态（10% 白底 + 1px 半透明白描边）。
- 结构：头部（图标底、节点名、层级、参考数）→ 素材条（母版 / 参考，空时用虚线说明）→ 双列模板网格 → 选中模板的说明与比例 → 选项（`Segmented`）→ 一行固定高度的状态行。
- 次要文字一律用 `theme.node.label`；`muted` 在亮色主题下只有约 3.9:1，`faint` 不可用于文字。不写死颜色，状态红用 `bg-destructive`。
- 可点击元素都要有键盘焦点样式（`focus-visible:ring-signal`）。
- 选项的按钮文字要短：长取值用 `choiceLabels`，否则会被截断。
- 默认高度由模板行数和是否带选项算出（`cardHeight`），不要手写固定值。

## 6.2 Skill 节点的界面规则

提示词包（美术资产、分镜、运镜…）和 Skill 包（动作戏导演）在界面上要一眼分得开。节点定义的 `kind` 是 `"prompt"`（默认）或 `"skill"`，由 `artAssetNode()` 根据 `output: "text"` 且有 `mokeSkills` 自动设置，Skill 包另填 `skillInfo`（Skill 名和作者）、`outputLabel`（产出是什么）、`templateLabel`（模板选择叫什么）。

- **菜单**：工具栏“扩展节点”和双击新建菜单顶部都有“提示词 | Skill”切换（`components/canvas/node-kind-switch.tsx`，记住上次的页签）。切换只过滤带分组的扩展节点，内置节点（文本、图片…）两页都在。Skill 行的图标底是**虚线描边**，第二行是“作者 · MOKE”（mono），说明放 tooltip；提示词行是实心图标底加一句说明。
- **卡片**：Skill 节点用 `skill-node-card.tsx`，结构和提示词卡片不同——来源（Skill 名和作者，右上描边胶囊“Skill”）→ 输入（连入的参考图缩略图）→ 设定（模板用 `Segmented`，不是网格；时长、冲击力沿用选项行）→ 产出（“→ 六段式视频提示词”和状态行）。区块之间只用细分隔线，不嵌套卡片；虚线图标底和菜单里的一致。
- **标题标签**：Skill 节点的标题前有 `SkillBook` 图标，提示是“Skill 节点：基于 MOKE Skill”，和“用户给文本节点挂了 Skill”的提示不同。
- **高度**：`skillCardHeight(skillCount, optionCount) = 342 + 18 × skillCount + 61 × optionCount`，是量出来的（两个 Skill、两个选项、连了图时内容 496px，卡片 500px）。区块都是 `shrink-0`，放不下时卡片溢出，不会悄悄压扁控件。提示词卡片的 `cardHeight` 同样改成每个选项 62px、固定部分 275px。模板标题要短（测试限制 4 个字），因为 5 个选项要放进一行 `Segmented`。
- **文本节点里的引用**：Skill 节点写出的文本里有 `@[node:id]`，只读视图用 `ReferenceChipText` 显示成缩略图加编号；图片不是这个文本节点的输入，所以靠 `metadata.referenceNodeIds`（生成时记下发送顺序）和 `citedReferences` 找到。引用的图已被删除或断开就显示“引用已失效”。旧结果里的 `{{Image N}}` 显示为“图片N”。存储的文本不变。

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
