<!-- e59e4c74-8127-4d0c-b165-915549982fed 1790aac1-635d-4087-85d2-42fad28eedb9 -->
# 为会话保存并恢复所用模型（含列表展示与文档同步）

## 目标

- 保存会话时，将当前模型写入 `savedDeepseekConversations[].model`；
- 加载会话时，如存在 `model` 字段，则恢复为 `localStorage.chatModel`；
- 在会话列表中显示模型标签；
- 同步更新 `CURSOR.md`、`README.md`、`README_zh.md`。

## 关键改动

- index.html
- sendMessage 首次创建持久会话条目处：为 `newEntry` 增加 `model: window.MODEL_NAME`。
- upsertSavedConversationNow：每次节流持久化时同步 `saved[idx].model = window.MODEL_NAME`（符合“1.a 每次持久化更新”）。
- conversations.html
- saveCurrentConversation(name)：在 `conversationObj` 中增加 `model: window.MODEL_NAME`。
- loadConversation(conversationId)：若 `conversation.model` 存在，执行 `localStorage.setItem('chatModel', conversation.model)` 后跳回聊天页。
- renderConversationsList()：在会话名称旁渲染模型标签 `<span class="model-badge">{conversation.model || '未记录'}</span>`（分组与未分组两处）。
- style.css
- 新增 `.model-badge` 样式（小号、次要色、圆角背景）。
- 文档
- CURSOR.md：在“核心数据流/关键功能说明”加入“会话记录模型并在加载时恢复”；在“变更记录”追加本次变更。
- README.md、README_zh.md：在“会话管理/配置”处补充“每个会话记录并恢复模型”；中英文同步。

## 兼容与边界

- 旧数据无 `model` 字段：加载时不改动 `chatModel`，列表显示“未记录”。
- 不改动 API Key 逻辑与 UI 结构；仅增加模型标签与最小样式。

## 参考代码位（非最终代码，仅定位）

- index.html
- 自动创建：`sendMessage()` 中 `newEntry = { id, name, messages, summary, groupId, updatedAt, lastSummarizedMessageCount }` 处添加 `model`。
- 节流写回：`function upsertSavedConversationNow()` 内 `saved[idx].messages = ...;` 后追加 `saved[idx].model = window.MODEL_NAME;`。
- conversations.html
- 保存：`function saveCurrentConversation(name)` 里的 `conversationObj` 添加 `model`。
- 加载：`function loadConversation(conversationId)` 里在跳转前写入 `chatModel`（仅当有 `model`）。
- 列表：渲染会话卡片模板中在 `.conversation-name` 后追加模型徽标。
- style.css
- `.model-badge { font-size: 12px; color: #08327a; background: rgba(13,71,161,0.06); border: 1px solid rgba(13,71,161,0.12); padding: 2px 6px; border-radius: 6px; margin-left: 6px; }`

### To-dos

- [ ] 在 index.html 首次持久化会话时写入 model 字段
- [ ] 在 index.html 节流写回时同步更新会话的 model
- [ ] 在 conversations.html 保存会话对象时写入 model
- [ ] 在 conversations.html 加载会话时恢复 chatModel
- [ ] 在会话列表中显示模型标签并新增样式
- [ ] 同步更新 CURSOR.md 与中英文 README 的相关说明