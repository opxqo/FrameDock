# FrameDock 设计文档（v0.1 草案）

更新日期：2026-10-17
状态：第 0 节为当前策略，其余章节中与之冲突的部分以第 0 节为准。本文档是 FrameDock 的权威设计；根目录 `codex.md` 仅作早期讨论背景。

## 0. 策略调整（2026-10-17，优先于下文）

用户要求：能直接复制开源项目代码就复制，当前阶段最重要的是把工作流跑通。因此：

- **前端**：`apps/web` 整体复制自 [infinite-canvas](https://github.com/basketikun/infinite-canvas)（MIT，提交 `3a6b64b`）。UI 沿用它的 antd + Tailwind + Zustand，**取代第 3.1 节的 React Flow + shadcn 方案和第 8 节的界面设计**。它已有画布、连线数据流、图片 / 视频 / 文本 / 音频生成、视频任务恢复、模型渠道配置。
- **执行**：先在前端编排。在 infinite-canvas 的单节点生成之上增加“运行到此处 / 运行下游”（拓扑排序、失败阻断下游）。第 6 节的服务端执行引擎、输入哈希缓存放到后续阶段。
- **存储**：暂时沿用 infinite-canvas 的浏览器本地存储（localforage）。迁移到服务端 SQLite + 本地文件放到工作流跑通之后，第 4 节的数据模型届时再按实际情况调整。
- **后端**：`apps/server` 保留，先提供 OpenAI 兼容的模拟生成接口，用于不花钱的端到端测试。
- **界面**（2026-10-17 更新）：UI 设计以 [`apps/web/DESIGN.md`](../apps/web/DESIGN.md) 为准（“导播台 Tally”体系），产品事实见 [`apps/web/PRODUCT.md`](../apps/web/PRODUCT.md)，改版审查见 [`docs/design/ui-audit.md`](design/ui-audit.md)。
- **里程碑**（取代第 10 节）：T002 复制前端 → T003 模拟接口 → T004 整条链运行 → 接入真实接口 → 存储迁移到服务端。

## 1. 定位

FrameDock（帧坞）是一套自部署的 **无限画布 + 节点式工作流** 创作工具，面向 AI 图片 / 视频生成。

- 画布体验参考 updream（调研见 [research/updream.md](research/updream.md)）。
- 连线是**真正的数据依赖**：节点有输入 / 输出端口，可手动搭流程、单节点重跑、复用缓存。
- 自部署：服务、数据库、素材都在自己的机器上；生成服务调用用户配置的第三方 API。

## 2. 已确认的决定

| 事项 | 决定 |
| --- | --- |
| 形态 | 先做 Web；桌面端等体系成熟后再考虑 |
| 工作流语义 | 端口 + 数据依赖，支持手动编排和按图执行；以后 Agent 操作同一张图 |
| 生成服务 | 第三方接口由用户后续提供；在此之前用模拟适配器（Mock）跑通流程 |
| Agent | 第一版不做，数据模型预留来源字段 |
| 用户 | 单用户，不做登录和协作（默认假设，待确认） |
| UI 原则 | **优先使用成熟开源组件，万不得已才手写** |

## 3. 技术栈

### 3.1 前端

| 用途 | 选型 | 说明 |
| --- | --- | --- |
| 框架 | React 19 + TypeScript + Vite | |
| 画布 | **@xyflow/react（React Flow）** | 平移缩放、端口连线、小地图、框选、分组都是现成的 |
| 画布 UI 组件 | **React Flow UI**（xyflow 官方，基于 shadcn） | 节点外框、工具栏、缩放控件、节点状态指示等，通过 shadcn CLI 安装 |
| 通用 UI 组件 | **shadcn/ui**（Radix + Tailwind CSS） | 按钮、对话框、下拉、标签页、侧边栏、右键菜单、Resizable 面板、Command 等 |
| 图标 | lucide-react | shadcn 默认图标库 |
| 通知 | sonner | shadcn 自带 Toast 方案 |
| 上传 | react-dropzone | 拖拽上传图片 / 视频 |
| 视频播放 | Vidstack Player | 视频节点预览 |
| 图片查看 | yet-another-react-lightbox | 点开大图、对比 |
| 参数面板 | react-hook-form + zod + shadcn Form | 由模型能力声明映射成表单控件 |
| 状态管理 | Zustand + zundo | zundo 提供撤销 / 重做 |
| 服务端数据 | TanStack Query | 接口请求、缓存、失效刷新 |

主题：暗色为主（参考 updream），用 shadcn 的主题变量统一配置。

### 3.2 后端

| 用途 | 选型 |
| --- | --- |
| 运行时 | Node.js 22 + TypeScript |
| Web 框架 | Fastify（含 `@fastify/multipart` 上传、`@fastify/static` 素材访问） |
| 数据库 | SQLite（better-sqlite3）+ Drizzle ORM |
| 校验 | zod（前后端共用 schema） |
| 实时推送 | SSE（任务状态、节点结果回填） |
| 并发控制 | p-queue |
| 媒体处理 | ffmpeg / ffprobe（取视频封面、时长、尺寸）、sharp（图片缩略图） |

### 3.3 工程结构

pnpm workspace monorepo：

```text
FrameDock/
├── apps/
│   ├── web/            # 前端
│   └── server/         # 本地服务 + 执行引擎
├── packages/
│   └── shared/         # 节点类型、端口类型、zod schema、API 类型
├── data/               # 运行时数据（不入库）：SQLite + 素材文件
└── docs/
```

以后做 Docker：一个镜像同时提供前端静态文件和 API，挂载 `data/` 目录。

## 4. 数据模型

### 4.1 表结构（SQLite）

**projects**：`id`、`name`、`viewport`（JSON：x/y/zoom）、`created_at`、`updated_at`

**nodes**

| 字段 | 说明 |
| --- | --- |
| `id` | 节点 ID（nanoid） |
| `project_id` | 所属项目 |
| `type` | 节点类型，见第 5 节 |
| `title` | 标题 |
| `x` / `y` / `width` / `height` | 位置尺寸 |
| `parent_id` | 所在分组（可空） |
| `params` | JSON，节点参数（提示词、模型、比例、时长等） |
| `output` | JSON，当前输出（文本内容 / 素材 ID 列表） |
| `status` | `idle` / `queued` / `running` / `succeeded` / `failed` / `stale` |
| `input_hash` | 产生当前输出时的输入哈希，用于判断是否需要重跑 |
| `origin` | JSON，来源（`manual` / 以后的 `agent` + 对话 ID），为 Agent 预留 |
| `created_at` / `updated_at` | |

**edges**：`id`、`project_id`、`source_node_id`、`source_port`、`target_node_id`、`target_port`、`order`（多输入端口内的顺序）

**assets**（素材）：`id`、`project_id`、`kind`（image / video / audio / text）、`path`（相对 `data/`）、`mime`、`width`、`height`、`duration`、`size`、`sha256`、`thumbnail_path`、`source`（upload / generated）、`created_at`

**runs**（每次执行记录，即生成历史）

| 字段 | 说明 |
| --- | --- |
| `id` | |
| `node_id` | |
| `input_hash` | |
| `inputs_snapshot` | JSON，本次执行实际用到的参数和上游输入 |
| `adapter` / `model` | 用的哪个适配器、哪个模型 |
| `remote_task_id` | 第三方任务 ID（关键：重启后据此继续查询） |
| `status` | `pending` / `submitted` / `running` / `succeeded` / `failed` / `canceled` |
| `output` | JSON，结果素材 ID |
| `error` | 错误信息 |
| `cost` | JSON，费用记录（服务商返回或估算） |
| `created_at` / `finished_at` | |

节点的 `output` 指向“当前选中的那次 run”的结果；历史结果保留在 `runs` 里，可在节点上切换。

### 4.2 素材存储

```text
data/
├── framedock.db
└── projects/{projectId}/
    ├── assets/{assetId}.{ext}
    └── thumbs/{assetId}.webp
```

## 5. 节点与端口

### 5.1 端口数据类型

`text`、`image`、`video`（后续加 `audio`）。连线只允许类型匹配的端口相连，React Flow 的 `isValidConnection` 负责校验。端口可以是单值或多值（如“参考图”可连多张，按 `order` 排序）。

### 5.2 第一版节点类型

| 节点 | 输入端口 | 输出端口 | 是否执行 |
| --- | --- | --- | --- |
| 文本 `text` | — | `text` | 否，内容即输出（Markdown） |
| 图片 `image` | — | `image` | 否，上传或从素材库拖入 |
| 视频 `video` | — | `video` | 否，上传或从素材库拖入 |
| 图片生成 `image_gen` | `prompt: text`、`refs: image[]` | `image[]` | 是 |
| 视频生成 `video_gen` | `prompt: text`、`first_frame: image`、`last_frame: image`、`refs: image[]`、`ref_videos: video[]` | `video` | 是 |
| 分组 `group` | — | — | 否，只用于整理 |

生成节点的可用端口和参数由所选模型的**能力声明**决定（如某模型不支持首尾帧，就不显示该端口）。节点内部的提示词输入框和 `prompt` 端口二选一：连了上游文本就用上游，没连就用节点自己的提示词。

## 6. 执行引擎

### 6.1 运行方式

- **运行此节点**：只执行当前节点；上游节点若为 `stale` 或从未执行，先执行上游。
- **运行到此处**：执行当前节点及其所有上游。
- **运行下游**：执行当前节点及其所有下游。

### 6.2 流程

1. 从目标节点收集需要执行的子图，拓扑排序；检测到环则拒绝。
2. 按顺序计算每个节点的 `input_hash` = hash（节点类型 + 参数 + 模型 + 适配器版本 + 各上游输出的内容哈希）。
3. 哈希与上次成功执行相同 → 直接复用结果，不调用接口、不花钱。
4. 否则创建 `run`，交给适配器提交；拿到 `remote_task_id` **立即写库**，再轮询状态。
5. 成功后下载结果到本地素材目录，生成缩略图，更新节点 `output` 和 `status`，通过 SSE 推给前端。
6. 失败则记录错误，下游节点不执行。

### 6.3 可靠性

- **重启恢复**：服务启动时扫描状态为 `submitted` / `running` 的 run，用 `remote_task_id` 继续轮询。
- **防重复扣费**：提交请求超时时，不自动重新提交，先标记为“状态未知”，由用户确认或按适配器支持的查询方式核实。
- **过期标记**：上游参数或输出变化时，下游节点标记为 `stale`，不自动执行。
- **并发**：全局和按适配器分别限制并发数（p-queue）。

## 7. 生成适配器

每个第三方接口写一个适配器，实现统一接口：

```ts
interface GenerationAdapter {
  id: string
  version: string
  listModels(): Promise<ModelCapability[]>
  submit(req: GenerationRequest): Promise<{ remoteTaskId: string }>
  poll(remoteTaskId: string): Promise<TaskState>   // 状态 + 结果 URL 或错误
  estimateCost?(req: GenerationRequest): Promise<Cost>
}
```

`ModelCapability` 参考 updream 的模型目录，声明：支持的操作（文生图、图生视频、首尾帧、参考生视频…）、每种操作允许的图片 / 视频 / 音频数量、可选比例、分辨率、时长、提示词长度上限、模型专属参数。前端据此生成端口和参数表单，后端据此校验。

接口密钥保存在服务端配置（`data/config.json` 或环境变量），前端不接触密钥。

第一版先实现 **Mock 适配器**：延迟几秒后返回占位图片 / 视频，用来跑通整个流程。用户提供第三方接口后再逐个接入。

## 8. 前端界面

参考 updream 布局：

- **顶栏**：项目名、返回项目列表、全局运行状态。
- **左侧工具条**：添加节点、素材库、运行历史。
- **画布**：React Flow，暗色点阵背景，小地图在左下角。
- **底部工具条**：选择 / 抓手、缩放、适应画布、撤销 / 重做。
- **右侧检查面板**（选中节点时打开）：参数表单、运行按钮、历史结果切换。
- 右键菜单：复制、删除、成组、运行。

额外页面：项目列表、设置（配置适配器和密钥）。

## 9. 接口概要

```text
GET    /api/projects                     项目列表
POST   /api/projects                     新建项目
GET    /api/projects/:id/graph           节点 + 连线 + 视口
PATCH  /api/projects/:id/graph           批量增删改节点和连线（画布编辑统一走这里）
POST   /api/projects/:id/assets          上传素材
GET    /api/projects/:id/assets          素材列表
POST   /api/nodes/:id/run                运行（mode: self | upstream | downstream）
POST   /api/runs/:id/cancel              取消
GET    /api/nodes/:id/runs               节点生成历史
GET    /api/models                       所有适配器的模型能力
GET    /api/events?project=:id           SSE：节点状态、运行结果
GET    /files/*                          素材文件
```

画布编辑统一用“批量操作”接口，以后 Agent 修改画布也复用同一套操作，不另开接口。

## 10. 里程碑

| 阶段 | 内容 | 完成标准 |
| --- | --- | --- |
| M0 工程初始化 | monorepo、前后端骨架、shadcn 和 React Flow 接入、SQLite | 前端能打开空画布，后端健康检查通过 |
| M1 画布 | 节点、端口连线、分组、小地图、撤销 / 重做、自动保存、项目列表 | 刷新页面后画布完整恢复 |
| M2 素材 | 上传图片 / 视频、缩略图、素材库面板、拖入画布 | 素材存到本地，重启可见 |
| M3 执行引擎 | 拓扑执行、哈希缓存、run 持久化、SSE、Mock 适配器 | 文本 → 图片生成 → 视频生成整条链跑通；改中间节点只重跑受影响部分；中途重启服务后任务能继续 |
| M4 真实接口 | 接入用户提供的第三方图片 / 视频接口 | 用真实接口跑通同一条链 |

## 11. 待确认

- 单用户、不做登录的假设是否成立。
- 第三方图片 / 视频接口的文档（M4 前提供即可）。
- 是否需要音频节点（配音 / 音乐）进入第一版。
