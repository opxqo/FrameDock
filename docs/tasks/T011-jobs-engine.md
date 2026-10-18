# T011 — 持久任务引擎骨架（任务系统 P1）

状态：待执行（Claude 实现）
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

- [ ] 单元测试：状态机转移、幂等键、取消、重启恢复、`unknown` 不自动重提、apiKey 清空。
- [ ] 用模拟适配器提交任务，杀掉并重启服务，任务继续并最终成功。
- [ ] SSE 断线重连后，`GET /api/jobs` 可补齐状态。
- [ ] `pnpm typecheck`、`pnpm lint`、`pnpm --filter @framedock/server test` 通过。

## 完成报告

（填写）

## 验收记录

（填写）
