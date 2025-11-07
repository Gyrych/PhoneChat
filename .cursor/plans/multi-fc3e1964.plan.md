<!-- fc3e1964-78bf-4a0c-844a-3d018ba278da 0047632b-7756-4337-8ecd-8ae8bd018d88 -->
# 为分组/会话记忆启用“多条 system 提示”并实现供应商兼容判定

## 目标

- 发送给模型时，将每个分组记忆、每个会话记忆分别作为独立的 `system` 消息；顺序可控、数量/长度可裁剪。
- 自动识别模型/供应商是否支持“多条 system”；不支持时合并为单条并清晰分段；一次性降级重试与本地缓存能力。

## 变更范围与关键文件

- `index.html`：请求装配、记忆注入、多 system 兼容与降级重试；新增能力判定与缓存。
- `config.html`：新增“system 合并策略”覆盖开关与“清空能力缓存”。
- `logger.js`：记录 system 条目数、是否合并、是否发生降级与关键字。
- `prompts.js`：如需集中管理“Web 搜索输出规范”等功能性 system 文案。
- `CURSOR.md`、`README.md`、`README_zh.md`：更新“多 system 注入策略、顺序、供应商兼容、配置项”。

## 判定与降级策略

- 静态映射（供应商前缀）：
  - 支持分条：openai、meta-llama、mistralai、deepseek、qwen、x-ai、minimax（保守，配合兜底）。
  - 不支持/单条语义：anthropic（Claude）、google（Gemini）、cohere、ai21。
- 运行时兜底：未知供应商默认先分条；若 4xx 且错误文本匹配“system only one / system_instruction / preamble / unsupported”等关键词，则合并为单条重试一次，并缓存结论（型号级优先，其次供应商级）。
- 用户覆盖：在设置页允许对“全局/当前型号/供应商”强制合并或强制分条；支持“一键清空能力缓存”。
- 本地缓存：`localStorage.freechat.capabilities` 保存 `{ [modelOrProvider]: { multiSystem: boolean } }`。

### 关键辅助函数（要点）

- `inferProviderFromModel(modelName)`：从 `openai/gpt-4o` 提取 `openai` 前缀。
- `supportsMultiSystem(modelName)`：合并“用户覆盖 → 本地缓存 → 静态映射 → 默认为 true”。
- `mergeSystemMessages(systemMsgs)`：用 `---` 分隔，将多条 system 合为一条，保留“[Group Memory]/[Session Memory]”段头。
- `sendWithMultiSystem(messages, model, fetcher)`：按支持性选择分条/合并；失败时基于错误关键字降级一次并缓存后重试。

## 记忆注入与顺序

- 新函数 `buildMemorySystemPrompts()` 返回 `Array<{ role: 'system', content: string }>`：

1) 全局/功能性系统提示（如 Web 搜索输出规范启用时置首）

2) 分组记忆（全部/仅当前，可配）

3) 当前分组内会话记忆（按更新时间裁剪、去重、限长/限条）

4) 历史消息（user/assistant）随后

- 若 `supportsMultiSystem(model)` 为 false：将第 1-3 步的 system 数组通过 `mergeSystemMessages()` 合并为单条。

## 配置与裁剪

- 本地配置键（示例）：
  - `freechat.memory.maxSessionsPerRequest`（默认 3-5）
  - `freechat.memory.maxCharsPerItem`（默认 800-1200）
  - `freechat.memory.inject.allGroups`（true=全部分组；false=仅当前）
  - `freechat.capabilities`（能力缓存对象）
  - 覆盖策略存储：`freechat.settings.multiSystem.override`（结构包含 global / perModel / perProvider）

## 日志扩展（logger.js）

- 新增字段：`sys.count`、`sys.merged`、`sys.degradedOnce`、`sys.degradeHint`、`sys.provider`。
- 在聊天主请求、自动会话记忆与分组记忆聚合三处记录。

## 文档更新

- 在 `CURSOR.md` 主体“记忆注入策略”与“请求构造流程”中补充“多 system 注入与兼容判定”。
- 在两份 README 中同步新增“多 system 行为说明、供应商差异、覆盖与缓存”。

## 简短示例

- 多 system（支持时）：
```json
{
  "messages": [
    {"role":"system","content":"Global policy & output"},
    {"role":"system","content":"[Web Search Rules] ..."},
    {"role":"system","content":"[Group Memory] 产品A…"},
    {"role":"system","content":"[Session Memory] 2025-11-05…"},
    {"role":"user","content":"开始今天的问题…"}
  ]
}
```

- 合并（不支持时）：
```
Global policy & output

---
[Web Search Rules] …

---
[Group Memory] 产品A…

---
[Session Memory] 2025-11-05…
```

### To-dos

- [ ] 将 buildMemorySystemPrompt 改为返回多条 system 消息
- [ ] 在请求组装处按顺序插入多条 system 消息
- [ ] 实现供应商兼容：不支持多 system 时自动合并
- [ ] 实现会话记忆去重、条数/长度裁剪与配置项
- [ ] 扩展日志，记录 system 条目数与来源
- [ ] 同步更新 CURSOR.md 与 README（中/英）