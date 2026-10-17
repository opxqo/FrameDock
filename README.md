# FrameDock · 帧坞

自部署的无限画布与节点式 AI 创作工具。当前为 M0 工程骨架：前端示例画布、后端健康检查、SQLite 表结构和自动迁移。

## 本地开发

使用 Node.js 22（至少 22.18）和 pnpm 11.25.0。better-sqlite3 包含原生模块，需要本机编译工具；macOS 使用 Command Line Tools 和 Python。

```sh
pnpm install
pnpm dev
```

- 前端：<http://localhost:5173>
- 后端健康检查：<http://localhost:8787/api/health>
- 停止：在启动终端按 Ctrl+C，同时停止前后端。

前端的两个节点及连线仅用于验证显示。支持画布平移、缩放和节点拖动；刷新恢复初始示例，不包含编辑、保存、上传或生成执行功能。

## 环境变量与数据库

可将根目录 `.env.example` 复制为 `.env`，开发和后端生产启动脚本会自动读取。已有进程环境变量优先。

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `8787` | API 监听端口；修改后需同步修改 Vite 开发代理目标 |
| `FRAMEDOCK_DATA_DIR` | 仓库根目录的 `data/` | 数据目录；相对路径始终相对于仓库根目录解析 |

后端仅监听本机地址。首次启动会自动创建数据目录、`framedock.db`，开启 WAL 和外键约束，并执行 `apps/server/drizzle/` 下已生成的迁移。除 5 张业务表外，Drizzle 会维护 `__drizzle_migrations` 迁移记录表。默认 `data/` 已加入 `.gitignore`；自定义数据目录应选择仓库外的路径。

```sh
curl http://localhost:8787/api/health
sqlite3 data/framedock.db .tables
pnpm --filter @framedock/server db:generate
```

`db:generate` 用于修改 schema 后生成下一次迁移；运行服务无需手动执行迁移命令。

## 检查与构建

```sh
pnpm typecheck
pnpm lint
pnpm format
pnpm build
pnpm --filter @framedock/server start
```

`lint` 使用 Biome 同时检查代码、导入顺序与格式；`format` 仅写入格式化结果。构建产物分别在 `apps/web/dist/` 和 `apps/server/dist/`。M0 的后端仅提供健康检查；前端产物的托管不在本阶段范围内。

## 目录

- `apps/web`：React 19、Vite、Tailwind CSS v4、shadcn/ui、React Flow UI。
- `apps/server`：Fastify、better-sqlite3、Drizzle ORM 与迁移。
- `packages/shared`：前后端直接引用的 zod 枚举和推导类型，无需单独构建。
- `docs/design.md`：权威设计文档。
- `docs/tasks/`：任务卡与验收记录。

UI 组件通过 [shadcn CLI](https://ui.shadcn.com/docs/installation/vite) 安装；缩放控件使用官方 [React Flow UI Zoom Slider](https://reactflow.dev/ui/components/zoom-slider)。
