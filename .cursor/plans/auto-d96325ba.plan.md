<!-- d96325ba-e590-4d63-8ff3-66efe7b9b0d9 993b14b0-58bc-4723-ba0d-247385419b5d -->
# 实施计划：会话自动无感存储、自动摘要与记忆注入

## 目标

- 自动创建并持续更新持久会话，避免忘记手动保存与重复保存。
- 在每轮 AI 回复完成后自动生成会话摘要；若在分组内则自动刷新分组记忆。
- 在请求前将“分组记忆+会话摘要”合并为一条 system 消息注入，不污染可见历史。

## 变更范围

- 修改：`index.html`（发送逻辑、自动持久化与记忆注入）
- 修改：`conversations.html`（摘要与分组记忆调用一致化，键使用与回退逻辑）
- 不改：`prompts.js`（现有模板可复用）
- 文档：更新 `CURSOR.md`、`README.md`、`README_zh.md`

## 核心改动点

1) 会话自动无感存储（首次用户消息创建，之后节流更新）

- 在 `index.html`：
- 当 `sendMessage()` 首次入列用户消息且无 `deepseekConversationId` 时，创建持久会话项：
- 结构：`{ id, name, messages, summary, groupId, updatedAt, lastSummarizedMessageCount }`
- `name` 用“首条用户消息前20字”或时间戳；`groupId` 取 `currentConversationGroupId`。
- 引入 `upsertSavedConversation(throttled)`：
- 按 `deepseekConversationId` 更新 `savedDeepseekConversations[idx].messages/updatedAt`；
- 使用节流（约 1500ms）降低写频率；流结束后强制一次最终写入。

2) 自动会话摘要（防抖 + 去重）

- 在流结束处（`fetchDeepSeekResponseStream` 循环完成）触发 `autoSummarizeIfNeeded()`：
- 仅当 `messages.length > (lastSummarizedMessageCount||0)` 或 `summary` 为空时调用。
- 使用 `OPENROUTER_API_KEY`（若无则回退 `deepseekApiKey`），`MODEL_NAME` 与 `PROMPTS.SESSION_SUMMARY`。
- 成功后更新 `summary`、`lastSummarizedMessageCount = messages.length`、`updatedAt`；
- 若会话 `groupId` 存在，随后 `await updateGroupMemory(groupId)`。

3) 分组记忆刷新一致化

- 在 `conversations.html`：
- `updateGroupMemory()` 改为优先用 `OPENROUTER_API_KEY`，回退 `deepseekApiKey`；使用 `MODEL_NAME`；
- 维持现有提示词 `PROMPTS.GROUP_SUMMARY`。

4) 记忆注入到请求体

- 在 `index.html` 的 `fetchDeepSeekResponseStream()` 构造 `messagesPayload` 前：
- 查找当前 `deepseekConversationId` 对应的 `summary` 与 `groupId`；
- 若存在 `currentConversationGroupId`，从 `conversationGroups` 取该组的 `memorySummary`；
- 仅当“会话的 groupId == currentConversationGroupId”时注入会话摘要；
- 组合为一条 system 消息（先“分组记忆”，再“会话摘要”），再拼接历史消息：
- 示例：
- `content: "分组记忆:\n<groupMemory>\n\n会话摘要:\n<sessionSummary>"`

5) 去重与一致性

- 仅在不存在 `deepseekConversationId` 时创建；后续均为 upsert。
- 避免把 system 记忆写入 `currentConversation`；仅作用于请求体。

6) 文档同步

- `CURSOR.md`：补充数据流、自动存储/摘要机制与注入策略，并追加变更记录。
- `README.md`/`README_zh.md`：更新“功能概述、结构图、使用说明、依赖”中关于自动存储/摘要与记忆注入的说明。

## 风险与回退

- localStorage 写入频率：通过节流与“结束时最终写”控制；如仍感性能压力，可增大节流时间或仅在关键节点写。
- 摘要/记忆调用失败：不阻断主流程，按现有“失败不抛出”的策略继续。

### To-dos

- [ ] 在 index.html 首条用户消息时创建持久会话条目
- [ ] 实现并接入节流的 upsertSavedConversation 更新逻辑
- [ ] 实现自动会话摘要与 lastSummarizedMessageCount 去重机制
- [ ] 摘要成功后自动刷新分组记忆并统一 API Key 回退逻辑
- [ ] 在请求构造处合并一条 system 注入分组记忆与会话摘要
- [ ] 更新 CURSOR.md 主体与变更记录以反映改动
- [ ] 同步更新 README.md 与 README_zh.md 的说明与结构图