<!-- 8ad557fd-dfea-4b07-b06c-e011264eb652 b74581d3-1861-4d1a-9618-21bf47b21e8d -->
# 修复移动端页眉遮挡问题

**目标**：在移动端（默认断点：宽度 ≤ 768px）修复 `#sessionTitleBar`（`.session-title`）遮挡消息首行的问题。实现方式为：在移动端将标题栏设为顶部固定（fixed），同时给主聊天容器增加等高的 `padding-top`，确保内容不会被遮挡；样式变更放在 `style.css`，并在修改后同步更新 `CURSOR.md` 与 README（中/英）。

**要修改的文件**：

- `style.css` （主要修改点）
- `index.html` （仅在必要时检查，无必需 DOM 变更）
- `CURSOR.md` / `README.md` / `README_zh.md`（记录变更说明）

**具体 CSS 片段（将加入 `style.css` 的合适位置）**：

```css
/* 移动端：使会话标题栏在顶部固定并为主容器留出空间，避免遮挡首条消息 */
@media (max-width: 768px) {
  .session-title {
    position: fixed; /* 顶部固定 */
    top: env(safe-area-inset-top); /* 兼容刘海屏 */
    left: 0;
    right: 0;
    width: 100%;
    z-index: 1000; /* 确保在消息之上 */
  }
  .chat-container {
    /* 56px 为 session-title 的预期高度；如实际高度不同会进行微调 */
    padding-top: calc(56px + env(safe-area-inset-top));
  }
}
```

**实施步骤（按序）**：

1. 在 `style.css` 中定位与 `.session-title`、`.chat-container` 有关的现有规则，合并/覆盖或追加上面媒体查询（确保不破坏桌面样式）。
2. 在移动端断点下（默认 768px）应用上面样式；若 `.session-title` 在 CSS 中已使用 `height` 或 `padding`，优先使用其实际高度替换 `56px`，或改为用 CSS 变量 `--session-title-height` 并统一维护。
3. 本地用浏览器设备仿真（移动尺寸）验证：

   - 确认标题栏固定且不遮挡消息首行；
   - 确认消息容器滚动行为正常（`scrollToBottom()` 保持可用）；
   - 验证刘海屏间距（iOS/Android）是否正确。

4. 若需要微调：将 `56px` 调整为实际高度或改为变量并在 `.session-title` 中显式设置 `height`。
5. 更新文档：在 `CURSOR.md` 的变更记录末尾追加本次修改说明（中文），并同步更新 `README.md` / `README_zh.md` 中“界面风格/移动端适配”段落，简要说明修改原因与效果。

**回滚方法**：删除或注释新增的媒体查询即可恢复原状。

**验收标准**：

- 在手机视口（≤768px）打开页面，顶部标题栏不遮挡消息第一行（视觉上有顶部间距）；
- 页面在桌面视口保持现有外观；
- 已在 `CURSOR.md` 中记录本次变更。

**风险与注意事项**：

- 如项目中已有针对 `.session-title` 的其他移动端样式（例如 transform/translate/position），需要合并处理以避免冲突；计划中包含查找并合并该规则的步骤。
- 若你希望标题栏改为不固定（即直接成为文档流元素），请回复“改为文档流”，我会把实现方案改为在移动端将 `.session-title` 设为 `position: static` 并移除 `padding-top` 的做法。

### To-dos

- [ ] 在 `style.css` 中添加移动端媒体查询，调整 `.session-title` 与 `.chat-container` 的样式以避免遮挡
- [ ] 更新 `CURSOR.md` 与 `README.md` / `README_zh.md`，记录本次样式修改原因与回滚说明
- [ ] 在浏览器移动视口模拟下验证标题栏不再遮挡消息，必要时微调高度或变量