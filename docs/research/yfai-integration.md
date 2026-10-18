# YFAI 接入依据

本次读取的公开目录生成时间为 `2026-10-18T02:24:15Z`。数据快照位于 `apps/web/src/lib/yfai-models.json`；运行时“检查并同步”会更新目录。

权威来源：

- [API 总览](https://yf.token6688.com/zh-CN/api-docs)
- [OpenAPI](https://yf.token6688.com/openapi.json)
- [完整模型目录及参数 schema](https://yf.token6688.com/v1/logical-models)
- [任务与终态约定](https://yf.token6688.com/zh-CN/api-docs/tasks)
- [媒体调用方式](https://yf.token6688.com/zh-CN/api-docs/media)

## 请求映射

| FrameDock 能力 | YFAI 协议 |
| --- | --- |
| 验证 Key | GET /v1/models，无生成费用 |
| 同步模型 | GET /v1/logical-models，公开接口 |
| 流式对话 | POST /v1/chat/completions |
| 图片 / 视频 / 音频 | POST /api/v1/model-runtime/invoke，`model_id`、`modality`、`params.prompt` |
| 查询任务 | GET /v1/tasks/{task_id}，以 is_final 判终态，再以 status / error 判成败 |
| 上传素材 | POST /v1/files，multipart 的 file 字段 |
| 克隆音色 | POST /v1/audio/voices，multipart 的 file、model=speech-2.8、name |
| 参数估价 | POST /v1/pricing-estimate |
| 同步媒体默认估价 | POST /v1/pricing-estimate/batch，最多 100 项一批 |

不能把本服务的视频按 AutoDL 的 Ark、Kling、MiniMax 原生协议分发，也不能把 Gemini 图片名当成原生 Gemini 端点。它们均通过本服务的逻辑模型 ID 与统一 runtime 调用。原始 id 与 public_id 均保留，使用文档明确支持的原始 id。

服务商成功提交可能返回 `code: 200` 信封，也可能直接返回顶层 task_id。任务终态错误仍是任务结果，不应被当成请求失败而丢失已保存的任务号。`needs_review` 是非终态。503 查询失败应继续查询；410 过期应停止。提交不自动重试。

价格为账户实付估价，并随参数、渠道与参考媒体变化。默认参数报价仅供模型列表比较。参数面板估价不自动上传画布连线素材，因此不能把它称为完整素材输入下的精确费用。真实账单以服务商为准。


## MJ 参考图错误修复

报错：`operation=edit requires attachments[0] (source image)`。

原适配器用 `params.images` / `params.url` 是否存在来决定 `operation=edit`，并且未提供 runtime 顶层的 `attachments`。这既把 MJ 的垫图 / Blend 误判成编辑，也让真正编辑请求缺少 runtime 的原图输入。空图片数组在 JavaScript 中同样为真，原判断还会把空数组当成编辑输入。

修复后：图片只在有效模式为 `image-edit` 时自动使用 `edit`，其余默认 `generate`；源图 URL 同时按官方 runtime 信封放到顶层 `attachments`，模型参数中的 `images` / `url` 保留用于参数校验和模型专属处理。MJ 单图垫图仍是 `text-to-image`，多图融合为 `multi-reference`，两者都用 `generate`。

本次重新读取的 [MJ 参数表](https://yf.token6688.com/v1/skills/models/mj_imagine) 明确只列 `text-to-image` 与 `multi-reference`。独立参数表支持 1–4 张垫图、2–4 张 Blend。接口修复通过合成请求回归验证，没有代用户重新提交付费生成。
