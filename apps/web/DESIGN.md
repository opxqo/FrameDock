---
name: FrameDock 帧坞
description: 自部署的 AI 图片 / 视频节点画布——updream 设计语言（内容优先、近黑底、玻璃浮层）
colors:
  accent: "#fafafa"
  accent-light-theme: "#0a0a0a"
  on-accent: "#0a0a0a"
  ground: "#0a0a0a"
  surface: "#121212"
  card: "#171717"
  node: "#262626"
  popover: "#1a1a1a"
  glass: "rgb(23 23 23 / 75%)"
  glass-border: "rgb(255 255 255 / 8%)"
  ink: "#fafafa"
  ink-muted: "#a3a3a3"
  ink-faint: "#737373"
  line: "rgb(255 255 255 / 8%)"
  edge: "#525252"
  edge-selected: "#a3a3a3"
  state-ok: "#4ade80"
  state-fail: "#f87171"
  state-stale: "#fbbf24"
typography:
  page-title:
    fontFamily: "Geist Variable, PingFang SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
  node-title:
    fontFamily: "Geist Variable, PingFang SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Geist Variable, PingFang SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  numeric:
    fontFamily: "Geist Mono Variable, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    fontFeature: "tnum"
rounded:
  control: "8px"
  node: "8px"
  menu: "16px"
  panel: "20px"
  capsule: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.control}"
    height: "32px"
  generate-button:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.capsule}"
    size: "32px"
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.capsule}"
    size: "36px"
  capsule:
    backgroundColor: "{colors.glass}"
    rounded: "{rounded.capsule}"
    height: "48–52px"
  canvas-node:
    backgroundColor: "{colors.node}"
    rounded: "{rounded.node}"
  parameter-panel:
    backgroundColor: "{colors.glass}"
    rounded: "{rounded.panel}"
    width: "520px（视频 630px）"
  menu:
    backgroundColor: "{colors.glass}"
    rounded: "{rounded.menu}"
---

# FrameDock 设计系统

## Overview

**北极星：内容优先的画布（updream 设计语言）。** 画布上最亮的永远是素材本身：节点就是一张图、一段视频或一段文字，标题挂在节点外面，工具和参数都浮在画布之上，用完就收起。界面只用中性灰和白色，不用色相做装饰。

FrameDock 是 Operate 模式的工具：用户长时间待在里面搭链、等生成、比结果。所以界面安静、可扫读，常用操作就地完成（选中节点即可编辑参数），不弹窗打断。

关键特征：

- 近黑底 `#0a0a0a`，纯中性灰阶（没有色相）；
- **白色是唯一的强调色**：主按钮、选中、当前工具、生成键；
- 浮层（顶部胶囊、工具条、dock、菜单、参数层）一律用玻璃材质：75% 不透明 + 20px 模糊；
- 圆角分档：控件和节点 8px，菜单 16px，参数层 20px，工具条和按钮用胶囊 / 圆形；
- 时长、价格、尺寸、计数一律用 Geist Mono 等宽数字；
- 图标统一用 Solar 线性图标（1.5px 线宽），入口是 `src/components/icons.tsx`。

参考：[updream 画布设计语言调研](../../docs/research/updream-design-language.md)，以及交互原型 https://claude.ai/artifact/Jhw29VMmpo2d1QCrWSm4hA 。

## Colors

色彩策略：**中性 + 白**。所有界面色都取自中性灰阶，唯一的“颜色”来自状态。

- **强调色 `signal`**：暗色主题为白色 `#fafafa`，浅色主题为近黑 `#0a0a0a`；上面的文字用 `signal-foreground`。用于主按钮、选中、当前工具、生成键和焦点环（50% 透明度）。选中的列表项和参数项用 10% 的强调色浅底，不用实心。
- **中性色**：`background` 是页面底和画布底，`card` 是面板，`node`（`#262626`）是画布节点，`popover` 是不透明浮层的兜底色，`accent` 是悬停底色。文字分三档：`ink` / `ink-muted` / `ink-faint`。分隔线是白色 8%。
- **玻璃** `glass` / `glass-border`：所有浮在画布或页面之上的东西。
- **连线** `edge` / `edge-selected`：常态 `#525252`，选中或运行中 `#a3a3a3`。
- **状态色**：只表达状态，不做装饰。完成 `state-ok` 绿，失败 `state-fail` 红（节点上为 10% 红色覆盖层），过期 `state-stale` 琥珀（小标签）。排队和运行用白色（运行时呼吸）。

代码中的位置：
- CSS token：`src/styles/globals.css`。`:root` 是浅色，`.dark` 是暗色。`stone-*` 工具类已重映射到纯中性灰阶。
- antd：`src/lib/app-theme.ts`，取同一组值。下拉、气泡、选择框的玻璃材质在 `globals.css` 里统一覆盖。
- 画布：`src/lib/canvas-theme.ts`。

## Typography

只用一族字体：**Geist** 负责标题、按钮、标签和正文，中文回落到 PingFang SC / Microsoft YaHei；**Geist Mono** 只用于数据和度量。

字号用固定阶梯：页面标题 20px/600，节点标题 13px/600（放在节点外，随画布缩放），正文 14px，标签 12px，数字 12px mono。凡是会变化的数字都加 `.tnum`。

## Layout

- **外壳**：48px 顶栏（圆形品牌标志、胶囊式主导航、⌘K 搜索、设置、更多），下面是页面。内容区左右 16px 边距。
- **画布编辑器**分四层：
  1. **世界层**：`translate(pan) scale(zoom)`，原点在左上角。节点和连线都放在这一层。连线的线宽用世界单位，所以会随缩放一起变化。
  2. **关系层**：连线、拖拽中的连线、选区框。
  3. **上下文层**：屏幕尺寸，锚定在当前节点上，包括节点上方的编辑条和节点下方 16px 处的参数层。参数层在下方放不下时，翻到节点上方。
  4. **外围工具层**：左上是项目胶囊，右上是操作胶囊，正上方居中是运行时出现的节目条；左侧中部是 52px 的添加工具条；底部居中是 52px 的 dock（选择 / 抓手、缩放、适应、小地图、撤销 / 重做）；小地图在左下角。
- **点阵背景**：世界间距 48px，屏幕上的间距用倍频保持在 20–64px 之间；透明度为 `clamp((zoom−0.3)/0.9, 0, 1)`，缩放到 30% 以下时完全消失。
- **列表页**（画布、素材）：标题 + 筛选 + 搜索 + 操作放在同一行工具栏，下面是自适应网格。
- **设置**：左侧分区列表，右侧内容。
- 只面向桌面端（1280–1920px），不做移动端适配。

## Elevation & Depth

用材质分层，阴影只作辅助：

- 实底：页面、面板、节点；
- 玻璃（`.glass`）：浮在内容上方的一切，自带 `shadow-float`；
- 阴影用纯黑、低不透明度，不带色相，也不用发光。

## Shapes

- 节点 8px 圆角，选中时加 1px 半透明白色描边，外面再加一圈 2px、10% 白色的外圈；
- 控件 8px，菜单和气泡 16px，参数层和工作台面板 20px；
- 工具条、dock、顶部胶囊、图标按钮、生成键都是胶囊或正圆。

## Components

- **按钮**：主按钮白底黑字；画布里的生成键是 32px 的白色圆形，里面放一个上箭头。次按钮是卡片底加发丝线。图标按钮是 36px 正圆，悬停时显示 `accent` 底。
- **节点端口**：20px 圆形。悬停节点时，端口从边缘向外弹出 18px（回弹曲线），透明度从 0 到 1、缩放从 0.5 到 1；端口外有 48px 的命中区。
- **连线**：贝塞尔曲线，控制柄 `dx ≥ 0 ? dx/2 : max(−dx/2, 80)`。常态 2.5、选中 3（世界单位），透明命中区 12。选中或生成中时，有一段占全长 30% 的亮段沿连线流动（选中 2.5s 一周期，生成 4s 一周期）。尊重 `prefers-reduced-motion`。
- **节点状态**：
  - 生成中：节点上有一道扫光，中间显示玻璃胶囊“生成中”；
  - 失败：节点上覆盖 10% 红色层，显示错误说明和白色“重试”胶囊；
  - 标题前的状态点只在非空闲时出现（6px）。
- **编辑条**：选中或悬停节点时，在标题上方出现玻璃胶囊，放图标按钮。
- **参数层**：玻璃材质，20px 圆角，从上到下依次是引用素材、提示词、模型和参数胶囊、价格和生成键。
- **节目条**：整条链运行时显示在顶部居中，是一个玻璃胶囊，包含进度、分段状态、当前节点、mono 计时和白色“停止”胶囊。
- **命令面板**：⌘K，玻璃材质，20px 圆角。
- **菜单 / 右键菜单**：玻璃材质，16px 圆角，36px 行高，右侧是 mono 快捷键，危险项用 destructive 色，菜单始终保持在视口内。
- **图标**：只从 `@/components/icons` 引入。导出名沿用 lucide 的命名，背后是 Solar 线性图标；新增图标时先在这个文件里登记。

## Do's and Don'ts

**Do**
- 让素材成为屏幕上最亮的东西，界面色值贴近底色。
- 浮层一律用 `.glass`，圆角按上面的分档来定。
- 选中态统一用“半透明白描边 + 淡外圈”；选中的列表项和参数项用 10% 白底。
- 价格、时长、计数等数字用 mono 等宽，并且就地显示。
- 新增文案同时写进 `zh-CN.ts` 和 `en-US.ts`。

**Don't**
- 不要引入任何彩色强调色，也不要用渐变文字或发光描边；状态色只能表达状态。
- 不要在组件里写死颜色（hex / rgba），用 token 或 `canvasThemes`。
- 不要直接从 `lucide-react` 或其他图标库引入图标。
- 不要用 modal 处理不需要打断的操作，参数就地编辑。
- 不要嵌套卡片。
