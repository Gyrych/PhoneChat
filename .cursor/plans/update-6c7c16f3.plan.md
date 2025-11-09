<!-- 6c7c16f3-9a47-410a-a090-d04996492cf1 d8cce6d0-6464-4378-aa4e-cc0c46bd9078 -->
# 更新模型选择列表与样式

概述：

- 将 `config.html` 与 `dist/config.html` 中的 `<select id="modelSelect">` 选项全部替换为用户提供的、按字母顺序排序且去重的模型列表；同时在 `style.css` 中添加小字号与禁止换行的样式，减小下拉项换行风险。最后在 `CURSOR.md`、`README.md` 与 `README_zh.md` 中同步更新“Model Configuration/默认回退模型”描述以保持文档一致性。

具体变更（按文件）：

- `config.html` / `dist/config.html`
  - 替换原有 `<select id="modelSelect">` 的 `<option>` 列表为下列条目（按字母顺序）：
```text
agentica-org/deepcoder-14b-preview:free
alibaba/tongyi-deepresearch-30b-a3b:free
arliai/qwq-32b-arliai-rpr-v1:free
cognitivecomputations/dolphin-mistral-24b-venice-edition:free
deepseek/deepseek-chat-v3-0324:free
deepseek/deepseek-chat-v3.1:free
deepseek/deepseek-r1:free
deepseek/deepseek-r1-0528:free
deepseek/deepseek-r1-0528-qwen3-8b:free
deepseek/deepseek-r1-distill-llama-70b:free
google/gemini-2.0-flash-exp:free
google/gemma-3-12b-it:free
google/gemma-3-27b-it:free
google/gemma-3-4b-it:free
google/gemma-3n-e2b-it:free
google/gemma-3n-e4b-it:free
meituan/longcat-flash-chat:free
meta-llama/llama-3.2-3b-instruct:free
meta-llama/llama-3.3-8b-instruct:free
meta-llama/llama-3.3-70b-instruct:free
meta-llama/llama-4-maverick:free
meta-llama/llama-4-scout:free
microsoft/mai-ds-r1:free
mistralai/mistral-7b-instruct:free
mistralai/mistral-nemo:free
mistralai/mistral-small-24b-instruct-2501:free
mistralai/mistral-small-3.1-24b-instruct:free
mistralai/mistral-small-3.2-24b-instruct:free
moonshotai/kimi-k2:free
minimax/minimax-m2:free
nvidia/nemotron-nano-12b-v2-vl:free
nvidia/nemotron-nano-9b-v2:free
nousresearch/hermes-3-llama-3.1-405b:free
openai/gpt-oss-20b:free
openrouter/polaris-alpha
qwen/qwen-2.5-72b-instruct:free
qwen/qwen-2.5-coder-32b-instruct:free
qwen/qwen2.5-vl-32b-instruct:free
qwen/qwen3-14b:free
qwen/qwen3-4b:free
qwen/qwen3-30b-a3b:free
qwen/qwen3-235b-a22b:free
qwen/qwen3-coder:free
tngtech/deepseek-r1t-chimera:free
tngtech/deepseek-r1t2-chimera:free
z-ai/glm-4.5-air:free
```

  - 保留 `<option value="">请选择模型</option>` 作为默认空项；其余旧选项将被删除。

- `style.css`
  - 新增或调整如下样式以减少换行并适当减小字号（示例）：
```css
/* 模型选择：减小字号并禁止选项换行 */
#modelSelect { font-size: 0.85rem; }
#modelSelect option { white-space: nowrap; }
```

- 文档（`CURSOR.md`, `README.md`, `README_zh.md`）
  - 在“默认演示/回退模型”与“Model Configuration”小节中同步替换旧模型列表说明，确认默认回退模型仍为 `minimax/minimax-m2:free`（该模型包含在新列表中）。

验收标准：

- `config.html` 与 `dist/config.html` 中下拉列表只包含上述新条目，按字母顺序且无重复；样式文件包含新的选择器样式；文档中的模型说明已同步。

风险与注意事项：

- `dist/` 目录可能为构建产物，直接修改会在下一次构建时被覆盖；我会按你选择同时修改 `dist/config.html`，但建议在后续构建流程中将生成文件同步更新或将源文件改为模板驱动。
- 部分模型名较长，仍可能在部分窄屏中显示截断，CSS 禁换行可能导致横向滚动。

下一步：

- 若你确认，我将开始按以上计划执行编辑（修改 `config.html`, `dist/config.html`, `style.css`, `CURSOR.md`, `README.md`, `README_zh.md`），并在完成后提交变更摘要供你审阅。你此前选择的两项已被纳入计划：在代码与文档同步替换（选 a），并采用默认样式调整（选 a）。

### To-dos

- [ ] 替换 `config.html` 中 `<select id="modelSelect">` 的 options 为新的按字母排序模型列表
- [ ] 替换 `dist/config.html` 中 `<select id="modelSelect">` 的 options 为相同的新模型列表
- [ ] 在 `style.css` 中添加 `#modelSelect` 与 `#modelSelect option` 的样式以减小字号并禁止换行
- [ ] 在 `CURSOR.md`、`README.md` 与 `README_zh.md` 同步更新模型说明与默认回退模型说明
- [ ] 在完成修改后检查文件并准备变更摘要供用户审阅