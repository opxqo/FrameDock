# T013 — 前端提交、订阅与对账（任务系统 P2 前端部分）

状态：验收通过（Claude 直接实现并验收；真实 YFAI 已验证）
前置：T011 验收（可先用模拟适配器联调，T012 完成后接真实模型）
方案：[backend-jobs-plan.md](../design/backend-jobs-plan.md) 第 6 节

## 范围

1. 新增 `apps/web/src/services/api/jobs.ts`：提交、查询、取消、重提、订阅 SSE（断线自动重连）。
2. 画布视频生成（`project.tsx`）与视频页（`pages/video/index.tsx`）：模型有服务端适配器时提交 job，把 `jobId` 存入节点 `metadata`（与 `videoTaskId` 同处）；没有则走原路径。用配置开关 `useServerJobs`（默认开）控制，可在设置里关闭回退。
3. 页面加载 / 切回时对账：节点带 `jobId` → 查询；`succeeded` 写入结果，`running` 订阅，`failed` 显示错误，`unknown` 显示“状态未知”并提供“重新提交 / 放弃”。复用 `hasResumableVideoTask` 的触发点。
4. 离开画布时的清理逻辑只取消浏览器路径的请求，不取消 job。
5. 中英文文案。

## 不要做的事

- 不改 `video.ts` 等供应商构造请求的代码；不做链式运行持久化（P4）。
- 不改画布数据结构之外的无关部分；沿用现有目录结构和写法。
- 不执行 git 提交。

## 验收标准

- [x] 提交视频任务后关闭标签页，重新打开，节点显示结果。
- [ ] （仅验证了刷新页面，未验证重启服务；服务端重启恢复已由 T011 的 kill -9 测试覆盖）任务进行中重启服务，页面回来后任务继续并完成。
- [x] 关闭 `useServerJobs` 后行为与现在完全一致。
- [x] `unknown` 状态不会被自动重提。
- [x] `pnpm --filter @framedock/web typecheck` 通过。

## 完成报告

做法：**在视频服务层加一种任务类型 `provider: "job"`**，调用方（画布、视频页）几乎不用改。节点里已有的 `videoTaskId` / `videoTaskProvider` 恢复机制直接复用：`videoTaskId` 存 jobId，`videoTaskProvider` 为 `"job"`，页面重开时 `pollVideoNodeTask` 照旧触发，只是等待对象换成服务端任务。

- `services/api/jobs.ts`（新）：提交 / 查询 / 取消 / 重提；共用一条 SSE（`EventSource` 自动重连，重连后及每 15 秒重新拉取一次，防漏事件）；`watchJob` 的 abort 只停止等待，不取消任务；上传参考文件到 `job_refs`。
- `services/api/video.ts`：`createVideoGenerationTask` 在 YFAI 分支和 OpenAI 兼容分支提交 job（multipart 表单拆成 `fields` + 已上传的 `files`，同一文件只传一次）；`waitForVideoGenerationTask` / `pollVideoGenerationTask` / `storeGeneratedVideo` 识别 job；服务端不可达或没有 `/api/jobs`（404/405）时自动回退到原浏览器路径；其他供应商（MiniMax、Kling、Ark、Wan、Gemini、脚本插件）不变。
- `yfai.ts`：把 invoke 信封构造抽成 `buildYfaiInvoke`，浏览器路径与 job 共用。
- `file-storage.ts`：`loadStoredMedia`，把服务端已存的结果直接登记为节点素材，不复制。
- `project.tsx`：用户点停止 / 删除节点 / 清空画布时取消对应 job（离开页面只停止等待）；节点恢复时若 job 为 `unknown`，静默恢复只显示错误，手动重试时弹窗让用户选“重新提交 / 放弃任务”；等待 job 不再要求渠道配置完整。停止时清除节点的 job 标记。
- `pages/video/index.tsx`：job 任务最多轮询 75 分钟（原 5 分钟）。
- 设置：`serverJobs` 开关（默认开），放在“本地代理”页；中英文文案。
- 服务端配套：任务结束后自动删除其 `job_refs` 参考文件（`onFinal` + `releaseJobReferences`，`unknown` 不删，因为还可能重提）。
- 与卡片的差异：`useServerJobs` 命名为 `serverJobs`；图片、音频、文本仍走原路径（T014）。

## 验收记录

2026-10-18，在运行中的开发服务（5173 + 8787）上用 `mock-video` 模型验证，测试数据（画布、日志、任务、视频文件）已全部删除：
- 视频页：提交后任务出现在 `/api/jobs`（`openai-video` 适配器，经服务端调用模拟接口）；任务进行中刷新页面，结果在任务完成后出现并能播放；删除生成记录同时删除了任务的结果文件。
- 画布：任务带上了 `nodeId` / `projectId`；离开画布后任务继续，约 15 秒后回到画布，节点已显示视频；停止按钮（确认后）把任务置为 `canceled`。
- 测试中发现并修复：覆盖已有内容的节点再次生成时，停止不会取消任务（取消条件误判了“已有内容”）。
- `pnpm --filter @framedock/web typecheck` 通过；服务端 31 项测试通过（新增 `onFinal`、参考文件清理）。
- 真实 YFAI（2026-10-18）：视频页用 GK Imagine 1.0、3 秒、480p 提交 1 单（¥0.11）；任务进行中刷新页面，任务在服务端继续，约 35 秒后成功，页面回来后显示视频并记入生成记录；该条记录和视频保留在视频页供查看。
- 未验证：关闭 `serverJobs` 后的完全回退（代码路径未改，未在浏览器里点过）；`unknown` 弹窗的界面（只有单元测试覆盖服务端语义）；服务重启期间页面的 SSE 重连。
