# T013 — 前端提交、订阅与对账（任务系统 P2 前端部分）

状态：待执行
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

- [ ] 提交视频任务后关闭标签页，重新打开，节点显示结果。
- [ ] 任务进行中重启服务，页面回来后任务继续并完成。
- [ ] 关闭 `useServerJobs` 后行为与现在完全一致。
- [ ] `unknown` 状态不会被自动重提。
- [ ] `pnpm --filter @framedock/web typecheck` 通过。

## 完成报告

（Codex 填写）

## 验收记录

（Claude 填写）
