# CURSOR.md

## 项目主体内容（FreeChat）

### 项目概述

FreeChat 是一个轻量级的本地 Web 聊天应用，提供简单的聊天 UI，允许用户通过配置的外部聊天 API 发送消息，并在浏览器端本地管理会话与 API Key。

### 技术栈与运行环境

- 技术栈：纯静态前端（HTML, CSS, JavaScript）。
- 运行环境：现代浏览器（支持 fetch 和 localStorage）。

### 主要文件说明

```1:1:index.html
<!DOCTYPE html>
<html lang="zh-CN">
```
- `index.html`：主页面，包含：
  - 聊天界面（消息展示区、输入区域、发送按钮）。
  - 消息持久化：使用 `localStorage` 的 `deepseekConversation` 保存当前会话。
  - API 调用：向 `DEEPSEEK_API_URL` 发起 POST 请求，使用 `deepseekApiKey` 作为 `Authorization: Bearer`。

```1:1:config.html
<!DOCTYPE html>
<html lang="zh-CN">
```
- `config.html`：设置页面，允许用户输入 DeepSeek API Key 并将其保存在 `localStorage`（键名 `deepseekApiKey`）。

```1:1:conversations.html
<!DOCTYPE html>
<html lang="zh-CN">
```
- `conversations.html`：会话管理：
  - 保存当前会话到 `savedDeepseekConversations`（localStorage）数组。
  - 加载已保存的会话到 `deepseekConversation`。
  - 删除已保存会话。

- `style.css`：为应用提供样式、布局以及响应式支持。
- `script.js`：包含辅助脚本（当前项目中用于导航链接）。

### 核心数据流

1. 用户在 `index.html` 输入消息并发送。
2. 消息追加到 `currentConversation` 并保存到 `localStorage`(`deepseekConversation`)。
3. 应用构造请求体并通过 `fetch` 向 `DEEPSEEK_API_URL` 发送请求，带上 `Authorization: Bearer <deepseekApiKey>`。
4. 收到响应后将 AI 响应追加到 `currentConversation`，渲染并保存。

### 已知限制与建议

- API Key 安全：当前实现将密钥以明文形式保存在 `localStorage`，不适合生产环境。建议使用后端代理或浏览器安全存储策略。
- 错误处理：对网络或 API 错误的提示有限，建议增强错误反馈与重试机制。
- CORS：运行时可能遇到跨域问题，依赖外部 API 的 CORS 配置。
 - 已迁移到 OpenRouter：项目已将默认请求端点从 DeepSeek 官方替换为 OpenRouter (`https://openrouter.ai/api/v1/chat/completions`) 并使用模型 `deepseek/deepseek-chat-v3.1:free`（密钥以前端 AES 混淆存储，生产环境建议后端代理）。
 - 已迁移到 OpenRouter：项目已将默认请求端点从 DeepSeek 官方替换为 OpenRouter (`https://api.openrouter.ai/v1/chat/completions`) 并使用模型 `deepseek/deepseek-chat-v3.1:free`（密钥以前端 AES 混淆存储，生产环境建议后端代理）。
 - 已迁移到 OpenRouter：项目已将默认请求端点从 DeepSeek 官方替换为 OpenRouter (`https://api.openrouter.ai/v1/chat/completions`) 并使用模型 `minimax/minimax-m2:free`（密钥以前端 AES 混淆存储，生产环境建议后端代理）。

---

## 变更记录

- 2025-10-23 初始版本：添加 `README.md`（英文），`README_zh.md`（中文），以及 `CURSOR.md`（项目主体内容与初始变更记录）。
 - 2025-10-26 实现会话分组与分组记忆功能：
   - 在 `index.html` 增加 `currentConversationGroupId` 支持，并在发送请求时将分组记忆注入为 system 提示词（若存在）。
   - 在 `conversations.html` 改写 `saveCurrentConversation`，保存会话时异步调用 DeepSeek 生成会话摘要并写入 `savedDeepseekConversations` 的 `summary` 字段；支持会话重命名、移动分组与展示摘要。
   - 新增 `updateGroupMemory` 方法：当分组下会话更新后，聚合该分组内所有会话摘要并调用 DeepSeek 进行二次摘要，结果保存到 `conversationGroups[].memorySummary`。
   - 在 `script.js` 添加 `storageGetJson` / `storageSetJson` 本地存储工具函数。
   - 在 `conversations.html` 添加分组创建 UI 与逻辑，分组信息保存在 `localStorage` 的 `conversationGroups` 键下。
   - 在 `conversations.html` 与 `index.html` 中实现了分组关联逻辑（保存会话时记录 groupId、在新会话时清理 groupId）。
  - 更新 TODO 状态：实现了实时保存扩展、摘要生成、分组 UI 的部分功能，正在完成分组记忆注入与文档同步。

- 2025-10-28: 在 `index.html` 中加入 Markdown 渲染支持：
  - 在页面头部引入 `marked` 和 `DOMPurify` 用于将 AI 回复渲染为安全的 HTML。
  - 修改 `renderMessages`：当消息角色为 `assistant` 时，使用 `marked.parse` 转换 Markdown，再用 `DOMPurify.sanitize` 清理，降级到纯文本显示以防渲染失败。
  - 目的：让 AI 回复可渲染 Markdown（例如代码块、有序列表、强调等）同时防止 XSS 攻击。
  - 注意：README 文件是否需要同步更新留待确认。