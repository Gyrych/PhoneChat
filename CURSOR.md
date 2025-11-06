# CURSOR.md

## 项目主体内容（FreeChat）

### 项目概述

FreeChat 是一个轻量级的本地 Web 聊天应用，提供简单的聊天 UI，允许用户通过配置的外部聊天 API 发送消息，并在浏览器端本地管理会话与 API Key。该项目以纯静态前端实现（HTML/CSS/JavaScript），适合作为本地演示或快速原型。

### 统一的默认 API 配置（已在文档中说明）

- 默认演示/回退端点（可替换）：`https://openrouter.ai/api/v1/chat/completions`
- 默认演示/回退模型：`minimax/minimax-m2:free`

> 说明：文档中声明的默认端点与模型仅用于演示与回退。生产环境强烈建议使用后端代理服务并使用您自己的 API Key 管理策略，不要将敏感 Key 以明文形式保存在前端。

### 技术栈与运行环境

- 技术栈：纯静态前端（HTML、CSS、JavaScript）。
- 运行环境：现代浏览器（支持 fetch、localStorage、ES6+）。

### 主要文件说明

- `index.html`：主页面，包含聊天界面、消息渲染、发送逻辑与消息持久化；内置加密的 OpenRouter API Key（仅演示用途）。
- `config.html`：设置页面，仅提供“模型选择并保存到 localStorage（键名 `chatModel`）”，当前不提供 API Key 输入项。
- `conversations.html`：会话管理页面，支持保存/加载/删除会话、分组管理、查看/重新生成会话摘要与分组记忆。
 - `conversations.html`：会话管理页面，支持保存/加载/删除会话、分组管理、查看/重新生成会话摘要与分组记忆；新建会话时弹窗询问是否加入已有分组并提供下拉选择。
- `prompts.js`：提示词模板，集中管理“会话摘要（SESSION_SUMMARY）/分组记忆（GROUP_SUMMARY）”等提示词常量。
- `style.css`：应用样式与响应式布局。
- `script.js`：可选的共用脚本（导航、localStorage JSON 助手等）；当前页面未默认引入。
- `tools/encrypt_key.js`：API 密钥加密工具（占位，当前无实现）。

### 核心数据流

1. 用户在 `index.html` 输入消息并发送。
2. 新消息被追加到当前会话数组并保存到 `localStorage`（键名：`deepseekConversation`）。若尚无 `deepseekConversationId`，则自动创建持久会话条目写入 `savedDeepseekConversations`，并记录该 ID（无须手动保存）。
3. 在发送请求前，若存在记忆则自动注入为一条 system 消息（新版注入策略）：
   - 分组记忆：默认注入“全部分组”的 `conversationGroups[].memorySummary`（可通过 `freechat.memory.inject.allGroups` 切换为仅当前分组）；
   - 会话摘要：注入“当前分组内所有会话”的 `savedDeepseekConversations[].summary`（按更新时间裁剪，阈值可配）；
   注入顺序为“分组记忆（全部/当前） → 当前分组会话摘要（多条） → 历史消息”，且不污染可见的 `currentConversation`。
4. 应用构造请求体并通过 `fetch` 向配置的 API 端点发送请求，使用 `Authorization: Bearer <apiKey>` 头。`apiKey` 优先使用内置加密的演示 Key（`OPENROUTER_API_KEY`），回退到 `localStorage.deepseekApiKey`（若存在）。
5. 每个持久会话条目会记录 `model` 字段（来源于 `localStorage.chatModel`/`window.MODEL_NAME`），在 `conversations.html` 加载会话时若存在该字段，会自动恢复到 `chatModel`，确保历史会话按其当时模型继续。
5. 收到 AI 响应后将回复流式追加与渲染，并实时保存会话；同时以 1.5s 节流策略将内容回写到持久会话条目（避免高频写入）。
6. 每轮流式结束后自动触发会话摘要：当消息条数超过上次已摘要计数或此前未有摘要时调用模型生成摘要，保存到 `savedDeepseekConversations[].summary` 并更新 `lastSummarizedMessageCount`；若会话属于某分组，则随后自动聚合并刷新该分组的 `memorySummary`。

### 关键功能说明（已实现/部分实现）

- 会话分组：支持将会话归类到分组（文件夹），支持重命名与在分组之间移动会话。
- 新建会话分组选择与命名：在会话管理页点击“新建会话”后，弹窗询问是否加入已有分组（下拉菜单）并允许为会话命名；结果分别写入 `deepseekConversationGroupId` 与 `deepseekNewConversationName`，主页面首次创建持久会话时读取并清理。
- 会话自动无感存储：首次发送消息自动创建持久会话条目；其后对会话的更改以节流（约 1.5s）写回，避免重复与遗忘。
- 会话自动摘要：每轮生成结束后自动判定是否需要摘要（去重），将结果保存到会话元数据。
- 分组记忆与摘要注入：请求前自动注入“分组记忆（默认全部分组）+ 当前分组全部会话摘要”（一条 system 消息，可配置与截断）。
- Markdown 渲染：AI 回复通过 `marked` 渲染为 HTML，并使用 `DOMPurify` 进行消毒以降低 XSS 风险。
 - 会话模型持久化与恢复：保存会话时写入 `model` 字段；加载会话时自动恢复该模型；会话列表在名称旁显示模型徽标。
- 主聊天页模型徽标：在 `index.html` 顶部显示当前会话所用模型（读取 `localStorage.chatModel` 或已加载会话的 `model`）。
- 思考过程显示：当使用具备“思考”能力的模型且 API 返回推理内容时，以“流式”显示并置于助手正文之前；默认展开，用户可点击按钮收起/展开。
  - 实现细节：推理内容在流式过程中同时写入当前助手消息对象的 `reasoning` 字段；`renderMessages` 会依据该字段在正文前渲染推理块，避免页面重渲染后丢失。

### 日志架构与数据流（新增）

- 目的：将与大模型交互的原始请求/响应（遮蔽 Authorization）记录到本地，用于问题排查。
- 方案：新增 `logger.js`，以环形缓冲（默认 1000 条）写入 `localStorage.freechat.logs`；支持导出（JSON/NDJSON）与清空。
- 接入点：
  - `index.html`：
    - 聊天主请求（`sendMessage` / `fetchDeepSeekResponseStream`）→ `chat_request` / `chat_stream` / `chat_done` / `error`
    - 自动会话摘要（`autoSummarizeIfNeeded`）→ `summary_request` / `summary_done`
    - 分组记忆聚合（`updateGroupMemory`）→ `groupmem_request` / `groupmem_done`
  - `conversations.html`：保存会话生成摘要、重新生成摘要、分组记忆聚合同步记录。
- 事件字段（要点）：`id`、`ts`、`type`、`endpoint`、`model`、`conversationId`、`groupId`、`req.headersMasked`、`req.body`、`res.status`、`res.streamChunks`（可能截断）、`res.final`、`error.message`、`durationMs`。
- UI：`index.html` 与 `conversations.html` 右上角新增“导出日志”“清空日志”按钮。
- 配置：`localStorage.freechat.log.maxEntries`（默认 1000）、`localStorage.freechat.log.enable`（默认 true）。

### 已知限制与建议

- API Key 存储：当前默认实现将 Key 以明文或轻度混淆的形式保存在 `localStorage`，不适合生产环境。建议使用后端代理并在服务器端安全存储 Key。
- 错误与重试：当前错误提示较为基础，建议增强网络错误、API 限流及重试策略的处理。
- CORS 与端点：客户端直接调用外部 API 可能遇到 CORS 限制，部署时请确认目标 API 的 CORS 配置或通过后端代理绕过。
 - 停止按钮：当前为 UI 级别效果，未中止网络请求；建议后续引入 AbortController 以支持真正中止。

### 依赖说明

- `marked`：Markdown 渲染（通过 CDN 注入）。
- `DOMPurify`：Markdown 渲染结果的安全消毒（通过 CDN 注入）。
- `CryptoJS`：对内置演示 OpenRouter Key 进行 AES 解密（通过 CDN 注入）。
- `Font Awesome`：图标库（通过 CDN 注入）。

---
## 变更记录
- 2025-11-06（记忆注入策略升级：全部分组记忆 + 当前分组全部会话摘要）
 - 目的：契合用户“在同一分组内会话时注入全局分组记忆与同组全部会话摘要”的设计意图。
 - 修改项：
   1. index：新增 `buildMemorySystemPrompt()` 并在请求前注入；支持可选首轮预摘要（`freechat.memory.preSummarize`）与可配置阈值/开关（分组范围、会话条数、字符截断）。
   2. 文档：更新 README（中/英）与 CURSOR.md 主体说明与变更记录，新增 localStorage 配置项说明。
 - 2025-11-06（新增本地请求/响应日志与导出/清空 UI）
  - 目的：保留与大模型交互的原始信息，便于排障与对齐。
  - 修改项：
    1. 新增 `logger.js`（环形缓冲、本地存储、导出/清空、遮蔽 Authorization）。
    2. `index.html` 与 `conversations.html` 接入日志：聊天主请求（含流式）、自动摘要、分组记忆、保存/重新摘要等。
    3. 两页面 header 新增“导出日志/清空日志”按钮。
    4. 更新 `README.md`/`README_zh.md` 增加“请求/响应日志”章节与结构图。
 - 2025-11-06（思考过程显示默认展开并置于正文前，流式）
  - 目的：提升可读性，先给出推理再给出答案，且允许用户手动折叠。
  - 修改项：
    1. index：在 `updateLastAssistantMessage` 中将思考块插入到助手正文之前；默认展开；保留用户折叠状态 `window._reasoningCollapsed`；在 `sendMessage` 开始时重置为展开；
    2. index：流式增量到达时同步刷新思考块内容，并将增量写入 `aiMsgObj.reasoning`；
    3. index：`renderMessages` 在助手消息渲染时优先渲染推理块（若存在）再渲染正文，解决完成后重新渲染导致推理块消失的问题；
    3. 文档：更新 README（中/英）与 CURSOR.md 主体说明。
 - 2025-11-05（头部品牌布局优化：标题与模型徽标上下排列）
  - 目的：提升当前模型可见性与层次感，使其与标题形成自然的纵向信息块。
  - 修改项：
    1. index：将 `FreeChat` 标题与 `#currentModelBadge` 包装入 `.brand` 容器；
    2. style：新增 `.header .brand` 样式为纵向排列并居中；
    3. 功能无变化，仅 UI 排版调整。
 - 2025-11-05（聊天页模型徽标与思考过程折叠查看）
  - 目的：在主聊天页明确显示当前模型；在使用思考类模型时提供推理过程查看能力且默认不打扰阅读。
  - 修改项：
    1. index：在 header 新增 `#currentModelBadge.model-badge` 并在初始化/加载时更新显示；
    2. index：在流式解析中捕获 `reasoning_content`（含常见变体）并累积；在最后一条助手消息下渲染“查看思考过程”可折叠面板；
    3. style：新增 `.reasoning-block`、`.reasoning-toggle`、`.reasoning-content` 样式；
    4. 文档：更新 README（中/英）与 CURSOR.md 主体说明与本变更记录。
 - 2025-11-05（新建会话分组选择弹窗）
  - 目的：新建会话时引导用户将会话加入已有分组，提升组织性与后续记忆注入的准确性。
  - 修改项：
    1. conversations：新增分组选择与命名模态（下拉菜单+名称输入，确认/跳过/取消）；改造“新建会话”流程为弹窗→根据选择写入/清理 `deepseekConversationGroupId` 与 `deepseekNewConversationName` 并重置临时会话后跳转；
    2. style：新增 `.modal-overlay`、`.modal`、`.modal-actions` 等样式；
    3. 文档：更新 README（中/英）与 CURSOR.md 主体说明与本变更记录；
    4. index：首次自动创建持久会话时优先使用 `deepseekNewConversationName` 作为名称并清理该键。
 - 2025-11-05（会话模型持久化/恢复与UI徽标）
  - 目的：保证历史会话按其创建/使用时的模型继续，避免模型切换导致风格与能力不一致；提升可见性。
  - 修改项：
    1. index：首次创建及节流写回时同步保存 `model` 字段；
    2. conversations：保存会话写入 `model`，加载会话时若存在则恢复 `chatModel`；在列表中显示模型徽标；
    3. 样式：新增 `.model-badge`；
    4. 文档：同步 CURSOR.md 与 README（中/英）。
- 2025-11-05（自动无感存储/摘要与记忆注入改造）
  - 目的：避免手动保存遗漏与重复保存；确保记忆进入推理上下文。
  - 修改项：
    1. index：首条用户消息自动创建 `savedDeepseekConversations` 条目；节流回写；流结束触发自动摘要；同组时注入“会话摘要”，并全局注入“分组记忆”。
    2. index：新增本页 `updateGroupMemory`，并在自动摘要成功后刷新分组记忆。
    3. conversations：统一 API Key 优先级（内置 OPENROUTER → 本地存储）；统一模型与端点；重新摘要/分组记忆均使用 `MODEL_NAME`。
    4. 文档：同步 CURSOR.md 与 README（中/英）以反映上述机制。
- 2025-11-05（文档与代码一致性修复：默认端点、文件说明、依赖与数据流）
  - 目的：使文档与当前实现完全一致，减少读者误解。
  - 修改项：
    1. 将主文档中的默认端点统一为 `https://openrouter.ai/api/v1/chat/completions`（与代码一致）。
    2. 更新“主要文件说明”：明确 `config.html` 仅提供模型选择；补充 `prompts.js` 与 `tools/encrypt_key.js`；标注 `script.js` 为可选且当前未默认引入。
    3. 更新“核心数据流”：明确演示 Key 的来源与 `deepseekApiKey` 的可替代读取方式，并指出设置页不提供 Key 输入。
    4. 新增“依赖说明”：补充 `CryptoJS` 与 `Font Awesome`。


- 2025-11-05（文档与代码一致性审查）：
  - 目的：修复项目中的不一致问题，确保文档与代码的统一性
  - 修复内容：
    1. 修复了conversations.html中的标题不一致问题：
       - 将页面标题从"会话管理 - DeepSeek 对话"更正为"会话管理 - FreeChat"
       - 将页面标题从"DeepSeek 对话管理"更正为"FreeChat 会话管理"
    2. 更新了README.md和README_zh.md中的API端点描述：
       - 将API端点从"https://api.openrouter.ai/v1/chat/completions"更正为"https://openrouter.ai/api/v1/chat/completions"
       - 确保文档中的端点描述与实际代码中的端点保持一致
    3. 完善了README.md和README_zh.md中的功能说明：
       - 添加了config.html页面的模型选择功能说明，描述如何使用设置页面选择不同的AI模型
       - 添加了停止生成按钮的功能说明，解释如何在AI响应生成过程中提前终止响应
       - 重新组织了使用说明部分，使其更加清晰和结构化

- 2025-11-05（代码注释添加）：
  - 目的：为所有代码文件添加文档头部注释和函数头部注释，提高代码可读性和可维护性。
  - 修改项：
    1. 为 `index.html` 添加文件头部注释和15个函数的头部注释（解密API密钥、初始化应用、加载会话、保存会话、渲染消息、发送消息、流式获取响应等）；
    2. 为 `config.html` 添加文件头部注释；
    3. 为 `conversations.html` 添加文件头部注释和5个函数的头部注释（保存会话、渲染会话列表、更新分组记忆、加载会话、删除会话）；
    4. 为 `script.js` 添加文件头部注释和2个函数的头部注释（安全读取JSON、安全写入JSON）；
    5. 为 `prompts.js` 添加文件头部注释；
    6. 为 `tools/encrypt_key.js` 添加文件头部注释（当前为空文件）。
  - 注释格式：
    - 使用简洁中文注释风格，不使用 JSDoc 标签（如 @param、@returns）；
    - 文件头部注释包含文件名和功能描述；
    - 函数头部注释包含功能描述、参数说明和返回值说明。

- 2025-11-04（代码修正）：修复会话自动存储与保存逻辑
  - 目的：修正可能导致请求体中重复用户消息、生成中内容丢失和并发发送导致的数据重复/丢失问题。
  - 修改点：
    1. 在 `index.html` 的 `fetchDeepSeekResponseStream` 中，不再重复追加当前用户消息到请求体（原实现会在请求中出现两次相同的用户消息）；
    2. 在 `updateLastAssistantMessage` 中，新增实时保存调用 `saveConversation()`，将流式生成的 assistant 内容写入 `localStorage`，以降低页面刷新或导航导致的数据丢失风险；
    3. 修复 `updateLastAssistantMessage` 中删除按钮的索引计算，避免依赖外部闭包变量导致的引用错误；
    4. 在 `sendMessage` 中发送期间禁用发送按钮，避免并发发送造成重复或竞态条件。
  - 风险与建议：
    - 目前已尽量保持前端纯静态实现，实时保存会多次写入 `localStorage`，在非常高频的流更新下可能有性能影响（通常可以接受）；
    - 若需更严格的并发控制或中断流的能力，建议后续引入 `AbortController` 中止请求并改进生成中止逻辑。

- 2025-11-04：文档同步与规范化（本次修改）：
  - 目的：统一项目文档中默认 API 端点与模型，清理重复信息，补充项目结构说明并在 README 中加入 Mermaid 可视化结构图以便阅读。
  - 修改项：
    - 在 `CURSOR.md`、`README.md` 与 `README_zh.md` 中统一默认端点为 `https://api.openrouter.ai/v1/chat/completions`，默认模型为 `minimax/minimax-m2:free`（仅作演示回退）。
    - 在 `README`（中/英）中增加项目结构 Mermaid 图、补充依赖说明（如 `marked`, `DOMPurify`）与安全建议。
    - 目的说明及后续建议已写入对应文档主体。
  - 2025-11-04 追加（文档最终化）：
    - 本次已完成 `CURSOR.md`、`README.md` 与 `README_zh.md` 的同步更新与格式化。
    - 变更范围：统一默认端点/模型说明，新增 Mermaid 项目结构图，并补充依赖与安全提示。
    - 建议：如需进一步将回退 Key 移出前端或添加后端示例，请回复确认，我将继续实现对应示例或文档调整。

- 2025-10-28：在 `index.html` 中加入 Markdown 渲染支持（`marked` + `DOMPurify`）。

- 2025-10-26：实现会话分组与分组记忆功能（分组 ID 支持、摘要生成、分组记忆聚合等）。

- 2025-10-23 初始版本：创建仓库并添加基础文档与源文件。

- 2025-11-06（文档一致性修复：API Key/停止按钮说明与键名修正）
  - 目的：使文档与实现完全对齐，澄清设置页不管理 API Key，停止按钮当前为 UI 级别。
  - 修改项：
    1. README.md：开头描述修正为“内置加密演示 Key 或通过 localStorage 配置；设置页仅配置模型”；基础聊天第 5 点改为“停止按钮为 UI-only，当前不中止网络请求”。
    2. README_zh.md：同步中文修正，与英文保持语义一致。
    3. CURSOR.md：将 `localStorage.deepeekApiKey` 更正为 `localStorage.deepseekApiKey`；在“已知限制与建议”新增“停止按钮为 UI 级别，建议引入 AbortController”。