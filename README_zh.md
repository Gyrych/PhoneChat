# FreeChat

FreeChat 是一个轻量级的本地 Web 聊天应用，适用于本地演示和快速原型开发。用户可以通过配置的外部聊天 API 发送消息、本地管理会话；默认使用内置加密的演示 OpenRouter Key，也可通过 localStorage 设置自己的 Key；设置页仅负责配置模型（不配置 API Key）。

## 功能

- 通过可配置的外部 API 接口发送和接收消息。
- 自动无感持久化：首条消息即创建持久会话条目，后续以节流方式持续写回（无需手动保存）。
- 保存、加载、删除与重命名会话。
- 将会话按分组管理，自动生成会话记忆，并自动刷新分组记忆。
- 在每次请求前以一条 system 消息注入记忆：
  - 注入“所有分组”的分组记忆（可配置，仅当前分组或全部分组）；
  - 注入“当前分组内所有会话”的会话记忆（可配置）。
- 将 AI 回复以 Markdown 渲染（使用 `marked`）并用 `DOMPurify` 进行消毒以防 XSS。
- 在会话管理页新建会话时，会弹窗询问是否加入已有分组（下拉选择），并可为新会话命名。
- 主聊天页顶部显示当前模型徽标。
- 对于具备“思考”能力的模型（如 DeepSeek-R1），当 API 返回推理内容时，将以流式形式显示在助手正文“上方”，默认展开，用户可点击按钮收起/展开。
- 内置请求/响应日志：记录到 localStorage（遮蔽 Authorization），并提供导出/清空按钮。
 - 现代浅色主题 + 简洁科技风，头部/输入区/AI 气泡/卡片采用磨砂玻璃质感（Glassmorphism）。
 - 字体：Inter 用于英数，中文回退系统字体；通过 CSS 变量实现响应式字号。
 - 联网搜索（OpenRouter Web 插件）：可选开启在线检索增强，支持引擎选择、结果数、上下文强度与自定义搜索提示，并在回复下方渲染引用链接。

## 默认（演示）API 配置

- 默认演示端点：`https://openrouter.ai/api/v1/chat/completions`
- 默认演示模型：`minimax/minimax-m2:free`

说明：以上默认设置仅用于演示/回退。生产环境请使用后端代理并在服务器端安全管理 API Key。

## 快速开始

1. 下载或克隆仓库。
2. 在浏览器中打开 `index.html`（无需构建步骤）。

## 配置

1. 打开 `config.html`，从下拉菜单选择模型并点击“保存”，模型会以 `chatModel` 键写入 `localStorage`。
2. 每个已保存会话会在 `savedDeepseekConversations[].model` 记录其所用模型；在 `conversations.html` 加载该会话时，如存在 `model` 字段，会自动恢复到 `localStorage.chatModel`。
3. 演示默认使用内置的加密 OpenRouter Key（仅用于演示，不可用于生产）。
4. 如需使用你自己的 Key，可在浏览器控制台执行 `localStorage.setItem('deepseekApiKey', 'YOUR_KEY')`，或替换 `index.html` 中的加密串；会话记忆与分组记忆也会读取该值作为替代。

### 联网搜索（OpenRouter 插件）

- 点击页面头部的“地球”图标打开 Web 面板。
- 面板项会持久化到 `localStorage`，启用后每次请求自动生效。

面板字段与存储键：
- `freechat.web.enable` — `true`/`false`（默认 `false`）
- `freechat.web.engine` — `auto | native | exa`（为 `auto` 时不显式写入，走供应商默认：支持原生则用原生，否则回退 Exa）
- `freechat.web.maxResults` — 整数 1..10（默认 5）
- `freechat.web.contextSize` — `low | medium | high`（为空则不指定）
- `freechat.web.searchPrompt` — 字符串（为空则使用 OpenRouter 默认提示）

行为说明：
- 启用后，请求体将包含 `plugins: [{ id: "web", ... }]`，并可选写入 `web_search_options.search_context_size`。
- 当返回 `message.annotations[].url_citation` 时，会在助手消息下方显示“参考来源”列表（使用域名作为链接文本）。

定价要点（详见官方文档）：
- Exa：按 1000 条结果 $4 计费（默认 5 条 ≈ 每次请求 $0.02），另计模型用量。
- Native：按模型提供商透传价格（OpenAI/Anthropic/Perplexity），与“搜索上下文强度”相关。

### 会话/分组记忆的模型选择策略

- 会话记忆生成（自动与手动）优先使用该会话记录的模型（`savedDeepseekConversations[].model`），若缺失则回退到全局 `window.MODEL_NAME`，再兜底 `'minimax/minimax-m2:free'`。
- 分组记忆生成始终使用全局模型。

### 记忆注入开关（通过 localStorage 配置）

- `freechat.memory.inject.allGroups` — `true`/`false`（默认 `true`）：注入全部分组记忆，或仅当前分组记忆。
- `freechat.memory.inject.groupSessions` — `true`/`false`（默认 `true`）：注入“当前分组内全部会话”的记忆。
- `freechat.memory.maxConvPerGroup` — 当前分组最多注入的会话摘要条数（默认 `10`）。
- `freechat.memory.maxCharsPerSection` — 每个注入段的最大字符数（默认 `4000`）。
- `freechat.memory.preSummarize` — `true`/`false`（默认 `false`）：是否在首轮发送前预生成“当前会话摘要”，以便首轮也能注入。

## 使用说明

### 基础聊天
1. 在底部输入框中输入您的消息
2. 按回车键或点击发送按钮
3. AI回复将显示在聊天区域
4. 您可以使用每条消息旁边的按钮复制或删除消息
5. 在响应生成过程中，会出现一个停止按钮（仅 UI 效果，当前不会中止网络请求；后续可引入 AbortController）
6. 顶部导航栏会显示当前使用的模型徽标
7. 若使用思考类模型且服务商返回推理内容，将在助手正文“上方”流式出现思考内容，默认展开；可点击按钮收起/展开

### 模型配置
1. 点击顶部导航栏中的设置按钮
2. 从下拉菜单中选择您偏好的模型（选项包括minimax、deepseek、glm等）
3. 保存您的配置
4. 返回聊天页面使用所选模型

### 会话管理
1. 点击顶部导航栏中的会话按钮
2. 查看按日期组织的所有聊天记录
3. 创建会话分组以便更好地组织
4. 会话记忆在每轮 AI 回复结束后自动生成
5. 分组记忆在会话记忆更新后自动刷新；注入时会包含“全部分组记忆 + 当前分组全部会话记忆”（受到上述开关控制）
6. 加载之前的会话或创建新会话
7. 新建会话时会弹出分组选择与命名对话框，可选择已有分组（可选）并设置名称（可选）
8. 会话列表在名称旁显示模型徽标；加载会话时会恢复其模型

## 文件说明

- `index.html` — 主聊天页面与核心逻辑；包含演示用加密 OpenRouter Key。
- `config.html` — 模型选择器（保存到 `localStorage` 键 `chatModel`）。
- `conversations.html` — 会话管理页面（保存/加载/删除、分组管理、记忆查看/重新生成）。
- `prompts.js` — 提示词模板，集中管理会话记忆与分组记忆提示词。
- `logger.js` — 轻量前端日志库（localStorage 环形存储；导出/清空 UI 挂载）。
- `style.css` — 应用样式。
- `script.js` — 可选的共用脚本（导航、JSON 存储助手），当前默认未引入。
- `tools/encrypt_key.js` — API 密钥加密工具占位文件。

Mermaid 项目结构图：

```mermaid
flowchart TB
  A[index.html] --> C[style.css]
  A --> D[config.html]
  A --> E[conversations.html]
  A --> F[prompts.js]
  A --> G[logger.js]
  A -- Web 插件参数 --> A
  E --> F
  E --> G
```

## 依赖

- `marked` — Markdown 解析器，用于渲染 AI 回复中的 Markdown 内容。
- `DOMPurify` — 对渲染的 HTML 进行消毒以防 XSS。
- `CryptoJS` — 用于对演示 OpenRouter Key 进行 AES 解密。
- `Font Awesome` — 界面使用的图标库。
- `logger.js` 为内部工具（无外部依赖）。
 - `Inter` — 英文字体，通过 Google Fonts 加载；中文回退到系统字体。

所有库均通过 HTML 文件中的 CDN 引入，无需构建步骤。
说明：玻璃质感依赖 `backdrop-filter`；在不支持的环境会优雅降级为半透明实体背景。

## 安全提示

- API Key 存储：在 `localStorage` 中保存 Key 仅适用于演示，生产环境请使用后端代理与服务器端安全存储。
- CORS：客户端直接调用外部 API 可能受 CORS 限制，建议使用后端代理避免跨域问题。

## 请求/响应日志

- 目的：用于问题排查，记录原始请求/响应元数据。
- 存储：`localStorage` 键 `freechat.logs`，环形缓冲（默认最多 1000 条）。
- 隐私：始终将 `Authorization` 遮蔽为 `Bearer ***masked***`；不采集设备指纹。
- 界面：
  - 在 `index.html` 与 `conversations.html` 右上角提供两个按钮：
    - 导出日志（可选 JSON 或 NDJSON）
    - 清空日志（不可恢复）
- 配置（通过 `localStorage`）：
  - `freechat.log.maxEntries` — 最大保存条目数（默认 1000）
  - `freechat.log.enable` — `true`/`false` 开启/关闭日志

事件示例（截断）：

```json
{
  "id": "evt_1730869000000_001",
  "ts": "2025-11-06T12:34:56.789Z",
  "type": "chat_request|chat_stream|chat_done|summary_request|summary_done|groupmem_request|groupmem_done|error",
  "endpoint": "https://openrouter.ai/api/v1/chat/completions",
  "model": "minimax/minimax-m2:free",
  "conversationId": "...",
  "groupId": null,
  "req": {"headersMasked": {"Content-Type": "application/json", "Authorization": "Bearer ***masked***"}, "body": {"model": "..."}},
  "res": {"status": 200, "streamChunks": ["data: {...}"], "truncated": false},
  "error": null,
  "durationMs": 1234
}
```

## 贡献

欢迎贡献。建议流程：

1. Fork 仓库。
2. 创建功能分支。
3. 本地修改并测试。
4. 提交 Pull Request 并描述你的变更。

## 许可证

本项目采用 MIT 许可证。
