# T003 模拟生成接口

状态：验收通过
前置：T002 已完成（`apps/web` 已是 infinite-canvas 前端）
对应：`docs/design.md` 第 0 节

## 背景

为了不花钱就能端到端测试“文本 → 图片 → 视频”这条工作流，在 `apps/server` 里实现一组**OpenAI 兼容的假接口**，前端开发环境预置一个指向它的“本地模拟”渠道。

前端调用这些接口的代码在 `apps/web/src/services/api/`：图片看 `image.ts`，视频看 `video.ts`。下面的返回格式就是按这两个文件的解析逻辑定的，实现前请先读一遍，以代码为准。

## 具体要求

### 1. 接口（全部挂在 `apps/server`，路径前缀 `/v1`）

不校验 API Key（有就忽略）。所有接口的请求参数都打印一行日志，方便排查。

| 接口 | 行为 |
| --- | --- |
| `GET /v1/models` | 返回 `{ object: "list", data: [{ id, object: "model" }] }`，包含 `mock-image`、`mock-video`、`mock-text` |
| `POST /v1/images/generations` | JSON 请求。生成 `n` 张占位 PNG（默认 1），返回 `{ created, data: [{ b64_json }] }`。**无论是否传 `response_format`，都返回 `b64_json`** |
| `POST /v1/images/edits` | multipart 请求（`@fastify/multipart`），参考图字段为 `image` 或 `image[]`。返回格式同上 |
| `POST /v1/videos` | multipart 请求。立即返回 `{ id, status: "queued" }`，任务存在内存 Map 里 |
| `GET /v1/videos/:id` | 前 3 次查询返回 `{ id, status: "in_progress" }`，之后返回 `{ id, status: "completed" }`。**不要返回 url 字段**，让前端走下面的 `/content` |
| `GET /v1/videos/:id/content` | 返回占位 mp4（`Content-Type: video/mp4`） |
| `POST /v1/responses` | 请求带 `stream: true` 或 `Accept: text/event-stream` 时，用 SSE 分几段发送 `response.output_text.delta`，然后发 `response.completed`；否则返回含 `output_text` 的普通 JSON。内容为“模拟回复：”加上用户输入的前 50 个字 |

### 2. 占位内容

- **图片**：用 `sharp` 把一段 SVG 渲染成 PNG。尺寸按请求的 `size`（形如 `1024x1024`），没有就用 1024x1024。画面里要写上：
  - 序号（第几张）；
  - 提示词前 40 个字；
  - 收到的参考图数量（如“参考图：2”）。

  背景色按提示词的哈希取，不同提示词颜色不同。中文显示成方块也可以接受。
- **视频**：用本机的 `ffmpeg`（`/opt/homebrew/bin/ffmpeg` 已安装）生成一段 3 秒、640x360、带“FrameDock mock”字样和计时的测试视频，例如 `testsrc2` 加 `drawtext`。生成一次后缓存到 `data/mock/video.mp4` 复用。ffmpeg 不可用时返回 500，并给出清晰的错误信息。
- 视频任务创建时记录收到的提示词和参考图数量，在日志里打印出来即可，视频内容不用变化。

### 3. 代码组织

- 新建 `apps/server/src/mock/`，按接口拆文件，在 `index.ts` 里注册为一个 Fastify 插件。
- 用环境变量 `FRAMEDOCK_MOCK_API` 控制：默认开启，设为 `0` 时不注册。写进 `.env.example`。
- 新依赖：`@fastify/multipart`、`sharp`，按需放行构建脚本。

### 4. 前端预置“本地模拟”渠道

修改 `apps/web/src/stores/use-config-store.ts`，**只在开发环境**（`import.meta.env.DEV`）生效：

- `defaultConfig.channels` 最前面加一个渠道：
  - `id: "mock"`，名称“本地模拟”；
  - `baseUrl: window.location.origin`，经 Vite 的 `/v1` 代理转到 8787，避免跨域；
  - `apiFormat: "openai"`，`apiKey: "mock"`；
  - 模型：`mock-image`（image）、`mock-video`（video）、`mock-text`（text）。
- 开发环境下 `imageModel`、`videoModel`、`textModel` 和 `model` 默认指向 `mock::…`。
- 浏览器里已有旧配置时：启动时如果没有 `mock` 渠道就补上，但不改用户已选的默认模型。改动要小，沿用该文件原有的写法。
- 生产构建不包含这个渠道。

### 5. 不要做的事

- 不改 `apps/web` 除 `use-config-store.ts` 以外的业务代码。如果确实需要改，在完成报告里说明原因。
- 不实现真实的生成服务，不做持久化。
- 不执行 git 提交。

## 验收标准

1. `pnpm typecheck`、`pnpm lint`、`pnpm build` 通过。
2. `pnpm dev` 后用 curl 验证：
   - `POST /v1/images/generations` 返回可解码的 PNG；
   - 视频接口走完“创建 → 查询 3 次处理中 → 完成 → 下载 content 得到可播放 mp4”；
   - `/v1/responses` 的流式模式能看到多段 delta。
3. 浏览器打开 `http://127.0.0.1:5173`，在全新浏览器配置下，设置里能看到“本地模拟”渠道，默认模型是 mock 模型。
4. 在画布上走一遍：
   - 文本节点连到图片生成，生成出占位图，图上的提示词与上游文本一致；
   - 把这张图连到视频生成，得到可播放的占位视频，服务端日志显示参考图数量为 1；
   - 视频处理中时刷新页面，任务会继续轮询直到完成。
5. `FRAMEDOCK_MOCK_API=0` 时这些接口返回 404。

## 完成报告（Codex 填写）

- 执行日期：2026-10-17。
- 实现结果：
  - `apps/server/src/mock/index.ts` 注册 `/v1` Fastify 插件，按模型、图片、视频、文本接口拆文件。所有接口忽略 API Key，打印一行结构化参数日志；multipart 日志记录字段、文件名、类型和字节数，不打印二进制内容。
  - 图片生成及编辑统一返回 `b64_json` PNG，支持 `n`、`size`、`image` / `image[]`，画面包含序号、提示词前 40 个 Unicode 字符、参考图数，背景色由完整提示词哈希决定。
  - 视频任务仅在内存 Map 中保存，前三次查询为 `in_progress`，第四次起为 `completed`，无 URL 字段。`/content` 返回可播放 MP4；首次生成后缓存到 `data/mock/video.mp4`。重复下载复用缓存；不存在的任务返回 404，未完成下载返回 409，生成失败返回带清晰说明的 500，并清理临时文件。
  - `/responses` 支持普通 JSON，以及由 `stream: true` 或 Accept 头触发的 SSE；每四个字符发送一段 delta，最后发送 `response.completed`。解析字符串输入和 user 消息中的文本，忽略 system 消息及图片内容，截取前 50 个 Unicode 字符。
  - 开发环境预置“本地模拟”渠道及三类默认模型，旧配置补渠道并保留原有默认模型。生产 bundle 中没有模拟渠道或模拟模型字符串。
- 关键命令：
  - `pnpm --filter @framedock/server add @fastify/multipart sharp`，随后将版本固定为精确版本；`pnpm install --frozen-lockfile` 通过。
  - `pnpm exec biome check --write apps/server/src/mock apps/server/src/index.ts apps/server/src/config.ts`。
  - 最终执行 `pnpm typecheck && pnpm lint && pnpm build`，全部通过；`git diff --check` 通过。构建仍有上游已有的动态/静态混合导入及大 chunk 提示，无构建错误。
  - `pnpm dev`，通过 `http://127.0.0.1:5173/v1` 的 Vite 代理执行 curl 接口检查。自动断言脚本：`python3 /private/tmp/framedock-t003-qa/api-check.py`。
  - `/opt/homebrew/bin/ffprobe -v error -show_entries stream=codec_name,width,height,pix_fmt:format=duration -of json /private/tmp/framedock-t003-qa/video.mp4`；`/opt/homebrew/bin/ffmpeg -v error -i /private/tmp/framedock-t003-qa/video.mp4 -f null -`，完整解码通过。
  - `node /private/tmp/framedock-t003-qa/config-check.mjs`：将实际 store 源码打包到独立 Node VM，使用内存 localStorage 验证全新配置、旧配置迁移及重复加载。不访问浏览器存储。
  - `FRAMEDOCK_MOCK_API=0 PORT=8788 FRAMEDOCK_DATA_DIR=/private/tmp/framedock-t003-qa/disabled-data node apps/server/dist/index.js`，逐个请求全部七个接口，均为 404。
  - `python3 /private/tmp/framedock-t003-qa/error-check.py`：在独立服务进程中注入 ffmpeg ENOENT，不修改本机可执行文件；确认 `/content` 返回清晰 500，临时文件被清理，进程由脚本 finally 关闭。
  - `rg -l 'mock-image|mock-video|mock-text|本地模拟' apps/web/dist/assets/*.js` 无匹配。
- 新增依赖及版本：
  - `@fastify/multipart` **10.1.4**、`sharp` **0.35.5**，均在 `apps/server`；`pnpm-workspace.yaml` 放行 sharp 构建脚本。
  - 未向项目安装测试依赖。首次尝试复用临时目录中的 Playwright 启动独立 Chrome，被系统沙箱阻止；页面验收随后通过已连接 Chrome 的普通 UI 操作完成。
- 改动文件清单：
  - `.env.example`、`pnpm-workspace.yaml`、`pnpm-lock.yaml`。
  - `apps/server/package.json`、`apps/server/src/config.ts`、`apps/server/src/index.ts`。
  - 新增 `apps/server/src/mock/{index,models,multipart,images,videos,responses}.ts`。
  - `apps/web/src/stores/use-config-store.ts`。
  - 本任务卡。未修改 `docs/design.md`、其他任务卡或参考项目；未复制第三方源码，因此没有新增源码版权登记。
- 验收标准逐条自查：

  | 条目 | 结果与证据 |
  | --- | --- |
  | 1. typecheck / lint / build | **通过**，最终完整执行均退出 0。 |
  | 2. curl 图片、视频、SSE | **通过**。默认 PNG 为 1024×1024；指定 640×360、n=2 返回两张不同序号 PNG；指定 `response_format: "url"` 仍仅返回 b64_json。multipart 单图及两图编辑成功。视频状态顺序为三次 in_progress、一次 completed，随后下载并完整解码为 H.264 / yuv420p / 640×360 / 3 秒；重复下载未改变缓存文件 mtime。两种 SSE 触发方式均得到多段 delta 和 completed。见临时目录的 `api-results.json`、`stream.sse`、`accept.sse`。 |
  | 3. 全新浏览器配置及默认模型 | **部分现场验证，待 Claude 补验全新浏览器配置**。普通 Chrome 打开指定 127.0.0.1:5173 后，设置中已看到本地模拟渠道及三模型；原有 GPT / Grok 默认模型保持不变。全新默认值、旧配置补齐、不重复插入的实际 store 逻辑均通过独立内存测试，见 `config-results.json`。严格的全新浏览器配置现场检查受环境限制，详见下文。 |
  | 4. 画布链路及刷新恢复 | **通过**。新建“**T003 模拟接口验收**”画布，文本“帧坞海边日落”连接生图配置，mock-image 输出图片显示上游原文（包含前端原有的“【文本1】”包装）。从生成图片拖线新建视频节点，以 mock-video 生成；服务端记录 `referenceCount: 1`。处理中刷新后仍显示生成中，随后同一任务继续查询至下载 content 并成功播放；浏览器 video 元素 readyState=4、duration=3、640×360、无解码错误，实际播放时 paused=false、currentTime>0。任务 `video_17f0a527-1fea-497d-b781-dd02f361a6da`，见 `browser-video-log.json`；截图 `canvas-completed.png`。 |
  | 5. 开关关闭返回 404 | **通过**。生产入口设置 FRAMEDOCK_MOCK_API=0 后，七个接口均返回 404，见 `disabled.log`。 |

- 与要求不一致之处及原因、保守处理：
  - 本机 `/opt/homebrew/bin/ffmpeg` 实测没有 `drawtext` 滤镜。保留本机安装，采用 sharp 绘制透明标题和逐秒计时帧，再由 ffmpeg 的 overlay 滤镜叠加 testsrc2；满足 3 秒、640×360、FrameDock mock 字样与计时要求，没有安装或替换 ffmpeg。
  - 前端视频接口会把首帧同时发为 `first_frame` 和 `images`（参考模式则为 `image[]` 与 `images`）。按两组字段数量的最大值统计逻辑参考图，避免一张图被记成两张；原始上传字段仍完整写入请求日志。
  - 图片请求为避免无人值守测试误分配过大内存，限定 n 为 1–15（与现有前端上限一致）、每边 1–4096；不合规请求返回 400。multipart 每文件上限 20 MiB、最多 40 个文件，不做额外持久化。
  - 自动审批拒绝对本地页面的原始 CDP 访问，理由为未获得该动作权限；未尝试绕过该限制或操作既有浏览器存储。加上独立 Chrome 启动受沙箱限制，因此没有完成严格的全新浏览器配置现场验收，以普通 UI 和独立 Node 内存测试分别报告，不将其宣称为完整浏览器验收。
  - 第一次视频刷新测试在请求返回及前端异步保存完成前立刻刷新，恢复到了旧的空节点；第二次在任务信息已保存后刷新，成功继续同一任务。此前端保存时间窗属于上游现有行为，卡片禁止修改相关业务文件，因此未扩大范围修复。
- 遗留问题及收尾：
  - Claude 需使用全新浏览器配置补验第 3 条；如要求点击生成后立即刷新也绝不丢任务，需要另开前端持久化任务。
  - 临时验证产物和脚本位于 `/private/tmp/framedock-t003-qa/`，开发服务日志为 `/private/tmp/framedock-t003-dev.log`；这些不是入库文件。占位视频缓存位于已忽略的 `data/mock/video.mp4`。保留新建的验收画布便于复核，未改变用户原有默认模型。
  - `pnpm dev`、8788 关闭模式服务和 8789 错误注入服务均已关闭；最终检查 5173、8787、8788、8789 均无监听进程。
  - 执行中发现另有未跟踪文件 `apps/web/src/lib/canvas/workflow-runner.ts` 出现，未读取、修改或删除。
  - 未执行 git 提交；状态按流程设为“已完成，待验收”，以上部分验收及限制留给 Claude 复核。

## 验收记录（Claude 填写）

2026-10-17，Claude 验收：**通过**。

- `pnpm typecheck`、`pnpm lint` 复跑通过。
- `pnpm dev` 后经 5173 代理用 curl 验证：`/v1/models` 返回 3 个模拟模型；`/v1/images/generations` 返回可解码的 PNG；视频任务连续 3 次 `in_progress` 后变为 `completed`，`/content` 下载到 3 秒 mp4（ffprobe 确认）；`/v1/responses` 流式返回多段 `response.output_text.delta`。
- 代码审阅：模拟接口按接口拆分在 `apps/server/src/mock/`，由 `FRAMEDOCK_MOCK_API` 控制；`use-config-store.ts` 的模拟渠道只在开发环境注入，改动范围小。
- 画布上的“文本 → 图片 → 视频”全流程放到 T004 的整条链验收中一起复核。
