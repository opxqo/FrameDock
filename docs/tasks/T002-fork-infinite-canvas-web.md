# T002 复制 infinite-canvas 前端为 apps/web

状态：待执行
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

- 关键命令：
- 新增或放行的依赖、安装策略：
- 改动过的源码文件清单（品牌、署名、关闭外部请求）：
- 关不掉的外部请求：
- 与要求不一致之处及原因：
- 遗留问题：

## 验收记录（Claude 填写）
