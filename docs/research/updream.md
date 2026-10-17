# updream 画布调研笔记

调研日期：2026-10-17
方式：在已登录的浏览器里观察 `https://www.updream.cn/canvas?project=...` 页面的运行时 DOM、加载的资源和接口返回的数据。只读，没有修改项目，也没有发起生成。
用途：作为 FrameDock 设计参考，只借鉴产品形态和数据模型思路，不复制对方代码。

## 技术栈（前端）

| 项 | 观察结果 |
| --- | --- |
| 框架 | React + React Router（`__reactRouterVersion`），Vite 构建（`assets/index-<hash>.js`，按路由拆包：`CanvasPage`、`AiChat`） |
| 样式 | CSS Modules（`_node_1q0bh_3` 这类类名）+ 部分 Tailwind 工具类 |
| 画布 | **自研 DOM 画布**，不是 React Flow，也不是 `<canvas>`。结构为 `.canvas-area > .canvas-world`，`canvas-world` 用 `transform: matrix(scale,…,tx,ty)` 实现平移缩放；节点是绝对定位的 `div.canvas-node`（`left/top/width/height`） |
| 协同 | 存在 Yjs 全局（`__ $YJS$ __`），可能用于实时同步或文本编辑 |
| 其他 | three.js（可能用于 3D 预览）、`opencut_wasm`（基于开源 OpenCut 的浏览器内剪辑）、`timeline-metadata` |
| 归属 | 静态资源在 `s1.hdslb.com`、媒体在 `biliapi.net`，是 B 站旗下产品 |

## 画布数据模型

### 节点 `GET /api/canvas-nodes/project/{id}`

所有节点放在一张表里，用 `node_type` 区分，主要字段：

- 通用：`id`、`name`、`x`、`y`、`width`、`height`、`node_type`、`is_deleted`、`ctime/mtime`
- 媒体结果：`cover_url`、`video_url`、`audio_url`
- 生成：`prompt`、`model_name`、`task_id`、`task_status`、`generation_history_count`、`is_dirty`
- 来源：`source_type`（`upload` / `material`）、`source_url`、`source_preview`（文本节点内容是存成 `.md` 文件，节点只存预览）
- `node_config`（JSON，存放类型相关的一切）：
  - 生成参数 `params`：`model`、`ratio`、`numImages`、`imageResolution`、`referenceImages/Videos/Audios/Documents` 等
  - Agent 溯源：`conversation_id`、`mode: agent_v2`、`chain_role`（`product` / `batch`）、`agent_output_layout`（批次、槽位，用于自动排版）、`agent_status`
  - 分组：`group` 节点用 `child_node_ids` 记录子节点

已观察到的 `node_type`：`text`、`image`、`video`、`group`。

### 连线 `GET /api/canvas-nodes/project/{id}/connections`

```json
{ "from_node_id": 1, "to_node_id": 2, "is_reference": false }
```

连线很简单，没有端口概念，只有一个 `is_reference` 标记来区分"引用关系"和"输入依赖"。

### 其他接口

- 位置批量保存：`POST /api/canvas-nodes/project/{id}/batch-update-positions`
- 单节点更新：`PUT /api/canvas-nodes/{id}`
- 素材库：`/api/asset-nodes/tree`、`/api/asset-nodes/search`（按 user / project 归属的文件夹树）
- 模型目录：`/api/ai/models`、`video-models`、`text-models`、`audio-models`、`music-models`
- 计费预估：`/api/credit/estimate?model_name=…&service_type=IMAGE&quality=2K…`

## 模型目录（适配器设计参考）

视频模型以声明式能力描述返回，前端据此渲染参数面板，例如：

- `operations`：`text_to_video`、`image_to_video`、`first_last_frame`、`reference_to_video`、`video_edit`、`clip_to_video`
- `operation_constraints`：每种操作允许的图/视频/音频数量的 min/max
- `durations`、`resolutions`、`aspect_ratios`、`max_prompt_length`、`supports_audio` 等

已见模型：VIDU Q4、Seedance 2.0 / 2.5、Wan 3.0、Hailuo H3、MiniMax H3 Max；图片：seedream-5.0、Midjourney 等。

**启发**：FrameDock 的生成适配器也应该返回这种能力描述，让节点参数面板由数据驱动，而不是每个模型写一套 UI。

## Agent 工作方式

接口前缀 `/agent/v2/conversations/{id}/…`，消息 `message_type` 有：

- `thinking`：过程提示（"开始浏览画布内容…"、"准备调用专属工作流 · 方案已写 1.8K 字"）
- `ask_user_question`：结构化提问，内容是 `[{header, question, options[{label, description}], multiSelect}]`，前端渲染成选项卡
- `message`：正式回复
- `task_complete`：任务完成

观察到的流程：用户提需求 → Agent 浏览画布和素材库 → 用选项卡确认风格、角色、时长 → 写剧本、美术资产清单、风格基准等 Markdown 文档节点 → 按文档创建角色三视图图片节点（提示词引用上游 `<图片1>`）→ 场景设计 → 视频节点。所有节点都带 `conversation_id` 和批次信息，能追溯到是哪次对话、哪一步产出的。

## 对 FrameDock 的启示

1. **画布可以自研 DOM + CSS transform**，不必一定用 React Flow；但 React Flow 能省大量交互工作，需要权衡。
2. **单表节点 + JSON 配置**的模型简单灵活，适合快速迭代节点类型。
3. 它的连线语义偏弱（只有 `is_reference`），执行依赖主要靠 Agent 编排。FrameDock 若想支持手动搭工作流并按图执行，需要更明确的端口和依赖语义。
4. **文本节点存成 Markdown 文件**，便于 Agent 读写，也符合本地优先。
5. **Agent 结构化提问（ask_user_question）** 和 **节点溯源（conversation_id、batch）** 值得照搬思路。
6. **模型能力声明式描述** 驱动参数 UI 和校验。
