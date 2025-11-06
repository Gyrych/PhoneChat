<!-- c69068ed-4435-428d-aac7-de78d4757f60 a47dda86-fa4c-4ffb-9ec9-94c6f5c987fa -->
# FreeChat 原始会话日志（前端本地 + 导出）实施计划

## 目标

- 在纯前端实现原始会话日志：记录完整请求/响应（遮蔽 Authorization），含时间戳、模型、端点、会话ID/分组ID、耗时、错误信息等。
- 存储于 localStorage（可配置保留上限），支持一键导出 JSON/NDJSON 与清空。

## 变更范围与文件

- 新增：`logger.js`（前端轻量日志库）
- 编辑：
  - `index.html`（挂载聊天主请求、流式增量、自动摘要与分组记忆调用的日志）
  - `conversations.html`（挂载保存会话时摘要、重新生成摘要、分组记忆再聚合的日志；新增导出/清空按钮）
  - `README.md`、`README_zh.md`（新增“日志功能说明/使用方式/结构图”）
  - `CURSOR.md`（主体增加“日志架构与数据流”，并在文末追加变更记录）

## 日志数据结构（事件）

- 统一事件结构（存储为对象，导出支持 JSON 与 NDJSON）
```json
{
  "id": "evt_1730869000000_001",          // 唯一ID（时间戳+自增）
  "ts": "2025-11-06T12:34:56.789Z",       // ISO 时间戳
  "type": "chat_request|chat_stream|chat_done|summary_request|summary_done|groupmem_request|groupmem_done|error",
  "endpoint": "https://openrouter.ai/api/v1/chat/completions",
  "model": "minimax/minimax-m2:free",
  "conversationId": "<localStorage.deepseekConversationId>",
  "groupId": "<localStorage.deepseekConversationGroupId|null>",
  "req": {
    "headersMasked": {"Content-Type":"application/json","Authorization":"Bearer ***masked***"},
    "body": {"model":"...","messages":[...]}
  },
  "res": {
    "status": 200,
    "streamChunks": ["data: {…}", "data: {…}", "[DONE]"] , // 流式时可截断
    "final": {"choices":[...]}, // 非流式/汇总后
    "truncated": false
  },
  "error": {"message":"..."},
  "durationMs": 1234
}
```

- 保留策略：默认最多 1000 条事件（键：`freechat.log.maxEntries` 可配），超过即丢弃最旧事件（环形缓冲）。
- 大字段截断：`streamChunks` 与 `final` 超过约 1MB 时标记 `truncated=true` 并保留前缀。

## 掩码与隐私

- 所有请求头中的 `Authorization` 统一写入 `Bearer ***masked***`。
- 不额外采集设备/浏览器指纹；仅使用页面已有上下文（会话ID、分组ID、模型）。

## 新增 `logger.js`（核心职责）

- 暴露 API：
  - `Logger.config({ maxEntries })`
  - `Logger.start(event)` → `eventId`
  - `Logger.append(eventId, patch)`（用于流式逐步写入，如追加 `streamChunks`）
  - `Logger.end(eventId, finalPatch)`（写入结束时间与 `durationMs`）
  - `Logger.error(context, err)`（统一错误落库）
  - `Logger.export({ format: 'json'|'ndjson' })`（触发下载）
  - `Logger.clear()`（清空）
- 存储键：`freechat.logs`（数组，环形），`freechat.log.maxEntries`（数值，可选）

## 挂载点与插入位置（关键片段）

- `index.html`
  - 发送消息入口（开始事件：chat_request；结束事件：chat_done/错误）
```349:427:E:\NewWorkplace\13_FreeChat\index.html
async function sendMessage() {
  // …获取 messageText、构造 requestBody 前后
  const evtId = Logger.start({ type: 'chat_request', endpoint: DEEPSEEK_API_URL, model: MODEL_NAME, conversationId: localStorage.getItem('deepseekConversationId'), groupId: (localStorage.getItem('deepseekConversationGroupId')||null), req: { headersMasked: { 'Content-Type':'application/json','Authorization':'Bearer ***masked***' }, body: /* requestBody 占位，待 fetch 前赋值 */ } });
  // …调用 fetchDeepSeekResponseStream 后：Logger.end(evtId, { type:'chat_done' });
}
```

  - 流式响应处理（逐块写入：chat_stream；完成时补 final/时长）
```447:567:E:\NewWorkplace\13_FreeWorkplace\13_FreeChat\index.html
async function fetchDeepSeekResponseStream(apiKey, userMessage, aiMsgObj) {
  // …构造 requestBody / headers 后
  Logger.append(evtId, { req: { body: requestBody }});
  // 读取流时：
  Logger.append(evtId, { type:'chat_stream', res: { streamChunks: [line] } });
  // 结束：Logger.end(evtId, { res:{ final: /*可用*/ }, durationMs })
}
```

  - 自动摘要、分组记忆（请求/完成事件）
```575:623:E:\NewWorkplace\13_FreeChat\index.html
async function autoSummarizeIfNeeded() {
  const evtId = Logger.start({ type:'summary_request', /* endpoint/model/ids + req.body */});
  // fetch 后：Logger.end(evtId, { type:'summary_done', res:{ final:data } })
}
```
```631:668:E:\NewWorkplace\13_FreeChat\index.html
async function updateGroupMemory(groupId) {
  const evtId = Logger.start({ type:'groupmem_request', /* … */});
  // fetch 后：Logger.end(evtId, { type:'groupmem_done', res:{ final:data } })
}
```

- `conversations.html`
  - 保存会话生成摘要、重新生成摘要、分组记忆再聚合处同样包裹 `start/end`；
```196:272:E:\NewWorkplace\13_FreeChat\conversations.html
async function saveCurrentConversation(name) {
  const evtId = Logger.start({ type:'summary_request', /* …body… */});
  // fetch 后：Logger.end(evtId, { type:'summary_done', res:{ final:data } })
}
```
```605:646:E:\NewWorkplace\13_FreeChat\conversations.html
async function updateGroupMemory(groupId) {
  const evtId = Logger.start({ type:'groupmem_request', /* … */});
  // fetch 后：Logger.end(evtId, { type:'groupmem_done', res:{ final:data } })
}
```


## 导出与清空 UI

- 在 `index.html` 与 `conversations.html` 的页眉新增两个按钮：
  - “导出日志” → 选择 JSON/NDJSON 后下载 `freechat-logs-YYYYMMDD-HHMMSS.ndjson`。
  - “清空日志” → 确认对话后调用 `Logger.clear()`。
- 按钮样式复用现有按钮风格；放置在右上角，与“设置/历史”按钮并列。

## 可配置项

- `localStorage.freechat.log.maxEntries`（默认 1000）。
- `localStorage.freechat.log.enable`（默认 true；false 时跳过所有写入）。

## 失败与异常处理

- 任何日志写入异常不影响主流程（try/catch 保护）。
- 大字段截断而非抛错，落入 `truncated=true`。

## 修改原因与目的（逐项）

- 新增 `logger.js`：抽象统一日志写入、导出与清空，避免在各页面重复实现。
- 编辑 `index.html`：主对话与流式处理是日志的核心来源，需完整覆盖请求/响应全链路。
- 编辑 `conversations.html`：自动摘要/分组记忆属于隐式对话调用，纳入同源日志便于排查。
- 文档更新：确保使用者理解日志用途、隐私保护、存储上限与导出方法。

## 风险与限制

- localStorage 空间有限（不同浏览器配额不同），流式日志量大时可能触发截断/淘汰；建议及时导出并清空。
- 纯前端无法稳定获取响应头；仅记录状态码与内容体。

## 回滚与禁用

- 通过 `localStorage.freechat.log.enable=false` 立即停用日志写入；删除 `logger.js` 与按钮可完全回滚。

### To-dos

- [ ] 新增 logger.js（本地存储/导出/清空、环形缓冲、掩码）
- [ ] 在 index.html 挂载聊天请求与流式日志（start/append/end/error）
- [ ] 在 index.html 挂载自动摘要与分组记忆日志
- [ ] 在 conversations.html 挂载摘要与分组记忆日志
- [ ] 两页面头部新增“导出日志/清空日志”按钮与交互
- [ ] 更新 CURSOR.md 主体与变更记录；同步更新 README 与 README_zh