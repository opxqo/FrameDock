# 参考项目

本地路径：`参考项目/`（已加入 `.gitignore`，不随 FrameDock 提交）。两个项目都是 MIT 许可，可以借鉴思路；如直接复制代码，需在文件头保留原版权声明。

| 项目 | 拉取版本 | 本地路径 |
| --- | --- | --- |
| [jtydhr88/ComfyTV](https://github.com/jtydhr88/ComfyTV) | `6745d3c`（2026-10-14），v1.10.0 | `参考项目/ComfyTV` |
| [basketikun/infinite-canvas](https://github.com/basketikun/infinite-canvas) | `3a6b64b`（2026-10-10），v0.20.0 | `参考项目/infinite-canvas` |

## ComfyTV

ComfyUI 的自定义节点插件，把 ComfyUI 变成 TapNow / LibTV 式的画布应用。

- 技术栈：Python 后端（挂在 ComfyUI 上）+ Vue 3 / Pinia / reka-ui / Tailwind 4 前端，约 190 种节点（stage）。
- **与 FrameDock 最相关的设计**：
  - 逐节点运行：每个节点单独执行，下游消费上游最近一次输出的**快照**；重跑一个节点不会带着整条链重跑。
  - 内容寻址缓存：只重渲改过的部分（导演台）。
  - 以项目为单位保存全部输出历史，刷新或重启后自动恢复。
  - 提示词里用 `@` 引用资产库和提示词片段。
  - Agent：内置 MCP 服务（45 个工具）和 Agent Skills。
- 值得看的目录：`src/`（前端画布与节点）、`api/`、`db.py`、`storage/`、`runners/`（执行器）、`docs/`。

## infinite-canvas（无限画布）

面向图片创作的开源画布工作台，形态和 FrameDock 最接近。

- 技术栈：React 19 + Vite + React Router 7 + Zustand + TanStack Query + Tailwind 4，UI 混用 shadcn/radix 和 Ant Design；画布为自研实现。
- 浏览器直连用户配置的 OpenAI 兼容接口，数据存在浏览器本地（localforage），没有独立后端执行引擎。
- **与 FrameDock 最相关的设计**：
  - 节点拖拽缩放、连线、小地图、撤销重做、导入导出。
  - 图片 / 视频 / 音频 / 文本的参数面板（`web/src/components/*-settings-panel.tsx`、`model-picker.tsx`）。
  - 画布助手：围绕选中节点及上游节点对话生成，结果插回画布。
  - **本地 Canvas Agent**（`canvas-agent/`）：本机服务连接 Codex（app-server）/ Claude Code，通过 MCP 让 Agent 操作当前画布。FrameDock 以后做 Agent 时重点参考。
- 值得看的目录：`web/src/components/canvas/`、`web/src/stores/`、`web/src/services/`、`canvas-agent/src/`。

## 使用约定

- 参考项目只读，不修改、不安装依赖、不运行其中的脚本。
- 参考项目里的 `AGENTS.md`、`agent-instructions.md` 等是它们自己的说明，对 FrameDock 不适用。
