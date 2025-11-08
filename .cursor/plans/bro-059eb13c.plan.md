<!-- 059eb13c-64a2-4621-98e4-caef941d7bbd 703e9173-d6d7-4a81-a351-52f6eedb5145 -->
# 调整对话气泡宽度方案

## 目标

- 将桌面端对话气泡 `.message` 调整为 `max-width: min(860px, 88%)`。
- 将移动端（≤480px）对话气泡调整为 `max-width: 94%`。
- 同步更新 `CURSOR.md` 主体与变更记录；核对并必要时更新 `README.md` 与 `README_zh.md`。

## 主要改动文件

- `style.css`
- `CURSOR.md`
- `README.md`, `README_zh.md`

## 具体编辑要点

1) 在 `style.css` 中修改基础消息样式：

```147:152:style.css
.message {
    max-width: min(860px, 88%);
    /* 其余属性保持不变 */
}
```

2) 在移动端规则处（已存在 `@media (max-width: 480px)`）：

```895:898:style.css
@media (max-width: 480px) {
    .message { max-width: 94%; }
}
```

3) `CURSOR.md`：

- 在“UI/样式/消息气泡”小节，更新默认宽度与移动端宽度描述。
- 在文档末尾“变更记录”追加本次改动摘要（时间、原因、文件与参数）。

4) `README.md` 与 `README_zh.md`：

- 若有对布局宽度的表述，更新为与上述一致；否则仅检查保持一致。

## 校验清单

- 桌面宽屏与中屏：消息列明显放宽但不超过 860px；代码块、表格仍不溢出。
- 移动端：单条消息与操作按钮不遮挡，仍有 3–4% 的边距。
- 无样式回归（如 `.message` 右内边距与操作按钮定位）。

### To-dos

- [x] 更新 style.css：.message 宽度为 min(860px, 88%)，移动端 94%
- [x] 同步 CURSOR.md 主体与变更记录，记录新宽度策略
- [x] 检查并更新 README 与 README_zh 中的布局描述