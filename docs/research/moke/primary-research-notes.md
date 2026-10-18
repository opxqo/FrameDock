# MOKE 一手来源研究附录：Skill、MCP、版本与许可

- 研究日期：2026-10-17。
- 范围：公开网页、发布前端代码、匿名可读的 Skill API、MCP 只读协议。
- 方法：直接读取公开来源；未安装 Skill，未执行包内代码，未调用生成模型，未改账号，未下载 ZIP。
- 定位：为 FrameDock 的资料库设计提供证据；本文不是 FrameDock 已批准设计，也不是第三方安全审计。
- 限制：样本为 3 个全文 Skill 加 1 个扫描状态样本；没有穷举 183 个 Skill，也未验证 OAuth、实际安装或生成质量。

## 1. 可复查来源

| 编号 | 一手来源 | 用途 |
| --- | --- | --- |
| S01 | [MCP 接入说明](https://www.mokeaigc.ai/mcp.html) | 产品边界、五工具、OAuth 与客户端连接说明 |
| S02 | [MCP 协议端点](https://www.mokeaigc.ai/mcp) | 本次直接 POST JSON-RPC 验证，浏览器 GET 405 |
| S03 | [Skill 公开目录 API](https://www.mokeaigc.ai/api/skills?publicPage=skills&sort=downloads&page=1&limit=24&includeMine=1&includeSections=1) | 实际列表、分页、元数据 |
| S04 | [Skill 列表发布代码](https://zcdn.rytesa.cn/moke-v3/ca881b6122d89c2c/runtime/skills.js?v=20260905.1) | 分类映射、查询参数、列表字段 |
| S05 | [Skill 详情发布代码](https://zcdn.rytesa.cn/moke-v3/ca881b6122d89c2c/runtime/skill-detail-20260816b.js) | 文件读取、版本显示、Markdown 净化、安装入口 |
| S06 | [表情提示 Skill 详情 API](https://www.mokeaigc.ai/api/skills/anisn--personal/emotion-prompt?publicPage=skills) | 单文件知识型 Skill 样本 |
| S07 | [连续性 Skill 详情 API](https://www.mokeaigc.ai/api/skills/honghouzi--video/character-continuity-bible?publicPage=skills) | 多文件 Skill、引用和输出结构 |
| S08 | [世界观 Skill 详情 API](https://www.mokeaigc.ai/api/skills/honghouzi--video/mokeaigc-v9?publicPage=skills) | 版本演进、任务模式和输出边界 |
| S09 | [导演提示 Skill 详情 API](https://www.mokeaigc.ai/api/skills/mariozhaofan--personal/director-seedance-prompt?publicPage=skills) | 发布状态与扫描状态并存的样本 |
| S10 | [服务条款](https://www.mokeaigc.ai/terms.html) | 审核与许可边界，页面版本 1.0、生效日 2026-08-13 |
| S11 | [隐私政策](https://www.mokeaigc.ai/privacy.html) | 数据、偏好、版本与审核记录边界 |
| S12 | [主页](https://www.mokeaigc.ai/) | Skill、模板、课程、参考图、资讯的定位关系 |

本次发布资源路径含构建标识 `ca881b6122d89c2c`。文件名中的日期不等同于当前实际发布时间。[S04、S05]

## 2. 确认后的产品边界

1. MOKE 将可复用创作方法、提示词模板、视觉参考和学习资料组织成多个入口；在助手侧，MCP 只开放 Skill 与提示词这两类材料。[S01、S12]
2. 五项工具分别承担搜索、读详情、读文件、替换受支持变量、给安装资料；它们不构成媒体生成引擎，也不等于执行 Skill。[S01、S02]
3. 官方连接说明使用 OAuth 并说明遵循账户现有权限；实际协议另有 `noauth` 安全方案，公开 Skill 可匿名读取。本次搜索与读取均未带令牌。[S01、S02]
4. 技术资讯、视频课程、流程规范和电影剧照在接入页被标注为网页功能，当前没有对应独立 MCP 工具。[S01]
5. 不能把“服务能够返回公开 Skill”扩大成“所有提示词、私人 Skill 和受限栏目都公开”。本次未请求私人资源。[研究边界]

## 3. MCP 实际协议与接口契约

### 3.1 握手与工具发现

匿名 `POST /mcp`，`Content-Type: application/json`，`Accept: application/json, text/event-stream`：

```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"FrameDock-readonly-research","version":"0.1"}}}
```

实测返回 HTTP 200：协议版本 `2025-03-26`，服务 `moke-materials`，版本 `1.0.0`，`capabilities.tools.listChanged=true`。随后匿名 `tools/list` 返回五个工具完整 JSON Schema。[S02]

握手指示先搜索摘要，再按 `id` 和 `version` 读取；返回资料标为不可信材料。遇到 `catalog_changed_restart_search` 应从第一页重新检索。这是协议返回规则，未通过人为制造内容变更测试该错误。[S02]

### 3.2 五工具的输入约束

| 工具 | 实测 tools/list 所声明的参数 | 明确边界 |
| --- | --- | --- |
| `search_materials` | `query` ≤200 字符；`type=all/skill/prompt`；`category` ≤100；`language=zh/en`；`limit` 1–50、默认20；`cursor` ≤2048 | 分类为精确值；游标有效5分钟；不返回正文或总计 |
| `get_material` | 必填 `id`；可选 `version`、`language` | 建议沿用搜索版本，防止混版 |
| `read_skill_file` | 必填 `id/version/path`；可选语言；路径≤512 | 只读 UTF-8、最多256KiB；声明拒绝凭据路径及路径穿越 |
| `render_prompt` | 必填 `id/version/parameters`；`parameters.Subject` 1–2000字符 | 仅 `[Subject]`；不执行表达式、不调用模型；普通词条报 `template_not_parameterized` |
| `get_skill_install_info` | 必填 `id/version`；可选语言 | 仅公开已发布版本；返回资料，不安装或执行 |

所有 schema 均 `additionalProperties=false`。五项工具均声明只读、非破坏、幂等；这是工具元数据，不替代对服务实现的审计。[S02]

作用域：搜索与详情列出 `skill:read/prompt:read`；文件与安装资料为 `skill:read`；模板替换为 `prompt:read`。每项均并列 `noauth` 和 OAuth 方案。[S02]

### 3.3 一条完整的公开 Skill 读取链

本次以 `character-continuity-bible` 为检索词，`type=skill`，`limit=3`，实测返回唯一条目：

```text
id: skill/honghouzi/honghouzi--video/character-continuity-bible
version: 1.0.0
access: public
status: published
trust: untrusted_material
source.page: /skills/honghouzi/honghouzi--video/character-continuity-bible
```

搜索结果还含作者、namespace、slug、usageRights，外层有 `nextCursor`、`catalogRevision`、`omittedTypes`。本次 `nextCursor=null`、`omittedTypes=[]`。[S02]

随后以同一 `id` 和 `version` 分别调用 `get_material`、`read_skill_file(path=SKILL.md)`、`get_skill_install_info`，全部 HTTP 200 且返回实际材料；没有安装动作。[S02]

值得保留的设计：搜索只给摘要和稳定标识，详情再给文件目录，最后按需读文件，适合控制上下文体积。[研究建议]

## 4. Web Skill 数据模型与实现

### 4.1 目录 API

列表代码使用 `/api/skills`，固定 `publicPage=skills`、`sort=downloads`、`limit=24`、`includeMine=1`、`includeSections=1`，追加 `page/q/category`；返回 `items/pagination/mine/sections`。[S04]

匿名第一页本次实测 `total=183`、`pages=8`、`hasMore=true`。这是一个时点的公开目录查询总量，不是独立审计的全平台库存，不是实际活跃用户量。[S03]

| 层 | 实际字段举例 |
| --- | --- |
| 标识与作者 | `id/namespace/slug/owner_id/owner_display_name` |
| 检索与呈现 | `display_name/summary/summary_zh/summary_en/labels/group_slug/front_category` |
| 分发状态 | `visibility/status/version_id/version/version_status/published_at` |
| 文件元数据 | `file_count/total_size/manifest_json` |
| 社交指标 | `download_count/star_count/rating_avg/rating_count/subscription_count` |
| 调用指标 | `invocation_count/invocation_users/last_called_at` |
| 扫描信息 | `security_verdict/security_is_safe/security_max_severity/security_findings_count/security_scanned_at` |

上述计数是服务器返回值，没有独立核对其统计口径。下载计数不能用作 Skill 实际执行成功次数。[S03、S06–S09]

### 4.2 详情、版本与文件

详情 `/api/skills/{namespace}/{slug}?publicPage=skills` 返回 `item/versions/files/securityAudits/review/install/prompts`；样本 `review=null`。[S06–S08]

`files[]` 含 `file_path/file_size/content_type/sha256`；`versions[]` 有版本、状态、变更说明、大小、下载就绪和扫描结论。`manifest_json` 提供路径、大小和类型；`parsed_metadata_json` 包含解析后的 frontmatter 及正文。[S06–S08]

详情前端通过 `/file?path=…&publicPage=skills` 预览当前文件；页面代码没有给该 URL 添加版本参数。与之不同，MCP 文件读取要求显式 `version`。因此 FrameDock 若要复现历史执行，不能直接照搬 Web 当前文件 URL 语义。[S05、S02]

Markdown 使用 `marked.parse` 后经 `DOMPurify.sanitize`；其他文本经过 HTML 转义，图片/视频用对应元素预览。这是观察到的客户端处理方式，未做 XSS 渗透测试。[S05]

### 4.3 分类存在两个维度，且接口混用

前台 `front_category` 取值为 `text/image/video/research/engineering/automation/operations`；旧值 `prompt→text`、`delivery→operations`，缺失时通过关键词归类。[S04]

连续性样本的 MCP 搜索 `category=image`，同一版本的详情 `category=tools-utilities`。后者对应 Web 的 `group_slug`，说明单字段没有一致保持“前台方向”与“业务组”的语义。[S02、S07]

FrameDock 宜显式区分：创作媒介、制作阶段、专业任务、使用模型、输入类型、交付物。不要把这些都挤进一个 category，也不要用摘要关键词作为最终分类权威。[研究建议]

## 5. 三个正文样本的知识组织

### 5.1 emotion-prompt：单文件参数知识库

- 版本 `20260823.062103`，1文件，23279字节；frontmatter 有 name/description，未写 version，服务元数据补入日期式版本。[S06]
- 方法组织为情绪、面部可见变化、姿态三个表达层，并将细微动作与可见结果关联；正文覆盖20类情绪、阶段转换和呼吸控制。[S06]
- 可借鉴：把抽象意图翻译为可观察的视觉动作，再让输出组合这些结构；这比一个长通用提示词更可检验。[研究建议]
- 边界：本文没有验证其中解剖描述准确性，也没有用模型验证各项表情控制效果。[研究边界]

### 5.2 character-continuity-bible：核心方法加按需参考

- 版本1.0.0，4文件：主 SKILL、Agent 元数据、角色战斗身份参考、连续性模板。[S07]
- 任务包括跨镜头的身份、服装、道具、空间与动作规律保持；正文区分稳定约束和允许变化，并有输出结构与护栏。[S07]
- 文本引用5个其他 Skill 名称，包括持久实体管理、探索变量管理、提示词打包、动作参考和制作记录；它们是自然语言引用，当前文件清单没有机器可解析依赖清单。[S07]
- 存在面向特定人的 `Liu Default` 及特定身体比例偏好。说明“可公开分发的 Skill”也可能混有作者的项目个性化约定。[S07]
- 可借鉴：核心流程、按需参考、输出合同、跨 Skill 交接；需要改进的是把用户偏好、项目状态、通用知识拆开，明确依赖与可选依赖。[研究建议]

### 5.3 mokeaigc-v9：多模式创作导演

- slug 保持 `mokeaigc-v9`，展示名已是 `MOKEAIGC V017`，当前版本1.0.1。稳定机器标识、营销名和包版本不是一回事。[S08]
- 当前1文件、40254字节；历史1.0.0是15文件、41122字节，两版都在 versions 中；两版 changelog 均为空。[S08]
- 内部分为世界展开、生物设计、同一场景构图探索三个模式，并按交付物区分规则适用范围；默认交付世界设定和双语静帧提示词。[S08]
- 技能声明图像提示词边界，并把视频运动与独立角色身份任务排除；用户指定范围可覆盖默认输出。[S08]
- 可借鉴：触发条件、模式路由、明确不适用任务、分交付物应用规则；版本变更应填写迁移说明，否则文件结构变化难以评估。[研究建议]

## 6. 版本固定、完整性与安装

MCP 安装信息的实际结构：

```text
downloadUrl: https://www.mokeaigc.ai/api/cli/v1/skills/honghouzi--video/character-continuity-bible/versions/1.0.0/download
integrity.algorithm: sha256
integrity.scope: files
integrity.files: [{path, size, sha256}, ...]
integrity.manifestSha256: 有值
integrity.archiveSha256: null
automaticallyExecuted: false
```

三个样本的当前 `SKILL.md` 均匿名 GET 200，下载文本的 SHA-256 与详情 `files[]` 中声明值一致；连续性 Skill 的 MCP SHA 与 Web 一致。只验证了这3个文本文件，未验证其他文件、ZIP、签名或上游作者身份。[S06–S08、S02]

这证明本次文本传输匹配服务声明；不能由此推出代码安全、授权完备或来源未被篡改。[研究结论]

Web 返回的安装命令通过 `npx @astron-team/skillhub@latest`，按 namespace/slug 安装；支持 Codex、Claude Code、OpenCode、OpenClaw、Cursor、Gemini 等客户端分支。另有 ClawHub 命令。[S06–S08]

注意两个实际差别：Web 安装 registry 是 `https://www.mokeaigc.com`，前台与 MCP 是 `.ai`；Web 命令未固定 Skill 版本，并使用 CLI 的 `@latest`。这不证明安装错误，但意味着不能据页面命令声称可复现安装。[S06–S08]

FrameDock 宜保留 `source_id + version + file hashes + installed_at`，把“添加到库”“读取”“安装”“执行”分成不同状态；本阶段先保存来源与版本引用即可，不必立即开发完整包管理器。[研究建议]

## 7. 公开、发布、扫描、许可是四个不同事实

三个正文样本的扫描结论是 `SAFE`，同时都有 `MANIFEST_MISSING_LICENSE`、INFO 发现；样本 frontmatter 和文件目录未见许可证。服务条款要求按各 Skill 所载许可证使用，不能由“可下载”推定允许复制进产品或重新分发。[S06–S08、S10]

下载排序首个样本 `director-seedance-prompt` 在列表中公开且 PUBLISHED，但扫描返回 `BLOCKED/CRITICAL`。发现项为 `BEHAVIOR_EVAL_SUBPROCESS`，定位到 `scripts/seal_review_packet.py`，另有缺少许可证的 INFO 项。[S03、S09]

这里只能说扫描器报告了这些发现；本研究未审阅该脚本、未执行它，也未独立确认漏洞或恶意行为。公开列表出现它不等于安装请求一定获准，本次未验证下载执行边界。[S09、研究边界]

对 FrameDock 的具体启示：

1. 来源字段、许可证字段、审查状态、扫描结果和人工验证结果分列。
2. 未知许可的第三方材料先作为链接和研究参考，不预设产品内置与再分发权限。
3. 允许展示原始扫描报告与版本时间，避免用一个绿色徽章表达所有可信维度。
4. 不把远程 Skill 正文当成产品系统指令；只有用户选择使用且确认任务范围后才进入执行上下文。

以上是资料治理建议，不是法律结论；本次未取得额外作者授权。[研究建议与边界]

## 8. 教程、视觉参考与 Skill 的关联程度

主页和 MCP 页给出课程、流程规范、电影剧照、模板、Skill 的互补使用路径：参考帮助视觉判断，流程帮助理解生产步骤，Skill 帮助组织任务，模板承载可复制文本。[S01、S12]

但本次没有发现可证明“某课→某 Skill→某模板”关系的公开机器接口。匿名请求 `tutorial.html` 和 `videos.html` 均回到首页，因此不能凭首页卡片宣称已审阅完整课程内容。[本次 HTTP 观察]

`character-continuity-bible` 的正文存在 Skill 间自然语言引用，这是已确认的内容连接；它与课程库、视觉库是否有统一关系图，尚未证实。[S07]

FrameDock 可把未来关系设计成有类型的链接：`teaches / uses_template / requires / produces / references / supersedes`。先手工维护少量高质量关系，再考虑自动推荐，不宜从栏目并存直接推断已有成熟知识图谱。[研究建议]

## 9. 建议用于后续验收的最小清单

- 能按任务找到材料，并明确它是模板、方法、参考还是完整工作流。
- 同一 id 在搜索与详情中的分类语义一致；分类变更有迁移规则。
- 引用具体版本；库更新不悄悄改变已有画布节点输入。
- 模板渲染是可复现替换；模型改写另存结果及来源，二者可区分。
- 文件按需读取，限制大小；知识正文与项目私有偏好分离。
- 可看来源、许可、适用范围、输入、输出、依赖和版本差异。
- 安装与执行状态明确；导入第三方材料不自动执行脚本。
- 重要输出有正例、反例、验收标准，而非仅靠下载量排序。

本附录所有“建议”均为针对 FrameDock 的设计推导；尚未写入权威设计或实现业务功能。
