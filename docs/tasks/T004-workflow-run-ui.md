# T004 整条链运行：界面接线与端到端验证

状态：验收通过
前置：T003 已完成（开发环境有“本地模拟”渠道）
对应：`docs/design.md` 第 0 节

## 背景

Claude 已经写好整条链运行的核心逻辑（**工作区里尚未提交，属于本任务基线，不要回滚**）：

- `apps/web/src/lib/canvas/workflow-runner.ts`：
  - `planWorkflow(startNodeId, nodes, connections, scope)`：沿连线收集子图、拓扑排序、检测环，`scope` 为 `"downstream"`（本节点及所有下游）或 `"upstream"`（本节点及所有上游，即“运行到此处”）。
  - `runWorkflowPlan`：逐个执行；某节点失败时，它的下游全部跳过。
  - 哪些节点会执行：
    - 配置节点：会执行，结果写回它最近一次生成的结果节点；
    - 图片 / 视频 / 音频节点：自身有提示词、且不是配置节点产出的结果，就原地重新生成；
    - 其他节点（文本、上传素材、分组）：只当输入，不执行。
- `apps/web/src/pages/canvas/project.tsx`：
  - `handleGenerateNode` 新增第 4 个参数 `{ overwrite, targetNodeId }`；
  - 原地生成时把用户自己写的提示词存到 `composerContent`，避免上游文本被重复拼接；
  - 新增 `runWorkflow(nodeId, scope)`、`stopWorkflow()` 和状态 `workflowRunning`，约在 `generateNodeRef` 的 `useEffect` 之后。
- i18n 已加 `canvas.workflow.*` 文案（zh-CN、en-US），包括 `runDownstream`、`runUpstream`、`stop`。

## 具体要求

### 1. 界面接线

- **节点右键菜单**（`components/canvas/canvas-context-menu.tsx` 及其在 `project.tsx` 中的调用处）：对单个节点右键时，增加“运行到此处”（`runWorkflow(id, "upstream")`）和“运行下游”（`runWorkflow(id, "downstream")`）两项。图标用 lucide-react 的现成图标，沿用该菜单已有的 `MenuButton` 写法。
- **节点悬浮工具条**（`components/canvas/canvas-node-hover-toolbar.tsx`）：增加一个“运行下游”按钮，和已有按钮风格一致。不适合放的节点类型（如分组）不显示。
- **停止**：`workflowRunning` 为 true 时，在画布上已有的工具栏或顶栏里显示一个“停止工作流”按钮，调用 `stopWorkflow()`。放在哪里由你按现有布局决定，沿用现有样式。
- 只做接线，**不要修改** `workflow-runner.ts` 和 `handleGenerateNode` 的逻辑。如果验证中发现它们有 bug，不要自己改，在完成报告里写清复现步骤、现象和你认为的原因。

### 2. 端到端验证（用“本地模拟”渠道，不花钱）

在浏览器里按顺序验证，每一步截图存到 `docs/tasks/evidence/T004-*.png`：

1. **单节点流程（补 T003）**：新建项目，建文本节点 A（内容“红色小舟”）→ 连到配置节点 C1（图片模式）→ 在 C1 上生成，得到图片结果 R1，图上文字含“红色小舟”。
2. **链式结构**：把 R1 连到配置节点 C2（视频模式）→ 生成，得到视频结果 R2。
3. **运行下游**：把 A 的内容改成“蓝色小舟”，在 A 上右键 →“运行下游”。预期：
   - C1 先跑，R1 **原地**更新为含“蓝色小舟”的图，不新增节点；
   - 然后 C2 跑，R2 原地更新为新视频，不新增节点；
   - 结束时提示“工作流完成”。
4. **运行到此处**：在 R2 上右键 →“运行到此处”，预期 C1、C2 依次重跑。
5. **失败阻断**：临时把 C1 的模型换成一个不存在的模型或错误渠道，使它失败，再对 A“运行下游”。预期 C1 失败，C2 被跳过，提示里有失败数和跳过数。验证后恢复。
6. **停止**：运行下游时在 C2 执行前点“停止工作流”，预期后续节点不再执行，提示“工作流已停止”。
7. **原地生成节点**：建一个空图片节点 I，写提示词“测试原地”，把 A 连到 I，生成；再改 A 后对 A“运行下游”，I 原地更新。I 的提示词输入框里仍然只显示“测试原地”，不能混入 A 的文本。
8. 刷新页面，以上节点和结果都在。

## 不要做的事

- 不改 `workflow-runner.ts`、`handleGenerateNode`、生成服务、存储逻辑。
- 不做 i18n 以外的文案改动，不做无关重构。
- 不执行 git 提交。

## 验收标准

1. `pnpm typecheck`、`pnpm lint`、`pnpm build` 通过。
2. 右键菜单、悬浮工具条、停止按钮都按要求出现并可用。
3. 上面 8 个验证场景全部按预期（截图齐全）。不符合预期的写进完成报告，不要自己改核心逻辑。

## 完成报告（Codex 填写）

执行日期：2026-10-17。

### 改动文件清单

- `apps/web/src/components/canvas/canvas-context-menu.tsx`：沿用 `MenuButton`，添加“运行到此处”“运行下游”和现有 lucide 图标。
- `apps/web/src/components/canvas/canvas-node-hover-toolbar.tsx`：添加“运行下游”按钮，复用 `ToolbarAction`。文本、配置、图片、视频、音频节点显示，分组不显示；图片按钮放在可配置快捷工具列表之外，保证已有快捷工具偏好不会将它过滤掉。
- `apps/web/src/components/canvas/canvas-top-bar.tsx`：工作流运行期间显示“停止工作流”，沿用顶栏 antd 按钮样式。
- `apps/web/src/pages/canvas/project.tsx`：仅增加上述组件的 props 接线；单节点右键时提供两个运行回调，点击后关闭菜单，多选和连线菜单不提供工作流入口。
- 本任务卡、`docs/tasks/evidence/T004-*.png`（15 张）和 `T004-browser-results.json`。

开始执行时已存在的 `workflow-runner.ts`、`handleGenerateNode` 和两份 i18n 文件均完整保留；已与执行前的 `/tmp/framedock-t004-baseline/` 快照逐字节/函数片段比较。没有修改生成服务、存储、设计文档、其他任务卡或第三方参考项目。

### 关键命令、依赖与验收自查

- `pnpm typecheck`：通过，shared、server、web 均完成。
- `pnpm lint`：通过；按现有 Biome 配置检查，配置明确排除了 `apps/web`，不将其表述为前端额外 lint 验证。
- `pnpm build`：通过；Vite 保留原有的大包和同模块混合静态/动态导入警告，无构建错误。
- `pnpm dev`：启动 Vite 5173、Fastify 8787，完成真实浏览器操作；`curl -fsS http://127.0.0.1:8787/api/health` 返回 `{"ok":true,"db":true,"version":"0.1.0"}`。
- `sips -s format png /tmp/T004-<场景>.jpg --out docs/tasks/evidence/T004-<场景>.png`：将浏览器原始 JPEG 截图转为真正的 PNG，无重绘或标注。
- `pnpm exec biome check --write docs/tasks/evidence/T004-browser-results.json`：证据 JSON 格式检查通过。
- Python 比较执行前后核心文件/函数，并检查截图、场景结果、节点与连线；通过。最终刷新后是 6 个节点、5 条连线，两个图片预览均加载，视频为 640×360、3 秒、`readyState = 4`。
- 向本次 `pnpm dev` 会话发送 Ctrl-C，前后端和 concurrently 会话均已退出；随后用 socket 连接检查确认 5173、8787 都不再监听。
- 没有安装、升级依赖；使用已有 `lucide-react`、antd 和 React。没有新增复制的第三方代码，无新增版权登记项。没有执行 git 提交。

验收标准 1（工程检查）、2（三个界面入口）和 3（八个浏览器场景及截图）均已自查通过。补充实测图片悬浮工具条运行成功，提示“工作流完成，共运行 1 个节点”；新建临时分组后确认其悬浮工具条没有运行按钮，再撤销分组恢复 6 个节点。截图见 [悬浮按钮](evidence/T004-ui-hover-toolbar.png)、[悬浮按钮执行](evidence/T004-ui-hover-run.png)、[分组工具条](evidence/T004-ui-group-toolbar.png)、[右键菜单](evidence/T004-ui-context-menu.png)、[运行期间顶栏](evidence/T004-ui-running.png)。空闲时停止按钮隐藏。

### 8 个场景的结果（按要求顺序）

主验收画布为 `http://localhost:5173/canvas/mkDq6UOTJQVyi1ETml6Yw`，标题“T004 工作流验收”。使用独立的 localhost 存储来源，避免与已有 127.0.0.1 页面共享测试配置。全部生成操作使用“本地模拟”，没有调用付费生成接口。恢复查看时需先运行 `pnpm dev`。

| 场景 | 结果与实际观察 | 截图 |
| --- | --- | --- |
| 1. 单节点流程 | 通过。新建 A，正文“红色小舟”；连接图片配置 C1，使用 mock-image、单张生成，得到 R1；图片包含“红色小舟”，共 3 个节点。 | [01 单节点](evidence/T004-01-single-node.png) |
| 2. 链式结构 | 通过。R1 连接视频配置 C2，使用 mock-video，生成 R2；模拟请求带 1 张参考图，视频可播放，共 5 个节点。 | [02 视频链](evidence/T004-02-video-chain.png) |
| 3. 运行下游 | 通过。A 改为“蓝色小舟”，右键运行下游；C1 先更新 R1，再执行 C2 更新 R2；5 个节点 ID 和数量均不变，图片、视频的媒体 URL 均更新，提示“工作流完成，共运行 2 个节点”。 | [03 下游完成](evidence/T004-03-downstream.png) |
| 4. 运行到此处 | 通过。在 R2 上右键“运行到此处”；C1、C2 依次重跑，仍为 5 个节点，提示完成 2 个节点，R2 的媒体 URL 再次更新。 | [04 上游重跑](evidence/T004-04-upstream.png) |
| 5. 失败阻断 | 通过。临时将本地模拟渠道地址改为只指向本机的错误地址 `http://localhost:8787/t004-invalid`；从 A 运行下游后，C1/R1 显示失败，C2 没有执行，R2 的视频 URL 保持不变，提示“1 个失败，1 个因上游失败被跳过”。随后恢复渠道为 `http://localhost:5173`。 | [05 失败与跳过](evidence/T004-05-failure-blocking.png) |
| 6. 停止 | 通过。在 C1 执行期间（进度 1 / 2）点击顶栏停止按钮，当前 C1 完成后不执行 C2，提示“工作流已停止”，R2 视频 URL 保持不变。为留出可操作时间，临时使用 4k 档、10 张模拟输出；接口实际尺寸为 2880×2880，仍写入原 R1 图片组，无新增节点。验证后恢复单张并将宽高输入恢复为 1024，后续场景再次生成了单张结果。 | [06 已停止](evidence/T004-06-stop.png) |
| 7. 原地生成节点 | 通过。新增空图片 I，提示词“测试原地”，连接 A 后首次在 I 原地生成。将 A 再改为“绿色小舟”，从 A 运行下游，C1、I、C2 共执行 3 步；I 的图片 URL 更新，六个节点 ID 与数量保持不变，输入框仍严格为“测试原地”，没有混入上游文本。 | [07 原地提示词](evidence/T004-07-in-place.png)、[首次生成](evidence/T004-07-in-place-initial.png)、[三步完成](evidence/T004-07-workflow-complete.png) |
| 8. 刷新恢复 | 通过。刷新后六个节点、五条连线及 R1/I 图片、R2 视频均恢复；节点 ID 与刷新前完全一致，所有媒体加载完成。 | [08 刷新结果](evidence/T004-08-refresh.png) |

结构化对比结果见 [T004-browser-results.json](evidence/T004-browser-results.json)。模拟视频按现有实现返回固定测试画面，因此“新视频”通过生成请求、媒体 URL 更新和原节点 ID 保持确认，不以画面差异判断。

### 发现的核心逻辑问题（复现步骤 / 现象 / 推测原因）

没有发现导致上述八项失败的工作流执行或生成核心问题，未修改核心逻辑。

另有未定位的画布视图现象：节点靠近画布底部时打开/编辑下方提示词面板，偶尔会出现画布内容向上滚动、悬浮工具条临时遮挡节点；关闭面板并刷新后恢复。可参考“首次原地生成”截图中的视图位置。推测与现有面板聚焦/容器滚动有关，未验证根因；本卡只接工作流入口，不扩大到画布布局修复。八个场景均在可操作视图下完成验证。

### 与要求不一致的地方及原因、遗留问题

- 无功能要求偏离。失败测试通过临时错误本地渠道触发：模拟接口不校验模型是否存在，单独填写不存在的模型不能可靠制造失败。
- 停止测试的默认单图模拟响应很快，首次操作到达时 C2 已开始，不能作为“C2 执行前停止”的证据；最终通过上述临时批次完整验证，保留的 06 截图及结果对应进度 1 / 2 的成功操作。浏览器原始 CDP 权限未获准，未使用该能力或改变网络设置，最终通过普通界面操作完成。
- 前述视图滚动现象留待后续单独定位。Vite 构建警告保留，本任务未做无关优化。
- 测试画布保留在浏览器中；127.0.0.1 来源还保留前期创建的“T004 工作流界面验收”草稿，没有清理已有用户项目。临时分组已撤销、错误渠道已恢复、临时服务已关闭。
- 待 Claude 按流程验收并提交；本报告不填写下方 Claude 的“验收记录”。

## 验收记录（Claude 填写）

2026-10-17，Claude 验收：**通过**。

- `pnpm typecheck`、`pnpm lint`、`pnpm build` 复跑通过。
- 代码审阅：右键菜单、悬浮工具条、顶栏停止按钮都沿用原有组件写法；`project.tsx` 中 Codex 只增加了 props 接线，`workflow-runner.ts` 和 `handleGenerateNode` 未被改动。
- 抽查截图：失败阻断场景提示“1 个失败，1 个因上游失败被跳过”，下游视频保持原结果，与预期一致；8 个场景的结构化记录见 `T004-browser-results.json`。
- 遗留：节点靠近画布底部时打开提示词面板，偶尔出现画布内容上移，属上游原有行为，后续单独排查。
