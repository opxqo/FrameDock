# T011 — 持久任务引擎骨架（任务系统 P1）

状态：验收通过（Claude 实现并验收）
前置：T010 验收；日志系统迁移 `0002` 已合并
方案：[backend-jobs-plan.md](../design/backend-jobs-plan.md) 阶段 P1，第 3–5 节

## 范围

1. `apps/server/src/jobs/schema.ts`：`jobs` 表（字段见方案第 3 节），在 `schema.ts` 末尾 `export *`；生成迁移 `0003`。
2. 状态机：`queued → submitting → running → succeeded | failed | canceled`，以及 `unknown`。提交后立即写 `remote_task_id`。
3. 队列：p-queue，全局并发 + 按适配器并发上限，配置写入 `config.ts`。
4. 适配器接口：`submit` / `poll` / `fetchResult`，错误区分“可重试”“终态失败”“状态未知”。
5. 接口：`POST /api/jobs`（含 `Idempotency-Key`）、`GET /api/jobs/:id`、`GET /api/jobs`、`POST /api/jobs/:id/cancel`、`POST /api/jobs/:id/resubmit`、`GET /api/jobs/events`（SSE）。
6. 重启恢复：`submitting` → `unknown`；`running` 按 `remote_task_id` 继续轮询。
7. 结果落盘：复用 kv blob 存储，键名约定先核对 `apps/web/src/services/file-storage.ts`。
8. 上游请求共用 `src/upstream.ts`（从 `proxy.ts` 的 undici Agent 配置抽取，**先复制一份，不改 proxy.ts**）。
9. **模拟适配器**：调用现有 `/v1` 模拟接口，用于不花钱的端到端测试。
10. 任务结束后清空 `credentials` 里的 apiKey；接口响应与日志中一律脱敏。

## 不要做的事

- 不改前端；不移植真实供应商适配器（T012）。
- 不改 `proxy.ts`、`logging/`；与日志系统的对接（`run_id = jobId`）待其记录函数稳定后单独处理。
- 不动 `projects/nodes/edges/runs/assets` 旧表。

## 验收标准

- [x] 单元测试：状态机转移、幂等键、取消、重启恢复、`unknown` 不自动重提、apiKey 清空。
- [x] 用模拟适配器提交任务，杀掉并重启服务，任务继续并最终成功。
- [x] SSE 断线重连后，`GET /api/jobs` 可补齐状态。
- [x] `pnpm typecheck`、`pnpm lint`、`pnpm --filter @framedock/server test` 通过。

## 完成报告

- `jobs/schema.ts`：`jobs` 表（另有 `idempotency_key` 唯一索引、`cancel_requested`），`schema.ts` 末尾 `export *`；迁移 `0003_numerous_greymalkin`。
- `jobs/engine.ts`：`JobEngine`。所有状态变更先写库再推送，更新带 `where state in (...)` 条件，迟到的回调不会覆盖已取消 / 已完成的任务。提交成功时 `remote_task_id` 与进入 `running` 在同一条语句里写入。
- 状态规则：提交失败为明确拒绝（`fatal`）→ `failed`；其余（超时、网络错误）→ `unknown`，不自动重提；轮询出错按退避重试，连续 8 次 → `unknown`；超过 `maxPolls` → `unknown`；`failed` / `canceled` 释放幂等键，`succeeded` 保留。
- `resubmit`：仅 `unknown` 且仍有 apiKey；有任务 id 则恢复轮询，无则重新提交（可能重复计费，由用户确认）。
- 重启恢复：`submitting` → `unknown`，`queued` 重新入队，`running` 按原任务 id 继续轮询。
- `jobs/routes.ts`：`POST/GET /api/jobs`、`GET /:id`、`/:id/cancel`、`/:id/resubmit`、`GET /events`（SSE，25 秒心跳；用 `preClose` 关闭流，避免拖慢关机）。响应不含 credentials；请求体只在 `GET /:id` 返回。
- `jobs/blobs.ts`：结果写入与 `kv.ts` 相同的目录和 kv 行，键为 `video:<jobId>` / `audio:<jobId>`（`media_files`）；图片的 `image:<jobId>` 键名**是暂定的**，待 T013/T014 核对 `image_files` 读取方式。`text` 暂无 blob 存储。
- `jobs/adapters/mock.ts`：走现有 `/v1/videos` 模拟接口，用于端到端测试。`upstream.ts` 复制了 proxy 的 undici 配置（未改 `proxy.ts`）。
- 依赖：`p-queue@10.0.0`。
- 与卡片的差异：`index.ts` 仅加了 `registerJobs` 一行；未与日志系统对接（`run_id = jobId` 留待其记录函数稳定）。同步型适配器（`run` 一步式）未做，留给 T014。

## 验收记录

2026-10-18：
- `pnpm --filter @framedock/server test`：20 项通过（含日志系统的 redact 测试），其中 jobs 12 项：状态机、幂等与释放、`unknown` 不自动重提、网络错误按 `unknown`、轮询退避与放弃、`maxPolls`、取消（运行中 / 提交中，迟到结果被忽略）、重启恢复、凭据不外泄、未知适配器。
- 端到端：两个服务实例（8791 当上游模拟，8792 跑任务）。提交任务后在 `running` 时 `kill -9` 并重启，任务按原 `remote_task_id` 继续并成功；结果经 `GET /api/kv/media_files/video%3A<id>` 取回 282964 字节 MP4；库中 apiKey 已清空；重复幂等键返回 200。
- 开着一个 SSE 连接发 SIGTERM，1 秒内退出（改用 `preClose` 前为 10 秒）。
- `pnpm typecheck` 通过；biome 无错误（1 条可选链样式警告）。
- 未验证：SSE 断线重连由前端处理（T013）；真实供应商适配器（T012）。
