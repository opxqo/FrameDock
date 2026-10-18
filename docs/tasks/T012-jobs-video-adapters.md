# T012 — 服务端视频适配器：YFAI 与 OpenAI 兼容（任务系统 P2 服务端部分）

状态：待执行（Claude 实现）
前置：T011 验收
方案：[backend-jobs-plan.md](../design/backend-jobs-plan.md) 阶段 P2

## 范围

1. `jobs/adapters/yfai.ts`：移植 `apps/web/src/services/api/yfai.ts` 的提交、轮询、终态判断（`is_final`、`status`、结果地址字段）。请求体由浏览器按现有 `prepareYfaiParams` 构造后提交，服务端不重复实现参数处理。
2. `jobs/adapters/openai-video.ts`：移植 `video.ts` 中 `createOpenAIVideoTask` / `pollOpenAIVideoTask` 的轮询与取内容逻辑。
3. 轮询间隔与次数沿用前端：YFAI 与 AutoDL 视频 5 秒 × 720 次，其余 2.5 秒 × 120 次。
4. 结果下载到 blob 存储，写入宽高 / 时长 / mime 到 `result`。
5. 对照 `docs/research/yfai-integration.md` 核对终态字段，用一次真实小额任务验证（需用户提供额度和确认）。

## 不要做的事

- 不移植 MiniMax / Kling / Ark / Wan / Gemini（P5）。
- 不改前端。
- 提交超时不自动重提。

## 验收标准

- [ ] 两个适配器各有基于模拟上游的单元测试（成功、失败、超时、取消、重启恢复）。
- [ ] 真实 YFAI 小额视频任务从提交到结果落盘全程通过服务端完成。
- [ ] `pnpm typecheck`、`pnpm lint`、服务端测试通过。

## 完成报告

（填写）

## 验收记录

（填写）
