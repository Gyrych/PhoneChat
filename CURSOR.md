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
- `prompts.js`：提示词模板，集中管理“会话摘要（SESSION_SUMMARY）/分组记忆（GROUP_SUMMARY）”等提示词常量。
- `style.css`：应用样式与响应式布局。
- `script.js`：可选的共用脚本（导航、localStorage JSON 助手等）；当前页面未默认引入。
- `tools/encrypt_key.js`：API 密钥加密工具（占位，当前无实现）。

### 核心数据流

1. 用户在 `index.html` 输入消息并发送。
2. 新消息被追加到当前会话数组并保存到 `localStorage`（键名示例：`deepseekConversation`）。
3. 应用构造请求体并通过 `fetch` 向配置的 API 端点发送请求，使用 `Authorization: Bearer <apiKey>` 头。当前实现的 `apiKey` 来源为内置加密的演示 Key（`OPENROUTER_API_KEY`）；会话摘要与分组记忆在 `conversations.html` 中也可读取 `localStorage` 的 `deepseekApiKey` 作为替代（若自行设置）。设置页目前不提供 Key 输入项。
4. 收到 AI 响应后将回复追加到会话并渲染，同时保存会话状态到本地存储。

### 关键功能说明（已实现/部分实现）

- 会话分组：支持将会话归类到分组（文件夹），支持重命名与在分组之间移动会话。
- 会话摘要：保存会话时可异步调用外部 API 生成会话摘要并保存到会话元数据中，用于快速检索与展示。
- 分组记忆：可将分组内会话的摘要聚合为分组级别的记忆摘要，并在发送请求时将该摘要注入为 system 提示词以增强上下文一致性。
- Markdown 渲染：AI 回复通过 `marked` 渲染为 HTML，并使用 `DOMPurify` 进行消毒以降低 XSS 风险。

### 已知限制与建议

- API Key 存储：当前默认实现将 Key 以明文或轻度混淆的形式保存在 `localStorage`，不适合生产环境。建议使用后端代理并在服务器端安全存储 Key。
- 错误与重试：当前错误提示较为基础，建议增强网络错误、API 限流及重试策略的处理。
- CORS 与端点：客户端直接调用外部 API 可能遇到 CORS 限制，部署时请确认目标 API 的 CORS 配置或通过后端代理绕过。

### 依赖说明

- `marked`：Markdown 渲染（通过 CDN 注入）。
- `DOMPurify`：Markdown 渲染结果的安全消毒（通过 CDN 注入）。
- `CryptoJS`：对内置演示 OpenRouter Key 进行 AES 解密（通过 CDN 注入）。
- `Font Awesome`：图标库（通过 CDN 注入）。

---
## 变更记录
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