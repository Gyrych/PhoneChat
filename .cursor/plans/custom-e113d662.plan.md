<!-- e113d662-59e0-4cd7-8776-4af5b544a59f f717a322-1ddb-4fbd-b7a1-ab7de4e8447d -->
# 为设置页实现自定义模型下拉组件（侵入式实现）

概述：

本计划在 `config.html`（及打包产物 `dist/config.html`）将原生 `<select id="modelSelect">` 替换为自定义下拉组件；样式写入 `style.css`，交互 JS 写入 `config.html` 的内联脚本（或单独引入脚本）。目标是在移动端避免模型名称自动换行、支持文本截断并能通过搜索快速定位完整模型名，同时保持本地存储行为不变（写入 `localStorage.chatModel`）。

修改文件（精确列表）：

- `config.html`：替换 DOM（移除 `<select id="modelSelect">`）并插入自定义组件的 HTML + 行为脚本。保留回退按钮与其它配置项不变。
- `dist/config.html`：同上，保持打包产物一致（同步修改）。
- `style.css`：新增样式段，包含自定义下拉的视觉与移动端触控适配（触控高度、截断、滚动、暗色/浅色兼容）。

关键实现要点（必读）：

1. HTML 结构（示例）——替换 `#modelSelect` 的位置：
```html
<div class="custom-select" id="customModelSelect" data-value="">
  <button class="custom-select__trigger" aria-haspopup="listbox" aria-expanded="false">
    <span class="custom-select__value">请选择模型</span>
    <i class="fas fa-caret-down"></i>
  </button>
  <div class="custom-select__panel" role="listbox" tabindex="-1">
    <input class="custom-select__search" placeholder="搜索模型" aria-label="搜索模型">
    <ul class="custom-select__options"></ul>
  </div>
</div>
```

2. CSS 要点（写入 `style.css`）——保证不换行并在窄屏下友好：
```css
/* 截断不换行，触控高度保证 */
.custom-select__value,
.custom-select__options li {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.custom-select__options li {
  min-height: 44px; /* 触控目标 */
  line-height: 1.2;
  padding: 8px 12px;
}
.custom-select__panel {
  max-height: 56vh;
  overflow: auto;
}
@media (max-width:600px) {
  .custom-select__trigger { font-size: 0.95rem; }
}
```

3. JS 要点（行内或外部脚本）：

- 在 DOMContentLoaded 时读取原页面 `<select>` 的 option 列表（如果存在），或直接从静态数组构建选项。
- 将选项渲染到 `.custom-select__options`，为每项设置 `title` 属性以便长按显示完整名称。
- 选中项时：更新 `.custom-select__value`、写入 `localStorage.chatModel`、并在 UI 上折叠面板。
- 搜索框：按子字符串过滤可见项，支持移动端软键盘输入。

示例核心函数片段：

```javascript
function buildCustomModelSelect(selectEl) {
  const options = Array.from(selectEl ? selectEl.options : []).filter(o => o.value).map(o => ({value:o.value,label:o.text}));
  const listEl = document.querySelector('#customModelSelect .custom-select__options');
  const valueEl = document.querySelector('#customModelSelect .custom-select__value');
  // render
  listEl.innerHTML = options.map(o => `<li role="option" data-value="${o.value}" title="${o.label}">${o.label}</li>`).join('');
  // click handler
  listEl.addEventListener('click', (e)=>{
    const li = e.target.closest('li'); if(!li) return;
    const v = li.dataset.value; valueEl.textContent = li.textContent; localStorage.setItem('chatModel', v);
    closePanel();
  });
}
```

4. 可访问性与兼容性：

- 面板使用 `role=listbox` 和 `role=option`，`aria-expanded` 随面板状态更新。
- 为每个 `li` 添加 `title`（在大多数移动浏览器长按会显示完整文本），并保留搜索输入以便查找全名。
- 如果浏览器或平台强制使用系统 picker（个别 Android 厂商），该方案仍会在页面内呈现自定义列表，规避原生 select 的样式受限问题。

回退与回滚：

- 直接保留原始 `config.html` 的备份（或在 git 中 revert）。实现完成后会在 `CURSOR.md` 的变更记录中追加本次修改摘要。

验收标准（验收步骤）：

- 桌面/移动浏览器打开 `config.html`，展开自定义下拉，所有模型项为单行显示并以省略号结尾，不出现换行。
- 在手机 Chrome/WebView 中可通过输入搜索并选择模型，所选值写入 `localStorage.chatModel` 并在返回 `index.html` 后生效。
- 确保触控目标高度 ≥44px，滚动性能良好，且键盘弹起时搜索仍可用。

预计时间与风险：

- 预计实现时间：约 30–60 分钟。风险：需同步修改 `dist/config.html`；注意保持原有保存/读取的键不变以免破坏持久化逻辑。

请确认：

- a) 我按以上计划实施（我将生成具体编辑清单并在得到你确认后开始改动）；
- b) 或者你想对交互细节（例如是否需要即时搜索高亮、是否添加清除按钮、是否展示完整模型名的 tooltip 按钮）做修改。

谢谢。

### To-dos

- [x] 在 config.html 添加自定义下拉 DOM 并移除原生 select
- [x] 在 style.css 增加自定义下拉的样式与移动端规则
- [x] 实现 JS：渲染选项、搜索、选择与 localStorage 同步
- [x] 将 dist/config.html 同步为修改后的 config.html
- [x] 在手机与桌面浏览器上手工验证行为与可访问性