# 部署与常驻运行

FrameDock 生产模式是**单进程**：Fastify 同时提供 API 和 `apps/web` 的构建产物，前端与 API 同源，不需要 Vite 开发服务器。

## 一次性运行

```bash
pnpm install
pnpm start
```

`pnpm start` 会在缺少构建产物时先执行 `pnpm build`，然后启动服务，默认地址 `http://127.0.0.1:8787/`。更新代码后请手动 `pnpm build` 再重启。

## 配置

写在仓库根目录 `.env`（参考 `.env.example`）：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `8787` | 监听端口 |
| `HOST` | `127.0.0.1` | 监听地址。默认只允许本机访问；设为 `0.0.0.0` 允许局域网访问，此时任何能访问该端口的人都能使用你保存的 API Key，请只在可信网络中开启 |
| `FRAMEDOCK_DATA_DIR` | `./data` | 数据库与素材目录 |
| `FRAMEDOCK_WEB_DIR` | `apps/web/dist` | 前端构建产物目录；不存在时只提供 API 并在日志里提示 |
| `HTTPS_PROXY` / `NO_PROXY` | 无 | 服务端访问供应商时使用的出口代理（`/proxy` 与 MOKE 都会遵循） |

浏览器里配置的代理不会作用于服务端请求；后台任务从服务端发出，需要代理时务必在这里或 launchd 里设置。

## macOS 开机自启（launchd）

1. 构建：`pnpm build`。
2. 复制并编辑示例，替换 `/path/to/FrameDock`、`USERNAME`，并用 `which node` 确认 node 路径（需要 Node 22）：

   ```bash
   mkdir -p ~/Library/Logs/framedock
   cp deploy/launchd/com.framedock.server.plist.example ~/Library/LaunchAgents/com.framedock.server.plist
   ```

3. 加载并启动：

   ```bash
   launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.framedock.server.plist
   ```

4. 常用操作：

   ```bash
   launchctl print gui/$(id -u)/com.framedock.server      # 查看状态
   launchctl kickstart -k gui/$(id -u)/com.framedock.server  # 重启（更新构建后使用）
   launchctl bootout gui/$(id -u)/com.framedock.server    # 停止并取消自启
   ```

行为：登录后自动启动；进程崩溃后 10 秒内自动拉起；`launchctl stop` 等正常退出不会被重启。日志在 `~/Library/Logs/framedock/`。

## 退出行为

收到 SIGINT / SIGTERM 后，服务停止接收新请求并关闭空闲连接，最多等待 10 秒让进行中的请求结束，然后关闭数据库；超时则强制退出。
