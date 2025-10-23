# CURSOR.md

## 项目主体内容（PhoneChat）

### 项目概述

PhoneChat 是一个轻量级的本地 Web 聊天应用，提供简单的聊天 UI，允许用户通过配置的外部聊天 API 发送消息，并在浏览器端本地管理会话与 API Key。

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

---

## 变更记录

- 2025-10-23 初始版本：添加 `README.md`（英文），`README_zh.md`（中文），以及 `CURSOR.md`（项目主体内容与初始变更记录）。

