# 后端任务系统方案：让生成任务在后台持续运行

状态：已确认（P4 采用方案 A，2026-10-18）
日期：2026-10-18
关联：[design.md](../design.md) 第 6、7 节（执行引擎、适配器），T005 统一存储

## 1. 问题

现在所有生成请求都由浏览器页面发起、轮询、下载（`apps/web/src/services/api/{video,image,audio,yfai}.ts`），后端 `apps/server` 只做转发（`/proxy`）和存储（`/api/kv`）。后果：

| 场景 | 现状 |
| --- | --- |
| 关闭标签页 / 刷新 | 图片、音频、文本的同步请求直接丢失；视频任务靠节点里的 `videoTaskId` 在重开页面后继续轮询 |
| 离开画布 / 切换项目 | [project.tsx:359](../../apps/web/src/pages/canvas/project.tsx) 的清理逻辑会 abort 全部请求，并取消链式运行 |
| 长任务 | 视频页最多轮询 120 次；链式运行进度只在内存里 |
| 提交超时 | 没有防护，重试可能重复扣费 |
| 服务重启 | 没有任务恢复 |

目标：**任务一旦提交，不依赖页面是否开着；服务重启后能接着跑；结果落到服务端，页面回来直接拿到。**

## 2. 方案总览（建议）

服务端新增“持久任务（job）引擎”，浏览器从“执行者”变成“提交者 + 订阅者”。

```
浏览器                                   服务端
  │  POST /api/jobs  (请求规格 + 渠道配置)     │
  │ ────────────────────────────────────────▶│ 写 jobs 表（先落库再返回）
  │◀──────────────── { jobId }                │ 队列(p-queue) → 适配器 submit/poll
  │  GET /api/jobs/events (SSE)               │      │ 记录 remote_task_id（提交后立即写库）
  │◀───── job 状态变更                         │      ▼
  │                                           │ 结果下载 → data/blobs/<store>/…
  │  页面重开：按 jobId 对账                   │ 状态 succeeded / failed / unknown
```

关键取舍：

1. **不重写前端的供应商逻辑。** `video.ts` 等共约 1800 行，按设计文档第 0 节“不做无关重构”，前端的构造请求代码保持不动。
2. **服务端适配器按优先级逐个移植**：先 YFAI（统一接口，已集成）和 OpenAI 兼容视频，其余（MiniMax、Kling、Ark、Wan、Gemini）暂留浏览器驱动。
3. **浏览器路径保留为回退**：服务不可用或模型暂无服务端适配器时，走原有逻辑。用开关控制，逐步切换。
4. **新建 `jobs` 表，不复用 `runs`。** `runs` 外键指向 `nodes`，而当前画布数据存在 kv 的 JSON 里，没有 `nodes` 行；`projects/nodes/edges/runs/assets` 这批早期表目前无代码使用，本方案不动它们，等存储迁移时再统一处理。

## 3. 数据模型

`jobs` 表（新增）：

| 字段 | 说明 |
| --- | --- |
| `id` | 文本主键（nanoid） |
| `kind` | `image` / `video` / `audio` / `text` |
| `adapter` | `yfai` / `openai-video` / …（决定服务端用哪个适配器） |
| `model` | 模型 id |
| `state` | `queued` / `submitting` / `running` / `succeeded` / `failed` / `canceled` / `unknown` |
| `request` | JSON：适配器需要的请求规格（提示词、参数、引用素材的 kv 键） |
| `credentials` | 渠道 baseUrl + apiKey 的快照；任务结束后清空 apiKey |
| `remote_task_id` | 供应商任务 id，提交成功后**立即**写库 |
| `result` | JSON：结果素材的 kv store / key、mime、宽高、时长 |
| `error` | 失败原因（可展示的文本） |
| `project_id` / `node_id` / `run_id` | 对账用，与日志系统字段同名，便于关联 |
| `attempts` / `next_poll_at` | 轮询计划，重启后据此继续 |
| `created_at` / `updated_at` / `finished_at` | 毫秒时间戳 |

状态含义里的 `unknown`：提交请求超时、无法确定供应商是否已受理。**不自动重提**，由用户在界面上确认“重新提交”或“放弃”。

API Key 落库的说明：单用户自部署，API Key 本来就明文存在 kv 的 `ai_config_store` 里，因此 jobs 里存快照不增加新的暴露面；但任务结束后清空，日志和接口响应里一律脱敏。

## 4. 服务端接口

| 接口 | 作用 |
| --- | --- |
| `POST /api/jobs` | 提交任务，先写库再入队，返回 `{ jobId }`；带 `Idempotency-Key`（节点 id + 输入哈希），重复提交返回已有任务 |
| `GET /api/jobs/:id` | 查询单个任务 |
| `GET /api/jobs?node=&project=&state=` | 按节点 / 项目 / 状态对账 |
| `POST /api/jobs/:id/cancel` | 取消（尽力通知供应商，不保证退款） |
| `POST /api/jobs/:id/resubmit` | 对 `unknown` 状态任务，用户确认后重提 |
| `GET /api/jobs/events` | SSE，推送状态变化；断线后前端按 `GET /api/jobs` 补齐 |

结果素材写入现有的 kv blob 存储（`data/blobs/media_files/…`），键名沿用前端 `services/file-storage.ts` 的约定，这样前端已有的 `resolveMediaUrl` 不用改。**键名约定实现前需要核对。**

## 5. 引擎行为

- **队列**：p-queue，全局并发 + 按适配器并发上限，写在配置里。
- **提交**：`state=submitting` 时调用适配器 `submit`；成功立刻写 `remote_task_id`，再进入 `running`。提交抛网络超时 → `unknown`。
- **轮询**：间隔和次数沿用前端现有值（YFAI / AutoDL 视频 5s × 720；其他 2.5s × 120），单次失败按指数退避重试，不计入失败。
- **完成**：下载结果 → 写 blob → 写 `result` → 清空 apiKey → 推 SSE。
- **重启恢复**：启动时扫描 `submitting`（→ `unknown`）和 `running`（按 `remote_task_id` 继续轮询）；优雅退出时把进行中的任务保持原状，不标失败。
- **同步型任务**（图片生成 / 编辑、音频）：供应商没有任务 id，服务端直接发起长请求并等待；服务重启则落入 `unknown`。这类任务的“后台”只保证**页面关闭后继续跑**，不保证服务重启后恢复。
- **网络出口**：沿用 `proxy.ts` 的 undici Agent（20 分钟超时、尊重 `HTTPS_PROXY`），抽到共享的 `upstream.ts`，避免两套配置。

## 6. 前端改动（最小化）

1. 新增 `services/api/jobs.ts`：提交、查询、订阅 SSE。
2. 画布与图片 / 视频页：在“发起生成”处判断模型是否有服务端适配器；有则提交 job，把 `jobId` 存进节点 `metadata`（与现有 `videoTaskId` 同一处），没有则走旧路径。
3. 页面加载 / 切回时，对账：节点有 `jobId` → 查任务；`succeeded` 则写入结果，`running` 则订阅，`failed` / `unknown` 则显示状态。复用现有 `hasResumableVideoTask` 的触发点（[project.tsx:531](../../apps/web/src/pages/canvas/project.tsx)）。
4. 离开页面的清理逻辑改为：只取消浏览器路径的请求，job 不受影响。
5. 链式运行（运行下游）见阶段 4。

## 7. 阶段划分

| 阶段 | 内容 | 验收 |
| --- | --- | --- |
| P0 运维基础 | 生产模式单进程：Fastify 托管 `apps/web` 构建产物；`pnpm start` 一条命令；macOS launchd 示例（开机自启、崩溃重启）；优雅退出 | 关掉终端后服务仍在；kill 后自动拉起 |
| P1 引擎骨架 | `jobs` 表 + 迁移；队列；接口 + SSE；适配器接口；**模拟适配器**（接现有 `/v1` 模拟接口，不花钱） | 单元测试：状态机、幂等、重启恢复、`unknown` 不自动重提 |
| P2 视频任务上线 | YFAI + OpenAI 兼容视频适配器；前端提交 / 对账 / 回退开关；结果落 blob | 提交视频后关闭标签页，重开看到成功；重启服务期间任务不丢 |
| P3 同步型任务 | 图片生成 / 编辑、音频、文本走 job；取消 | 生成中关闭页面，结果在重开后出现 |
| P4 链式运行持久化 | 方案 A：浏览器编排 + 每节点持久 job，run 记录写服务端 | 运行下游途中关页面：已提交节点跑完；重开后自动继续推进下游，失败阻断下游 |
| P5 其余适配器 | MiniMax / Kling / Ark / Wan / Gemini 逐个移植；逐个切换开关 | 各适配器用模拟服务做回归 |

### P4 决策（已确认）

采用**方案 A**：浏览器仍负责编排，每个节点是持久 job，编排状态（run 记录：节点顺序、已完成集合）写入服务端。页面关闭时，已提交的节点会跑完，但下游不会自动推进；页面重开后对账并继续推进。

方案 B（服务端理解画布、完全后台推进）推迟到存储迁移到服务端 SQLite 之后再评估。

## 8. 与日志系统的协调

另一个会话正在开发日志系统，当前未提交改动涉及 `schema.ts`（新增 `api_logs`）、`package.json`、迁移 `0002`、`logging/`，后续大概率还会改 `index.ts` 和 `proxy.ts`。避免冲突的约定：

- 新代码放 `apps/server/src/jobs/` 和 `apps/server/src/upstream.ts`，**不改** `proxy.ts`、`logging/`。
- 新表定义放 `src/jobs/schema.ts`，在 `schema.ts` 末尾 `export *` 一行；迁移编号在日志系统迁移合并之后再生成（`0003`），先不生成迁移文件。
- `index.ts` 只加一行 `register`，提交前先看一遍当前 diff。
- job 引擎发出的上游请求要进日志：`api_logs` 已有 `run_id` / `node_id` 字段，约定 `run_id = jobId`。具体接入方式等日志系统的记录函数稳定后再对接，需要问那边的会话。

## 9. 风险与未核实项

- 前端 `file-storage.ts` 的 blob 键名约定、`app-sync.ts` 对 `media_files` 的同步行为：写适配器之前要读一遍。
- YFAI 各模型的轮询终态字段（`is_final`、`status`）以 `docs/research/yfai-integration.md` 和 `services/api/yfai.ts` 为准，移植后用真实小额任务验证一次。
- 供应商若不支持按任务 id 查询，服务重启后无法恢复，只能落入 `unknown`。
- 任务跑在服务端意味着服务端要能访问供应商和素材地址；若用户在浏览器里配了代理而服务端没有，需要读 `HTTPS_PROXY`（已支持，但要在 P0 文档里写明）。

## 10. 建议的任务卡拆分

按 [tasks/README.md](../tasks/README.md) 的流程，Claude 实现引擎核心（P1 状态机与恢复、P2 适配器），Codex 做接口、前端对接和测试：

| 卡片 | 内容 | 执行者 |
| --- | --- | --- |
| [T010](../tasks/T010-server-prod-run.md) | P0 生产模式单进程与常驻运行 | Codex |
| [T011](../tasks/T011-jobs-engine.md) | P1 引擎骨架 | Claude |
| [T012](../tasks/T012-jobs-video-adapters.md) | P2 服务端视频适配器 | Claude |
| [T013](../tasks/T013-jobs-web.md) | P2 前端对接与对账 | Codex |
| [T014](../tasks/T014-jobs-sync-kinds.md) | P3 同步型任务 | Codex |

P4 的卡片等 P2 验收后再写。编号从 T010 起，给日志系统留出 T008–T009。
