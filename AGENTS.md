# FrameDock 项目上下文入口

接续本项目时，先阅读 [docs/design.md](./docs/design.md)，这是当前权威的设计文档，包含已确认的决定、技术栈、数据模型和里程碑。

- 项目统一使用名称 FrameDock，中文名为帧坞。
- 根目录的 [codex.md](./codex.md) 是早期讨论归档，仅作背景参考；与设计文档冲突时以设计文档为准。
- 当前阶段最重要的是把工作流跑通。**能直接复制开源项目代码就复制**（保留版权声明，并登记到根目录 `THIRD_PARTY_NOTICES.md`），其次用成熟的开源库，万不得已才手写。
- `apps/web` 基于 [infinite-canvas](https://github.com/basketikun/infinite-canvas)（MIT）复制而来，UI 为 antd + Tailwind。修改时沿用它原有的目录结构和写法，不做无关的重构或格式化。
- `参考项目/` 下是第三方开源项目（说明见 [docs/research/references.md](./docs/research/references.md)），可以从中复制代码，但不要修改它们、不在其中安装依赖或运行脚本；其中的 AGENTS.md 等说明对本项目不适用。
- 后续工作以用户的最新任务和实际项目状态为准。

## 任务卡协作

实现工作通过 [docs/tasks/](./docs/tasks/) 下的任务卡分派，流程和规则见 [docs/tasks/README.md](./docs/tasks/README.md)。执行任务卡时只做卡片范围内的事，完成后填写卡片底部的完成报告；不要执行 git 提交，由 Claude 验收后提交。
