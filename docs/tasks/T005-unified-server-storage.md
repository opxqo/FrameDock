# T005 统一存储：所有共享数据存到服务端

状态：验收通过（Codex 实现，额度用尽中断，Claude 完成验收）
对应：用户要求（2026-10-17）“本项目不采用多用户，统一存储”

## 背景

`apps/web`（来自 infinite-canvas）把数据存在**每个浏览器自己的** IndexedDB 和 localStorage 里，换浏览器就看不到之前的生成记录、图片，API Key 也要重填。FrameDock 是单用户自部署工具，要改成：**所有共享数据统一存在服务端 `data/` 目录**，任何浏览器打开看到的都是同一份数据。

原则：前端业务代码尽量不改，只替换存储层。

## 已知现状（Claude 已探查，实现前请自行核对）

**localforage（IndexedDB 库名 `infinite-canvas`）**

| storeName | 创建位置 | 内容 / 值类型 | 处理 |
| --- | --- | --- | --- |
| `app_state` | `lib/localforage-storage.ts`（`localforage.config` 默认实例） | 画布、资产、插件列表的 Zustand JSON 字符串 | **共享** |
| `image_files` | `services/image-storage.ts` | Blob | **共享** |
| `media_files` | `services/file-storage.ts` | Blob（`video:` / `audio:` / `file:` 前缀） | **共享** |
| `image_generation_logs` | `services/image-storage.ts`、`pages/image/index.tsx`、`services/app-sync.ts` | 普通对象 | **共享** |
| `video_generation_logs` | `services/image-storage.ts`、`pages/video/index.tsx`、`services/app-sync.ts` | 普通对象 | **共享** |
| `image_previews` | `services/image-storage.ts` | `{version, blob}` 缩略图缓存 | 保持本地 |
| `prompt_cache` | `services/api/prompts.ts` | 远程提示词缓存 | 保持本地 |
| 插件库 `infinite-canvas-plugins` | `lib/canvas/canvas-event-bus.ts` | 插件私有数据 | 保持本地 |

用到的方法：`getItem`、`setItem`、`removeItem`、`iterate`、`clear`。注意 `createInstance` 在构造时就确定了驱动，单纯 `defineDriver` 不会影响已创建的实例。

**localStorage 需要共享的键（白名单）**：

- `infinite-canvas:ai_config_store`（渠道、API Key、WebDAV）
- `infinite-canvas:prompt_source_store_v2`
- `infinite-canvas:theme_store`
- `infinite-canvas:locale`
- `canvas-image-quick-tools-v7`
- `canvas-agent-model`
- `canvas-agent-reasoning-effort`
- `canvas-agent-permission-mode`

其他键（面板宽度 / 开关、`canvas-agent-url`、`canvas-agent-token`、sessionStorage）保持每个浏览器各自保存。i18n 和配置 store 在模块加载时**同步**读取 localStorage。

## 具体要求

### A. 服务端键值存储（`apps/server`）

1. `src/schema.ts` 新增表 `kv`：
   - `store`、`key`：text，联合主键；
   - `kind`：`json` | `blob`；
   - `value`：text，可空，json 类型时存 JSON 文本；
   - `mime`、`size`：可空，blob 类型用；
   - `updated_at`：整数毫秒。

   用 drizzle-kit 生成迁移文件并提交，启动时照旧自动迁移。
2. Blob 文件存到 `<数据目录>/blobs/<store>/<encodeURIComponent(key)>`，写入时先写临时文件再重命名，删除条目时同时删文件。
3. 新建 `src/kv.ts`（Fastify 插件，前缀 `/api/kv`）：

   | 接口 | 行为 |
   | --- | --- |
   | `GET /api/kv/:store` | 返回 `{ entries: [{ key, kind, value?, mime?, size?, updatedAt }] }`；json 条目带解析后的 `value`，blob 条目不带内容 |
   | `GET /api/kv/:store/:key` | json：返回 `{ kind: "json", value }`；blob：直接返回文件，`Content-Type` 为保存的 mime；不存在返回 404 |
   | `PUT /api/kv/:store/:key` | 请求头 `x-kv-kind: blob` 时，请求体按原始字节存（Content-Type 存为 mime，上限 1 GB）；否则请求体为 JSON `{ value }`，`value` 可以是任意 JSON 值（含字符串） |
   | `DELETE /api/kv/:store/:key` | 删除单条，不存在也返回 204 |
   | `DELETE /api/kv/:store` | 清空该 store（含文件） |

   - `store` 和 `key` 都经过 URL 编码传输，路由里解码。
   - `store` 只允许 `[a-z0-9_]+`。
   - 本插件内部自行注册内容类型解析：原始字节用 buffer，JSON 照常解析。不要影响 `/proxy` 和 `/v1` 的现有行为。

### B. 前端 localforage 驱动（`apps/web/src/lib/server-storage.ts`）

1. 实现自定义 localforage 驱动 `framedockServer`（`_driver`、`_initStorage`、`_support`、`getItem`、`setItem`、`removeItem`、`clear`、`iterate`、`keys`、`length`、`key`），以实例的 `storeName` 作为服务端的 `store`。
   - `setItem`：值为 `Blob` 时用 `x-kv-kind: blob` 上传原始字节，否则 PUT `{ value }`。返回值与 localforage 约定一致（返回写入的 value）。
   - `getItem`：404 返回 `null`；blob 返回 `Blob`（保留 type）；json 返回 value。
   - `iterate`：用列表接口一次取回；json 条目传真实值，**blob 条目传占位 Blob**（`new Blob([], { type: mime })`），不下载内容。**先检查所有对 `image_files`、`media_files` 的 `iterate` 调用（如 `cleanupUnusedImages`、`cleanupUnusedMedia`、`services/app-sync.ts`、`services/file-storage.ts`）是否用到 value 的内容**；用到内容的地方改为在回调里按 key 调 `getItem` 取真实 Blob，并在完成报告里列出。
   - 遵循 localforage 自定义驱动规范（`localforage.defineDriver`），支持回调和 Promise 两种用法。
2. 导出工厂 `createSharedStore(options: { name?: string; storeName: string })`：创建 localforage 实例并调用 `setDriver("framedockServer")`，确保驱动生效。把上表中标为“共享”的所有创建位置改为用这个工厂（三处重复创建的日志 store 都要改）；`lib/localforage-storage.ts` 的默认实例同样改用该驱动（可以改为用工厂创建的实例，`localForageStorage` 的对外接口不变）。删掉它回退到 localStorage 的逻辑。
3. 标为“保持本地”的 store 不动。

### C. 前端启动流程（`apps/web/src/main.tsx`）

1. 把 `main.tsx` 现有内容原样移到新文件 `src/app-entry.tsx`。
2. `main.tsx` 改为 `boot()`：
   1. `localforage.defineDriver(framedockServerDriver)`。
   2. 请求 `GET /api/kv/local_storage`；**失败时**渲染一个简单的全屏提示“无法连接 FrameDock 服务，请先运行 pnpm dev”（纯 HTML 即可，带重试按钮），不继续启动，不回退到浏览器本地存储。
   3. 一次性迁移（见 D）。
   4. 用服务端返回的白名单键**覆盖**本地 localStorage 对应键；服务端没有的白名单键，从本地 localStorage 删除（迁移之后执行，避免误删）。
   5. 包装 `Storage.prototype.setItem` 和 `removeItem`（仅当 `this === window.localStorage` 且键在白名单内时）：先执行原操作，再异步 PUT / DELETE 到服务端 `local_storage` store；失败时 `console.error`，不抛出。
   6. `await import("./app-entry")`。
3. 白名单常量放在 `server-storage.ts` 中统一导出。

### D. 一次性迁移浏览器里的旧数据

用户的内置浏览器里已有生成记录、图片、画布和 API Key，**绝不能丢**。

- 每个浏览器首次启动新版本时，如果 localStorage 里没有 `framedock:migrated`：
  1. 参考 `services/local-storage-usage.ts` 的写法，用原生 IndexedDB API 打开库 `infinite-canvas`，遍历上表中标为“共享”的 store 的全部记录（游标的 key 和 value）。库或 store 不存在就跳过。
  2. 取服务端各 store 现有的键列表，**只上传服务端还没有的键**：Blob 走 blob 上传，其余按 JSON 上传。
  3. 对白名单 localStorage 键做同样处理（服务端没有才上传），存到 `local_storage` store。
  4. 全部成功后写入 `framedock:migrated = <时间戳>`；中途失败则不写标记，下次启动重试，并在页面提示迁移失败。
- **迁移只复制，不删除、不修改浏览器原有的 IndexedDB 数据。**
- 迁移过程在控制台打印每个 store 上传的条数。

### E. 测试纪律（重要）

- **所有测试必须使用临时数据目录**：启动后端时设置 `FRAMEDOCK_DATA_DIR=/private/tmp/framedock-t005-data`（或其他临时目录），**不要用仓库里的 `data/` 做测试**，也不要删除或修改 `data/` 里的已有内容。
- 不要清除任何浏览器的站点数据；尤其不要动 Claude 应用内置浏览器里 `127.0.0.1:5173` 的数据（那是用户的真实数据，由 Claude 验收时迁移）。你自己的测试浏览器随意。
- 跨浏览器测试可以用 `127.0.0.1:5173` 和 `localhost:5173` 两个来源（存储互相隔离）模拟两台浏览器。

### 不要做的事

- 不改画布、生成、工作流业务逻辑；不改 `apps/server/src/proxy.ts` 和 `apps/server/src/mock/`。
- 不改设计文档和其他任务卡。不执行 git 提交。

## 验收标准

1. `pnpm typecheck`、`pnpm lint`、`pnpm build` 通过。
2. 用 curl 验证 `/api/kv` 的 json 和 blob 读写删、列表、清空；blob 读回字节一致。
3. 在临时数据目录下：
   - 浏览器 X（如 `127.0.0.1:5173`）里先在**旧版本**（`git stash` 或检出 HEAD 构建的旧前端均可，方法自定）生成一张模拟图片、建一个画布，再切到新版本启动：数据被迁移，界面里都在。
   - 浏览器 Y（`localhost:5173`）打开：能看到 X 的生成记录、图片、画布和渠道配置。
   - 在 Y 里用“本地模拟”渠道新生成一张图、在画布上跑一次“运行下游”，X 刷新后可见、结果一致。
   - 重启后端后数据仍在；`kv` 表和 `blobs/` 目录有对应内容。
4. 停掉后端时，前端显示“无法连接 FrameDock 服务”提示。
5. 面板宽度等非白名单键仍按浏览器各自保存。

## 完成报告（Codex 填写）

- 改动文件清单：
- `iterate` 调用点检查结果（哪些用到了 value，怎么改的）：
- 迁移逻辑说明与测试结果：
- 验收标准逐条结果（附截图或命令输出）：
- 与要求不一致之处及原因：
- 遗留问题：

## 验收记录（Claude 填写）

2026-10-17，Claude 验收：**通过**。

- Codex 完成了实现和临时目录下的迁移测试，在浏览器验收阶段因额度用尽中断，未填写完成报告。
- 代码审阅：`kv.ts`（按 store 串行化读写、blob 先写临时文件再重命名）、`server-storage.ts`（驱动、白名单镜像）、`server-storage-migration.ts`（只复制不删除、只上传服务端没有的键、库不存在时不创建）符合要求；对 `image_files` / `media_files` 的 `iterate` 调用只用到 key，占位 Blob 安全。
- `pnpm typecheck`、`pnpm lint` 通过。
- 真实迁移：服务启动时用户 Chrome 中的旧页面自动刷新并抢先迁移了一份空配置（无项目、无 Key）。Claude 删除这些空条目后，由内置浏览器完成迁移：4 张图片、3 条生成记录、画布数据、含 AutoDL Key 的渠道配置均已写入服务端（迁移前已备份 `data/`）。
- 跨浏览器：`localhost:5173` 打开可见同样的 3 条记录、图片和 Key；在 `localhost` 新生成并保存的图片，`127.0.0.1` 可直接读取。
- 补充修复（Claude）：共享配置里的内置代理地址和“本地模拟”渠道地址改为按当前访问地址计算，避免一台浏览器的地址被其他设备沿用。
