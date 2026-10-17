# T002 复制 infinite-canvas 前端为 apps/web

状态：验收通过
对应：`docs/design.md` 第 0 节

## 背景

策略调整：前端不再自己写，直接用开源项目 infinite-canvas（MIT）的 `web/` 作为 FrameDock 的前端。来源已在本地：`参考项目/infinite-canvas/web`（提交 `3a6b64b`，v0.20.0）。M0 里 `apps/web` 的 React Flow 示例页面整体丢弃。

## 具体要求

### 1. 复制与替换

- 删除现有 `apps/web` 的全部内容，把 `参考项目/infinite-canvas/web` 的内容复制过来。不复制 `node_modules`、`dist`。不要修改 `参考项目/` 下的任何文件。
- 删除复制来的 `bun.lock`、`package-lock.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`，统一用根目录的 pnpm workspace 和锁文件。
- `vercel.json`、`docker-entrypoint.sh` 等部署文件保留，不用改。

### 2. 接入 monorepo

- `apps/web/package.json`：
  - 包名改为 `@framedock/web`。
  - 依赖版本保持原样。
  - 保证有 `dev`、`build`、`typecheck` 三个脚本。`typecheck` 用 `tsc --noEmit` 或它原有的等效命令，使用它**自己的** `tsconfig.json`，不要套用根目录的 `tsconfig.base.json`。
- Vite 开发服务器：
  - 端口改为 `5173`，`strictPort: true`。
  - 增加代理：`/api` 和 `/v1` 转发到 `http://127.0.0.1:8787`。`/v1` 是给 T003 的模拟接口用的。
  - 它原有的其他配置保持不变。
- 根目录 `pnpm dev` 照旧同时启动前后端（根 `package.json` 已有脚本，包名保持 `@framedock/web` 即可）。
- `biome.json`：把 `apps/web` 排除在检查之外。复制来的代码风格不同，**不要对它做全量格式化**。
- pnpm 11 的安装策略可能拦截新包，比如 `minimumReleaseAge`，或者有构建脚本的依赖需要加进 `allowBuilds`。按需在 `pnpm-workspace.yaml` 里精确放行，并在完成报告里列出。

### 3. 品牌与署名

- 用户能看到的产品名改为 FrameDock / 帧坞，包括浏览器标题、侧边栏和顶栏的产品名、`index.html` 的 meta、i18n 文案里的产品名。Logo 图片暂时保留原样。
- 新建根目录 `THIRD_PARTY_NOTICES.md`，写明：
  - `apps/web` 来源仓库 `https://github.com/basketikun/infinite-canvas`、提交 `3a6b64b`；
  - 原 LICENSE 全文（版权人 basketikun）。
- 在 `apps/web` 里找一个关于或设置之类的位置加一行文字：“基于 infinite-canvas（MIT）开发”，并链接到原仓库。找不到合适位置就放在设置页底部。

### 4. 关掉对外部服务的默认请求

目标：打开页面、正常使用时，**除了用户自己配置的模型接口，不自动请求任何外部域名**。只关掉默认行为，相关代码保留。

- 版本检查（`src/hooks/use-version-check.ts` 及其调用处）：不再自动请求。
- 赞助商、推广链接，以及 README 之外页面里的广告位：从界面上移除。
- 插件市场或远程插件的默认地址：清空，不自动加载。
- 提示词库的默认远程源：清空，不自动拉取。
- 字体、统计、埋点等其他外部请求：逐一排查，能关就关；关不掉的列在完成报告里。

### 5. 不要做的事

- 不改业务逻辑：画布、生成、存储、Agent 相关代码都保持原样。
- 不替换 antd，不重写组件，不做代码风格整理。
- 不修改 `apps/server`、`packages/shared`、`docs/design.md`、其他任务卡。
- 不执行 git 提交。

## 验收标准

1. 根目录 `pnpm install` 成功，只有一个根锁文件 `pnpm-lock.yaml`。
2. `pnpm typecheck`、`pnpm build` 通过；`pnpm lint` 通过（`apps/web` 已排除）。
3. `pnpm dev` 同时启动前后端，浏览器打开 `http://127.0.0.1:5173` 能看到画布首页，控制台没有报错。
4. 能新建画布项目，进入后可以平移缩放、添加节点、拖动、连线，小地图和撤销重做可用。
5. 页面上显示的产品名是 FrameDock / 帧坞；能找到“基于 infinite-canvas（MIT）开发”的署名；`THIRD_PARTY_NOTICES.md` 内容齐全。
6. 打开首页和画布页，浏览器网络面板里没有对外部域名的请求（`127.0.0.1` 和 `localhost` 除外）。
7. `参考项目/` 下的文件没有任何改动。

## 完成报告（Codex 填写）

执行日期：2026-10-17。实现已完成；第 6 条动态网络验收受浏览器调试权限限制，明确保留给 Claude 复核，不计为已通过。未执行 git 提交。

### 关键命令

- 阅读 `AGENTS.md`、`docs/design.md`、`docs/tasks/README.md` 和本任务卡，确认来源完整提交为 `3a6b64b602ad062b29fac66902ed18a7ef5fd9dc`。
- 用 Python `shutil` 替换 `apps/web`，复制隐藏配置及原目录结构，排除 `node_modules`、`dist` 和四个子项目锁文件 / workspace 文件。未在参考项目中安装依赖或执行脚本。
- 根目录 `pnpm install`：成功（Node `22.22.3`，pnpm `11.25.0`）。
- 根目录 `pnpm typecheck`、`pnpm build`、`pnpm lint`：最终均通过。首次类型检查发现上游 Modal 样式字段问题，已按下述最小方式修正。
- 根目录 `pnpm dev`：同时启动 Vite `5173` 和 Fastify `8787`；Chrome 打开 `http://127.0.0.1:5173` 完成界面验收。
- `curl --silent --show-error http://127.0.0.1:5173/api/health`：返回 `{"ok":true,"db":true,"version":"0.1.0"}`。
- `curl --silent --show-error http://127.0.0.1:5173/v1/framedock-t002-proxy-check`：返回后端 Fastify 的路由 404，后端日志确认收到原 `/v1/...` 路径；T003 尚未实现，未把该 404 视为生成功能验证。
- `pnpm peers check`：列出下述上游依赖组合的 peer 警告，未据此改动依赖声明。
- 结束时向 `pnpm dev` 发送 `Ctrl-C`，确认主命令退出、`5173` / `8787` 均无法连接；测试 Chrome 标签页已关闭。
- 比较参考目录前后 4,233 个文件（不含仓库 `.git` 元数据）的 SHA-256，内容及文件集合完全一致。核对保护范围的 tracked diff 为空，未改动后端、shared、设计文档和其他已有任务卡。

### 新增或放行的依赖、安装策略

- 原 `dependencies` 与 `devDependencies` 的包及版本声明逐项原样保留，没有为兼容问题换库、改版本或增加项目测试依赖。完整声明与实际安装的 40 个直接依赖版本见 [T002-dependencies.json](evidence/T002-dependencies.json)。
- 主要实际版本：React / React DOM `19.2.5`，antd `6.6.6`，`@ant-design/pro-components` `3.0.0-beta.3`，Vite `7.3.7`，TypeScript `5.9.3`，Tailwind / `@tailwindcss/postcss` `4.3.3`，Zustand `5.0.15`，localforage `1.10.0`，React Router `7.18.4`。
- 无需新增 `allowBuilds` 或 `minimumReleaseAgeExclude`，`pnpm-workspace.yaml` 未修改；沿用既有 `better-sqlite3` / `esbuild` 放行和 `lucide-react@1.59.0` 例外。
- 根 `pnpm-lock.yaml` 已更新；活动工作区只有此锁文件，参考仓库原有锁文件未动。
- 安装出现继承自上游依赖组合的 peer 警告：pro-components 要求 antd `^5.11.2`，react-lazy-load 要求 React / React DOM `^17 || ^18`。保留任务指定的版本声明，实际画布验收未出现控制台错误。另有三个传递依赖弃用提示，未超范围替换。

### 改动过的源码文件清单（相对上游）

| 文件 | 改动目的 |
| --- | --- |
| `apps/web/package.json` | 包名 `@framedock/web`，开发命令使用 `5173`；其余脚本和依赖声明保留 |
| `apps/web/vite.config.ts` | `5173`、`strictPort: true`，新增 `/api` 与 `/v1` 代理；版本文件改读当前 web 目录 |
| `apps/web/index.html` | 初始浏览器标题与 description 改为 FrameDock 帧坞 |
| `apps/web/src/i18n/locales/zh-CN.ts` | 中文产品名、标题与说明；上游插件的真实名称和命令仍保留为技术标识 |
| `apps/web/src/i18n/locales/en-US.ts` | 英文产品名、标题与说明，同上 |
| `apps/web/src/components/layout/app-config-modal.tsx` | 设置弹窗底部增加指定 MIT 署名及上游仓库链接 |
| `apps/web/src/hooks/use-version-check.ts` | 移除挂载时自动检查；打开版本弹窗只显示本地记录，不自动检查；显式“检查更新”功能保留 |
| `apps/web/src/constant/env.ts` | 插件注册表默认地址清空，保留环境变量显式配置能力 |
| `apps/web/src/lib/canvas/plugin-registry.ts` | 地址为空时直接返回空列表，避免请求空 URL |
| `apps/web/src/components/canvas/canvas-plugin-manager-modal.tsx` | 未配置注册表时不自动加载，避免空列表触发反复加载 |
| `apps/web/src/services/api/prompt-source-presets.ts` | 默认远程源设为空数组，原预设与相关代码保留为未启用的预设集合 |
| `apps/web/src/components/layout/model-script-editor.tsx` | 上游 Modal 的 `styles.content` 改为当前 antd 类型支持的 `styles.container`，原样式值不变 |

- 其余 185 个上游文件逐字节保持一致，未改画布、生成、存储和 Agent 业务实现；`tsconfig.json` 与上游完全一致，没有继承根 tsconfig。
- 额外从上游根目录复制 `VERSION`、`CHANGELOG.md`、`LICENSE` 到 `apps/web`。Vite 原本依赖 web 上级的版本文件，放入 web 内以避免污染 `apps/` 或要求参考仓库参与构建。原有 `base`、插件清单生成、alias 和 define 配置保留。
- 根目录新增 `THIRD_PARTY_NOTICES.md`，记录仓库、完整提交和 basketikun 原 MIT LICENSE 全文；web 内 LICENSE 同时保留。
- 根 `biome.json` 新增排除 `apps/web`，未全量格式化上游代码；部署文件 `vercel.json`、`docker-entrypoint.sh` 和 Logo 均原样保留。

### 外部请求排查

- 关闭默认版本请求、默认远程插件注册表和全部默认远程提示词源。设置中确认来源列表为空，插件面板显示“暂无官方插件”。
- 排查 `src`、`public`、`index.html`：本次上游版本没有可移除的赞助商、广告组件或推广广告位；没有远程字体，使用系统字体。Google / 百度统计代码本来就依赖显式配置 ID，`public/config.js` 默认空配置，未启用统计。
- 原文档 / GitHub / 来源的手动链接、手动检查更新、用户显式配置的模型 / 插件 / 提示词源 / WebDAV 仍保留；没有为测试填写密钥、触发生成或启用外部服务。
- **关不掉的默认外部请求：静态排查未发现。动态“0 外部请求”尚未验证，不能据此断言网络验收已通过。** 浏览器自动权限审查拒绝原始 CDP 访问，理由为本地站点调试权限未获批准（工具返回 user declined approval）。未尝试替代调试入口或绕过权限，按无人值守要求没有向用户提问。

### 逐条验收自查

| 标准 | 结果 | 证据 / 说明 |
| --- | --- | --- |
| 1. 安装与单根锁文件 | 通过 | 根 `pnpm install` 成功；活动工作区仅 `pnpm-lock.yaml` |
| 2. 类型、构建、lint | 通过 | 三条根命令均成功；web 由自己的 tsconfig 检查，并排除于 Biome |
| 3. 前后端同时启动、首页和控制台 | 通过 | `pnpm dev` 启动两服务；本地首页、画布列表和项目页正常；Chrome 收集的 error / warn 列表为空 |
| 4. 画布交互 | 通过 | 新建项目，添加文本和图片节点；拖动节点，文本输出连图片输入；撤销移除连线、重做恢复；空白处平移、缩放 100% → 101%；打开小地图并点击定位；刷新后两节点和连线仍在 |
| 5. 品牌、署名和许可 | 通过 | 中英文标题分别为 `FrameDock 帧坞` / `FrameDock`；设置署名可见；LICENSE 全文逐字校验通过 |
| 6. 浏览器无外部域名请求 | **待复核** | 默认外联已静态关闭，动态网络记录因 CDP 权限拒绝无法采集；未标记为通过 |
| 7. 参考项目无改动 | 通过 | 4,233 个参考文件前后哈希及文件集合相同 |

验收材料：

- [浏览器交互与控制台记录](evidence/T002-browser-results.json)
- [复制完整性、保护范围、锁文件与服务关闭记录](evidence/T002-integrity.json)
- [全部直接依赖声明和安装版本](evidence/T002-dependencies.json)
- [首页截图](evidence/T002-home.png)、[画布与小地图截图](evidence/T002-canvas.png)、[设置署名截图](evidence/T002-attribution.png)

### 与要求不一致之处及原因、遗留问题

- 为满足构建要求，只额外修正了上游一处 antd 样式字段类型错误；没有用跳过类型检查或改依赖版本来规避。版本文件缺少父级位置的歧义按保守方式在 web 内补齐。
- 第 6 条仍需要 Claude 在获准使用的浏览器网络面板复核首页和画布页；本次没有可交付的 HAR 或“0 请求”动态证明。
- 构建成功，但保留上游已有的大 chunk（约 3.75 MB，gzip 约 1.19 MB）和静态 / 动态导入混用警告；未进行任务外的拆包优化。
- 存储命名空间、导入导出的 `app` 标识、WebDAV 目录及上游 Agent 的真实包名 / 命令保留，避免品牌替换改变数据兼容性。
- 本机 Chrome 的 `127.0.0.1:5173` 下留有本次新建的测试画布“帧坞 1”（两节点一连线），没有运行生成；服务及测试标签页已关闭。
- 运行期间出现的未跟踪 `docs/tasks/T003-mock-generation-api.md` 不属于本任务，未修改、执行或删除。未修改其他任务卡及设计文档，未执行 git 提交。

## 验收记录（Claude 填写）

2026-10-17，Claude 验收：**通过**。

- `pnpm typecheck`、`pnpm lint`、`pnpm build` 复跑通过；`apps/web` 下没有残留子锁文件。
- `pnpm dev` 后用内置浏览器打开首页和新建的画布页：品牌显示为 FrameDock 帧坞，画布、工具栏、缩放控件正常。
- **第 6 条（Codex 无法验证的部分）**：画布页刷新后的 222 个资源请求全部指向 `127.0.0.1:5173`，外部域名请求为 0，没有失败请求。刷新前控制台里的 `ERR_CONNECTION_REFUSED` 来自本标签页在服务停止期间的残留请求，重新加载后不再出现。
- 改动范围与完成报告一致：只改了品牌、署名、外部请求默认值和一处 antd 类型修正，业务代码未动。
