---
name: FrameDock 帧坞
description: 自部署的 AI 图片 / 视频节点画布——“导播台 Tally”视觉体系
colors:
  signal: "oklch(0.8 0.145 72)"
  signal-light-theme: "oklch(0.7 0.15 62)"
  on-signal: "oklch(0.22 0.03 60)"
  ground: "oklch(0.195 0.009 255)"
  canvas: "#101317"
  surface: "oklch(0.215 0.01 255)"
  card: "oklch(0.225 0.01 255)"
  popover: "oklch(0.255 0.011 255)"
  accent-hover: "oklch(0.29 0.012 255)"
  ink: "oklch(0.96 0.004 255)"
  ink-muted: "oklch(0.72 0.012 255)"
  line: "oklch(0.96 0.01 255 / 9%)"
  tally-idle: "oklch(0.5 0.012 255)"
  tally-live: "oklch(0.8 0.145 72)"
  tally-ok: "oklch(0.76 0.15 155)"
  tally-fail: "oklch(0.68 0.19 25)"
  tally-stale: "oklch(0.6 0.03 255)"
typography:
  page-title:
    fontFamily: "Geist Variable, PingFang SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
  section-title:
    fontFamily: "Geist Variable, PingFang SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "Geist Variable, PingFang SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist Variable, PingFang SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
  numeric:
    fontFamily: "Geist Mono Variable, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    fontFeature: "tnum"
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "12px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
components:
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.on-signal}"
    rounded: "{rounded.md}"
    height: "32px"
    padding: "0 15px"
  button-default:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "32px"
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.sm}"
    size: "32px"
  icon-button-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.ink}"
  rail:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.md}"
    width: "40px"
  canvas-node:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.xl}"
  popover:
    backgroundColor: "{colors.popover}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "4px"
  top-bar:
    backgroundColor: "{colors.ground}"
    height: "48px"
---

# FrameDock 设计系统

## Overview

**创意北极星：导播台 Tally。** 画布是一台生成内容的切换台：每个节点戴着一盏 tally 灯，整条链运行时，信号沿连线一路点亮，就像节目推送上线。FrameDock 是 Operate 模式的工具：用户长时间待在里面搭链、等生成、比结果，所以界面必须安静、可扫读，**素材是全屏最亮的东西**。

这个体系拒绝两种默认：灰底加一个强调色的“什么都没决定”，以及紫蓝渐变的 AI 味。世界观只出四样东西：字体、配色、密度和一个标志性动作（tally 灯 + 点亮的连线 + 节目条）。布局、导航和控件一律用用户熟悉的标准做法。

关键特征：

- 冷调控制室炭灰，分三层（底 / 卡片 / 浮层），全部同一色相（255）；
- 唯一强调色是信号琥珀，只用于主操作、选中和焦点；
- tally 状态色只表达节点状态，从不用来装饰；
- 1px 发丝线边框，8–12px 的紧凑圆角，信息密度高；
- 时长、价格、尺寸、计数一律用 Geist Mono 等宽数字。

## Colors

色彩策略：**Restrained（克制）**。中性色从世界里取冷调，加一个强调色；状态色另成一套词汇。

- **Signal 信号琥珀**（`signal`，浅色主题用 `signal-light-theme`）：主按钮、当前导航的下划线、选中节点描边、焦点环、选中的参数项（12% 浅底 + 琥珀描边）。上面的文字用 `on-signal`。
- **控制室中性色**：`ground` 是页面底和顶栏，`canvas` 是画布底，比 ground 稍深，好让素材跳出来；`card` 是面板和节点，`popover` 是菜单、弹层和面板浮层，`accent-hover` 是悬停底色。文字用 `ink` / `ink-muted`，分隔线用 `line`（9% 不透明度的发丝线）。
- **Tally 状态色**：`tally-idle` 待运行，`tally-live` 排队或运行中（排队是空心，运行中是实心并呼吸），`tally-ok` 完成，`tally-fail` 失败，`tally-stale` 跳过 / 过期（虚线空心）。

代码中的位置：
- CSS token：`src/styles/globals.css`（`:root` 浅色，`.dark` 暗色）。所有 `stone-*` 工具类都被重映射到这套中性色阶，旧组件会自动跟着变；
- antd：`src/lib/app-theme.ts`，用同一组值的 hex 近似；
- 画布：`src/lib/canvas-theme.ts`。

## Typography

一族字体：**Geist** 负责标题、按钮、标签和正文，中文回落到 PingFang SC / Microsoft YaHei；**Geist Mono** 只用于数据和度量（时长、价格、百分比、快捷键）。不用展示型字体。

字号用固定 rem 阶梯，不做流式缩放：页面标题 20px/600，分区标题 16px/600，正文 14px，标签和次要信息 12px，数字 12px mono。凡是会变化的数字都加 `.tnum`（等宽数字）。

## Layout

- **外壳**：48px 顶栏（品牌、四个主入口、⌘K 搜索、设置、更多），下面是页面。内容区左右 16px 边距，与顶栏对齐，不做居中的营销式窄栏。
- **画布编辑器**：48px 实底顶栏（面包屑项目名 / 中间节目条 / 右侧操作）；左边缘是竖排工具栏；左下角是撤销 + 缩放 + 适应 + 小地图；左侧节点面板可以收起。
- **列表页**（画布、素材）：标题 + 筛选 + 搜索 + 操作放在同一行工具栏，下面是自适应网格（2 / 3 / 4 / 5 列）。
- **设置**：左侧分区列表（常用分区在前，“高级”分组在后），右侧是内容。
- 移动端：顶栏收起成菜单按钮，设置分区变成横向滚动的标签。

## Elevation & Depth

以色阶分层为主，阴影为辅。阴影带冷调色相，不用纯黑：

- `shadow-panel`：工具栏、卡片浮起一级；
- `shadow-float`：菜单、popover、命令面板、右键菜单。

不用毛玻璃做装饰，不用发光描边，也不用彩色光晕。

## Shapes

圆角内小外大：控件 6–8px（`sm` / `md`），面板和浮层 8–10px，画布节点 12px（`xl`）。边框统一 1px 发丝线；节点选中时加 1px 琥珀外描边，不加粗边框。圆形只用于 tally 灯和头像类元素。

## Components

- **按钮**：主按钮是信号琥珀底 + 深色字，32px 高；次按钮是卡片底 + 发丝线；图标按钮 32×32，悬停用 `accent-hover`。每一级按钮都有 hover / focus-visible / active / disabled 状态。
- **Tally 灯**：8px 圆点，放在节点标题行最前面，常驻显示。待运行时标题行淡化到 60%，有状态时完全不透明。
- **点亮的连线**：运行范围内的连线用琥珀色（45% 不透明）；通往当前运行节点的那条加粗，并叠加流动的虚线信号；完成后变绿，失败变红。尊重 `prefers-reduced-motion`。
- **节目条**：只在整条链运行时出现在画布顶栏中间：tally 灯 + “运行中 n/m” + 分段进度（每段是一个步骤的状态色）+ 当前节点（点击可定位）+ mono 计时 + 停止。
- **命令面板**：⌘K / Ctrl+K，cmdk 实现；分组为当前画布 / 新建 / 最近 / 前往 / 偏好；每条命令显示快捷键。
- **工具栏**：竖排 40px 宽，每个按钮的 tooltip 写明快捷键；当前工具用 15% 琥珀底 + 琥珀图标。
- **菜单 / 右键菜单**：popover 底，32px 行高，右侧是 mono 快捷键；危险项用 destructive 色；菜单始终保持在视口内。
- **参数项**：32px 高、8px 圆角；选中用琥珀描边加 12% 琥珀浅底。

## Do's and Don'ts

**Do**
- 让素材（图片、视频）成为屏幕上最亮的东西，界面色值尽量贴近底色。
- 状态只用 tally 词汇表达，画布、侧栏、节目条三处保持一致。
- 价格、时长、计数等数字用 mono 等宽，并且就地显示（模型选择器、配置节点）。
- 参数调整优先用 popover 或就地编辑；高频操作给快捷键，并在 tooltip 和菜单里写出来。
- 新增文案同时写进 `zh-CN.ts` 和 `en-US.ts`；错误信息要说明哪一步出了什么问题、怎么恢复。

**Don't**
- 不要用渐变文字、毛玻璃装饰、发光描边、点阵背景，也不要营销式的居中大标题。
- 不要把 tally 色当装饰色，也不要再引入第二个强调色。
- 不要嵌套卡片，也不要用大圆角胶囊按钮堆参数。
- 不要在组件里写死颜色（hex / rgba）；用 token 或 `canvasThemes`。
- 不要用 modal 处理不需要打断的操作。
