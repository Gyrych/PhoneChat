<!-- b55dae8a-3215-4962-abd1-4c83aaa435d1 9f77a488-3dc0-4152-b7e9-78c8793d2c58 -->
# 修复侧边栏滚动、删除确认与移动端模型名显示

概述：

- 在 `style.css` 中对抽屉内记忆窗格添加受限高度与内部滚动，并确保选择器限定在 `.drawer` 作用域。这样展开后不会阻塞抽屉整体滚动，也能在内容较长时内部滚动。
- 在 `script.js` 中新增一个可复用的项目内确认模态 `showConfirmModal(message)`，返回 Promise；在 `index.html` 与 `conversations.html` 中把所有 `confirm(...)` 替换为该模态的调用（保留行为、仅把原有同步 `confirm` 改为异步模态）。
- 调整会话标题栏相关 CSS，确保 `#currentModelBadge` 在小屏上能换行显示，并确保 `updateCurrentModelBadge()` 在页面初始化时被调用以刷新徽章文本。

要修改的文件（按优先级）：

- `style.css`（添加/调整样式，限定到 `.drawer` 作用域，解决抽屉内滚动与记忆面板占行问题）。
- `script.js`（新增 `showConfirmModal` 与 `openModal`/`closeModal` 工具函数）。
- `index.html`（在抽屉中删除按钮使用新模态；确保初始化时调用 `updateCurrentModelBadge()`；如果需要，添加全局 confirm 模态 DOM）。
- `conversations.html`（在会话管理页把 `confirm` 替换为 modal）。
- `dist/style.css`, `dist/index.html`, `dist/conversations.html`（同步产物修改或在构建后由你选择是否同步，我会同时列出要改的产物文件以便打包发布）。

关键修改片段（简洁示例，仅示意，要在代码中精确替换）：

- style.css（在 `.drawer` 作用域中新增）：
```css
/* 限制展开记忆的最大高度并允许内部滚动，避免阻塞抽屉外层滚动 */
.drawer .conversation-summary-content,
.drawer .group-memory {
  flex-basis: 100%;
  width: 100%;
  box-sizing: border-box;
  margin: 6px 0;
  max-height: calc(50vh); /* 可调整为更合适的值 */
  overflow-y: auto;
}
```

- script.js（新增模态工具函数示例）：
```javascript
// 在 script.js 中新增（返回 Promise，使用现有 .modal/.modal-overlay 样式）
function showConfirmModal(message) {
  return new Promise((resolve) => {
    let overlay = document.getElementById('__globalConfirmModal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = '__globalConfirmModal';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal">
          <div class="modal-title">提示</div>
          <div class="modal-desc" id="__globalConfirmModalMsg"></div>
          <div class="modal-actions">
            <button id="__globalConfirmCancel">取消</button>
            <button id="__globalConfirmOk">确认</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
    }
    document.getElementById('__globalConfirmModalMsg').textContent = message;
    overlay.style.display = 'flex';
    const ok = document.getElementById('__globalConfirmOk');
    const cancel = document.getElementById('__globalConfirmCancel');
    function cleanup(result) {
      overlay.style.display = 'none';
      ok.removeEventListener('click', onOk);
      cancel.removeEventListener('click', onCancel);
      resolve(result);
    }
    function onOk() { cleanup(true); }
    function onCancel() { cleanup(false); }
    ok.addEventListener('click', onOk);
    cancel.addEventListener('click', onCancel);
  });
}
```

- index.html 中删除按钮替换示例（将原 `if (!confirm(...)) return;` 替换为异步调用）：
```javascript
// 原 synchronous:
// if (!confirm('确定要删除这个会话吗？')) return;
// 新的：
const confirmed = await showConfirmModal('确定要删除这个会话吗？');
if (!confirmed) return;
```

- session title（模型徽章）确保在初始化时刷新：
  - 在页面初始化（DOMContentLoaded）流程中调用 `updateCurrentModelBadge()`（若尚未调用）。

验收标准：

- 在主页面打开抽屉并展开会话或分组记忆后，抽屉仍可上下滚动，且对于超长记忆内容会显示内部滚动条（或分段显示）。
- 点击删除按钮出现项目内统一样式的模态确认框，用户确认后才删除条目；行为与原 `confirm()` 等价但 UI 一致性更好。
- 在手机浏览器上主页面会话标题栏可以显示并换行较长模型名称（长模型名不会被永久截断或隐藏），徽章文本在页面加载时正确更新。

回滚与兼容性：

- 我会把修改限定在 `.drawer` 作用域与新增的 `showConfirmModal` 函数，便于回退（删除新增 CSS 与 JS 即可回退）。

下一步：如果你确认该计划，我将按计划开始实现修改（先在 `index.html`/`style.css`/`script.js` 上做小幅编辑，并同步 `dist/` 的对应产物）。

### To-dos

- [ ] 修复抽屉内会话/分组记忆展开后导致无法滚动的问题
- [ ] 在 UI 内使用项目模态替换原始 window.confirm 删除流程
- [ ] 修正主页面标题栏模型徽章在手机上的显示与确保初始化刷新