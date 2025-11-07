<!-- ab44d589-a78e-4659-a730-b9670766f73f da693552-bd7d-4bdf-836e-460f406b83c8 -->
# 集中管理“联网搜索综合提示”的实施方案

## 目标

- 将 `index.html` 中硬编码的联网搜索系统提示迁移到 `prompts.js` 统一管理。
- 保持功能不变：启用 Web 插件时，仍在系统消息最前注入该提示。
- 同步更新 `CURSOR.md` 主体与变更记录，说明提示来源于 `PROMPTS.WEB_SYNTHESIS`。

## 涉及文件

- `prompts.js`
- `index.html`
- `CURSOR.md`

## 现状（待迁移的内联提示）

下面这段存在于 `index.html` 的 `buildWebSynthesisPrompt()` 中：

```1330:1341:e:\NewWorkplace\13_FreeChat\index.html
function buildWebSynthesisPrompt() {
    try {
        return [
            '你可以访问最新的联网检索结果。请按如下要求生成回答：',
            '1) 先直接给出“最终答案”，不要只给网址；用简洁结构化中文回答。',
            '2) 如问题涉及时间/日期，按中国时区口径（Asia/Shanghai）。',
            '3) 如问题涉及天气：包含地点名、当前天气现象、温度(℃)、体感温度、风向风速、湿度/降水、数据时间戳。',
            '4) 仅在答案之后追加“参考来源”列表；每条用域名作为 Markdown 链接文本并指向原文。',
            '5) 多来源不一致时进行交叉核验，必要时标注不确定性并说明原因；避免臆测。',
            '6) 不输出工具调用标记或与用户无关的内部调试信息。'
        ].join('\n');
    } catch (_) {
        return '';
    }
}
```

## 变更方案

1) 在 `prompts.js` 新增常量：`window.PROMPTS.WEB_SYNTHESIS`

- 内容为上述多行提示的模板字符串（按原文逐行保持一致）。
- 继续采用全局 `window.PROMPTS` 命名空间；中文注释说明用途。

2) 改造 `index.html` 的 `buildWebSynthesisPrompt()`

- 实现由“返回内联数组拼接”改为“返回 `window.PROMPTS.WEB_SYNTHESIS`（若存在）”；
- 若未加载到 `prompts.js` 或字段缺失，安全返回空字符串（保持当前 try/catch 结构）。
- 注入处（`injectedMsgs.push({ role: 'system', content: webSynthPrompt })`）无需变动。

3) 更新 `CURSOR.md`

- 在“联网搜索架构与数据流 → 结果综合系统提示”小节补充：系统提示来源 `PROMPTS.WEB_SYNTHESIS`；
- 追加变更记录（日期+本次迁移说明）。

## 不变更项

- `config.html` 的 `freechat.web.searchPrompt`（供应商检索提示覆盖项）为另一用途，不做合并；
- UI 文案如“参考来源”属显示文本，不归入提示词模板管理。

## 风险与回退

- 若 `prompts.js` 未加载将导致无法注入该系统提示；当前保留空字符串回退，逻辑安全。

## 验收点

- 启用 Web 插件后，请求的首条 system 消息内容与迁移前一致；
- 在 `prompts.js` 能看到 `WEB_SYNTHESIS` 常量；
- `CURSOR.md` 主体和变更记录已更新。

### To-dos

- [ ] 在 prompts.js 添加 PROMPTS.WEB_SYNTHESIS 常量
- [ ] index.html 改造 buildWebSynthesisPrompt 读取 PROMPTS.WEB_SYNTHESIS
- [ ] 更新 CURSOR.md 主体说明与追加变更记录，指明提示来源