<!-- 0ae20cb9-79dc-4c9a-a8bd-a508ac453115 5d37feff-ba55-4439-8d93-07618057510b -->
# FreeChat UI 修复计划

## 问题分析

根据代码分析，发现以下问题根源：

### 1. 便签跳动、屏幕闪烁

**根因：**

- `style.css` 第1672-1720行：便签卡片存在多个动画效果
  - `stickySlideIn` 动画（0.5s弹性动画）
  - `:nth-child(odd/even)` 交替旋转效果
  - `:hover` 时的变换效果
- 大模型输出时频繁调用 `renderMessages()` 导致DOM重绘

**解决方案：**

- 保留基础便签样式，移除旋转和弹性动画
- 添加 `will-change` 优化渲染性能
- 使用 `transform: translateZ(0)` 启用GPU加速

### 2. 背景条纹问题

**根因：**

- `style.css` 第60-65行：`.app-shell` 有渐变背景
- 第430-448行：`.chat-body` 有纸张纹理背景（`repeating-linear-gradient`）
- 第880-902行：`.conversation-sidebar/.conversation-content` 有木纹纹理背景
- 第452-471行：`.chat-header` 有纸张纹理背景

**解决方案：**

- 移除所有 `background-image` 的纹理效果
- 统一使用纯白色背景 `#ffffff`
- 保留基础的 `border` 和 `box-shadow` 以维持视觉层次

### 3. 便签与对话框距离过大

**根因：**

- `style.css` 第1675行：`.sticky-note-card` 的 `margin: 12px 0`
- 第1574行：`.message-container` 的 `gap: 8px` 可能不够紧凑
- 第430-448行：`.chat-body` 的 padding 可能导致额外间距

**解决方案：**

- 减小 `.sticky-note-card` 的 margin 为 `6px 0`
- 调整 `.message-container` 的 gap 为 `4px`
- 优化 `.chat-body` 的 padding 设置

### 4. 标题栏固定与滚动弹性

**根因：**

- `style.css` 第82-84行：`.app-bar` 已经是 `position: sticky` 是正确的
- 但可能存在移动端浏览器默认的滚动弹性效果
- `index.html` 中可能缺少 `touch-action` 和 `overscroll-behavior` CSS属性

**解决方案：**

- 为 `html, body` 添加 `overscroll-behavior: none` 禁用滚动弹性
- 为 `.message-container` 添加独立滚动容器
- 确保 `.app-bar` 和 `.chat-header` 保持固定

### 5. 会话管理页面移动端适配

**根因：**

- `style.css` 第837-842行：`.conversation-layout` 在小屏幕下仍是 grid 布局
- 第844-878行的媒体查询在 `max-width: 900px` 才切换为单列
- 可能存在内容超出视口宽度的元素

**解决方案：**

- 调整媒体查询断点为 `max-width: 768px`
- 为 `.conversation-sidebar` 和 `.conversation-content` 添加 `overflow-x: hidden`
- 确保所有子元素使用 `max-width: 100%`

### 6. 会话管理页面布局重组

**根因：**

- `conversations.html` 第41-109行：当前布局是左侧边栏+右侧内容
- 用户需求：上下两个明确区域（分组管理+会话管理）

**解决方案：**

- 修改 `conversations.html` 结构为上下两个独立区域
- **上部分组管理区域**包含：
  - 新建分组功能
  - 分组列表（带记忆展示、重命名、记忆重生成按钮）
- **下部会话管理区域**包含：
  - 新建会话功能
  - 按分组归类的会话列表（可折叠）
  - 每个会话包含：记忆展示、加载、重命名、移动、删除、记忆重生成、模型名称
- 移除分组删除按钮（保留分组重命名和记忆重生成）

## 实施步骤

### 步骤1：修复便签跳动与闪烁

**文件：** `style.css`

**修改内容：**

- 移除 `.sticky-note-card` 的 `animation: stickySlideIn` 和 `@keyframes stickySlideIn`
- 移除 `:nth-child(odd/even)` 的旋转效果
- 简化 `:hover` 效果
- 添加 `will-change: transform` 和 GPU 加速

### 步骤2：移除所有纹理背景

**文件：** `style.css`

**修改内容：**

- `.app-shell`：移除渐变背景，改为 `background: #f8f9fa`（浅灰）或 `#ffffff`
- `.chat-body`：移除纸张纹理，改为 `background: #ffffff`
- `.chat-header`：移除纸张纹理，改为 `background: #ffffff`
- `.conversation-sidebar/.conversation-content`：移除木纹，改为 `background: #ffffff`
- `.group-panel`：移除纸张纹理，改为 `background: #ffffff`
- `.drawer-item`：移除纹理，改为 `background: #ffffff`

### 步骤3：调整便签间距

**文件：** `style.css`

**修改内容：**

- `.sticky-note-card` 的 margin 改为 `6px 0`
- `.message-container` 的 gap 改为 `4px`
- 调整 `.chat-body` 的 padding 为合适值

### 步骤4：固定标题栏并移除滚动弹性

**文件：** `style.css`

**修改内容：**

- 在 `html, body` 选择器中添加：
  ```css
  html, body {
    overscroll-behavior: none;
    -webkit-overflow-scrolling: touch;
  }
  ```

- 为 `.message-container` 添加独立滚动：
  ```css
  .message-container {
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
  }
  ```

- 确保 `.app-bar` 保持 `position: sticky; top: 0; z-index: 1200`

### 步骤5：修复会话管理页面移动端适配

**文件：** `style.css`

**修改内容：**

- 调整 `.conversation-layout` 媒体查询为 `max-width: 768px`
- 为 `.conversation-sidebar`、`.conversation-content` 添加：
  ```css
  overflow-x: hidden;
  max-width: 100%;
  ```

- 确保所有表格、卡片、按钮等元素响应式

### 步骤6：重组会话管理页面布局

**文件：** `conversations.html` 和 `style.css`

**HTML 结构调整：**

```html
<main>
  <!-- 上部：分组管理区域 -->
  <section class="group-management-section">
    <header>
      <h2>分组管理</h2>
      <button id="createGroupBtn">新建分组</button>
    </header>
    <div class="group-list">
      <!-- 分组列表，每个分组包含：记忆展示（可折叠）、重命名、记忆重生成 -->
    </div>
  </section>
  
  <!-- 下部：会话管理区域 -->
  <section class="conversation-management-section">
    <header>
      <h2>会话管理</h2>
      <button id="newChatBtn">新建会话</button>
    </header>
    <div class="conversation-list">
      <!-- 按分组归类的会话列表（可折叠） -->
    </div>
  </section>
</main>
```

**CSS 样式调整：**

- 创建 `.group-management-section` 和 `.conversation-management-section` 样式
- 使用 `flex-direction: column` 垂直排列
- 每个区域独立滚动，带明确的标题和操作区
- 统一按钮样式，确保UI风格一致

## 验证清单

- [ ] 便签不再跳动，大模型输出时屏幕平滑
- [ ] 主页面、配置页面、会话管理页面背景为纯白色
- [ ] 便签之间间距合理紧凑
- [ ] 标题栏固定，滚动无弹性效果
- [ ] 会话管理页面在移动端无左右滚动
- [ ] 会话管理页面布局清晰，分为上下两个区域
- [ ] 分组列表包含记忆展示、重命名、记忆重生成，无删除按钮
- [ ] 会话列表包含完整功能：记忆、加载、重命名、移动、删除、记忆重生成、模型名称
- [ ] 更新 `CURSOR.md` 记录所有变更

## 依赖关系

- 步骤1-3可以并行进行（都是CSS修改）
- 步骤4-5可以并行进行
- 步骤6依赖前5步完成后进行（HTML结构调整）

### To-dos

- [ ] 修复便签跳动与闪烁：移除动画和旋转效果，添加GPU加速
- [ ] 移除所有页面的纹理背景，统一使用白色背景
- [ ] 调整便签间距：减小margin和gap值
- [ ] 固定标题栏并移除滚动弹性效果
- [ ] 修复会话管理页面移动端适配问题
- [ ] 重组会话管理页面布局为上下两个区域
- [ ] 更新CURSOR.md文档记录所有变更