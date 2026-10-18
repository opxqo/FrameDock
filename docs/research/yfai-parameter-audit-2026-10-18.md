# YFAI 模型参数核对报告（只读检查，未改任何代码）

日期：2026-10-18　范围：FrameDock 对接 YFAI 的全部可用模型（图片 25 / 视频 44 / 音频 9 / 对话 53，其中已下架 7）

## 0. 方法与边界

只用免费、只读的接口，**没有提交任何付费生成**：

| 来源 | 用途 |
| --- | --- |
| `GET /v1/logical-models`（线上目录） | 与内置快照 `apps/web/src/lib/yfai-models.json` 逐字段比对 |
| `GET /v1/skills/models/{name}`（每个模型的官方参数文档，78 个图/视/音模型） | 与目录里的 `param_schema` 比对（参数名、枚举、默认值、必填、范围） |
| `openapi.json`（invoke / 估价 / 对话 / 防重复 / 错误码说明） | 核对信封字段与调用约定 |
| `POST /api/v1/model-runtime/dry-run`（¥0，不打厂商不冻结，返回“真正发给厂商的请求体 wire.body”） | 用**应用自己的代码**（`buildYfaiParams` / `buildYfaiInvoke`）对每个模型、6 种输入组合（文生、1 图、首尾帧 2 图、3 图、图+视频、图+音频）构造请求，共 426 次，看平台是否接受、参数是否真的到了厂商请求体 |
| `POST /v1/pricing-estimate`（免费估价） | 对比“应用默认值”和“官方默认值”的价格 |

局限：dry-run 只模拟当时选中的渠道；参考素材的“送厂前收口”不执行；5 个模型（`seedance-2-0-special`、`kling-3.0-turbo`、`aliyun-*`、`kling-lip-sync`）平台拒绝 dry-run（501，因为会真打厂商）；`seedance-2-5-special` 文生视频渠道当时在维护（503）。这些无法逐字核对 wire。

## 1. 结论一览

| # | 严重度 | 问题 | 影响范围 | 已证实？ |
| --- | --- | --- | --- | --- |
| 1 | **高** | 语音合成（TTS）类模型文本发到 `params.prompt`，平台要的是 `params.input` → 必然 400 | `gpt-4o-mini-tts`、`gemini-3.1-flash-tts`、`gemini-2.5-pro-tts`、`doubao-tts-2.0`、`speech-2.8` | 是（dry-run 复现，改用 input 即 200） |
| 2 | **高** | 选了“首尾帧”但模型没有首尾帧模式时，**静默降级**：尾帧被丢弃或被当成普通参考图 | 见 §3，共 8 个视频模型 | 是（wire 体对比） |
| 3 | 中 | 内置目录快照已过期，3 个模型与线上不一致；`pnpm verify:yfai` 只比枚举/最小/最大，漏检默认值与 `max_items` | `seedance-2-5-special`、`grok-imagine-1-5-7tu-special`、`grok-imagine-1.5-special` | 是 |
| 4 | 中 | 应用发的“默认值”与官方文档默认值不同（28 个模型）；应用发的是目录默认值，且**每次都显式发送** | 见 §4 | 是 |
| 5 | 中 | 对话接口把模型参数（`web_search`、`enable_thinking`、`thinking`、`thinking_budget`、`reasoning_effort`）原样塞进 `/v1/chat/completions` 顶层，文档称“其余字段按 GT 原样透传”，**这些非标准字段是否被各家厂商接受未确认** | 42/36/14/10/27 个对话模型 | 否（需一次极小的真实调用才能确认） |
| 6 | 低 | UI 上提供、但到厂商请求体里不见了的参数（平台侧未转发，不是我们没发） | §5 | 是（wire 缺失） |
| 7 | 低 | 提示词限制：内置目录缺少 `max_prompt_bytes`（10 个模型以**字节**计，如 grok 系 4096 字节≈1365 个汉字）；所有长度限制网关都不在 dry-run 阶段强制 | §6 | 是 |
| 8 | 低 | 参考素材的比例/边长/时长/帧率/像素等限制，应用只检查了文件大小 | 24+ 个模型 | 是（读代码） |
| 9 | 低 | 用的是旧 `id` 而非目录里的 `public_id`（图/视/音 32 个，对话 37 个不同）；文档说“旧 id 也能调” | 全部 | 是（目前可用，存在下线风险） |

没发现问题的部分见 §7。

## 2. 问题 1：TTS 文本放错字段（高）

- 文档（invoke）：语音合成卡 `operation=speech`（缺省），**需要 `params.input` 与 `voice`**；其余模态的 prompt 才在 `params.prompt`。
- 应用：`buildYfaiInvoke` 固定 `params: { ...rest, prompt }`（`apps/web/src/services/api/yfai.ts`），音频路径 `requestAudioGeneration`（`services/api/audio.ts`）直接复用，**没有任何 input 映射**。
- 复现（dry-run，`voice` 已给）：

| 模型 | 只发 prompt | 发 input |
| --- | --- | --- |
| gpt-4o-mini-tts | 400 `params.input is required` | 200（wire：`{"input":"你好，世界",...}`） |
| doubao-tts-2.0 | 400 `params.input is required` | 200 |
| gemini-3.1-flash-tts / gemini-2.5-pro-tts | 400 `params.input is required` | 200（wire 里变成 `contents[0].parts[0].text`） |
| speech-2.8 | 应用端先报 `voice is required`（无默认音色），补上音色后同样缺 input | — |

- 平台在 400 阶段拒绝，**不扣费**，但这些模型在应用里**完全不可用**。音乐模型 `music`（Suno）走 prompt，dry-run 通过（200），无此问题。
- 另外 `whisper-1`（需要 `audios` + `audio_duration_sec`）、`voice-clone`、`voice-design` 已被 `yfaiToolOnly` 排除，不在生成流程里。

## 3. 问题 2：首尾帧静默降级（高）

应用的模式选择（`buildYfaiParams`）：2 张图 → `first-last`，3 张以上或有参考角色 → `reference`；**如果该模型的 `mode` 枚举里没有这个值，就不设置，退回默认模式**，不报错。

对 2 张图（首帧 + 尾帧）实测 wire：

| 模型 | 应用实际选的模式 | wire 里发生了什么 |
| --- | --- | --- |
| seedance-2-0-official、minimax-h3（及其余有 first-last 的模型） | first-last | 正确：`role: first_frame` / `last_frame` |
| **grok-imagine-video** | first-frame | **尾帧被丢弃**，请求体里只有 `image: FIRST` |
| **seedance-2-5-promo、seedance-2-5-special** | first-frame | 尾帧变成 `extra_images`，不是尾帧 |
| **happyhorse-1-1** | first-frame | 两张图都放进 `images` 列表，尾帧语义不明（未确认是否使用） |
| **grok-imagine-video-special** | first-frame | 同上类（未单独取 wire） |
| **wan-3-0-special、seedance-2-0-9tu-special** | reference | 两张图变成普通参考图（`extra_images` / `image_urls`），首尾帧意图丢失 |
| **wan-3-0** | （未设 mode，落到默认 text-to-video） | 应用端报“images: max 0”，**报错信息与原因不符** |
| pixverse-c1 / pixverse-v6 / kling-3.0-turbo / minimax-hailuo-2-3 / sora-2-official | first-frame | 应用端正确报“images: max 1” |

结论：画布里“连首帧 + 尾帧”的工作流，对上面前 7 个模型会**悄悄变成别的效果**，用户花了钱才发现。另外有 16 个模型标记了 `frame_reference_exclusive`（首尾帧与参考图不能混用），应用遇到混用时直接选 `reference`，把首尾帧也当参考图，同样没有提示。

## 4. 问题 3 / 4：目录过期与“默认值”口径（中）

### 4.1 内置快照 vs 线上目录

快照时间 `2026-10-18T02:24:15Z`，131 个模型，线上现在有 3 个不同：

| 模型 | 字段 | 快照 | 线上 |
| --- | --- | --- | --- |
| seedance-2-5-special | `images.max_items`（及按模式上限） | 30 | **9** |
| grok-imagine-1-5-7tu-special | `resolution` 默认 | 480p | **720p** |
| grok-imagine-1.5-special | `duration` 默认 | 6 | **15** |

后果：首个会让应用允许上传 30 张参考图（平台 9 张）；后两个让应用按旧默认发请求。快照内也**缺少线上有的字段**：`frame_reference_exclusive`（16 个模型）、`max_prompt_bytes`（10 个）、`video_input_max_mb`（9 个对话模型）、`client_api_formats`、`unavailable_reason`。
`pnpm verify:yfai` 目前只比 `enum/min/max`，所以没有发现上面 3 处（可改进，见 §9）。

### 4.2 目录默认值 vs 官方每模型文档默认值

应用用目录（logical-models）的 `default`，并且**每个参数都显式发送**；每个模型自己的文档页给出的默认值在 28 个模型上不同。免费估价对比（¥）：

| 模型 | 差异（应用 / 文档） | 价格 应用 / 文档 |
| --- | --- | --- |
| grok-imagine-video | 时长 3 / 6，清晰度 480p / 720p | 0.11 / 0.74 |
| grok-imagine-1.5 | 时长 4 / 6，480p / 720p | 0.50 / 1.18 |
| grok-imagine-1-5-7tu-special | 时长 3 / 15 | 0.27 / 1.33 |
| seedance-2-0-promo | 时长 4 / 5，480p / 720p | 0.48 / 1.77 |
| seedance-2-0-ecom-special | 时长 5 / 15，quality 满血9图 / 标准 | 4.12 / 9.94 |
| wan-3-0 | 时长 4 / 5，480p / 720p | 0.88 / 2.21 |
| wan2.7-video | 时长 2 / 5 | 1.37 / 3.42 |
| sora-2-official | 时长 4 / 12 | 2.77 / 8.31 |
| happyhorse-1-1 | 时长 3 / 5，720p / 1080p | 2.77 / 6.15 |
| veo-4-omni | 时长 3 / 10 | 0.27 / 0.69 |
| minimax-h3 | 时长 4 / 5 | 1.25 / 1.47 |
| gpt-image-2-official | quality low / medium | 0.018 / 0.108 |
| gemini-nano-banana-2.1-image | size 4K / 1K | **0.218 / 0.067（应用默认贵 3.3 倍）** |
| 其余（gpt-image-2.5-*、gpt-image-2、gpt-image-2-c、doubao-seedream-5-0-pro、qwen-image-*、kling-image-o3、gemini-3-pro-image、kling-3.0-turbo、grok-imagine-video-special、wan-3-0-special） | 分辨率/质量/时长不同 | 价格相同或接近 |

解读：应用的默认值整体更“省钱”（短时长、低清晰度），但与官方文档的默认**不一致**，用户看到的“默认”并非官方默认。**唯一反过来更贵的是 `gemini-nano-banana-2.1-image`（4K）。** 图片类的 4K/高质量默认并不影响价格（估价相同），但会得到 2880×2880 这类大图。

## 5. 问题 6：UI 有选项，但厂商请求体里没有（平台侧，非我们没发）

在“默认参数、文生”场景用 dry-run 对每个模型核对 resolution/duration/aspect_ratio/quality/size/output_format 是否出现在 wire（已排除大小写、`720p`↔`1280x720`、比例×分辨率合成像素这类正常改写）：

| 模型 | 参数 | wire 情况 |
| --- | --- | --- |
| gpt-image-2-c | quality=high | 缺失 |
| gpt-image-2-official | output_format=png | 缺失 |
| gpt-image-2.5-sunburst | output_format=jpeg | 缺失 |
| wan2.7-image | quality=standard | 缺失 |
| qwen-image-3.0 | resolution=2K | 缺失（wire 只有 `size:"1:1"`） |
| seedance-2-0-special / -manju-special / -9tu-special | resolution=720p | 缺失（该渠道 `Seedance 2.0 Fast`，固定 15 秒） |
| **seedance-2-0-ecom-special** | duration=5 | **wire 里是 `seconds:"10"`，被渠道改写** |
| mj_imagine | output_format、iw 等 | 不上线；MJ 的其它参数被网关折成提示词后缀（`--quality 1 --stylize 100 --chaos 0 --weird 0`、`--ar 16:9`、`--v 7`、`--seed`…），符合预期 |

这些是网关/渠道层的取舍：参数我们**发了**，但没有生效。建议在 UI 里对应选项加提示，或向 YFAI 确认。

## 6. 提示词长度

- 目录 `max_prompt_chars` 只是提示。**对 40 多个有该限制的图/视频模型逐一做 dry-run：恰好等于上限与超出 1 个字符都返回 200，网关在校验阶段不拒绝任何一个**（`qwen-image-2.0` 只有 800 字符、`mj_imagine` 1024、`kling-3.0-turbo` 2500 都是如此；`kling-3.0-turbo`、`seedance-2-0-special` 因 501 无法测）。真实厂商是否截断/拒绝，只有真实提交才知道（2026-10-18 已实测 MJ 1159 字符被接受）。
- 另有按**字节**计的限制（目录字段 `max_prompt_bytes`，内置快照没有）：`grok-imagine-video / 1.5 / 1-5-7tu / 1.5-special / video-special` 4096 字节、`kling-3.0-turbo` 2500、`sora-2-official` 16384、`wan-3-0` 61440（≈20480 汉字）、`qwen-image-3.0` 61440。汉字按 3 字节算，grok 系实际只有约 1365 个汉字。同样 dry-run 阶段不强制。
- 应用现状：已改为只提醒不拦截（见此前改动），但提醒按“字符”数而不是“字节”数，对 grok 系会低估。

## 7. 逐项核对后**没有发现问题**的部分

- 请求信封字段与 openapi 一致：`model_id`、`modality`、`operation`、`params`、`lane_ids`（顶层）、`attachments`、`client_request_id`；图片 `operation`（generate/edit）取值正确；`lane_ids` 与估价的 `pinned_lane_ids` 区分正确。
- 线上目录 vs 每模型文档：**参数名一致，无多出/缺失**（78 个图/视/音模型逐个比对）；枚举、必填、范围、`max_items` 全一致，只有默认值差异（§4.2）。
- 参考图数量上限：应用的 `validateYfaiParams` 与目录 `max_items_by_mode` 一致（pixverse/sora/kling-turbo/hailuo 报 max 1，veo/kling-v3/wan2.7 报 max 2 等都与目录相符）。
- 视频 `count` 固定 1、图片 `count` 取配置值；`available_when` 隐藏参数不发送（14 个参数）；必填且无默认值的非上传参数只有 TTS/声音类 8 个，应用均提示必填。
- 53 个图/视频模型“默认参数、文生”通过 dry-run（200）；全部 71 个可用模型默认参数 dry-run：56 通过、10 需参考文件、5 无法 dry-run、0 个参数被拒（本次 `pnpm verify:yfai` 结果）。
- 余额字段：线上是 `credits.available`（文档写的是 `available_balance`），应用现已两种都接受。
- 图片参考图只在 wire 里出现 1 次（gemini-3-pro-image 单图编辑出现 2 次，原因未明，需真实请求确认，风险低）。

## 8. 无法在不花钱的前提下确认的点

1. 对话接口的非标准顶层参数（问题 5）——需要一次极小的真实对话调用（约 ¥0.0001）确认厂商是否报错或静默忽略；文档只说“按 GT 原样透传，各模型支持度见模型详情页”，并明确“顶层 `attachments` 本端点不解析”。
2. `happyhorse-1-1` 首帧模式下的两张图、`grok-imagine-video-special` 的 wire、被 501 拒绝 dry-run 的 5 个模型。
3. 超长提示词在各厂商端的真实表现（除 MJ 外）。

## 9. 建议的修复清单（均未执行，待你决定）

1. TTS：音频生成时把文本写入 `params.input`（保留 `prompt` 兼容），并给 `speech-2.8`、`doubao-tts-2.0` 默认音色或在 UI 必选；加测试覆盖这 5 个模型。
2. 首尾帧：模型没有 `first-last` 时，对 2 张带首/尾角色的图**直接提示“该模型不支持首尾帧”并阻止提交**（或让用户明确选择“只用首帧”）；修正 `wan-3-0` 的错误报错；对 `frame_reference_exclusive` 模型混用首尾帧与参考图时给提示。
3. 目录：刷新内置快照（设置里“检查并同步”或重新抓取），并把 `max_prompt_bytes`、`frame_reference_exclusive` 等字段保留进快照；`pnpm verify:yfai` 增加对 `default`、`max_items`、`required`、`available_when`、`frame_reference_exclusive` 的比对，并对照每模型文档页。
4. 默认值：统一口径（跟随官方文档默认，或明确标注“FrameDock 默认：更短更省”），并对 `gemini-nano-banana-2.1-image` 默认 4K 单独处理。
5. 长度提醒：对有 `max_prompt_bytes` 的模型按字节计算。
6. UI：对 §5 的“无效选项”加灰显或提示；MJ 参数说明里注明会被折成提示词后缀。
7. 对话参数：先做一次极小真实调用确认；若厂商不接受，对话路径只发 `reasoning_effort` 等标准字段，其余走 invoke 的 `params`。
8. `model_id` 逐步迁移为目录里的 `public_id`（旧 id 目前仍可用）。
9. 参考素材：按目录里的 `aspect_min/max`、`min/max_edge_px`、`max_total_duration_sec`、`accept_formats` 等在上传时预检（平台虽会部分自适应，但失败要等提交后才知道）。

## 附：本次检查产物

- 426 次 dry-run 明细、线上目录与 78 份模型文档的快照在会话临时目录，可按需导出；未向仓库写入任何文件，未改动任何代码，未提交任何付费生成。
