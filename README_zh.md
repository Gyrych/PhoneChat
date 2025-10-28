# PhoneChat

PhoneChat 是一个轻量级的本地 Web 聊天应用，允许用户通过外部聊天 API 发送消息、本地管理会话，并通过设置页面配置 API Key。

## 功能

- 通过配置的外部 API 接口（`DEEPSEEK_API_URL`）发送和接收消息。
- 将当前会话持久化到 `localStorage`。
- 保存、加载和删除命名会话。
- 复制和删除单条消息。
- 在 `config.html` 中配置 API Key（存储在 `localStorage`）。
 - 支持将会话归类为分组（文件夹），可重命名并在分组间移动会话。
 - 保存会话时自动调用 DeepSeek API 生成会话摘要并在会话列表中展示。
 - 会对分组内会话的摘要做聚合并生成分组记忆（使用 DeepSeek API），在同一分组内聊天时，该分组记忆会作为系统提示词注入以提供上下文记忆。

## 快速开始

1. 下载或克隆仓库。
2. 在浏览器中打开 `index.html`（无需构建步骤）。

## 配置

- 打开 `config.html` 并粘贴你的 DeepSeek API Key，然后点击 “保存设置”。该 Key 将以 `deepseekApiKey` 的键名保存在浏览器的 `localStorage` 中。

## 使用说明

- 在输入框中输入消息，点击发送按钮或按 Enter 发送。
- 使用会话按钮打开 `conversations.html`，以保存或加载会话。
- 保存的会话保存在 `localStorage` 的 `savedDeepseekConversations` 键下。

## 文件说明

- `index.html` — 主聊天页面与核心逻辑。
- `config.html` — 用于保存 API Key 的设置页面。
- `conversations.html` — 会话管理页面（保存/加载/删除）。
 - `conversations.html` — 会话管理页面（保存/加载/删除），支持分组管理、查看会话摘要与分组记忆。
- `style.css` — 应用样式。
- `script.js` — 用于导航按钮的小脚本。
 - `index.html` — 现在将 AI 助手的回复以 Markdown 渲染（使用 `marked`），并用 `DOMPurify` 进行安全过滤以防 XSS。

## 安全提示

- API Key 存储在 `localStorage` 中且未加密。如用于生产环境，建议通过后端或更安全的浏览器存储方案来保管 Key。

## 贡献

欢迎贡献，建议的工作流程：

1. Fork 仓库。
2. 创建功能分支。
3. 修改并测试。
4. 提交 Pull Request，说明你的变更。

## 许可证

本项目使用 MIT 许可证。
