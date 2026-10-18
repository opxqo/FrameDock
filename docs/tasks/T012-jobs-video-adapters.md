# T012 — 服务端视频适配器：YFAI 与 OpenAI 兼容（任务系统 P2 服务端部分）

状态：已完成，待真实任务验证（Claude 实现）
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

- [x] 两个适配器各有基于模拟上游的测试（成功、失败、5xx 不重提、过期、文件缺失；取消与重启恢复由 T011 的引擎测试覆盖）。
- [ ] （待用户确认额度后执行）真实 YFAI 小额视频任务从提交到结果落盘全程通过服务端完成。
- [x] `pnpm typecheck`、`pnpm lint`、服务端测试通过。

## 完成报告

- `jobs/adapters/yfai.ts`：移植 `yfai.ts` 的 `unwrap`、`yfaiTaskUrls`、轮询语义。请求为 `{ invoke: <浏览器构造的 invoke 信封> }`，凭据 `baseUrl` 取 YFAI 的 `/v1` 地址。提交：4xx 与错误信封 → `failed`；5xx、网络错误、无任务号 → `unknown`，不重发。轮询：503/429 与 `is_final=false`（含 `needs_review`）→ 继续；410 → `failed`（已过期）；400/401/403/404 → `failed`，其余 → 退避重试；终态按 `status` / `error` 判成败，失败信息带任务号。结果取第一个 URL 下载，不带 API Key。5 秒 × 720 次，与前端一致。
- `jobs/adapters/openai-video.ts`：移植 `createOpenAIVideoTask` / `pollOpenAIVideoTask`。请求 `{ fields, files? }`，文件来自 kv blob（`store` + `key`，仅 `[a-z0-9_]+` 的 store 名）或内联 data URL，由服务端组装 multipart。支持 `{code,data}` 信封、`video_url` 等结果地址（公开链接不带 Key）、`/videos/{id}/content`（带 Key），并识别内容接口返回的 JSON 错误。
- `jobs/adapters/http.ts`：共用请求、错误信息提取、下载校验。
- `AdapterContext` 增加 `kind`；`jobs/testing.ts` 抽出测试公共代码；`pnpm test` 的 glob 改为递归。
- 与卡片的差异：OpenAI 兼容适配器轮询 3 秒 × 600 次（30 分钟），长于前端的 5 分钟——后台任务不阻塞页面，超时只会进入 `unknown`。YFAI 多图输出只保存第一张，批量图片留给 T014。
- 未做：真实 YFAI 任务验证（见验收标准，需要用户确认额度）。

## 验收记录

（填写）
