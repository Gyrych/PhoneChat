# CURSOR.md

## 项目主体内容（FreeChat）

### 一句概述

FreeChat 是一个以纯静态前端实现的本地 Web 聊天示例与原型，支持与可配置的外部聊天 API 交互、会话分组与本地记忆管理，提供 Android（Capacitor）打包支持。该仓库为演示用途包含一个内置加密的 OpenRouter demo Key；生产环境请勿在客户端存储密钥。

### 技术栈与运行环境

- 纯静态前端：HTML / CSS / JavaScript（无构建依赖，所有第三方库通过 CDN 引入）。
- 主要库（通过 CDN）：`marked`（Markdown 渲染）、`DOMPurify`（XSS 消毒）、`CryptoJS`（演示 Key 解密）、`Font Awesome`（图标）、`Inter`（字体）。
- Android 打包：Capacitor，`dist/` 作为 web 资源目录。

### 核心功能（实现要点）

- 聊天交互：通过配置的外部 API 端点发送请求（默认演示端点：`https://openrouter.ai/api/v1/chat/completions`，演示模型：`minimax/minimax-m2:free`）。请求使用 `Authorization: Bearer <apiKey>` 头部，主聊天默认使用内置演示 Key。
- 会话持久化：当前会话缓存在 `deepseekConversation`；持久会话列表保存为 `savedDeepseekConversations`。首次发送会自动创建持久会话；后续以节流（默认 ~1.5s）写回以减少写入频率。
- 会话分组：分组数据保存在 `conversationGroups`，支持分组创建/重命名/移动/删除。
- 记忆体系：
  - 会话记忆（session memory）与分组记忆（group memory）分别以 `summary` / `memorySummary` 字段保存。
  - 记忆生成不再直接阻塞主线程：摘要任务被封装为 `memoryJobs` 并写入 `localStorage`；内联 Blob Worker 异步拉取并执行队列任务，完成后主线程在核验 `lastSummarizedMessageCount` 后将 `summary` 写回对应会话并触发分组内聚合更新。
  - 注入策略：若启用 Web Search，则首位插入 Web 合成提示；随后按顺序注入分组记忆（逐条）→ 当前分组内会话记忆（逐条）→ 历史消息。对只支持单条 system 的提供商会自动合并多条 system（以 `---` 分隔）。
- Web Search（OpenRouter web plugin）：当启用时在请求体注入 `plugins: [{ id: 'web', ... }]` 与 `web_search_options`；返回的 `message.annotations[].url_citation` 会被解析并显示为“参考来源”折叠列表。
- 流式解析与思考显示：流式增量写入 assistant 占位消息；若响应包含 reasoning，按流式顺序将其渲染在正文之前，默认展开并允许折叠。
- 日志：`logger.js` 维护本地环形缓冲（`freechat.logs`），记录请求/响应事件（Authorization 被遮蔽）。导出支持 `current|all|byConversationId`。
- 性能与鲁棒性优化：批量写入（`batchedStorageSetJson`）、AbortController（停止生成时中止请求）、流式解析的 Worker 化、Markdown/DOMPurify 延迟加载、非流式请求的重试与退避策略、消息虚拟化（只渲染最新 N 条）等。

### 重要 localStorage 键（摘要）

- `deepseekConversation`：当前会话临时对象（页面交互使用）。
- `savedDeepseekConversations`：持久会话数组（每项包含 `id`、`messages`、`model`、`summary`、`modelParams` 等）。
- `conversationGroups`：会话分组集合（含 `memorySummary` 字段）。
- `memoryJobs`：会话摘要任务队列（Worker 异步消费）。
- `deepseekApiKey`：可选的备用 API Key（仅用于记忆/分组记忆调用的回退，主聊天默认不读取）。
- `localStorage.chatModel`：全局当前模型名（用户在 `config.html` 中选择并保存）。
- `freechat.modelParams` / `freechat.systemPrompt`：全局模型参数与系统提示（settings 页面可配置并复制到会话记录以便回放）。
- `freechat.web.*`：Web Search 参数（`engine`、`maxResults`、`contextSize`、`searchPrompt`）。
- `freechat.logs`：请求/响应日志环形缓冲。
- `freechat.memory.*`：记忆注入相关配置（如 `freechat.memory.inject.allGroups` 等）。

### 典型数据流（简要）

1. 用户在输入框发送消息 → 添加至 `deepseekConversation` 并触发节流保存。
2. 构建请求体：按 `getCurrentModel()` 获取运行时模型、合并模型参数、插入（可选）`freechat.systemPrompt`、注入 Web Search system（若启用）与分组/会话记忆项 → 发起 `fetch`（含 Authorization）。
3. 流式接收并逐步合并到助手占位消息，实时保存。流结束后根据条件将摘要任务入队 `memoryJobs`。
4. Blob Worker 执行摘要任务并返回 `summary`，主线程进行版本校验后写回 `savedDeepseekConversations` 并触发 `updateGroupMemory()` 聚合分组记忆。

### Web Search 行为与输出规范

- 启用入口：输入区左侧内联开关 `#webInlineToggle`（状态存储 `freechat.web.enable`）；参数迁移至 `config.html`。
- 请求体注入：`plugins: [{ id: 'web', engine?, max_results?, search_prompt? }]`，以及 `web_search_options`（`search_context_size`）。
- 输出合成：当启用时首位注入 `PROMPTS.WEB_SYNTHESIS`（定义于 `prompts.js`），要求“先给结论再给引用”、时间使用 `Asia/Shanghai`、在数据/统计场景中给出关键数值 + 来源时间戳并说明口径，引用以域名为文本链接并与正文一一对应。

### Android（Capacitor）打包要点

- 构建：`npm run build`（`node scripts/build.js`）生成/复制静态资源到 `dist/`；`npx cap copy` 同步到 `android/` 原生工程；在 Android Studio 中打开并运行或打包。
- Windows 一键：`scripts/build-apk.ps1` / `scripts/build-apk.cmd`（`npm run build:apk`），需 JDK17 与 Android SDK（`platform-tools`、`build-tools`、`platforms`）。

### 已知限制与建议

- 主聊天默认使用内置演示 Key（演示用途），生产应使用后端代理并在服务器上安全保存 Key。
- CORS：客户端直接调用第三方 API 可能会遇到跨域限制；建议在部署时使用后端代理。
- 高频写入与历史消息：大量历史或高频流更新可能造成 localStorage 写入压力，建议在生产中采用后端持久化或降低写回频率。

### 变更记录（简要）

- 2025-11-18：重写 `CURSOR.md` / `README.md` / `README_zh.md`，确保文档与当前代码实现一致，记录记忆队列、注入顺序、localStorage 键与 Android 打包说明（文档对齐，不修改代码）。
- （历史记录请参见项目仓库中原有条目，变更记录区保留以便追溯）


