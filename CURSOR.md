# CURSOR.md

## 项目主体内容（FreeChat）

### 一句概述

FreeChat 是一个纯静态、本地存储的聊天界面：新版 UI 采用统一 App Shell（桌面双栏 + 移动抽屉）、全局状态条与 toast、会话卡片 + 多选批量，以及四步式设置中心，仍支持与可配置的外部聊天 API 交互、会话/分组记忆与 Android（Capacitor）打包。仓库附带 AES 混淆的 OpenRouter demo Key，仅供本地演示。

### 技术栈与运行环境

- 纯静态前端：HTML / CSS / JavaScript（无构建依赖，所有第三方库通过 CDN 引入）。
- 主要库（通过 CDN）：`marked`（Markdown 渲染）、`DOMPurify`（XSS 消毒）、`CryptoJS`（演示 Key 解密）、`js-tiktoken`（精确 token 计数）、`Font Awesome`（图标）、`Inter`（字体）。
- Android 打包：Capacitor，`dist/` 作为 web 资源目录。

### 核心功能（实现要点）

- 聊天交互：通过配置的外部 API 端点发送请求（默认 `https://openrouter.ai/api/v1/chat/completions` + `minimax/minimax-m2:free`）。App Shell 包含顶部状态栏、精确 token 进度条（tiktoken）、语音/附件入口、toast/状态条，移动端仍可抽屉化。
- **复古打字机界面**：消息以"便签纸"样式展示，用户问题和 AI 回复配对显示在同一张米黄色便签卡片上，具备纸张纹理、3D 阴影、轻微旋转等复古效果。历史消息支持逐字符打字机动画（可通过 `localStorage.setItem('freechat.ui.typewriterAnimation', 'false')` 禁用），底部输入区采用金属质感打字机风格。每张便签支持收藏功能，收藏的便签可在侧边栏"收藏夹"中查看。
- 会话管理：分组信息存于 `conversationGroups`，主列表按分组渲染卡片；支持多选批量移动/删除/导出，卡片内含记忆折叠、模型/消息数元数据。新建会话时支持从下拉列表直接选择已有分组，也可以输入新分组名称创建分组：若已选择分组则不会再强制要求填写分组名称，仅在“既未选择分组、又未填写新分组名”的情况下弹出“请输入分组名称”提示。
- 设置中心：`config.html` 升级为四步 Stepper（模型 → 参数 → 联网 → System/隐私），并提供实时概览卡 + 隐私面板。
- 会话持久化：当前对话缓存在 `deepseekConversation`；持久列表写入 `savedDeepseekConversations`，首条发送自动建档，后续节流（~1.5s）写回。
- 记忆体系：
  - 会话记忆（session memory）与分组记忆（group memory）分别以 `summary` / `memorySummary` 字段保存。
  - 记忆生成不再直接阻塞主线程：摘要任务被封装为 `memoryJobs` 并写入 `localStorage`；内联 Blob Worker 异步拉取并执行队列任务，完成后主线程在核验 `lastSummarizedMessageCount` 后将 `summary` 写回对应会话并触发分组内聚合更新。
  - 注入策略：若启用 Web Search，则首位插入 Web 合成提示；随后按顺序注入分组记忆（逐条）→ 当前分组内会话记忆（逐条）→ 历史消息。对只支持单条 system 的提供商会自动合并多条 system（以 `---` 分隔）。
- Web Search（OpenRouter web plugin）：当启用时在请求体注入 `plugins: [{ id: 'web', ... }]` 与 `web_search_options`；返回的 `message.annotations[].url_citation` 会被解析并显示为“参考来源”折叠列表。
- 流式解析与思考显示：流式增量写入 assistant 占位消息；若响应包含 reasoning，按流式顺序将其渲染在正文之前，默认展开并允许折叠。
- 日志：`logger.js` 维护本地环形缓冲（`freechat.logs`），记录请求/响应事件（Authorization 被遮蔽）。导出支持 `current|all|byConversationId`。
- 性能与鲁棒性优化：批量写入（`batchedStorageSetJson`）、AbortController、Worker 化流式解析、Markdown/DOMPurify 延迟加载、重试/退避策略、消息虚拟化等。

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
- `freechat.favoriteStickies`：收藏的便签列表（包含问答内容、模型、时间戳等信息）。

### 典型数据流（简要）

1. 用户在输入框发送消息 → 添加至 `deepseekConversation` 并触发节流保存。
2. 构建请求体：按 `getCurrentModel()` 获取运行时模型、合并模型参数、插入（可选）`freechat.systemPrompt`、注入 Web Search system（若启用）与分组/会话记忆项 → 发起 `fetch`（含 Authorization）。
3. 流式接收并逐步合并到助手占位消息，实时保存。流结束后根据条件将摘要任务入队 `memoryJobs`。
4. Blob Worker 执行摘要任务并返回 `summary`，主线程进行版本校验后写回 `savedDeepseekConversations` 并触发 `updateGroupMemory()` 聚合分组记忆。

### Web Search 行为与输出规范

- 启用入口：输入区左侧内联开关 `#webInlineToggle`（状态存储 `freechat.web.enable`）；参数迁移至 `config.html`。
- 请求体注入：`plugins: [{ id: 'web', engine?, max_results?, search_prompt? }]`，以及 `web_search_options`（`search_context_size`）。
- 输出合成：当启用时首位注入 `PROMPTS.WEB_SYNTHESIS`（定义于 `prompts.js`），要求“先给结论再给引用”、时间使用 `Asia/Shanghai`、在数据/统计场景中给出关键数值 + 来源时间戳并说明口径，引用以域名为文本链接并与正文一一对应。

### UI 布局与交互要点

- `index.html`：App Bar + Drawer + Chat Body 由 `.app-shell` 统一布局；App Bar 在桌面保留设置按钮，移动端仅显示左侧菜单按钮与标题；输入区包含 `voiceBtn`、自动增高 textarea、token meter（基于字符长度估算），并把思考/联网开关放在可换行的工具列，`showStatus` 现与固定状态条/Toast 栈联动。侧边抽屉中的“新建会话”入口会弹出模态：用户可选择已有分组或输入新分组名，同时可选输入会话名与模型；当选择已有分组时不再强制校验“分组名称必填”，避免重复输入。
- `conversations.html`：主体采用 `.conversation-layout`（左侧分组面板、右侧卡片区）；多选通过 `selectedConversationIds` + `bulk*` 操作按钮实现；列表渲染新函数 `renderConversationsList`（旧逻辑保留为 `legacyRenderConversationsList` 仅供参考）。会话管理页自身的新建会话模态只依赖下拉分组选择和会话名称，不再要求额外输入分组名；左侧“创建分组”区域则始终用于显式新建分组，因此保留“分组名称必填”的简单校验。
- `config.html`：单页长表单样式的设置面板，集中展示模型选择、模型参数、联网搜索参数与全局 System 提示，并在下方通过 `updateLiveSummary()` 实时汇总当前保存的模型/参数/联网/System 与本地存储统计。
- `<960px` 响应式：App Bar 收敛为“菜单 + 标题”单行，隐藏上下文文案/多余按钮；输入区固定在底部并额外留出 `env(safe-area-inset-bottom)`，思考/联网/语音/附件按钮组成单独的横向工具条固定在输入框下沿；抽屉变成全屏滑入式 Sheet，顶部/底部留安全区；会话批量操作条/设置页面在窄屏下均改为单列表单，便于上下滚动查看。

### Android（Capacitor）打包要点

- 构建：`npm run build`（`node scripts/build.js`）生成/复制静态资源到 `dist/`；`npx cap copy` 同步到 `android/` 原生工程；在 Android Studio 中打开并运行或打包。
- Windows 一键：`scripts/build-apk.ps1` / `scripts/build-apk.cmd`（`npm run build:apk`），需 JDK17 与 Android SDK（`platform-tools`、`build-tools`、`platforms`）。

### 已知限制与建议

- 主聊天默认使用内置演示 Key（演示用途），生产应使用后端代理并在服务器上安全保存 Key。
- CORS：客户端直接调用第三方 API 可能会遇到跨域限制；建议在部署时使用后端代理。
- 高频写入与历史消息：大量历史或高频流更新可能造成 localStorage 写入压力，建议在生产中采用后端持久化或降低写回频率。

### 变更记录（简要）

- 2025-11-22：**新增便签收藏功能**
  - 每张便签卡片新增收藏按钮（星标图标），与复制、删除按钮并列显示。
  - 收藏的便签保存到 `localStorage` 的 `freechat.favoriteStickies` 键中。
  - 侧边栏新增"收藏夹"区域，支持折叠/展开，显示所有收藏的便签列表。
  - 点击收藏夹中的便签可单独查看完整内容（包括思考过程和引用来源）。
  - 收藏便签页面提供"返回会话"链接和取消收藏功能。
- 2025-11-22：**重大UI改版 - 复古打字机便签纸界面**
  - **Token 计数改进**：集成 `js-tiktoken` 库（CDN 异步加载），实现精确的 token 计数（支持中英文混合场景）；降级方案采用改进的估算算法（中文 1 字≈2 token，英文 4 字符≈1 token）。
  - **便签纸样式**：将消息展示改造为复古便签纸风格，用户问题和 AI 回复配对显示在同一张米黄色卡片上，具备纸张纹理、多层阴影、3D 效果、交替轻微旋转等视觉特性。
  - **打字机动画**：为历史消息添加逐字符打字机动画效果（speed: 30ms/字符），支持点击便签立即显示完整内容，可通过 localStorage 配置禁用（`freechat.ui.typewriterAnimation`）。
  - **打字机输入框**：底部输入区域采用金属质感打字机风格，深色渐变背景、金属边框、按钮光泽效果。
  - **动画与适配**：便签卡片具备从底部"打印出来"的滑入动画；移动端（<960px）自动取消旋转效果、单列布局，确保内容不被裁切；所有样式支持响应式适配。
- 2025-11-21：移除设置页 `config.html` 左侧的 Stepper 指示列，将其改为朴素的单页长表单，仅保留模型/参数/联网/System 提示等表单区与底部概览卡，使配置页面结构更直观简洁。
- 2025-11-21：移除主聊天页 App Bar 中的"查看隐私说明"按钮，仅保留设置入口，使顶部操作区更简洁；功能层面的本地存储/隐私策略保持不变。
- 2025-11-21：修正主聊天页新建会话模态的分组选择逻辑：当从下拉框选择已有分组时不再强制要求再次输入分组名称，仅在未选择任何分组且未输入新分组名称时才提示"请输入分组名称"；同步更新本文件与 README 文档的交互描述。
- 2025-11-21：精简移动端 UI（App Bar 仅显示菜单+标题、输入工具固化为底部横排、抽屉安全区适配）、新增按钮无障碍属性，并同步 README*/CURSOR 文档。
- 2025-11-20：重构三大页面 UI（App Shell、会话卡片 + 批量操作、四步式设置中心），新增 token meter/Toast 栈/批量导出等体验，并同步 `README*.md` 与本文件描述。
- 2025-11-18：重写 `CURSOR.md` / `README.md` / `README_zh.md`，确保文档与当前代码实现一致，记录记忆队列、注入顺序、localStorage 键与 Android 打包说明（文档对齐，不修改代码）。
- （历史记录请参见项目仓库中原有条目，变更记录区保留以便追溯）


