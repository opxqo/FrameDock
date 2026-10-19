# T018 — 设置里的 YFAI 专属栏目

状态：验收通过（Claude 实现并验收）
日期：2026-10-18

## 目的

YFAI 的信息原来分散在好几处：模型服务卡片、发送前的余额检查、任务核查、`/logs` 页、画布。现在在设置左侧导航单独开一个“YFAI”栏目，把账户、作品、流水、日志、参数回执和模型集中到一起。

## 做法

### 面板结构
`components/layout/config-yfai-panel.tsx`

- **顶部账户条**：可用 / 冻结 / 总额 ⚡（`/v1/skills/balance` 的 credits 块）、已启用模型数、目录同步时间、刷新、控制台和文档链接。没填 Key 时显示提示，并带一个跳回“模型服务”的按钮。
- **最近作品** `config-yfai-works.tsx`：
  - 列出服务端的 YFAI 任务，可以按类型或失败筛选；
  - 卡片显示结果预览（图片、视频、音频）、模型、时间、实际花费、提示词摘要、参数回执和任务号（可复制）；
  - 状态未知的任务可以“继续取回”。
- **消费明细** `config-yfai-usage.tsx`：
  - 数据来自 `/v1/skills/usage`，不带类型过滤，金额保留正负号，翻页按 next_cursor 加载；
  - 净花费只对 usage、refund、unfreeze 三类求和；
  - 每笔扣费标注能否对上本地任务，对话调用标为“对话”。
- **调用日志** `config-yfai-logs.tsx`：复用 `/api/logs?provider=yfai` 和日志页的详情抽屉。
- **参数回执**：只列出网关改写、补全或忽略了参数的任务，显示请求值 → 实际值，并附中文原因。
- **模型**：从 `config-yfai.tsx` 抽出 `YfaiModelList` 放在这里。“模型服务”页的 YFAI 卡片保留 Key 和同步，加一个“在 YFAI 面板管理 →”链接。

### 服务端
- `jobs` 新增 `notes` 列，迁移为 0006。`JobNotes` 包括：
  - `paramAdjustments`；
  - `ledgerId`；
  - `cost`；
  - `lane`。
- YFAI 适配器在提交和完成时写入 `notes`：
  - `param_adjustments`（顶层或 data 信封里都会读）；
  - 完成时的 `delivery_provenance.request_id`，即流水用的 ID；
  - `billing.actual_cost_credits`；
  - `channel_id`。
- 任务列表支持 `adapter` 过滤，返回 `prompt` 摘要（前 200 字）、`notes`、`createdAt`。
- 新增 `POST /api/jobs/:id/notes`：补记 ledgerId、cost、lane。`ledgerId: ""` 表示“查过了，没有”。

### 流水和任务的对应（修复）
**实测发现**：YFAI 流水里的 `request_id` 不是响应头 `X-Request-Id`，而是任务详情里的 `delivery_provenance.request_id`。原来的“任务核查”按 `X-Request-Id` 对账，所以一笔也对不上；提示里“多半是任务系统上线前的调用”的说法也因此是错的。

现在的做法：
- 新任务完成时直接记下 ledgerId。
- 旧任务由 `listYfaiJobs` 调一次 `GET /v1/tasks/{id}`（免费）补记，每次最多 40 个。
- YFAI 对较早的任务只返回精简视图、不含账单信息，这类任务用 `matchYfaiLedger` 按“同模型、结算时间与任务完成时间相差 3 分钟内”一对一匹配，界面标注“按时间对上”。
- 任务核查也改用同一套逻辑，`fetchYfaiLedger` 已移除。

## 验证

### 自动测试
- 服务端测试 40 项通过，其中新增一项覆盖：
  - 提交和完成时的回执合并；
  - ledgerId、cost、lane 的记录；
  - `addNotes`；
  - `prompt` 摘要；
  - `adapter` 过滤。
- 前端 `bun test` 87 项通过，新增 6 项覆盖：
  - 流水解析与带符号求和（签到、月卡、预扣不算模型花费）；
  - 余额解析；
  - 回执格式化；
  - 从实测任务形状读取 ledgerId；
  - 按 ID 或时间一对一匹配。
- 两端 typecheck 通过。
- 迁移 0006 已在运行中的 dev server 上应用，没有崩溃。

### 浏览器检查（只读，没有发起付费生成）
- 余额显示 ⚡4.48。
- 消费明细 45 条，原先 40 笔扣费全部“无记录”，现在：
  - 4 笔按 ID 对上，其余大部分按时间对上；
  - gemini 标为“对话”；
  - 仍有 13 笔对不上。
- 调用日志、模型、参数回执各标签都正常显示。
- 用 mock 渠道跑了一个任务（`aspect_ratio 21:9 → 16:9`），回执出现在作品卡片和“参数回执”标签里。这个 mock 任务（mock-image，提示词以“T018 mock receipt”开头）留在了任务列表里。

### 已知限制
- 较早的任务没有实际花费数据，卡片上不显示金额。

## 追加（同日）：导航顺序与作品本地保存

- 设置导航里 YFAI 排到“模型服务”前面。
- 原来的问题：画布的存储清理会删掉已放到画布的任务结果文件，作品页因此没有图。现在 `storage-cleanup.ts` 把最近 500 个成功任务的结果文件也算作“在用”，清理不再删除它们。代价是放到画布的图在本机存两份。
- 已经被删掉的结果会自动补回：
  - 作品页对每个成功任务发一个 HEAD 请求，检查本地文件还在不在；
  - 缺失的调用 `POST /api/jobs/:id/restore`，由服务端用这次请求带来的 Key 查询任务并重新下载，保存回原来的 key，Key 不落库；
  - 每次同时处理 2 个。
- 补回后看图走本机文件，不再请求网络。YFAI 已经不再保留的任务显示“本机没有这份结果，YFAI 也已不再提供”。
- 验证：
  - 服务端测试 41 项通过，新增一项“重新下载用一次性 Key 且不保存 Key”；
  - 前端 87 项通过，typecheck 通过；
  - 浏览器里作品页 13 个成功的图片任务原来都没有图，现在全部补回并显示，本地文件可以直接读取。
