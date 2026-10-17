# T001 M0 工程初始化

状态：验收通过
对应里程碑：M0（见 `docs/design.md` 第 10 节）

## 背景

项目目前只有文档，没有任何代码，也还不是 git 仓库。本任务搭建 monorepo 骨架，让前端能打开一个空的暗色画布，后端能连上 SQLite 并通过健康检查。技术选型以 `docs/design.md` 第 3 节为准。

本机环境：Node v22、pnpm 11、git 2.50，项目在本地 APFS 磁盘上。

## 具体要求

### 1. 仓库与 monorepo

- `git init`，默认分支 `main`。
- pnpm workspace，结构按设计文档 3.3 节：`apps/web`、`apps/server`、`packages/shared`。
- 根 `package.json` 提供脚本：`dev`（同时启动前后端）、`build`、`typecheck`、`lint`、`format`。
- TypeScript 严格模式，根目录放共享的 `tsconfig.base.json`。
- 代码检查与格式化用 **Biome**（一个工具同时做 lint 和 format）。
- `.gitignore` 至少包含：`node_modules`、`dist`、`data/`、`.env*`（保留 `.env.example`）、`.DS_Store`。
- 根目录 `.nvmrc` 写 `22`；`package.json` 的 `engines` 和 `packageManager` 字段写明版本。

### 2. `packages/shared`

- 包名 `@framedock/shared`，前后端都能直接引用源码（不需要单独构建步骤）。
- 用 zod 定义并导出（只需定义，不实现逻辑）：
  - 端口数据类型：`text`、`image`、`video`。
  - 节点类型：`text`、`image`、`video`、`image_gen`、`video_gen`、`group`。
  - 节点状态：`idle`、`queued`、`running`、`succeeded`、`failed`、`stale`。
  - run 状态：`pending`、`submitted`、`running`、`succeeded`、`failed`、`canceled`。
- 导出由 zod 推导出的 TypeScript 类型。

### 3. `apps/server`

- Fastify + TypeScript，开发时用 `tsx watch` 运行，端口 `8787`（可用环境变量 `PORT` 覆盖）。
- 数据目录由环境变量 `FRAMEDOCK_DATA_DIR` 指定，默认是仓库根目录下的 `data/`；启动时自动创建。
- SQLite：better-sqlite3 + Drizzle ORM，数据库文件 `data/framedock.db`，开启 WAL。
- 按设计文档 4.1 节建 5 张表：`projects`、`nodes`、`edges`、`assets`、`runs`，字段名照抄文档。JSON 字段用 text 存储（Drizzle 的 `{ mode: 'json' }`），时间用整数毫秒时间戳。
- 用 drizzle-kit 生成迁移文件并提交；服务启动时自动执行迁移。
- 接口：`GET /api/health`，返回 `{ "ok": true, "db": true, "version": "<package.json 版本>" }`，其中 `db` 通过执行一条真实查询得出。
- 根目录提供 `.env.example`，列出 `PORT` 和 `FRAMEDOCK_DATA_DIR`。

### 4. `apps/web`

- Vite + React 19 + TypeScript，开发端口 `5173`，`/api` 和 `/files` 代理到 `http://localhost:8787`。
- Tailwind CSS v4，并用官方 CLI 初始化 **shadcn/ui**（`npx shadcn@latest init`），默认使用**暗色主题**，基础色选 zinc 或 neutral。
- 用 shadcn CLI 先装好这些组件：`button`、`tooltip`、`dropdown-menu`、`context-menu`、`dialog`、`sonner`、`separator`。
- 安装 `@xyflow/react`，页面是一个**全屏画布**：
  - 暗色点阵背景、小地图（左下角）、缩放控件（底部）。
  - 优先使用 **React Flow UI** 的现成组件（官方文档：https://reactflow.dev/ui ，通过 shadcn CLI 安装），比如缩放控件；没有对应组件的才用 `@xyflow/react` 自带的 `Background`、`MiniMap`、`Controls`。
  - 画布上放 2 个示例节点和 1 条连线，用来确认渲染正常（数据写死在前端即可）。
- 页面左上角显示 “FrameDock” 字样，并通过 TanStack Query 请求 `/api/health`，用一个小状态点显示后端是否连通（绿 / 红）。
- 安装但暂不需要深度使用：`zustand`、`@tanstack/react-query`、`lucide-react`。

## 不要做的事

- 不要实现任何业务功能：节点编辑、保存、上传、执行引擎都不在本任务范围内。
- 不要手写可用 shadcn / React Flow UI 替代的组件。
- 不要引入设计文档之外的 UI 库（如 Ant Design、MUI、Mantine）。
- 不要修改 `docs/design.md`、`codex.md`。

## 验收标准

1. 全新克隆后执行 `pnpm install` 无报错。
2. `pnpm dev` 同时启动前后端，无报错。
3. `curl http://localhost:8787/api/health` 返回 `ok: true` 且 `db: true`。
4. 首次启动后 `data/framedock.db` 被创建，包含上述 5 张表（可用 `sqlite3 data/framedock.db .tables` 查看）。
5. 浏览器打开 `http://localhost:5173`：暗色全屏画布，可拖动、缩放，有小地图和缩放控件，2 个示例节点和 1 条连线正常显示；左上角状态点为绿色。关掉后端后刷新，状态点变红。
6. `pnpm typecheck`、`pnpm lint`、`pnpm build` 全部通过。
7. `data/` 目录没有被提交到 git。
8. 只有一个提交，提交信息以 `T001:` 开头（如有返工，追加以 `T001 fix:` 开头的提交）。

## 完成报告（Codex 填写）

执行日期：2026-10-17。环境：macOS arm64、Node.js 22.22.3、pnpm 11.25.0、git 2.50.1。

### 交付内容

- 已搭建 `apps/web`、`apps/server`、`packages/shared` 和根目录的 dev/build/typecheck/lint/format 脚本；使用共享严格 TypeScript 配置与 Biome。
- shared 导出卡片要求的 4 组 zod 枚举及推导类型，前后端直接引用源码，无独立构建步骤。
- Fastify 读取 `PORT`、`FRAMEDOCK_DATA_DIR`，自动建目录、开启 SQLite WAL/外键约束并执行 Drizzle 迁移；健康检查执行真实 SQL，并读取 server 的 package.json 版本。
- 五张表的字段按设计文档定义，JSON 使用 Drizzle text JSON 模式，时间字段为整数毫秒时间戳；已生成 `apps/server/drizzle/0000_tiny_sebastian_shaw.sql` 和迁移元数据。
- 使用 shadcn 官方 CLI 初始化 Radix / Nova / neutral，安装要求的 7 个组件；通过官方 React Flow UI registry 安装 Zoom Slider（同时安装 Slider），使用原生 Background / MiniMap 和示例节点。
- 默认暗色全屏画布包含 2 个节点和 1 条连线，支持拖动和平移缩放；TanStack Query 请求健康检查，显示后端绿/红状态点。已补充根 README 和环境变量示例。
- `docs/design.md`、`codex.md`、`AGENTS.md`、任务协作 README 均经 SHA-256 对比确认未修改；没有实现编辑、保存、上传或执行引擎。

### 关键命令

```sh
git init -b main
# 失败：.../FrameDock/.git: Operation not permitted

pnpm install
pnpm --dir apps/web dlx shadcn@latest init --base radix --preset nova --no-monorepo --yes
pnpm --dir apps/web dlx shadcn@latest add button tooltip dropdown-menu context-menu dialog sonner separator --yes
pnpm --dir apps/web dlx shadcn@latest add https://ui.reactflow.dev/zoom-slider --yes
pnpm --filter @framedock/server db:generate
pnpm exec biome check --write .
pnpm dev
curl http://localhost:8787/api/health
curl http://localhost:5173/api/health
sqlite3 data/framedock.db .tables
sqlite3 data/framedock.db 'PRAGMA journal_mode; PRAGMA integrity_check; SELECT COUNT(*) FROM __drizzle_migrations;'
pnpm typecheck
pnpm lint
pnpm build
```

另在不包含 node_modules、dist、data 和本地 store 的全新源码副本 `/private/tmp/framedock-t001-qa.kDLCDN/fresh-source` 中执行 `pnpm install --frozen-lockfile`、`pnpm typecheck`、`pnpm lint`、`pnpm build`，均退出 0。由于 Git 初始化失败，该验证是全新源码副本安装，不能声称已验证真实 `git clone`。

浏览器验收通过连接的 Chrome 执行。终端直接启动独立 headless Chrome 被环境终止，随后改用已有的浏览器工具完成验证；没有修改用户的浏览器配置。验收截图：[后端连通](evidence/T001-online.png)、[后端关闭](evidence/T001-offline.png)。

生产构建验证脚本为临时文件 `/private/tmp/framedock-t001-qa.kDLCDN/server-check.py`（`python3` 执行，结果在同目录 `server-results.json`）。它从非仓库 cwd 启动源码副本的 `dist/index.js`，使用环境变量覆盖端口为 56646、数据目录为 `data/qa-overridden`，逐字段核对五张表、JSON/Timestamp 的 SQLite 存储类型、WAL、完整性和迁移次数；在临时数据库插入测试项目后重启，确认项目保留、迁移记录仍为 1。两次健康检查均为 `{ "ok": true, "db": true, "version": "0.1.0" }`，两次进程均正常退出 0。

### 主要依赖及实际安装版本

| 范围 | 依赖与版本 |
| --- | --- |
| 根工具 | TypeScript 5.9.3、Biome 2.5.15、concurrently 10.0.6 |
| shared | zod 4.6.7 |
| server | Fastify 5.12.7、better-sqlite3 13.0.3、Drizzle ORM 0.45.4、drizzle-kit 0.31.11、tsx 4.23.15、tsup 9.0.0、zod 4.6.7 |
| web | React / React DOM 19.3.1、Vite 8.3.4、@vitejs/plugin-react 6.1.2、Tailwind CSS / @tailwindcss/vite 4.3.3、@xyflow/react 12.12.0、TanStack Query 5.104.3、Zustand 5.0.15、lucide-react 1.59.0 |
| CLI 与组件配套 | shadcn 4.22.0、radix-ui 1.8.1、sonner 2.0.8、next-themes 0.4.6、class-variance-authority 0.7.1、cn 0.5.0、tw-animate-css 1.4.0、@fontsource-variable/geist 5.3.0 |
| 类型包 | @types/node 22.20.5、@types/react / @types/react-dom 19.3.0、@types/better-sqlite3 9.6.0 |

完整版本和完整性校验见 `pnpm-lock.yaml`。pnpm 11 的 `allowBuilds` 仅允许 better-sqlite3 和 esbuild 的构建脚本；`.pnpm-store/` 也已忽略。

### 逐条验收自查

| 标准 | 结果与证据 |
| --- | --- |
| 1. 全新克隆后 install | **部分验证**：全新源码副本 `pnpm install --frozen-lockfile` 成功，含原生模块构建；真实 clone 受 Git 初始化失败限制，未验证。 |
| 2. dev 同时启动前后端 | **通过**：根 `pnpm dev` 同时启动 Vite 5173 与 Fastify 8787；正常运行时无启动错误，已验证 Ctrl+C 停止两端。 |
| 3. 健康检查 | **通过**：直连 8787 和经 5173 代理均返回 `{"ok":true,"db":true,"version":"0.1.0"}`。 |
| 4. SQLite 首次建库与表 | **通过**：默认 `data/framedock.db` 已创建，含 projects/nodes/edges/assets/runs；额外的 `__drizzle_migrations` 是 Drizzle 自用记录表。WAL=wal、integrity_check=ok、迁移数=1。 |
| 5. 浏览器画布与状态点 | **通过**：Chrome 1920×963 中画布尺寸与视口一致；暗色点阵、左下小地图、底部官方 Zoom Slider、2 节点/1 连线正常。实测画布平移、节点拖动、放大至 120%、缩小回 100%、滑块键盘调整至 101%、重置 100%、适应画布。正常运行时浏览器 warning/error 日志为空；后端关闭并刷新后状态点为红色，画布仍显示。截图见上。 |
| 6. typecheck/lint/build | **通过**：原工作区与全新源码副本均通过，lint 无告警；build 有一条非阻断的 Vite chunk 超过 500 kB 提示，未调高阈值掩盖。 |
| 7. data 不提交 | **静态检查通过，Git 复核受阻**：`.gitignore` 含 `/data/`、node_modules、dist、`.env*`（例外保留 `.env.example`）、`.DS_Store`；当前没有任何 Git 提交，不能提供 `git ls-files` 的复核结果。 |
| 8. 仅一个 T001 提交 | **未通过，环境阻塞**：工作区权限把该项目 `.git` 路径设为只读，`git init -b main` 被拒绝；未创建仓库、main 分支或提交。没有绕过限制，也没有伪报提交哈希。 |

### 与要求不一致之处及保守处理

- 唯一阻塞是 Git 初始化/提交权限。按“全部通过再提交”的规则，卡片保留“待执行”，另注明实现已完成但交付流程受阻；没有改成“已完成，待验收”。权限恢复后仍需完成真实 clone / install 验证、忽略清单复核，以及唯一一次 `T001: 初始化 M0 monorepo、示例画布与 SQLite` 提交。
- 本任务按详细要求保留示例节点及连线；“空画布”理解为尚无业务能力的画布骨架，不删除详细要求中的示例。
- 官方 shadcn CLI 使用 pnpm dlx 调用，与任务中的 npx 为同一 CLI。基础色为 neutral，主题固定为暗色；CLI 自动添加的配套依赖保留。
- Drizzle SQLite 枚举字段使用 shared 推导类型的 `$type`，避免当前 zod `.options` 数组与 Drizzle 非空元组类型不兼容；不额外引入业务校验或数据库行为。
- 官方 Zoom Slider 仅作接入所需的小改动：严格模式下检查滑块数组首项、补充按钮无障碍名称、收紧控件宽度与图标样式。shadcn Slider 保留固定序号的 thumb key，并局部说明 Biome 例外，避免滑动时用变化的值作为 key 导致重挂载。
- better-sqlite3 使用原生模块构建环境；根 engines 标明 Node 22.18 至 22.x（满足构建器要求），`.nvmrc` 仍为 `22`。数据目录的相对路径统一相对于仓库根目录，开发和构建产物一致；默认仅监听本机地址。

### 遗留问题与清理

- **待解决：`.git` 写权限导致无法初始化和提交**。当前没有 Git 仓库，不能认定整张卡片已完成。
- 非阻断提示：Vite 主 JS chunk 535.89 kB（gzip 170.91 kB），后续按业务阶段需要再拆包；drizzle-kit 自带的两项 esbuild-kit 传递依赖已弃用，当前安装/迁移/构建均成功，未擅自更换 ORM 工具。
- 浏览器工具创建的验收标签已关闭；根 dev、断线测试用 Vite、两次生产测试进程均已关闭，5173/8787/56646 无监听。断线期间 Vite 的 ECONNREFUSED 是预期测试现象。临时测试数据只写入 `/private/tmp/` 下的源码副本，原工作区业务表保持为空。
- 临时测试脚本、源码副本与日志保留在 `/private/tmp/framedock-t001-qa.kDLCDN/`，未添加为项目依赖。项目内仅保留两张验收截图；运行数据与构建产物均在忽略范围内。

## 验收记录（Claude 填写）

2026-10-17，Claude 验收：**通过**。

- Codex 的沙箱禁止写 `.git`，标准 1、7、8 由 Claude 补做：`git init -b main` 后暂存，确认 `data/`、`.pnpm-store/`、`node_modules`、`dist` 均未进入暂存区，共 49 个文件；以 `T001:` 提交。之后的流程改为由 Claude 在验收后提交（见 `docs/tasks/README.md`）。
- `pnpm typecheck`、`pnpm lint`、`pnpm build` 复跑通过。
- `pnpm dev` 启动后，`/api/health` 直连 8787 和经 5173 代理均返回 `{"ok":true,"db":true,"version":"0.1.0"}`；`data/framedock.db` 含 5 张业务表。
- 内置浏览器打开 5173：暗色点阵画布、左下小地图、底部 Zoom Slider、2 个节点 1 条连线，状态点为绿色，控制台无错误。
- 代码审阅：结构清晰，按卡片范围实现，无超范围功能。小建议留待后续卡片处理：Vite 代理目标可改为 `127.0.0.1:8787`，与服务端监听地址一致，避免 `localhost` 先解析到 IPv6。
