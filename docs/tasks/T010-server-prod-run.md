# T010 — 服务端生产模式单进程与常驻运行（任务系统 P0）

状态：验收通过（Claude 直接实现并验收）
方案：[backend-jobs-plan.md](../design/backend-jobs-plan.md) 阶段 P0

## 背景

现在 `pnpm dev` 同时起 Vite 和 Fastify，关掉终端两者都停。要让后台任务能持续运行，服务必须能以单进程常驻：Fastify 同时提供 API 和 `apps/web` 的构建产物，崩溃后自动拉起，退出时有序收尾。

## 范围

1. **托管前端构建产物**：`apps/server` 在生产模式下用 `@fastify/static` 提供 `apps/web/dist`，非 `/api`、`/proxy`、`/v1` 前缀的 GET 请求回退到 `index.html`（单页应用路由）。目录不存在时只打印提示，不影响 API 启动。
2. **一条命令启动**：根 `package.json` 增加 `pnpm start`（先确认 `apps/web` 与 `apps/server` 已构建，再起 server），并增加 `pnpm build` 已有的串联不被破坏。
3. **监听地址可配置**：新增环境变量 `HOST`（默认 `127.0.0.1`），写入 `config.ts` 和 `.env.example`。不要默认监听 `0.0.0.0`。
4. **优雅退出**：收到 SIGINT / SIGTERM 时停止接收新请求，等待进行中的请求最多 10 秒，再关闭数据库。保留现有的信号处理结构，只补超时。
5. **macOS 常驻示例**：新增 `deploy/launchd/com.framedock.server.plist.example` 和 `docs/deploy.md`，说明如何用 launchd 开机自启、崩溃重启、日志位置，以及用 `HTTPS_PROXY` / `NO_PROXY` 配置出口代理。

## 不要做的事

- 不改 `proxy.ts`、`logging/`、`schema.ts`（另一个会话正在开发日志系统）；`index.ts` 只加静态托管的注册和 `HOST`，提交前先看当前 diff。
- 不新增数据库表，不生成迁移。
- 不改 `apps/web` 源码；不把 Vite 开发服务器改成生产方式。
- 不执行 git 提交。

## 验收标准

- [x] `pnpm build && pnpm start` 后，浏览器访问 `http://127.0.0.1:8787/` 打开前端，刷新子路由（如画布页）不 404。
- [x] `/api/health`、`/api/kv/*`、`/proxy/*` 行为不变；前端和 API 同源，不需要 Vite 代理。
- [x] 未构建前端时 `pnpm start` 的 API 仍可用，并有明确提示。
- [x] 设置 `HOST=0.0.0.0` 后可被局域网访问，默认值仅本机。
- [x] 对进程发送 SIGTERM 后，日志显示收尾并在 10 秒内退出。
- [x] `pnpm typecheck` 与 `pnpm lint` 通过。
- [x] `docs/deploy.md` 能让第三者照着配好 launchd。

## 完成报告

- `src/web-app.ts`（新）：用 `@fastify/static` 托管 `apps/web/dist`；`assets/` 长缓存，其余 `no-cache`；SPA 回退只对不带扩展名的 GET 且非 `/api` `/proxy` `/v1` 生效，缺失的文件和 API 路径返回 JSON 404；未构建时只打印提示。
- `config.ts`：新增 `HOST`（默认 `127.0.0.1`）和 `FRAMEDOCK_WEB_DIR`；`index.ts` 仅加 `registerWebApp`、`HOST`、10 秒强制退出定时器和 `forceCloseConnections: "idle"`，未触碰日志系统相关行。
- `scripts/start.mjs` + 根 `pnpm start`：缺构建产物时先 `pnpm build`，再启动 server。
- `deploy/launchd/…plist.example`、`docs/deploy.md`、`.env.example` 已补充。
- 依赖：`@fastify/static@10.1.6`（精确版本）。
- 与卡片的差异：launchd 示例直接运行 node 而不是 `pnpm start`，让 launchd 监管真正的服务进程。

## 验收记录

2026-10-18，用临时数据目录和 8797–8799 端口验证：
- `/`、`/canvas/abc` 返回 200 HTML；`/assets/nope.js`、`/api/nope` 返回 404 JSON；`/api/health` 正常；`/` 的 `Cache-Control: no-cache`。
- `FRAMEDOCK_WEB_DIR` 指向不存在目录时 API 正常并有提示。
- `HOST=0.0.0.0` 监听 `*:8798`，默认仅 `127.0.0.1`。
- SIGTERM 后日志出现收尾信息，1 秒内退出。
- `pnpm typecheck` 通过；`plutil -lint` 通过。
- 未做：真实 launchd 加载（会改动用户登录项，需用户自行执行）；`/proxy`、`/api/kv` 仅确认未改动代码，未逐一回归。
