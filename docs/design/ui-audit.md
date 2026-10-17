# UI 审查（改版前）

日期：2026-10-17。依据：impeccable（Operate 模式，`craft-floor.md`、`operate.md`）和 taste-skill 的 `redesign-existing-projects` 清单。
截图：改版前暗色 1440 / 390 全部路由，以及 T004 留下的画布证据图（`docs/tasks/evidence/T004-*.png`）。
状态标记：✅ 已修复，⏳ 待处理。

## 全局 / 设计系统

| # | 问题 | 位置 | 依据 |
|---|---|---|---|
| G1 | 暗色底是 `oklch(0.145 0 0)`，基本等于纯黑，且完全中性无色相；卡片层 `#1c1917` 是暖灰，和冷中性混用 | `styles/globals.css` `.dark`、`lib/app-theme.ts` | redesign：避免纯黑、不要冷暖灰混用 |
| G2 | primary 用白色（暗色）/ 黑色（浅色），没有强调色：主按钮、选中、焦点都是黑白，层级只靠明度 | `lib/app-theme.ts` | operate：强调色只用于主操作、选中和状态 |
| G3 | 没有指定字体，使用系统默认字体；数字没有设 tabular-nums（时长、价格、尺寸会跳动） | `index.html`、`globals.css` | craft-floor：浏览器自带表面也要设计 |
| G4 | 渐变文字 `.ai-title-aurora`；提示词标签写死 hex 颜色 | `globals.css` | craft-floor 禁用：渐变文字 |
| G5 | 圆角混乱：rounded-full 胶囊按钮、rounded-2xl 面板、antd 默认 6px 并存 | 各组件 | redesign：圆角要分层次（内小外大） |
| G6 | 状态色没有统一的词汇：侧栏用绿点和橙点，节点卡片没有状态，运行中只有一个转圈 | `canvas-side-panel.tsx`、`canvas-node.tsx` | PRODUCT 原则 2：状态一眼可见 |
| G7 | 滚动条、选中文本、焦点环都是浏览器默认 | `globals.css` | craft-floor |

## 外壳与首页

| # | 问题 | 位置 |
|---|---|---|
| S1 | 首页是营销页：超大 “FrameDock 帧坞” 标题、彩色高亮词块、点阵背景、装饰圆圈，和工具定位不符；用户要先点“开始使用”才能进入工作 | `pages/home/index.tsx` |
| S2 | 顶栏有 7 个主入口加 6 个图标按钮（Agent、文档、渠道、语言、主题、版本号、GitHub），大部分和工作流无关 | `components/layout/app-top-nav.tsx` |
| S3 | 画布列表的空状态只有一句话，标题“FrameDock 帧坞”重复，还有“画布库”这种眉标（kicker，craft-floor 禁用） | `pages/canvas/index.tsx` |
| S4 | 没有全局搜索或命令面板；跳转只能用鼠标 | — |
| S5 | 没有 API Key 时缺少引导，第一次运行才弹出配置窗口 | `use-config-store` `openConfigDialog` |

## 画布编辑器

| # | 问题 | 位置 |
|---|---|---|
| C1 | 顶栏塞了插件、文档、渠道、语言、主题、版本、GitHub、键盘、Agent，还有“Codex 未连接”状态；项目名和保存状态反而不显眼 | `canvas-top-bar.tsx` |
| C2 | 节点悬浮工具条在暗色下是白色胶囊，是全屏最亮的元素，抢了素材的视觉重心 | `canvas-node-hover-toolbar.tsx` |
| C3 | “生成配置”节点里的字号约 9px，tab、计数、按钮挤在一起，正常缩放下看不清 | `canvas-config-node-panel.tsx` |
| C4 | 节点没有状态指示：待运行、排队、运行中、成功、失败、过期分不清；运行中只在结果节点里放一个转圈 | `canvas-node.tsx` |
| C5 | “组装提示词”面板很大，悬浮在节点下方，挡住画布，像一个模态窗口 | `canvas-node-prompt-panel.tsx` |
| C6 | 底部工具条有 13 个图标，没有分组标签，也没有显示快捷键；缩放条单独放在左下角 | `canvas-toolbar.tsx`、`canvas-zoom-controls.tsx` |
| C7 | 运行整条链的进度“工作流运行中：2/2”浮在顶部中间，和停止按钮离得很远，也不显示当前在跑哪个节点 | `project.tsx` |
| C8 | 空画布只有网格，没有任何引导（双击添加、拖入文件、快捷键） | `project.tsx` |
| C9 | 左侧面板默认展开，占 280px；“画布 / 资产 / 提示词库”三个 tab 和画布无关的内容混在一起 | `canvas-side-panel.tsx` |
| C10 | 快捷键只有撤销、复制、全选等基础操作，运行、适应画布、切换工具都没有快捷键，也没有速查表 | `project.tsx:1620` |

## 设置

| # | 问题 | 位置 |
|---|---|---|
| P1 | 6 个 tab 平铺（渠道、本地代理、偏好设置、提示词来源、WebDAV、本地存储），常用和少用的混在一起 | `app-config-modal.tsx` |
| P2 | 偏好设置页的默认模型、图片分辨率、音频参数、系统提示词在同一个长表单里，没有分组 | `app-config-modal.tsx` |
| P3 | 页面标题下方是“渠道聚合、模型选择、同步与本地存储”这种说明文案，信息量很低 | `pages/config/index.tsx` |

## 工作台 / 素材 / 提示词

| # | 问题 | 位置 |
|---|---|---|
| W1 | 生图工作台是三栏卡片，卡片里再套虚线框（卡片嵌套，craft-floor 禁用）；质量和分辨率用大号胶囊按钮，占掉大半屏 | `pages/image/index.tsx` |
| W2 | 空状态是“空收件箱”插画加一句话，没有说明下一步该做什么 | `pages/image`、`pages/video` |
| W3 | 移动端（390px）三栏挤成一列，参数面板很长 | `pages/image`、`pages/video` |
| W4 | 素材库和提示词库的筛选标签样式和其他页面不一致 | `pages/assets`、`pages/prompts` |
