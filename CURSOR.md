# CURSOR.md

## 项目主体内容（FreeChat）

### 项目概述

FreeChat 是一个轻量级的本地 Web 聊天应用，提供简单的聊天 UI，允许用户通过配置的外部聊天 API 发送消息，并在浏览器端本地管理会话与 API Key。该项目以纯静态前端实现（HTML/CSS/JavaScript），适合作为本地演示或快速原型。

### 统一的默认 API 配置（已在文档中说明）

- 默认演示/回退端点（可替换）：`https://openrouter.ai/api/v1/chat/completions`
- 默认演示/回退模型：`minimax/minimax-m2:free`

> 说明：文档中声明的默认端点与模型仅用于演示与回退。生产环境强烈建议使用后端代理服务并使用您自己的 API Key 管理策略，不要将敏感 Key 以明文形式保存在前端。

## 变更记录（自动同步）
2025-11-09（更新：配置页模型列表已按用户要求替换为新的有序名单）
 - 目的：同步设置页下拉模型与项目文档，确保默认回退模型为 `minimax/minimax-m2:free` 且模型列表按字母序展示
 - 修改项：
   1. `config.html` / `dist/config.html`：替换 `#modelSelect` 下拉项为新名单（去重并按字母排序）
   2. `style.css`：添加 `#modelSelect` 样式以减小字号并禁止选项换行
   3. `README.md` / `README_zh.md`：在"模型配置"/"配置"处说明设置页包含已整理模型列表，保留默认演示模型为 `minimax/minimax-m2:free`

### 技术栈与运行环境

- 技术栈：纯静态前端（HTML、CSS、JavaScript）；移动端封装采用 Capacitor（Android）。
- 运行环境：现代浏览器（支持 fetch、localStorage、ES6+）；Android 7.0+（WebView）。

### 主要文件说明

- `index.html`：主页面，包含聊天界面、消息渲染、发送逻辑与消息持久化；内置加密的 OpenRouter API Key（仅演示用途）。
 - `index.html`：主页面，包含聊天界面、消息渲染、发送逻辑与消息持久化；在主聊天列顶部新增会话标题栏用于展示当前会话名称与分组；内置加密的 OpenRouter API Key（仅演示用途）。
- `config.html`：设置页面，提供"模型选择（写入 `localStorage.chatModel`）"与"联网搜索设置（写入 `freechat.web.*`）"；当前不提供 API Key 输入项。
- （已废弃）`conversations.html`：早期的高级会话管理页面；保存/加载/删除、分组管理、记忆查看/重新生成等能力已整合到 `index.html` 的覆盖式抽屉中（含"新分组名 + 创建分组"控件）。
 - `conversations.html`：会话管理页面，支持保存/加载/删除会话、分组管理、查看/重新生成会话记忆与分组记忆；新建会话时弹窗询问是否加入已有分组并提供下拉选择。
  - 说明：`conversations.html` 的视觉样式、文本与布局现已与主页面侧边栏（抽屉）保持一致，复用同一套样式与模态组件；此页面相较抽屉仅新增与会话管理相关的操作按钮（会话删除 / 会话重命名 / 会话移动分组 / 分组删除 / 分组重命名），并复用统一模态（`.modal` / `.modal-overlay`）与脚本辅助函数（`showConfirmModal`、`showInputModal`）。
- `prompts.js`：提示词模板，集中管理"会话记忆（SESSION_SUMMARY）/分组记忆（GROUP_SUMMARY）"等提示词常量。
- `style.css`：应用样式与响应式布局。
- `script.js`：可选的共用脚本（导航、localStorage JSON 助手等）；当前页面未默认引入。
- `tools/encrypt_key.js`：API 密钥加密工具（占位，当前无实现）。

### 核心数据流

1. 用户在 `index.html` 输入消息并发送。
2. 新消息被追加到当前会话数组并保存到 `localStorage`（键名：`deepseekConversation`）。若尚无 `deepseekConversationId`，则自动创建持久会话条目写入 `savedDeepseekConversations`，并记录该 ID（无须手动保存）。
3. 在发送请求前，若存在记忆则自动注入为"多条 system 消息"（新版注入策略）：
   - 分组记忆：逐条注入 `conversationGroups[].memorySummary`（默认注入全部分组，可通过 `freechat.memory.inject.allGroups` 切换为仅当前分组）；
   - 会话记忆：逐条注入"当前分组内所有会话"的 `savedDeepseekConversations[].summary`（按更新时间倒序裁剪，阈值可配且去重）；
   注入顺序为"（若启用）Web 搜索输出规范 → 分组记忆（全部/当前，逐条） → 当前分组会话记忆（逐条） → 历史消息"，且不污染可见的 `currentConversation`。不支持多 system 的供应商将自动合并为单条并以 `---` 分隔。
4. 应用构造请求体并通过 `fetch` 向配置的 API 端点发送请求，使用 `Authorization: Bearer <apiKey>` 头。主聊天请求仅使用内置加密的演示 Key（`OPENROUTER_API_KEY`）；如需让主聊天使用自有 Key，请替换 `index.html` 中的加密串。会话记忆与分组记忆相关调用中，`apiKey` 为 `OPENROUTER_API_KEY` 优先，回退到 `localStorage.deepseekApiKey`（若存在）。
5. 每个持久会话条目会记录 `model` 字段（来源于 `localStorage.chatModel`/`window.MODEL_NAME`），在 `conversations.html` 加载会话时若存在该字段，会自动恢复到 `chatModel`，确保历史会话按其当时模型继续。
6. 收到 AI 响应后将回复流式追加与渲染，并实时保存会话；同时以 1.5s 节流策略将内容回写到持久会话条目（避免高频写入）。
6. 每轮流式结束后自动触发会话记忆：当消息条数超过上次已记忆计数或此前未有会话记忆时调用模型生成记忆，保存到 `savedDeepseekConversations[].summary` 并更新 `lastSummarizedMessageCount`；若会话属于某分组，则随后自动聚合并刷新该分组的 `memorySummary`。

7. 记忆生成的异步化与后台队列（新增）

- 为避免在生成记忆时阻塞主线程与影响交互，记忆生成流程已改为“入队异步执行”：
  - 在流结束或手动触发生成时，会将摘要任务封装为 `memoryJobs` 队列项写入 `localStorage`（键名：`memoryJobs`），立即返回并不阻塞当前请求/渲染流程。
  - 浏览器端通过内联 Blob Worker（`memoryWorker`）在后台拉取并执行 `memoryJobs`，Worker 完成后主线程负责将 `summary` 写回对应的 `savedDeepseekConversations` 条目，并在需要时触发 `updateGroupMemory()` 进行分组记忆刷新。
  - 每个 job 包含 `payload`（例如 `systemPrompt`、`userContent`、`modelToUse`、`msgCount`）以保证 Worker 在独立线程中也能完成请求。
  - 为避免竞态写回，主线程在将 Worker 返回结果写入 `savedDeepseekConversations` 前会核验 `lastSummarizedMessageCount`，仅在生成时 snapshot 的 `msgCount` 比当前记录更大时才写回，防止覆盖更新的摘要。
  - UI 顶部会话标题栏增加记忆状态徽章（`#memoryStatusBadge`），展示当前会话是否存在 pending/in-progress/done/failed 的记忆任务，用户可据此重试或忽略。
  - 相关实现文件：`index.html`（`enqueueMemoryJob`、`startMemoryWorkerIfNeeded`、`memoryJobs` 持久化、UI 徽章）、`conversations.html`（手动生成改为入队）。


### 记忆生成规则（更新，收紧降噪）

必须保留（满足其一才记）：
- 用户提供的事实/偏好/配置/账号/地点/时间/阈值/长期约束
- 明确的任务/请求（主题/风格/格式/目标/限制）
- 可复用上下文（固定风格、领域、常用地点/时间口径）

严禁包含：
- 问候/寒暄/道歉/感谢/自我介绍/能力列表/操作引导/通用建议
- 模型元信息（模型名、架构、记忆机制、隐私合规、提供商等）
- 复述系统提示或模板话术（如"我可以…/欢迎…"）

合并去重：
- 语义相近合并为更一般化表述；重复信息仅保留一次；仅确认而无新增信息的不记录。

低信号会话处理：
- 若本轮无"新增用户事实或明确请求"，视为低信号；输出中"用户意图/关键信息/模型要点/待办"均写"无"（仍保持结构，便于管道兼容）。

输出格式与限制：
- 会话记忆：用户意图（1 句）/关键信息（0–5）/模型要点（≤1，仅当对后续有指导价值，否则"无"）/待办（0–3）。
- 分组记忆：5–7 条按重要性排序，集中表达长期可复用的用户画像与稳定约束；待办 0–3 条。
- 长度限制：总字数 ≤ 200，每条 ≤ 40 字；不得出现"严禁包含"项。

### 联网搜索架构与数据流（更新）

- 目的：为任意模型按需接入实时 Web 检索，提升事实性与时效性；兼容 OpenRouter Web 插件的统一注解规范。
- UI：
  - 输入区左侧提供"联网搜索"内联胶囊开关（`#webInlineToggle`），用于启用/关闭；状态持久化键：`freechat.web.enable`。
  - 参数配置已迁移到设置页（`config.html`）的"联网搜索设置"，不再在主页面展示"地球"按钮与浮层面板。
  - 参数项与本地存储映射：
    - `freechat.web.engine`：`auto|native|exa`；
    - `freechat.web.maxResults`：1..10；
    - `freechat.web.contextSize`：`low|medium|high`；
    - `freechat.web.searchPrompt`：字符串。
- 请求构造：当启用时在请求体加入：
  - `plugins: [{ id: 'web', engine?, max_results?, search_prompt? }]`
  - `web_search_options: { search_context_size? }`
  - 引擎为 `auto` 时不显式写入（按"原生优先，回退 Exa"）。
- 结果综合系统提示：当启用 Web 插件时，会在请求最前插入一条系统消息（来源：`PROMPTS.WEB_SYNTHESIS`，集中定义于 `prompts.js`），要求模型"先给最终答案，后给引用"，并约束：
  - 中文结构化输出；所有时间/日期按 `Asia/Shanghai`；
  - 若涉及事实/数据/统计/价格/指标/赛事/政策/公告等：给出关键数值/单位与来源时间戳，必要时说明口径/区间/币种；
  - 引用列表使用域名作为 Markdown 链接文本；引用须与正文陈述一一对应；
  - 多来源不一致时做交叉核验并标注不确定性（如口径差异/时间滞后等），避免臆测；
  - 示例（按需适用）：天气问题包含地点、现象、温度(℃)/体感、风向风速、湿度/降水、数据时间戳。
- 响应解析：
  - 流式正文/思考维持现有解析；
  - 若片段中出现 `delta.annotations[].url_citation` 或尾包中出现 `message.annotations[].url_citation`，均累积到当前助手消息对象 `aiMsgObj.citations`；
  - 渲染时在助手消息下方以"参考来源"列表展示（使用域名作为链接文本）。
- 计费提示：
  - Exa（回退或强制）：按 OpenRouter 额度 $4/1000 结果（默认 5 条≈$0.02/次）+ 模型用量；
  - Native：供应商透传，随上下文强度变化。

### 关键功能说明（已实现/部分实现）

- 会话分组：支持将会话归类到分组（文件夹），支持重命名与在分组之间移动会话。
- 新建会话分组选择与命名：在会话管理页点击"新建会话"后，弹窗询问是否加入已有分组（下拉菜单）并允许为会话命名；结果分别写入 `deepseekConversationGroupId` 与 `deepseekNewConversationName`，主页面首次创建持久会话时读取并清理。
- 会话自动无感存储：首次发送消息自动创建持久会话条目；其后对会话的更改以节流（约 1.5s）写回，避免重复与遗忘。
- 会话自动记忆：每轮生成结束后自动判定是否需要生成会话记忆（去重），将结果保存到会话元数据。
- 分组记忆与会话记忆注入：请求前自动注入"分组记忆（默认全部分组，逐条）+ 当前分组全部会话记忆（逐条）"（多条 system 消息，可配置与截断；对不支持多 system 的供应商自动合并为单条）。
- 会话记忆模型选择策略：生成会话记忆（自动与手动）时，优先使用该会话记录的 `model`，其后回退到全局 `window.MODEL_NAME`，最后兜底 `'minimax/minimax-m2:free'`；分组记忆始终使用全局模型。
- Markdown 渲染：AI 回复通过 `marked` 渲染为 HTML，并使用 `DOMPurify` 进行消毒以降低 XSS 风险。
 - 会话模型持久化与恢复：保存会话时写入 `model` 字段；加载会话时自动恢复该模型；会话列表在名称旁显示模型徽标。
- 主聊天页模型徽标：在 `index.html` 顶部显示当前会话所用模型（读取 `localStorage.chatModel` 或已加载会话的 `model`）。
- 思考过程显示：当使用具备"思考"能力的模型且 API 返回推理内容时，以"流式"显示并置于助手正文之前；默认展开，用户可点击按钮收起/展开。
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
- UI：仅 `index.html` 右上角显示"导出日志"按钮；`conversations.html` 不再提供导出入口；"清空日志"按钮默认隐藏（可恢复）。
- 配置：`localStorage.freechat.log.maxEntries`（默认 1000）、`localStorage.freechat.log.enable`（默认 true）。
 - 导出范围：默认仅导出"当前会话"。亦支持导出全部（`scope: 'all'`）或按会话ID（`scope: 'byConversationId', conversationId`）。文件名包含范围后缀（如 `-current`）。

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
 - `Inter`：英数字体（通过 Google Fonts 注入，中文回退系统字体）。

### Android 打包与运行（Capacitor）

- 目标：将本项目以 APK/AAB 形式运行在安卓设备上，保持现有前端与流式体验。
- 方案：使用 Capacitor 将 `dist/` 中的静态资源作为 WebView 资产嵌入原生工程。
- 关键文件与目录：
  - `capacitor.config.json`：`appId`、`appName`、`webDir: "dist"`，并设置 `server.androidScheme: "https"`；
  - `android/`：原生工程目录（由 `npx cap add android` 生成）；
  - `scripts/build.js`：构建脚本，将仓库根部的静态资源复制到 `dist/`；
  - `dist/`：网页打包输出目录，作为 Capacitor web 资源来源；
  - `package.json`：包含 `"build": "node scripts/build.js"`。
- 基本流程：
  1. 安装依赖（已完成）：`npm install @capacitor/core -D @capacitor/cli @capacitor/android`；
  2. 初始化 Capacitor（已完成）：`npx cap init FreeChat com.example.freechat --web-dir dist`；
  3. 复制静态资源：`npm run build` → 产出 `dist/`；
  4. 同步资源到原生工程：`npx cap copy`；
  5. 打开工程并运行：在 Android Studio 打开 `android/`，连接真机或启动模拟器后 Run；
  6. 打包发布：Android Studio → Build → Generate Signed Bundle/APK。
- CORS 与流式：
  - 首选使用 WebView 中的 `fetch` 直接访问 OpenRouter，保留流式体验；
  - 若目标服务对 WebView/localhost CORS 收紧，可改造为原生 HTTP 插件（会失去 SSE 流式），或使用后端代理。

#### Windows 一键构建 APK
- 脚本：`scripts/build-apk.cmd`（双击运行），`scripts/build-apk.ps1`；NPM 命令：`npm run build:apk`
- 前置：安装 JDK17 与 Android SDK，并通过 `sdkmanager --licenses` 接受许可；安装 `platform-tools`、`build-tools;35.0.0`、`platforms;android-35`（或 34）。
- 输出：
  - 原始 APK：`android/app/build/outputs/apk/debug/app-debug.apk`
  - 复制副本：`dist/apk/FreeChat-debug.apk`

### 界面风格与设计令牌（新增）

- 主题基调：浅色、简洁科技感 + 磨砂玻璃质感（Glassmorphism）。
- 设计令牌（`style.css :root`）：
  - 颜色：`--bg`、`--fg`、`--muted`、`--brand`、`--brand-2`、`--surface`、`--surface-strong`、`--border`、`--shadow`
  - 圆角/模糊：`--radius`、`--blur`
  - 字体比例：`--fs-body`、`--fs-h1`、`--fs-h2`、`--lh`
  - 触控/图标层级（移动端收敛）：`--tap`（触控最小尺寸，默认 44px）、`--icon-lg`（头部/附件）、`--icon-md`（圆形主按钮内图标）、`--icon-sm`（消息操作图标）
- 字体：`Inter`（英数）+ 系统中文（如 `PingFang SC`、`Microsoft YaHei`、`Noto Sans CJK SC`）。
- 玻璃通用类：`.glass`（半透明白面 + `backdrop-filter: blur(...) saturate(...)` + 细边 + 统一阴影）。
- 降级策略：对不支持 `backdrop-filter` 的环境，使用 `@supports not (...)` 将玻璃背景替换为更实的 `--surface-strong`。
- 应用范围：
  - 头部 `.header`、输入区 `.input-container`、会话卡片 `.conversation-item`、AI 气泡 `.ai-message`、模态 `.modal` 等均采用玻璃风格；
  - 用户消息采用品牌渐变（`--brand` → `--brand-2`）；
  - 模型徽章 `.model-badge` 使用胶囊玻璃风；
- 顶部不再使用整条"横向容器"；仅保留左上角一个悬浮的"会话抽屉开关"按钮；品牌 Logo 与标题不在顶部显示；
  - 图标按钮统一半透明玻璃按钮，悬停轻微浮起与投影；
  - 响应式字号与行高通过 `clamp()` 与 `--lh` 控制；
  - `prefers-reduced-motion` 自动降低动画强度。
- 页眉极简化：移除"导出日志/清空日志/设置"按钮与模型徽章显示，保留左侧会话抽屉开关与品牌，贴近 DeepSeek 的极简顶部布局；设置入口与高级管理入口移至抽屉底部。

#### 消息气泡宽度策略（更新）
- 桌面/平板：`.message { max-width: min(860px, 88%) }`，在宽屏上限制最大片宽 860px，同时在中等宽度下放宽到容器的 88%，提升可读性。
- 手机（≤480px）：`.message { max-width: 94% }`，保留 3–6% 的边距，避免贴边与操作遮挡。
- 手机（≤600px）：在 `@media (max-width: 600px)` 下进一步通过减小消息左右内边距并微调字体与行高来增加每行可显示字符数（例如将左右内边距从 ~12–18px 缩小至 8px 左右），同时保留触控目标尺寸 `--tap` 不变以保证可点性。

#### 移动端尺寸与间距策略（适中风格）
- 基线：通过 `--tap` 保证主要可点元素的触控尺寸；通过 `--icon-lg/md/sm` 统一 Font Awesome 图标字号（不改 DOM）。
- 规则：
  - `@media (max-width: 600px)`：压缩 `.header` 内边距；`.settings-btn/.conversations-btn/.attach-btn` 统一为 `var(--tap)`；`.pill-toggle` 高度 40px、标签 0.95rem；`.action-btn` 28×28 并提高字号；`.message` 右内边距增至 56px 以避免操作按钮遮挡内容。
 - `@media (max-width: 600px)`：压缩 `.header` 内边距；`.settings-btn/.conversations-btn/.attach-btn` 统一为 `var(--tap)`；`.pill-toggle` 高度 40px、标签 0.95rem；`.action-btn` 28×28 并提高字号；在此断点下同时减小 `.message` 的左右内边距并微调 `font-size` 与 `line-height`，以在不缩减触控可点尺寸的前提下增加每行可见文字宽度。
  - `@media (max-width: 360px)`：将 `--tap` 压缩至 40px，同时下调 `--icon-lg/md`。
  - 与 `@media (max-width: 480px)` 共存：该断点主要控制消息列宽为 94% 与会话管理区按钮纵排，不冲突。
  - 文本标签隐藏：在手机端隐藏 `.pill-toggle .label`（仅显示图标），节省横向空间。
  - 输入区布局：在手机端将 `.input-container` 切换为三列网格：左列为两个胶囊开关上下排列，中列为输入框跨两行，右列为"附件（上）/发送或停止（下）"上下排列；不改 DOM，仅用 CSS 位置编排。

#### 安全区适配（刘海/打孔屏）
- 在 `index.html` 的 `<meta name="viewport">` 中加入 `viewport-fit=cover`，启用 WebView 对安全区的计算。
- 在 `style.css` 中通过 `env(safe-area-inset-top)`/`constant(safe-area-inset-top)` 为 `body` 顶部增加内边距，避免摄像头/状态栏遮挡头部品牌区域。
- 在 `style.css` 中为抽屉 `#drawer`、`.drawer-list`、`.drawer-footer` 增加 `env(safe-area-inset-*)/constant(...)` 内边距，避免侧边栏内容被刘海/底部手势条遮挡（移动端）。
- 该方案对 Android/iOS WebView 均有效；对不支持的环境无副作用。

#### 抽屉式会话管理与欢迎界面（新增）
- 覆盖式抽屉：统一桌面/移动端的会话管理交互；点击顶部"会话"按钮打开，点击遮罩或按 ESC 关闭。
- 抽屉内容：顶部"新建会话"主按钮 + 搜索框 + "新分组名+创建分组"；主体按分组展示会话（加载/删除）；底部仅保留"设置"入口。
- 设置入口：底部使用"齿轮"图标按钮（仅图标，保留 `title/aria-label` 为"设置"），在移动端节省空间且更易辨识。
- 新建会话：沿用会话管理页的分组选择/命名模态，写入相同的本地键；创建后返回主聊并显示欢迎界面。
  - 更新：弹窗改为"分组名称（必填）+ 会话名称（可选）"；当输入的新分组不存在时会自动创建分组，并写入对应的 `conversationGroups` 条目与 `deepseekConversationGroupId`。
- 欢迎界面：当当前会话为空时显示，包含"Logo（logo.png）+ FreeChat 同行展示"与副标题"在这里可以进行无约束交流。"（整洁布局，不显示建议卡片）。

---
## 变更记录
- 2025-11-09（移动端抽屉安全区适配 + 设置入口改图标）
  - 目的：在移动端避免抽屉被摄像头/底部手势条遮挡；设置入口更直观、省空间。
  - 修改项：
    1. style.css：为 `.drawer`/`.drawer-list`/`.drawer-footer` 添加 `env(safe-area-inset-*)`/`constant(...)` 内边距；新增 `.drawer-icon-btn`（齿轮图标按钮样式）。
    2. index.html：将抽屉底部文字"设置"改为齿轮图标按钮，保留无障碍属性。
    3. CURSOR.md：在"安全区适配"补充抽屉适配说明；在"抽屉式会话管理"标注设置入口为图标按钮；追加本条变更记录。
- 2025-11-09（页眉极简化：移除导出/清空/设置/模型徽章）
  - 目的：进一步贴近 DeepSeek 主页的极简页眉设计，减少视觉噪声。
  - 修改项：
    1. index.html：移除页眉"导出日志/清空日志/设置"按钮与模型徽章；日志导出改为控制台调用 `Logger.export(...)`。
    2. CURSOR.md/README（中/英）：同步更新页眉与日志导出使用说明。
 - 2025-11-17（记忆生成异步化：引入 memoryJobs 队列与后台 Worker）
  - 目的：将会话/分组记忆的生成改为后台异步任务，避免阻塞主线程与用户交互，并在 UI 中单独展示记忆生成状态，修复会话结束后记忆可能丢失的问题。
  - 修改项：
    1. `index.html`：新增 `memoryJobs` 入队/持久化逻辑（`enqueueMemoryJob`、`startMemoryWorkerIfNeeded`）、内联 Blob Worker 调度、会话标题栏记忆状态徽章（`#memoryStatusBadge`）、在流结束时改为入队而非直接 await `autoSummarizeIfNeeded()`。
    2. `conversations.html`：将手动生成会话记忆的网络请求改为入队异步生成（不再直接 fetch 并写回）。
    3. `CURSOR.md`：在主体中记录异步记忆队列的架构与本次修改说明，并追加本变更记录。
  - 注意事项：
    - 新增 localStorage 键：`memoryJobs`（任务队列）；每个任务包含 id、conversationId、status、payload 等字段。
    - 写回摘要前进行 msgCount 校验以避免竞态覆盖。
    - 若需要回退：恢复原有在流结束处直接 await `autoSummarizeIfNeeded()` 的行为并移除 `memoryJobs` 相关代码。
- 2025-11-09（页眉再简化：移除 Logo 与标题，仅保留抽屉按钮）
  - 目的：完全对齐"仅左侧抽屉开关"的极简顶部布局。
  - 修改项：
    1. index.html：删除品牌 Logo 与"FreeChat"标题的 DOM；去掉整条头部容器，改为左上角悬浮按钮。
    2. CURSOR.md：主体"界面风格"改为"顶部仅悬浮按钮"；追加本条变更记录。
- 2025-11-09（移除高级管理页；分组创建移入抽屉）
  - 目的：简化导航，将所有管理能力统一到主页面抽屉。
  - 修改项：
    1. index.html：抽屉内新增"新分组名 + 创建分组"控件；删除抽屉底部"高级管理"入口。
    2. README（中/英）：移除高级管理页描述；标注 `conversations.html` 为废弃。
    3. CURSOR.md：更新"主要文件说明"与"抽屉式会话管理"章节，追加本条变更记录。
- 2025-11-09（欢迎界面简化与 Logo 更新）
  - 目的：保持欢迎区整洁、贴近目标风格；统一使用 `logo.webp`。
  - 修改项：
    1. index.html：欢迎区改为"logo.png + FreeChat 同行"+ 副标题，移除建议按钮。
    2. README（中/英）与本文件主体描述同步调整。
- 2025-11-09（覆盖式抽屉会话管理与欢迎界面）
  - 目的：对齐 DeepSeek 主页的整体排布与交互；将会话管理统一为"覆盖式抽屉"；为空会话提供欢迎界面与快速建议卡。
  - 修改项：
    1. index.html：新增抽屉与遮罩 DOM；新增"新建会话"主按钮、搜索框、分组/会话列表（支持加载/删除）；抽屉底部提供"高级管理/设置"入口；将"会话"按钮改为开关抽屉（支持 ESC/遮罩关闭）。
    2. index.html：新增欢迎界面（Logo/标题/副标题"在这里可以进行无约束交流。"/建议卡）；新增一键填充输入框逻辑；根据是否有消息自动显示/隐藏欢迎界面。
    3. index.html：迁移并接线"新建会话（分组选择/命名）"模态，沿用既有本地存储键；新建后清空临时会话并回到主聊。
    4. style.css：新增抽屉/遮罩/列表/主按钮/搜索样式与动效；新增欢迎界面与建议卡样式；保持玻璃风与移动端响应式一致性。
    5. README（中/英）：更新功能列表与"会话管理"章节，说明抽屉式管理与欢迎界面；将 `conversations.html` 定位为"高级管理"。
    6. CURSOR.md：主体新增"抽屉式会话管理与欢迎界面"小节，并记录本次变更。
- 2025-11-08（新增 Windows 一键构建 APK 脚本）
  - 目的：简化在 Windows 下的 APK 生成流程，减少手工步骤。
  - 修改项：
    1. 新增 `scripts/build-apk.ps1` 与 `scripts/build-apk.cmd`，一键执行"前端构建 → 同步 → Gradle 构建 → 输出 APK 副本"。
    2. `package.json` 增加 `build:apk` 脚本（调用 PowerShell 脚本）。
    3. README（中/英）与本文件加入"一键构建 APK"说明。
- 2025-11-08（移动端刘海/打孔屏安全区适配）
  - 目的：解决部分机型（如小米）摄像头/状态栏遮挡顶部"FreeChat"标识的问题。
  - 修改项：
    1. index.html：`<meta name="viewport">` 增加 `viewport-fit=cover`。
    2. style.css：在 `body` 上添加 `env(safe-area-inset-top)` 与 `constant(safe-area-inset-top)` 顶部内边距自适配。
    3. CURSOR.md：新增"安全区适配（刘海/打孔屏）"章节并记录变更。
- 2025-11-08（新增 Android 封装与构建脚本）
  - 目的：在安卓设备上以 APK/AAB 形态运行本应用。
  - 修改项：
    1. 新增 `capacitor.config.json`，设置 `webDir: "dist"` 与 `server.androidScheme: "https"`；
    2. 新增 `scripts/build.js` 与 `package.json` 的 `"build"` 脚本，用于将静态资源复制到 `dist/`；
    3. 通过 `npx cap add android` 生成 `android/` 原生工程；`npx cap copy` 同步资源；
    4. CURSOR.md 主体新增"Android 打包与运行（Capacitor）"章节并记录本次变更。
 - 2025-11-08（对话气泡宽度放宽）
  - 目的：在桌面与中等屏幕显著提升阅读体验，并在超宽屏限制过长行宽；手机端保留更舒适的边距。
  - 修改项：
    1. style.css：`.message { max-width: min(860px, 88%) }`；`@media (max-width: 480px)` 下 `.message { max-width: 94% }`。
    2. CURSOR.md：新增"消息气泡宽度策略（更新）"小节；在"移动端尺寸与间距策略"中将 480px 断点的说明更新为 94%。
- 2025-11-08（主聊天页添加品牌 Logo）
  - 目的：提升品牌辨识度与导航一致性（点击 Logo 回首页）。
  - 修改项：
    1. index.html：在标题左侧加入 `icon/icon.png`，高度 32px，点击回首页。
    2. style.css：新增 `.brand-line` 与 `.brand .logo` 样式；≤600px 高度 28px。
    3. CURSOR.md：更新"界面风格与设计令牌"主体并记录本次变更。
- 2025-11-08（移除会话管理页"导出日志"按钮，仅主聊天页保留）
  - 目的：简化 UI，避免在会话管理页"当前会话"语义不稳定导致的误解。
  - 修改项：
    1. conversations.html：删除头部导出按钮与其事件绑定，保留清空按钮（仍默认隐藏，可恢复）。
    2. CURSOR.md：更新"日志架构与数据流 → UI"为"仅 index.html 显示导出按钮；conversations.html 不再提供导出入口"；追加本条变更记录。
    3. README（中/英）：更新"请求/响应日志"章节，声明仅主聊天页提供导出按钮；如需全部导出可在控制台执行 `Logger.export({ scope: 'all' })`。
- 2025-11-08（移动端隐藏内联胶囊开关文字标签）
  - 目的：在手机浏览器中节省横向空间，仅显示图标以保持整洁。
  - 修改项：
    1. style.css：在 `@media (max-width: 600px)` 中对 `.pill-toggle .label` 设置 `display: none;`。
    2. CURSOR.md：在"移动端尺寸与间距策略"补充"文本标签隐藏"条目，并记录本次变更。
- 2025-11-08（移动端输入区上下排列布局）
  - 目的：在手机端提高空间利用率与可点性，将左右两侧控件上下排列，保持输入区居中且不挤压。
  - 修改项：
    1. style.css：`@media (max-width: 600px)` 下将 `.input-container` 切换为三列网格，左列两个开关上下排列，中列输入框跨两行，右列附件在上、发送/停止在下；仅使用 CSS，不改变 DOM 结构。
    2. CURSOR.md：在"移动端尺寸与间距策略"中补充"输入区布局"描述，并登记本条变更。
- 2025-11-08（移动端图标与间距整体收敛，适中风格）
  - 目的：在手机浏览器中统一图标比例与触控尺寸，避免操作遮挡，提高可读性与可点性。
  - 修改项：
    1. style.css：在 `:root` 新增 `--tap` 与 `--icon-lg/md/sm`；统一按钮内 `<i>` 图标字号；新增 `@media (max-width: 600px/360px)` 对头部、按钮、胶囊开关、消息右内边距与操作按钮尺寸的收敛规则。
    2. CURSOR.md：新增"触控/图标层级令牌"与"移动端尺寸与间距策略"小节，并记录本条变更。
- 2025-11-08（统一化联网搜索提示词，覆盖通用数据/事实场景）
  - 目的：将 Web 综合提示从"示例性天气要求"扩展为"适用于通用联网查询"的统一规范。
  - 修改项：
    1. prompts.js：扩展 `PROMPTS.WEB_SYNTHESIS`，加入对数据/统计/价格/政策等通用条款与"引用与正文对齐"的要求；保留天气为示例。
    2. CURSOR.md：同步更新"结果综合系统提示"的要点列表，以反映统一规范。
- 2025-11-08（将联网搜索综合提示迁移到 prompts.js 统一管理）
  - 目的：消除 `index.html` 中的硬编码提示词，统一提示词来源，便于维护与复用。
  - 修改项：
    1. prompts.js：新增 `PROMPTS.WEB_SYNTHESIS` 常量，承载"联网搜索结果综合"系统提示。
    2. index.html：`buildWebSynthesisPrompt()` 改为读取 `PROMPTS.WEB_SYNTHESIS` 并在缺失时安全回退为空字符串。
    3. CURSOR.md：在"联网搜索架构与数据流"中注明提示来源，并追加本条变更记录。
- 2025-11-07（会话/分组记忆提示词收紧以降低噪声）
  - 目的：减少问候、自述、模型元信息等无关内容进入记忆，提升长期复用价值密度。
  - 修改项：
    1. prompts.js：重写 `SESSION_SUMMARY`/`GROUP_SUMMARY` 模板，加入"必须保留/严禁包含/合并去重/低信号处理/长度限制"。
    2. README（中/英）：新增"记忆生成规则"章节，阐明保留/禁止/低信号/格式与长度限制。
    3. CURSOR.md：在主体新增"记忆生成规则（更新）"，并记录本次变更。
- 2025-11-07（日志导出支持按会话范围过滤，默认当前会话）
  - 目的：避免导出多余历史信息，更聚焦当前排障。
  - 修改项：
    1. logger：`export(opts)` 新增 `scope` 与 `conversationId` 支持（`current|all|byConversationId`，默认 `current`），导出文件名追加范围后缀。
    2. index/conversations：导出按钮默认传入 `scope: 'current'`；仍保留格式选择（ndjson/json）。
    3. 文档：更新 README（中/英）与本文件主体，说明导出范围与控制台示例。
- 2025-11-07（主输入区布局更新：内联"联网搜索"开关 + 发送/中止互斥）
  - 同日补充：加入"深度思考"开关与"附件"按钮；占位符改为"给 DeepSeek 发送消息"。
  - 目的：使交互与示例布局一致，快速切换联网搜索，并统一按钮位置与风格。
  - 修改项：
    1. index：在 `<footer>` 输入区左侧新增 `#thinkingInlineToggle`（控制是否显示推理，仅影响显示）与 `#webInlineToggle`（读写 `localStorage.freechat.web.enable`）；右侧新增 `#attachBtn` + 隐藏 `#fileInput`（仅记录选择）。
    2. style：新增 `.circle-btn`（圆形按钮通用）、`.stop-btn` 与 `.web-inline-toggle` 样式；移除 `.stop-btn-floating` 浮动样式。
    3. index：`initWebPanel()` 移除启用复选框逻辑，面板仅保留参数（引擎/结果数/上下文/Search Prompt）。
    4. README（中/英）：更新"Web Search"与"基础聊天/Basic Chat"说明（启用入口改为输入区开关；停止为同位互斥）。
    5. CURSOR.md：更新"联网搜索架构与数据流"主体并追加本条变更记录。
- 2025-11-07（隐藏清空日志按钮，保留功能可恢复）
  - 目的：主页面与会话管理页顶部"清空日志"按钮平时不使用，避免误触；保留能力以便需要时恢复。
  - 修改项：
    1. style：新增 `#clearLogsBtn { display: none !important; }`，两个页面共享隐藏。
    2. 文档：更新 README（中/英）"请求/响应日志"UI 描述为"仅显示导出，清空默认隐藏（可恢复）"。
    3. CURSOR 主体：更新"日志架构与数据流 → UI"说明并追加本条变更记录。
 - 2025-11-07（接入 OpenRouter Web 搜索插件 + 引用展示）
 - 2025-11-07（修复：解析流式 delta.annotations 引用）
  - 目的：部分提供方将 url_citation 放在流式 `delta.annotations` 中，之前仅读取尾包 `message.annotations` 导致引用不显示。
  - 修改项：
    1. index：在 SSE 循环中解析并去重累积 `delta.annotations`；
    2. index：`updateLastAssistantMessage` 渲染前移除已有 `.citations`，避免重复叠加。
  - 目的：为聊天响应提供可选的联网检索增强与标准化引用展示；用户可在对话页配置开关与参数。
  - 修改项：
    1. index：新增头部"地球"按钮与 `webPanel` 面板（引擎/结果数/上下文强度/Search Prompt/开关），参数持久化至 `localStorage`；
    2. index：当启用时向请求体注入 `plugins` 与 `web_search_options`；
    3. index：在流式解析过程中捕获 `message.annotations[].url_citation` 并渲染"参考来源"链接（域名为文本）；
    4. style：新增 `.web-panel` 与 `.citations` 样式；
    5. 文档：更新 README（中/英）增加"Web Search"章节与结构图；
    6. CURSOR.md：新增"联网搜索架构与数据流"主体说明并记录新增本地存储键。
- 2025-11-06（术语统一与存储兼容迁移：会话记忆/分组记忆）
  - 目的：统一名词体系，明确"记忆系统=会话记忆+分组记忆"，避免"会话摘要/分组摘要"等混用；兼容历史字段。
  - 修改项：
    1. 文案/UI：将所有用户可见"会话摘要"更新为"会话记忆"；分组相关统一为"分组记忆"。
    2. 提示词：`prompts.js` 中 `GROUP_SUMMARY` 文案由"会话摘要"改为"会话记忆"。
    3. 注释/说明：`index.html`、`conversations.html` 注释同步用词；README（中/英）与 CURSOR 主体同步。
    4. 兼容迁移：在 `index.html`/`conversations.html` 注入一次性迁移，将历史 `memory`→`summary`，`groupMemory`→`memorySummary`。
    5. 说明：日志事件名 `summary_request/summary_done` 未改名，但其含义对应"会话记忆生成"。
- 2025-11-06（UI 现代化：浅色玻璃风 + Inter 字体 + 设计令牌）
  - 目的：统一现代审美，提升可读性、层级与品牌一致性；引入可复用的设计令牌。
  - 修改项：
    1. `style.css` 顶部新增设计令牌与 Inter 字体导入，增加 `.glass` 通用类与降级；
    2. 头部、输入区、AI 气泡、会话卡片、按钮与模型徽章全面应用玻璃风与统一比例；
    3. 用户消息采用品牌渐变；
    4. 将 `index.html` 内联的停止按钮样式迁移至 `style.css`（统一风格与维护便捷性）。
- 2025-11-06（记忆注入策略升级：全部分组记忆 + 当前分组全部会话摘要）
 - 目的：契合用户"在同一分组内会话时注入全局分组记忆与同组全部会话摘要"的设计意图。
 - 修改项：
   1. index：新增 `buildMemorySystemPrompt()` 并在请求前注入；支持可选首轮预摘要（`freechat.memory.preSummarize`）与可配置阈值/开关（分组范围、会话条数、字符截断）。
   2. 文档：更新 README（中/英）与 CURSOR.md 主体说明与变更记录，新增 localStorage 配置项说明。
 - 2025-11-06（新增本地请求/响应日志与导出/清空 UI）
  - 目的：保留与大模型交互的原始信息，便于排障与对齐。
  - 修改项：
    1. 新增 `logger.js`（环形缓冲、本地存储、导出/清空、遮蔽 Authorization）。
    2. `index.html` 与 `conversations.html` 接入日志：聊天主请求（含流式）、自动摘要、分组记忆、保存/重新摘要等。
    3. 两页面 header 新增"导出日志/清空日志"按钮。
    4. 更新 `README.md`/`README_zh.md` 增加"请求/响应日志"章节与结构图。
 - 2025-11-06（思考过程显示默认展开并置于正文前，流式）
  - 目的：提升可读性，先给出推理再给出答案，且允许用户手动折叠。
  - 修改项：
    1. index：在 `updateLastAssistantMessage` 中将思考块插入到助手正文之前；默认展开；保留用户折叠状态 `window._reasoningCollapsed`；在 `sendMessage` 开始时重置为展开；
    2. index：流式增量到达时同步刷新思考块内容，并将增量写入 `aiMsgObj.reasoning`；
 - 2025-11-15（修复：侧边栏滚动、删除改用项目模态、移动端模型徽章与去重引用显示）
   - 目的：改善移动端与抽屉交互体验，统一删除确认 UI，修复联网搜索时重复显示参考来源的问题。
   - 修改项：
     1. `style.css` / `dist/style.css`：在 `.drawer .conversation-summary-content` / `.drawer .group-memory` 中添加 `max-height: calc(50vh); overflow-y: auto; -webkit-overflow-scrolling: touch;`，使展开的记忆窗格在抽屉内可滚动，避免抽屉整体失去滚动能力。
     2. `script.js`：新增 `showConfirmModal(message)` 函数，使用现有 `.modal-overlay` / `.modal` 样式动态创建项目内确认模态并返回 Promise，用于替换同步的 `confirm()` 调用以统一 UI 风格并支持异步流程。
     3. `index.html` / `dist/index.html`：引入 `script.js`，将抽屉内删除按钮的 `confirm()` 同步流程替换为 `await showConfirmModal(...)` 异步模态；在 `updateCurrentModelBadge()` 中调用 `adjustSessionTitleHeight()` 以确保移动端标题栏高度随徽章内容变化重新计算。
     4. `conversations.html` / `dist/conversations.html`：引入 `script.js` 并将会话管理页内的删除确认改为使用 `showConfirmModal()`，保持行为一致性。
     5. `index.html` / `dist/index.html`：在渲染引用（参考来源）时增加防重逻辑——若模型正文已包含“参考来源”字样，则跳过追加结构化引用列表，避免模型正文与注解渲染同时显示导致重复。
   - 备注：已同时更新 `dist/` 中对应产物以保持离线打包一致性；如需回退，可删除以上新增的 CSS/JS 修改并恢复 `confirm()` 使用。
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
    2. index：在流式解析中捕获 `reasoning_content`（含常见变体）并累积；在最后一条助手消息下渲染"查看思考过程"可折叠面板；
    3. style：新增 `.reasoning-block`、`.reasoning-toggle`、`.reasoning-content` 样式；
    4. 文档：更新 README（中/英）与 CURSOR.md 主体说明与本变更记录。
 - 2025-11-05（新建会话分组选择弹窗）
  - 目的：新建会话时引导用户将会话加入已有分组，提升组织性与后续记忆注入的准确性。
  - 修改项：
    1. conversations：新增分组选择与命名模态（下拉菜单+名称输入，确认/跳过/取消）；改造"新建会话"流程为弹窗→根据选择写入/清理 `deepseekConversationGroupId` 与 `deepseekNewConversationName` 并重置临时会话后跳转；
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
    1. index：首条用户消息自动创建 `savedDeepseekConversations` 条目；节流回写；流结束触发自动摘要；同组时注入"会话摘要"，并全局注入"分组记忆"。
    2. index：新增本页 `updateGroupMemory`，并在自动摘要成功后刷新分组记忆。
    3. conversations：统一 API Key 优先级（内置 OPENROUTER → 本地存储）；统一模型与端点；重新摘要/分组记忆均使用 `MODEL_NAME`。
    4. 文档：同步 CURSOR.md 与 README（中/英）以反映上述机制。
- 2025-11-05（文档与代码一致性修复：默认端点、文件说明、依赖与数据流）
  - 目的：使文档与当前实现完全一致，减少读者误解。
  - 修改项：
    1. 将主文档中的默认端点统一为 `https://openrouter.ai/api/v1/chat/completions`（与代码一致）。
    2. 更新"主要文件说明"：明确 `config.html` 仅提供模型选择；补充 `prompts.js` 与 `tools/encrypt_key.js`；标注 `script.js` 为可选且当前未默认引入。
    3. 更新"核心数据流"：明确演示 Key 的来源与 `deepseekApiKey` 的可替代读取方式，并指出设置页不提供 Key 输入。
    4. 新增"依赖说明"：补充 `CryptoJS` 与 `Font Awesome`。


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
    1. README.md：开头描述修正为"内置加密演示 Key 或通过 localStorage 配置；设置页仅配置模型"；基础聊天第 5 点改为"停止按钮为 UI-only，当前不中止网络请求"。
    2. README_zh.md：同步中文修正，与英文保持语义一致。
    3. CURSOR.md：将 `localStorage.deepeekApiKey` 更正为 `localStorage.deepseekApiKey`；在"已知限制与建议"新增"停止按钮为 UI 级别，建议引入 AbortController"。
 - 2025-11-06（会话记忆模型选择策略：按会话模型优先）
  - 目的：重新生成会话记忆使用"该会话所用模型"，自动会话记忆亦同；分组记忆继续使用全局模型。
  - 修改项：
    1. conversations.html：保存后异步生成会话记忆时，`modelToUse` = 会话模型 > 全局模型 > 兜底。
    2. conversations.html：手动"重新生成会话记忆"时，`modelToUse` = 会话模型 > 全局模型 > 兜底。
    3. index.html：`preSummarizeCurrentConversationMaybe` 预摘要使用会话模型优先。
    4. index.html：`autoSummarizeIfNeeded` 自动摘要使用会话模型优先。

- 2025-11-07（将"联网搜索设置按钮"的功能迁移到设置页）
  - 目的：统一配置入口，简化主页面，仅保留按消息级"联网搜索"开关。
  - 修改项：
    1. index：移除头部"地球"按钮与 `#webPanel` 浮层；删除 `initWebPanel()` 及其调用；保留 `#webInlineToggle` 内联开关。
    2. config：新增"联网搜索设置"分区（引擎/最大结果/上下文/Search Prompt）；读写 `freechat.web.*` 键；复用"保存设置"按钮一次性保存。
    3. README（中/英）：更新使用说明，指明参数配置在 `config.html`，主页面不再展示地球按钮与面板；更新 `config.html` 文件说明。
    4. CURSOR 主体：更新"主要文件说明"与"联网搜索架构与数据流 → UI"说明，并追加本条变更记录。

- 2025-11-07（多 system 记忆注入 + 供应商静态兼容 + 日志补充）
  - 目的：将每个分组记忆/会话记忆分别作为独立 system 消息发送；对不支持多 system 的供应商自动合并；补充日志以便排障。
  - 修改项：
    1. index：新增 `buildMemorySystemPrompts()`，逐条注入分组与会话记忆；顺序为"Web 搜索规范（启用时置首）→ 分组记忆 → 会话记忆 → 历史消息"。
    2. index：实现静态供应商映射（openai/mistralai/deepseek/qwen/meta-llama/x-ai/minimax 支持；anthropic/google/cohere/ai21 视为不支持），不支持时自动合并为单条，段间以 `---` 分隔。
    3. index：会话记忆去重（按会话ID）、新增可选键 `freechat.memory.maxSessionsPerRequest` 与 `freechat.memory.maxCharsPerItem`（不存在时回退旧键），并保留字符截断；
    4. logger：在聊天请求写入 `sys` 字段（`count`、`merged`、`provider`）。
  - 文档：本文件主体与 README（中/英）同步"多 system 注入策略、顺序、静态供应商兼容与本地配置键"。

- 2025-11-08（文档一致性修复：API Key 使用与日志 UI）
  - 目的：使文档与当前实现完全一致，消除歧义与重复描述。
  - 修改项：
    1. "核心数据流"：明确主聊天仅使用内置加密 Key；记忆相关调用可回退 `localStorage.deepseekApiKey`。
    2. "日志架构与数据流 → UI"：删除过时"会话管理页也提供导出"的描述，统一为仅主聊天页导出；清空按钮默认隐藏。
    3. "主要文件说明"：去重 `conversations.html` 条目；修复编号重复问题。

- 2025-11-10（移动端消息宽度与内边距微调）
  - 目的：在移动设备上增加每行可阅读字符数，提高阅读友好性，同时保持触控目标尺寸与操作可点性。
  - 修改项：
    1. `style.css` / `dist/style.css`：在 `@media (max-width:600px)` 下减小 `.message` 的左右内边距（如由 12–18px 缩小至 ~8px），并微调 `font-size` 与 `line-height`（示例：`font-size: clamp(0.95rem, 1vw + 0.15rem, 1rem)`、`line-height: 1.45`），保留右侧操作按钮的预留空间但略为收窄。
    2. `CURSOR.md`：同步更新"消息气泡宽度策略"与"移动端尺寸与间距策略"节中的说明。
    3. `README.md` / `README_zh.md`：在"移动端友好/尺寸策略"处补充本次实现说明（实现细节为 UI 优化，非功能变更）。
 - 2025-11-11（消息气泡左右对称与操作按钮外侧定位）
  - 目的：在保证最大可读宽度的同时，使消息气泡左右视觉对称。
  - 修改项：
    1. `style.css` / `dist/style.css`：将 `.message` 的左右内边距设置为对称值（左右均为 8px），并把消息操作按钮 `.message-actions` 通过负偏移 `right: -36px`（窄屏为 -32px）定位到气泡外侧，避免按钮占用文本流宽度，同时保证按钮大小与可点性。
    2. `README.md` / `README_zh.md`：在"移动端友好/尺寸策略"补充本次实现说明（UI 优化，保持触控目标）。
- 2025-11-12（按消息记录模型信息并显示）
  - 目的：确保每条 assistant 消息展示其实际生成时所使用的大模型（消息级 model），便于审计与回溯。
  - 修改项：
    1. `index.html` / `dist/index.html`：在创建 assistant 占位消息时写入 `aiMsgObj.model = MODEL_NAME`；在流式解析过程中若返回片段或尾包包含模型信息（优先检查 `json.model`、`json.model_name`、`json.choices[0].model`、`json.choices[0].message.model`），则覆盖 `aiMsgObj.model` 并实时刷新 UI 以展示该字段。
    2. `style.css` / `dist/style.css`：新增 `.message-model` 样式，用于在消息的操作按钮行显示模型标签。
    3. `CURSOR.md` / `README.md` / `README_zh.md`：补充文档说明，指出回退逻辑为使用消息创建时的 `MODEL_NAME`，以及流式响应中优先采用供应商返回的模型信息。
  - 回退与兼容性：
    - 若响应未提供模型信息，消息将保留创建时的 `MODEL_NAME` 作为记录（可靠回退）。
    - 保存/持久化（localStorage）会保留消息对象的 `model` 字段，保证历史消息可回溯模型来源。
 - 2025-11-12（将消息操作按钮单独一行）
  - 目的：把消息旁的操作按钮从气泡右侧移到气泡下方单独一行，提升正文可读宽度与视觉整洁性。
  - 修改项：
    1. `style.css` / `dist/style.css`：将 `.message-actions` 改为流式（position: static），并设置 `justify-content: flex-end; margin-top: 8px;`，使按钮单独占一行并靠右对齐；移除绝对定位与外侧负偏移实现。
    2. `README.md` / `README_zh.md`：在"移动端友好/尺寸策略"补充本次实现说明（UI 优化，按钮单独占行）。

- 2025-11-11（新增：主页面会话标题栏）
  - 目的：在主聊天页面顶部展示当前会话名称与所属分组，提升会话可识别性与上下文可视化。
  - 修改项：
  1. `index.html`：在主聊天列顶部新增 `#sessionTitleBar` DOM，包含 `#sessionName` 与 `#sessionGroup`；新增 `renderSessionTitle()` 用于动态渲染并在会话切换/创建时更新显示。
    2. `style.css` / `dist/style.css`：新增 `.session-title`、`.session-name`、`.session-group` 的样式，继承项目玻璃风令牌并兼容移动端断点。
    3. `README.md` / `README_zh.md` / `CURSOR.md`：同步更新文档说明并追加本条变更记录。
  - 回滚：移除 `#sessionTitleBar` DOM 与 `renderSessionTitle()`，并删除新增 CSS 即可回退，不影响本地存储结构或会话逻辑。

- 2025-11-11（修复：统一侧边栏内"会话记忆"与"分组记忆"窗格宽度）
  - 目的：确保覆盖式抽屉（侧边栏）中显示的"会话记忆"和"分组记忆"窗格在宽度与盒模型上保持一致，跟随抽屉可用宽度（`--drawer-width`），提升视觉一致性并便于样式维护。
  - 修改项：
    1. `style.css`：为 `.conversation-summary-content, .group-memory` 添加 `width:100%`、`box-sizing:border-box`、`max-width:100%`、`margin:6px 0` 等规则，并为 `.group-memory` 添加 `border-left: 2px solid #eee`，移除对内联样式的依赖。
    2. `conversations.html`：移除创建分组记忆区域的 padding/borderLeft/margin 的 inline 赋值，改为统一类 `group-memory conversation-summary-content`；同时移除会话记忆模板中用于 margin-top 的 inline style（保留 `display:none` 以便 JS 控制显示）。
    3. `dist/style.css`：同步更新以使打包产物生效。
  - 风险与回滚：若需回退，将 `style.css`/`dist/style.css` 中新增规则删除并恢复 `conversations.html` 中被移除的 inline 样式即可回退，不影响数据结构与本地存储。

- 2025-11-11（更新：使会话记忆展示时独占一行，避免与管理按钮同行）
  - 目的：当用户点击"查看会话记忆"时，使会话记忆窗格独占 `.conversation-item` 的一整行，不再与右侧的管理按钮同列，从而获得更大横向可用宽度并提升可读性。
  - 修改项：
    1. `style.css` / `dist/style.css`：将 `.conversation-item` 的 `align-items` 改为 `flex-start` 并添加 `flex-wrap: wrap`，同时为 `.conversation-info` 加入 `min-width: 0`，并为 `.conversation-summary-content` 增加 `flex-basis:100%`（使其换行并占满整行）。
    2. `conversations.html`：保持摘要 DOM 位置不变（留在 `.conversation-info` 内），但依赖 CSS 控制换行/占行，不再通过 inline style 调整宽度或边距。
  - 回滚：删除或还原上述 CSS 更改并恢复任何被修改的 inline 样式即可回退。

- 2025-11-11（更新：抽屉作用域下使会话记忆窗格独占宽度）
  - 目的：只在主页面的覆盖式抽屉（`.drawer`）内，使"会话记忆（conversation-summary-content）"和"分组记忆（group-memory）"在展开时换行并占满抽屉内容宽度，避免与抽屉内的操作按钮同行，从而在不影响 `conversations.html` 页面布局的前提下提升抽屉内记忆可读性。
  - 修改项：
    1. `style.css`：在 `.drawer` 作用域下新增以下规则：使 `.drawer .conversation-summary-content, .drawer .group-memory` 为 `flex-basis:100%` 与 `width:100%`，并使 `.drawer .drawer-item` 支持 `flex-wrap: wrap`；确保 `.drawer .drawer-item > div:first-child` 可收缩（`min-width:0`）。这些规则限定在 `.drawer` 作用域，避免影响其他页面。
    2. `dist/style.css`：同步以上样式变更以使打包产物生效。
    3. `index.html`：无需 DOM 改动；抽屉内现有生成逻辑已用 `.conversation-summary-content` / `.group-memory` 类名生成记忆块，样式由 CSS 控制展示行为。
  - 验收：在主页面打开抽屉并展开任意会话的"查看会话记忆"，记忆区域应换行并占满抽屉宽度，左右内边距与分组记忆一致；`conversations.html` 布局不受影响。
  - 回滚：删除 `.drawer` 作用域 CSS 规则并恢复先前的全局规则或 inline 样式可以回退该行为。

- 2025-11-11（更新：精简主页面抽屉的操作按钮并添加"会话管理"入口）
  - 目的：在主页面抽屉中减少直接管理操作，保留核心快速操作并在底部提供跳转入口前往完整的会话管理页。
  - 修改项：
    1. `index.html`：抽屉内每个会话项仅保留"加载（加载会话）"与"重新生成会话记忆"两个图标按钮；移除"重命名/移动/删除"等按钮以减少误操作和视觉复杂度，完整管理仍在 `conversations.html` 中进行。
    2. `index.html`：抽屉底部在设置图标旁新增仅图标的"会话管理"入口（`fa-list`），带 `title`/`aria-label`（tooltip）以说明功能，点击跳转 `conversations.html`。
    3. `style.css` / `dist/style.css`：无须新增样式（使用现有 `drawer-icon-btn`），逻辑通过 DOM 生成脚本控制按钮显示。
  - 验收：打开主页面抽屉时，会话条目右侧仅显示加载与重新生成按钮；抽屉底部显示列表图标按钮，悬停显示"会话管理"，点击后跳转到 `conversations.html`。
  - 回滚：恢复 `index.html` 中被移除的按钮创建与事件绑定，并删除 `drawer-footer` 中新增的会话管理链接即可回退。

- 2025-11-12（修复：移动端会话标题栏遮挡首条消息）
  - 目的：解决在部分手机视口中，顶部会话标题栏以粘性/悬浮方式显示时遮挡消息首行的问题，提升移动端可读性与交互可靠性。
  - 修改项：
    1. `style.css`：在 `@media (max-width: 768px)` 下将 `.session-title` 改为 `position: fixed` 并使用 `env(safe-area-inset-top)` 兼容刘海屏，同时为 `.chat-container` 增加等高的 `padding-top`（参考高度 56px，可按需微调或替换为 CSS 变量 `--session-title-height`）。
    2. `README.md` / `README_zh.md`：在"移动端友好/尺寸策略"处补充本次实现说明，说明标题栏固定与顶部内边距的目的与效果。
  - 回滚：删除或注释新增的媒体查询样式即可恢复先前行为（不影响数据或功能）。

- 2025-11-12（提示词增强：记忆注入说明与背景资料标记）
  - 目的：避免将生成的长期记忆误当作当前会话前文，提高注入记忆的可控性。
  - 修改项：
    1. `prompts.js`：在 `SESSION_SUMMARY` 与 `GROUP_SUMMARY` 中添加"背景资料"约定，要求记忆条目以短标记指明记忆级别（background | foreground），默认 background；并在输出中简短注明"仅作背景资料，非会话前文；仅在用户明确提及/询问时可引用"。
    2. `prompts.js`：新增常量 `PROMPTS.MEMORY_INJECTION`，作为在注入记忆为 system/assistant 消息前统一附加的说明文本，提醒模型该批记忆为深层背景资料，默认不作为当前会话前文。
    3. 文档：在 `README.md` 与 `README_zh.md` 中增加记忆注入约定说明，提示开发者在构造请求时使用 `PROMPTS.MEMORY_INJECTION` 作为注入 wrapper，并说明记忆级别标签的语义与默认行为。
  - 风险与验证：仅修改提示词与文档，不改动运行时逻辑。验证方式：生成一条记忆并按注入说明将其附加为 system 消息，再行对话以确认模型在未被显式引用时不会将记忆视为当前前文。
2025-11-12（样式调整：标题栏模型换行、气泡模型展示与模态置顶）
- 目的：改进模型名称在头部与消息气泡中的显示，避免长模型名溢出并确保新建会话模态位于最顶层，提升可读性与交互可靠性。
- 修改项：
  1. `style.css` / `dist/style.css`：
     - 使 `#sessionTitleBar` / `.session-title` 支持换行，`#currentModelBadge`（或 `.model-badge`）单独占一行并右对齐，允许长模型名换行显示而不超出标题栏。
     - 将消息内 `.message-model` 调整为单独一行、宽度不超过气泡、右对齐并允许换行（`overflow-wrap: anywhere` / `word-break: break-word`），避免超出气泡范围。
     - 将 `.modal-overlay` 的 `z-index` 提升至 `2147483647`，确保新建会话模态位于最顶层，不被其他浮层覆盖。
  2. 文档：在 `CURSOR.md` 变更记录中追加本条目（即当前条目），说明变更目的与影响。
 - 回退：若需回退，恢复 `style.css` / `dist/style.css` 中被修改的规则；该改动为纯 CSS，不影响消息渲染逻辑或数据持久化。

2025-11-14（实现：前端性能与流式解析优化 - 实施记录）
- 目的：解决用户反馈的对话卡顿与移动端 APP 因渲染/解析/存储压力导致的卡顿或闪退，通过低侵入、可回退的方式在前端侧减轻主线程负载与 I/O 压力。
- 修改项（代码变更，均已实现并打包至 `dist/`）：
  1. `index.html`：
     - 新增 `batchedStorageSetJson`，将高频写入（如 `deepseekConversation`）合并延迟写入，默认 400ms 合并，降低 `localStorage` 同步 I/O 压力。
     - 为流式响应引入 `AbortController`（`window._currentRequestController`），并在“停止生成”动作中真正中止网络请求与流读取。
     - 将流式增量渲染合并到下一帧（`requestAnimationFrame` 调度），实现 `doUpdateLastAssistantMessage` + `updateLastAssistantMessage` 的合并更新，减少重绘频率。
     - 实现对 Markdown 渲染库的懒加载 `ensureMarkdownLibs()`，并在后台预加载以降低首屏阻塞。
     - 对记忆注入增加运行时强制上限（默认最多注入 3 条会话记忆、每条最多 1000 字符，可通过 localStorage 覆盖），防止请求体膨胀导致远端处理延迟。
     - 内联实现流式解析 Web Worker（通过 Blob Worker 动态创建），将 JSON.parse 与解析工作移出主线程，主线程仅做小量 DOM 更新。
     - 渲染策略调整：实现简单的消息虚拟化（仅渲染最新 N 条消息，默认 200，可配置），明显减少移动端 DOM 节点数量。
     - 新增性能采样工具 `startPerfSampler/stopPerfSampler` 用于在无法实时调试时收集时间与 JS Heap 快照样本。
  2. `logger.js`：
     - 新增 `Logger.summarize()` 接口，便于程序化获取日志统计（平均/最大耗时、错误计数、热点 endpoint 列表、平均流片段数），便于离线排查。
  3. 构建/打包：
     - 已运行 `npm run build` 并执行 `npm run build:apk`（在当前环境成功生成 `dist/apk/FreeChat-debug.apk`）。

- 验证与回退：
  - 已在本地构建并将修改复制到 `dist/`；打包 APK 成功（路径见 `dist/apk/FreeChat-debug.apk`）。如需回退，可在 `index.html` 中删除/恢复新增函数并还原 `renderMessages`/`updateLastAssistantMessage` 的旧实现，同时移除 worker 与批量写入逻辑。

2025-11-14（实现：前端性能与网络鲁棒性改进）
- 目的：提升用户交互体验、降低前端 I/O 与渲染压力、并增强网络请求的健壮性与可控性。
- 修改项：
  1. `index.html`：
     - 新增基于 `AbortController` 的请求中止支持：点击“停止生成”将真正中止当前网络请求与流式读取（`window._currentRequestController` 管理），并清理发送锁与 UI 状态。
     - 实现发送互斥锁 `window._sendingInProgress`，避免并发发送与重复请求。
     - 为非流式请求新增 `fetchWithRetry()` 封装，支持超时与指数退避重试（配置：重试次数/回退间隔/超时）。
     - 对高频写入（如当前会话）使用 `batchedStorageSetJson()` 做 per-key 批量写入合并（默认延迟 400ms），减少 `localStorage` 同步 I/O。
     - 将流式增量渲染合并到下一帧（requestAnimationFrame），减少 DOM 重绘频率并降低 CPU 使用（`updateLastAssistantMessage` 调度到 `doUpdateLastAssistantMessage`）。
     - 为联网检索添加短期节流配置（`freechat.web.cooldownMs`，默认 5000ms）并在触发时显示估算费用提示，避免短时间内重复触发高成本检索。
     - 异步加载 Markdown 渲染/消毒库（`marked` 与 `DOMPurify`），通过 `ensureMarkdownLibs()` 在后台预加载以降低首屏阻塞。
     - 在记忆构建中加入低信号检测与记忆级别前缀（默认 `【记忆级别: background】`），并保持原有的去重逻辑。
  2. `logger.js`：增加 `getLogs(opts)` 與 `getConfig()` 接口，方便程序化读取与导出；保持环形缓冲逻辑与导出范围支持。
  3. `README.md` / `README_zh.md`：更新文档以反映以上运行时改进（AbortController、重试/退避、批量写入、DOM 合并更新、库懒加载、联网检索节流与费用提示）。
  4. `prompts.js`：提示词与注入说明保持不变，但 `index.html` 在注入顺序上支持通过 `localStorage.freechat.memory.injection.order` 配置注入顺序（组合 `web,groups,sessions,messages`）。
- 风险与回退：
  - 所有改动均为前端兼容增强；若需回退，可逐项取消新增函数（例如 `ensureMarkdownLibs`、`fetchWithRetry`、`batchedStorageSetJson`、`doUpdateLastAssistantMessage`）并恢复原有直接 `localStorage.setItem` 与同步渲染逻辑。
  - 建议在生产环境将主聊天 API Key 与联网检索代理移至后端以提升安全性及避免直接在客户端计费。

2025-11-14（修复：主页面与抽屉渲染、Markdown 恢复、引用显示与图标构建）
- 目的：修复用户反馈的多个显示/构建问题，提升移动端/桌面端一致性与可用性。
- 修改项：
  1. `index.html`：确保在初始化时异步加载 Markdown 渲染/消毒库 (`marked` + `DOMPurify`)，并在加载完成后重渲染历史消息以保证从 `localStorage` 恢复的消息正确渲染 Markdown；在 `renderMessages`、`doUpdateLastAssistantMessage`、`updateLastAssistantMessage` 中增加对 `marked`/`DOMPurify` 的存在性判断以支持懒加载回退；在新建会话模态确认逻辑中创建并持久化一个空会话条目，确保抽屉中可立即看到新会话；增强引用（citation）渲染，显示来源标题与完整 URL，并按编号列出以便一一对应。
  2. `style.css`：为抽屉滚动加入 `-webkit-overflow-scrolling: touch`、`touch-action: auto` 与 `overscroll-behavior: contain`，改善在 iOS/移动端的滚动体验并修复抽屉无法滚动的问题；确认并保留会话标题栏在移动端的固定定位与消息容器预留 `padding-top` 以防遮挡。
  3. `scripts/build.js`：继续将 `icon` 目录复制到 `dist/`；若检测到 `android/` 原生工程，尝试将 `icon/logo.png` 复制到若干 `mipmap-*` 原生资源目录下的 `ic_launcher.png` 作为快速替换方案（建议在 Android Studio 中使用适当工具生成各密度的 launcher 图标以达到最佳效果）。
- 影响与回退：
  - 本次改动为前端兼容与 UX 修复，均可通过还原对应文件改动回退。关于原生图标替换：脚本已尝试复制 `logo.png` 到原生资源目录，但建议使用 Android Studio 或 icon generation 工具生成适当尺寸的 mipmap 资源以获得最佳视觉效果与适配性。

2025-11-15（修复：统一项目模态与流式滚动问题）
- 目的：修复用户反馈的两项 UX 问题：会话删除时未弹出统一确认模态，以及流式生成过程中页面未随增量输出滚动到最新消息。
- 修改项：
  1. `script.js`：增强 `showConfirmModal(message)` 的健壮性：
     - 在创建 overlay 时回退到 `document.documentElement`（以兼容 script 在 head 中引入但 body 尚未就绪的场景）。
     - 明确设置 overlay 的 z-index（脚本层面防护）并在显示时聚焦确认按钮以提升可访问性。
     - 支持按 `Escape` 键取消，并在 cleanup 中正确移除键盘事件与按钮事件监听，增加异常降级回退到 `window.confirm`。
  2. `style.css`：为 `.modal` 添加更高优先级的 `z-index: 2147483648`，确保模态位于其它浮层（如抽屉、标题栏）之上，避免被遮挡导致“无弹窗”错觉。
  3. `index.html`：改进 `scrollToBottom()` 实现：
     - 优先使用最后消息元素的 `scrollIntoView({block: 'end'})`，并通过 `requestAnimationFrame` 在下一帧执行以确保 DOM 布局完成后滚动。
     - 保留 `scrollTop = scrollHeight` 作为回退方案，增加异常捕获以避免因渲染时序导致的 JS 抛错。
- 验收：会话管理页与抽屉中的删除操作现在应弹出统一的项目模态（支持键盘 ESC 取消）；在流式生成回复时，消息容器会在增量更新后滚动到最新消息，提升连续输出的可见性。
- 回退：恢复 `script.js` / `style.css` / `index.html` 中对应变更即可回退本次改动。

2025-11-15（修改：移除页面底部独立的参考来源结构化展示）
- 目的：避免在模型回复中同时出现模型正文自带的“参考来源”与页面底部单独追加的结构化引用导致重复显示和滚动定位问题。
- 修改项：
  1. `index.html`：移除在流式/更新流程中针对会话最后一条助手消息的额外 `buildCitationsElement`（其会在消息外侧或底部单独追加“参考来源”），改为依赖消息内部渲染逻辑（`renderMessages`）及模型正文自身的引用描述。
  2. 文档：在变更记录中说明变更目的与回退方法。
- 验收：当模型正文包含“参考来源”时不会在页面底部或消息外重复出现结构化引用；流式回复时消息容器滚动到最新消息不再被底部固定引用块影响。

2025-11-15（更新：默认折叠参考来源显示）
- 目的：改进引用的可读性与界面占用，默认将引用列表折叠以减少视觉干扰，用户可展开查看。
- 修改项：
  1. `index.html` / `dist/index.html`：`buildCitationsElement(anns)` 现在生成一个带折叠行为的引用块，包含一个可点击的标题按钮 `参考来源 (N)`，引用列表默认 `display:none`，点击按钮展开/收起。保留了去重逻辑与回退异常处理。
  2. `CURSOR.md`：追加本条变更记录并说明回退方法（恢复旧版 `buildCitationsElement` 即可）。
- 验收：加载含有 `message.annotations` 或 `message.citations` 的回复时，界面显示 `参考来源 (N)` 按钮，列表默认折叠，点击后展开显示所有来源链接。

2025-11-17（修复：会话加载竞态与历史会话加载不响应问题）
- 目的：修复在抽屉/会话管理中加载会话时可能被延迟写回的旧会话快照覆盖、以及加载后界面无响应或新会话内容被清空的竞态问题。
- 修改项：
  1. `index.html`：
     - 新增 `batchedStorageCancelKey(key)` 与 `batchedStorageFlushAll()`，用于取消/强制写回 `batchedStorageSetJson` 的待写入项，避免延迟写入覆盖新加载的数据；在页面 `beforeunload` 时调用 `batchedStorageFlushAll()` 以保证写回一致性。
     - 在抽屉加载会话与新建会话时，**先中止当前流式请求并取消待写入**（调用 `window._currentRequestController.abort()` 并 `batchedStorageCancelKey('deepseekConversation')`），避免旧快照在延迟后覆盖刚加载的会话。
     - 优化 `upsertSavedConversationNow()`：在写回 `savedDeepseekConversations` 前再次读取最新存储值并进行基于最新值的合并更新（乐观合并），降低并发写回覆盖的风险。
  2. 内联 Blob Worker（记忆生成）写回逻辑已保持原有的竞态防护（基于 `lastSummarizedMessageCount` 的校验），不受此次修改影响。
- 风险与注意事项：
  - 这些改动主要是前端同步/并发写入的健壮性修复，已尽量采用向后兼容的方式（新增辅助函数并在关键路径处调用），回退时可逐项移除新增函数与调用点。
  - 若您希望我同时同步更新 `dist/` 下的打包产物或 README（中/英），请确认，我将继续同步修改并提交。
2025-11-17（新增：抽屉侧边栏 - 新建会话模型选择、模型展示与搜索扩展）
- 目的：在主页面抽屉（侧边栏）新建会话时允许选择会话使用的模型，并在抽屉历史会话列表中展示会话对应的模型名称；同时扩展抽屉搜索以匹配模型名称，提升会话可回溯性与搜索效率。
- 修改项：
  1. `index.html`：
     - 在“新建会话”模态中新增模型选择下拉（`#newChatModelSelect`），下拉优先使用 `config.html` 缓存的模型列表（localStorage 键：`openrouter.models.cache`），若无缓存则仅展示当前全局模型作为占位。
     - 在新建会话（模态确认与首次发送自动创建）时保存 `savedDeepseekConversations[].model` 字段，优先使用模态选择的模型，回退到 `localStorage.chatModel`、`window.MODEL_NAME`，再回退到默认 `minimax/minimax-m2:free`。
     - 在抽屉会话列表项中展示会话的模型徽章（`.model-badge`），并在创建后清理临时键 `deepseekNewConversationModel`（若用于其它逻辑）。
     - 扩展 `renderDrawerConversationsList()` 的过滤逻辑，使抽屉搜索同时匹配会话名、分组名与模型名。
  2. `style.css`：
     - 新增 `.model-badge` 与 `.modal-label` 的样式，保证模型徽章在窄屏下的截断与外观一致。
- 新增本地存储/短期临时键：
  - `deepseekNewConversationModel`（可选，已实现创建后清理；主要用于某些创建路径的临时存储，非持久配置键）。
- 验收：
  - 打开抽屉 → 点击“新建会话” → 在弹窗中可选择模型并确认 → 新会话出现在抽屉列表且其 `model` 字段被保存；抽屉会话项显示模型徽章；使用抽屉搜索能按模型名检索到会话。
- 回退：
  - 若需回退该功能，移除 `index.html` 中关于 `#newChatModelSelect` 的 DOM 与 JS 填充逻辑、还原 `renderDrawerConversationsList()` 的原始过滤逻辑，并删除新增的 `.model-badge` 样式即可回退前端行为（数据仍保存在 localStorage，需手动清理）。
2025-11-18（修复：会话模型同步问题 - 运行时读取模型）
- 目的：修复在抽屉中新建/加载会话后，主页面发送请求仍使用脚本初始化时缓存的模型名，导致模型选择未生效的问题。
- 修改项：
  1. `index.html` / `dist/index.html`：新增 `getCurrentModel()` 辅助函数，并在发送流程、日志与请求构建处使用 `getCurrentModel()` 读取运行时模型，避免依赖脚本级常量 `MODEL_NAME`（初始化缓存可能过时）。
  2. 保持对 `window.MODEL_NAME` 的写入兼容性（不会移除现有赋值），但发送/日志不再直接使用初始化时的常量。
- 验收：
  - 在抽屉中新建会话并选择非默认模型 → 打开会话 → 发送消息时，网络请求中 `model` 字段应与抽屉选择一致。
  - 从会话列表加载历史会话（包含 `model` 字段）→ 跳转到主页 → 发送消息时使用该会话保存的模型。
- 回退：
  - 恢复对 `MODEL_NAME` 常量的直接使用，或删除 `getCurrentModel()` 的替换调用即可回退本次行为改动。

2025-11-18（修复：会话管理页与主页面侧边栏样式/交互对齐）
- 目的：使独立的会话管理页（`conversations.html`）在视觉、排布和模态交互上与主页面的抽屉侧边栏保持一致，减少风格差异并复用现有样式/脚本组件，便于维护与用户认知一致性。
- 修改项：
  1. `conversations.html`：将会话/分组操作的交互替换为统一模态调用，新增会话重命名/移动到分组的输入模态调用；保留并复用 `showConfirmModal` 作为删除确认对话框，新增 `showInputModal`（见下）。
  2. `script.js`：新增 `showInputModal(opts)` 通用输入/选择模态函数，返回 Promise，兼容文本输入与下拉选择；与已有 `showConfirmModal` 使用相同的 `.modal` / `.modal-overlay` 样式与键盘行为（ESC 取消、回车确认）。
  3. `style.css`：无需改动样式主体，复用抽屉/模态现有规则；若后续需要可在 `.conversations-page` 作用域做小幅适配。
  4. `CURSOR.md`：记录本次变更并更新 `conversations.html` 的说明（已同步）。
- 影响与回退：
  - 影响：会话重命名/移动/分组重命名的弹窗现在使用项目统一的模态样式，提升一致性；原来使用的浏览器 prompt/alert 被替换为友好的模态交互。
  - 回退：可通过还原 `conversations.html` 中被替换的 prompt 调用、移除 `script.js` 中的 `showInputModal` 实现并恢复原有逻辑回退此改动。