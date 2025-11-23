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

- 2025-11-22：**会话管理页面按钮风格统一**
  - **会话卡片操作按钮**：统一为复古打字机风格，包括加载按钮（蓝色）、重命名按钮（米黄色）、移动按钮（橙色）、删除按钮（红色）、重新生成记忆按钮（绿色）。
  - **分组面板操作按钮**：统一分组重命名（米黄色）、分组删除（红色）、分组记忆重新生成（绿色）按钮风格。
  - **批量操作按钮**：统一批量移动、批量导出（蓝色）、批量删除（红色）按钮风格。
  - **查看记忆按钮**：便签纸风格，米黄色背景，Courier New 字体，棕色边框。
  - 所有按钮采用渐变背景、立体阴影、悬停动画效果，风格统一，功能区分明确。
- 2025-11-22：**会话管理页面结构优化与简化**
  - 重新组织左侧边栏：分为"分组管理"、"全部分组"、"快捷操作"、"数据安全说明"四个清晰区块。
  - 简化主内容区：移除批量操作工具栏，直接展示会话卡片列表，界面更简洁。
  - 改进空状态提示：添加大图标和"开始新会话"快捷按钮。
  - 统一按钮样式：主按钮（橙色）、成功按钮（绿色）、信息按钮（蓝色）、危险按钮（红色）。
  - 所有区块都带有图标标题，层次分明，功能清晰。
- 2025-11-22：**全局UI风格统一 - 复古打字机办公场景**
  - **顶部标题栏**：深色金属打字机面板风格，金属拉丝纹理，浅色文字带阴影，菜单按钮立体金属质感。
  - **会话抬头**：米黄便签纸风格，Georgia 衬线字体，Courier New 等宽字体，棕色系配色。
  - **侧边栏抽屉**：深色木质纹理背景，金属质感输入框，橙色主按钮，便签纸风格列表项。
  - **配置页面**：复古办公桌背景，便签纸风格卡片区域，棕色系配色。
  - **会话管理页面**：木质侧边栏，便签纸卡片，悬停动画效果。
  - **整体背景**：暖色调办公桌纹理，统一的复古氛围。
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

- 2025-11-23：**UI优化与会话管理页面重构**
  - **修复便签跳动与闪烁**：移除`.sticky-note-card`的滑入动画和交替旋转效果，简化hover效果，添加GPU加速（`transform: translateZ(0)`和`will-change: transform`），避免大模型输出时的屏幕抖动。
  - **统一背景为白色**：移除所有页面的纹理背景（包括主页面、配置页面、会话管理页面），将`.app-shell`、`.chat-body`、`.chat-header`、`.conversation-sidebar`、`.conversation-content`、`.group-panel`、`.drawer-item`、`.config-section`、body等元素的背景统一改为`#ffffff`纯白色，移除纸张纹理和木纹效果，保持简洁清爽的视觉风格。
  - **优化便签间距**：将`.sticky-note-card`的margin从`12px 0`减小为`6px 0`，`.message-container`的gap从`8px`减小为`4px`，使便签之间更紧凑，提升阅读连贯性。
  - **固定标题栏并移除滚动弹性**：为`html`和`body`添加`overscroll-behavior: none`禁用滚动弹性效果，为`.message-container`添加`overflow-y: auto`、`overflow-x: hidden`和`overscroll-behavior: contain`实现独立滚动容器，确保标题栏固定，滚动平滑无弹性。
  - **修复会话管理页面移动端适配**：将`.conversation-layout`的媒体查询断点从`900px`调整为`768px`，为`.conversation-sidebar`和`.conversation-content`添加`overflow-x: hidden`和`max-width: 100%`，确保在移动端无左右滚动，所有内容自适应屏幕宽度。
  - **重组会话管理页面布局**：将`conversations.html`从左右布局改为上下布局，分为两个明确区域：
    - **上部分组管理区域**：包含新建分组功能、分组列表展示，每个分组卡片显示分组名称、会话数量、记忆展示（可折叠）、重命名按钮、记忆重生成按钮，移除分组删除按钮。
    - **下部会话管理区域**：包含新建会话、保存当前会话、导出全部按钮，会话列表按分组归类并支持折叠，每个会话卡片显示会话名称、模型名称、时间戳、消息数量、记忆展示（可折叠）、加载按钮、重命名按钮、移动按钮、删除按钮、记忆重生成按钮。
    - 新增`.group-management-section`和`.conversation-management-section`样式类，统一按钮样式（`.section-btn-primary`、`.section-btn-success`、`.section-btn-info`），优化移动端响应式布局。
- 2025-11-23：**历史会话加载与UI细节优化**
  - **禁用历史会话打字机动画**：`renderMessages()` 函数新增 `skipTypewriterAnimation` 参数，在从会话管理页面加载历史会话时传入 `true`，避免历史消息重新播放打字机动画，提升用户体验。该参数同步传递给 `renderStickyNotePair()` 函数，仅在实时接收新消息时启用打字机动画。
  - **优化便签纸底部间距**：将 `.message-container` 的 `padding-bottom` 从 `clamp(140px, 28vh, 220px)` 减小为 `clamp(60px, 15vh, 100px)`，减少最后一张便签纸与输入框之间的过大空白距离，使页面布局更紧凑合理。
  - **简化会话管理页面按钮**：移除会话管理页面的"新建会话"、"保存当前会话"、"导出全部"按钮以及右上角的"新建"按钮，空状态下的"开始新会话"按钮改为直接跳转回主页面，避免功能重复，简化用户操作流程。
  - **统一会话操作按钮样式**：为会话卡片中的操作按钮添加复古风格图标按钮，与分组管理按钮UI风格一致：加载（蓝色、`fa-download`）、重命名（米黄色、`fa-edit`）、移动（橙色、`fa-folder-open`）、重新摘要（绿色、`fa-sync-alt`）、删除（红色、`fa-trash`），所有按钮采用 36×36px 圆角方形、渐变背景、立体阴影，悬停时上浮2px并加深阴影，提升视觉一致性和交互反馈。

- 2025-11-23：**用户体验优化（问题修复）**
  - **修复加载会话时的打字机动画问题**：加载历史会话时，所有历史消息不再播放打字机动画，而是直接显示完整内容。通过在`loadConversation()`函数中设置`window._justLoadedConversation`标志，并在`renderMessages()`和`renderStickyNotePair()`函数中检查此标志来跳过打字机动画。
  - **优化便签纸底部间距**：将`.message-container`的`padding-bottom`从`clamp(60px, 15vh, 100px)`调整为`clamp(20px, 3vh, 30px)`，减少最后一张便签纸与输入框之间的空白距离，使界面更紧凑。
  - **统一会话管理页面新建会话按钮逻辑**：会话管理页面的新建会话按钮现在与主页面侧边栏的新建会话按钮逻辑保持一致，直接打开分组选择模态框，不再显示确认对话框。修改了`newConversationBtn`和`startNewChatBtn`的事件处理，去掉了`showConfirmModal`步骤，直接调用`openNewChatGroupModal()`。
  - **简化会话管理页面按钮**：移除了会话管理页面右上角的"新建会话"按钮、"保存当前会话"按钮和"导出全部"按钮，只保留会话管理区域内的"新建会话"按钮，使界面更简洁明了。

- 2025-11-23：**完善会话管理页面新建会话功能**
  - **问题原因**：会话管理页面的`openNewChatGroupModal()`函数实现与主页面不一致，缺少完整的模态框HTML和相关逻辑，导致新建会话功能不完整。
  - **解决方案**：从主页面（index.html）完整复制新建会话模态框的HTML结构和所有相关JavaScript函数到会话管理页面（conversations.html），确保两个页面的新建会话功能完全一致。
  - **新增内容**：
    - 添加完整的新建会话模态框HTML，包含：已有分组下拉选择、新建分组名称输入框、会话名称输入框、模型选择下拉、确认和取消按钮
    - 添加`openNewChatGroupModal()`函数：显示模态框并填充分组和模型下拉列表
    - 添加`closeNewChatGroupModal()`函数：关闭模态框
    - 添加`populateNewChatModelSelect()`函数：从localStorage缓存读取模型列表并填充到下拉框
    - 添加`populateExistingGroupSelect()`函数：读取已有分组并填充到下拉框，根据用户选择显示/隐藏新建分组输入框
    - 添加模态框确认按钮事件：处理用户输入，创建或选择分组，创建新会话条目并保存到localStorage，最后跳转到主页面
  - **效果**：现在会话管理页面的"新建会话"按钮与主页面侧边栏的"新建会话"按钮功能完全一致，用户体验统一。

- 2025-11-23：**完善历史会话加载时的打字机动画禁用**
  - **问题**：在Markdown库加载完成后重新渲染历史消息时，没有传递`skipTypewriterAnimation`参数，导致历史消息可能会再次播放打字机动画。
  - **修复**：在`ensureMarkdownLibs().then()`回调中调用`renderMessages(true)`，确保Markdown库加载完成后重新渲染历史消息时也跳过打字机动画。
  - **效果**：现在所有加载历史会话的场景（页面初始化、从抽屉加载会话、新建会话）都完全禁用打字机动画，历史消息直接显示完整内容，提升用户体验。

- 2025-11-23：**修复流式输出时历史消息闪烁和重新加载问题**
  - **问题原因**：
    1. 在`sendMessage()`函数中多次调用`renderMessages()`，每次调用都会清空整个消息容器（`messageContainer.innerHTML = ''`）并重新渲染所有消息，导致历史消息闪烁或重新播放打字机动画
    2. `doUpdateLastAssistantMessage()`函数查找的是`.message.ai-message`元素，但在便签纸模式下AI回复在`.sticky-answer`中，找不到元素时会调用`renderMessages()`导致历史消息被清空
    3. 存在重复的`doUpdateLastAssistantMessage()`函数定义
    4. `renderStickyNotePair()`函数中的打字机动画判断逻辑不完善：只判断`!isLastMessage`导致在流式输出时重新渲染历史消息会应用打字机动画
  - **解决方案**：
    1. 优化`sendMessage()`函数中的渲染逻辑：合并两次`renderMessages()`调用为一次，在添加用户消息和空AI消息后只渲染一次；流式输出结束后注释掉`renderMessages()`调用，因为内容已通过`doUpdateLastAssistantMessage()`实时更新
    2. 修改`doUpdateLastAssistantMessage()`函数，优先查找便签纸模式的`.sticky-answer`元素，找不到时静默返回而不是调用`renderMessages()`
    3. 删除重复的`doUpdateLastAssistantMessage()`函数定义
    4. 修改`renderStickyNotePair()`函数中的打字机动画判断逻辑，增加`!isStreaming`条件（检查`window._sendingInProgress`标志），确保在流式输出过程中重新渲染时所有历史消息都不应用打字机动画
  - **效果**：流式输出过程中，历史消息保持可见且不会重新加载或重新播放打字机动画，只有最后一条AI消息实时更新，用户体验大幅提升。


