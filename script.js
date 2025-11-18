/**
 * 文件名：script.js
 * 功能描述：FreeChat 共用工具函数，提供localStorage的JSON读写功能和页面导航功能
 */
// 会话管理按钮事件
// 绑定会话管理按钮（存在时绑定，避免在其它页面引发错误）
const _conversationsBtn = document.getElementById('conversationsBtn');
if (_conversationsBtn) {
    _conversationsBtn.addEventListener('click', () => {
        window.location.href = 'conversations.html';
    });
}

/**
 * 安全读取JSON数据
 * 功能：从localStorage读取指定键的JSON数据，解析失败时返回默认值
 * 参数：key - localStorage键名，defaultValue - 解析失败时的默认返回值
 * 返回值：解析后的JSON对象或默认值
 */
function storageGetJson(key, defaultValue) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : defaultValue;
    } catch (e) {
        console.error('解析 localStorage 数据失败：', key, e);
        return defaultValue;
    }
}

/**
 * 安全写入JSON数据
 * 功能：将JSON对象安全地写入localStorage，写入失败时记录错误日志
 * 参数：key - localStorage键名，value - 要写入的JSON对象
 * 返回值：无
 */
function storageSetJson(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error('写入 localStorage 失败：', key, e);
    }
}

/**
 * 项目内统一的确认模态框（返回 Promise）
 * 用法：const ok = await showConfirmModal('确定要删除吗？');
 * 说明：使用已有的 `.modal-overlay` / `.modal` 样式，若不存在则动态创建
 */
function showConfirmModal(message) {
    return new Promise((resolve) => {
        try {
            let overlay = document.getElementById('__globalConfirmModal');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = '__globalConfirmModal';
                overlay.className = 'modal-overlay';
                overlay.style.display = 'none';
                overlay.style.alignItems = 'center';
                overlay.style.justifyContent = 'center';
                overlay.innerHTML = `
                    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="__globalConfirmTitle">
                        <div class="modal-title" id="__globalConfirmTitle">提示</div>
                        <div class="modal-desc" id="__globalConfirmMsg"></div>
                        <div class="modal-actions">
                            <button id="__globalConfirmCancel">取消</button>
                            <button id="__globalConfirmOk">确认</button>
                        </div>
                    </div>
                `;
                // 有些环境下 document.body 可能尚未存在，回退到 document.documentElement
                const host = document.body || document.documentElement;
                host.appendChild(overlay);
            }

            // 填充消息并显示
            const msgEl = document.getElementById('__globalConfirmMsg');
            if (msgEl) msgEl.textContent = message || '';
            overlay.style.display = 'flex';
            try { overlay.style.zIndex = String(2147483647); } catch (_) {}

            // 处理按键（ESC 取消）
            const onKeyDown = (ev) => {
                if (ev && ev.key === 'Escape') {
                    ev.preventDefault();
                    cleanup(false);
                }
            };

            // 事件处理：查询按钮并绑定
            const okBtn = document.getElementById('__globalConfirmOk');
            const cancelBtn = document.getElementById('__globalConfirmCancel');
            const cleanup = (result) => {
                try { overlay.style.display = 'none'; } catch (_) {}
                try { document.removeEventListener('keydown', onKeyDown); } catch (_) {}
                try { if (okBtn) okBtn.removeEventListener('click', onOk); } catch (_) {}
                try { if (cancelBtn) cancelBtn.removeEventListener('click', onCancel); } catch (_) {}
                resolve(result);
            };
            const onOk = () => cleanup(true);
            const onCancel = () => cleanup(false);

            if (okBtn) okBtn.addEventListener('click', onOk);
            if (cancelBtn) cancelBtn.addEventListener('click', onCancel);
            document.addEventListener('keydown', onKeyDown);

            // 尝试将焦点移到确认按钮，改善可访问性与键盘操作
            try { if (okBtn && typeof okBtn.focus === 'function') okBtn.focus(); } catch (_) {}
        } catch (e) {
            console.error('showConfirmModal 异常：', e);
            // 回退到浏览器原生 confirm，保证兼容性
            try { resolve(window.confirm(message)); } catch (_) { resolve(false); }
        }
    });
}

/**
 * 通用输入/选择模态（返回 Promise）
 * 用法：
 *   // 文本输入
 *   const name = await showInputModal({ title: '重命名会话', label: '新名称', value: oldName, placeholder: '输入名称' });
 *   // 选择下拉
 *   const groupId = await showInputModal({ title: '移动会话', label: '选择分组', selectOptions: [{ value: 'g1', label: '分组1' }, { value: '', label: '无分组' }], value: currentGroupId });
 *
 * 返回：用户确认时返回字符串（输入值或选中 value），取消或关闭时返回 null
 */
function showInputModal(opts) {
    return new Promise((resolve) => {
        try {
            const o = Object.assign({ title: '输入', label: '', value: '', placeholder: '', selectOptions: null }, opts || {});
            let overlay = document.getElementById('__globalInputModal');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = '__globalInputModal';
                overlay.className = 'modal-overlay';
                overlay.style.display = 'none';
                overlay.style.alignItems = 'center';
                overlay.style.justifyContent = 'center';
                overlay.innerHTML = `
                    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="__globalInputTitle">
                        <div class="modal-title" id="__globalInputTitle"></div>
                        <div class="modal-desc" id="__globalInputLabel"></div>
                        <div id="__globalInputBody"></div>
                        <div class="modal-actions">
                            <button id="__globalInputCancel">取消</button>
                            <button id="__globalInputOk">确认</button>
                        </div>
                    </div>
                `;
                const host = document.body || document.documentElement;
                host.appendChild(overlay);
            }

            const titleEl = document.getElementById('__globalInputTitle');
            const labelEl = document.getElementById('__globalInputLabel');
            const bodyEl = document.getElementById('__globalInputBody');
            const okBtn = document.getElementById('__globalInputOk');
            const cancelBtn = document.getElementById('__globalInputCancel');

            titleEl.textContent = o.title || '';
            labelEl.textContent = o.label || '';
            // 清空 body 并根据 selectOptions 渲染 input 或 select
            bodyEl.innerHTML = '';
            let inputEl = null;
            if (o.selectOptions && Array.isArray(o.selectOptions)) {
                const sel = document.createElement('select');
                sel.className = 'modal-select';
                // 支持数组元素为字符串或 {value,label}
                o.selectOptions.forEach(opt => {
                    const optionEl = document.createElement('option');
                    if (typeof opt === 'string') {
                        optionEl.value = opt;
                        optionEl.textContent = opt;
                    } else {
                        optionEl.value = (opt.value !== undefined && opt.value !== null) ? String(opt.value) : '';
                        optionEl.textContent = opt.label || String(opt.value);
                    }
                    sel.appendChild(optionEl);
                });
                sel.value = o.value || '';
                bodyEl.appendChild(sel);
                inputEl = sel;
            } else {
                const inp = document.createElement('input');
                inp.type = 'text';
                inp.className = 'modal-input';
                inp.value = o.value || '';
                inp.placeholder = o.placeholder || '';
                bodyEl.appendChild(inp);
                inputEl = inp;
            }

            overlay.style.display = 'flex';
            try { overlay.style.zIndex = String(2147483647); } catch (_) {}

            const onKeyDown = (ev) => {
                if (ev && ev.key === 'Escape') {
                    ev.preventDefault();
                    cleanup(null);
                }
                if (ev && ev.key === 'Enter') {
                    // 回车触发确认（仅当聚焦在输入控件上时）
                    if (document.activeElement === inputEl) {
                        ev.preventDefault();
                        onOk();
                    }
                }
            };

            const cleanup = (result) => {
                try { overlay.style.display = 'none'; } catch (_) {}
                try { document.removeEventListener('keydown', onKeyDown); } catch (_) {}
                try { if (okBtn) okBtn.removeEventListener('click', onOk); } catch (_) {}
                try { if (cancelBtn) cancelBtn.removeEventListener('click', onCancel); } catch (_) {}
                resolve(result);
            };
            const onOk = () => {
                try {
                    const val = inputEl ? (inputEl.value !== undefined ? inputEl.value : '') : '';
                    cleanup(val === '' ? '' : String(val));
                } catch (e) { cleanup(null); }
            };
            const onCancel = () => cleanup(null);

            if (okBtn) okBtn.addEventListener('click', onOk);
            if (cancelBtn) cancelBtn.addEventListener('click', onCancel);
            document.addEventListener('keydown', onKeyDown);

            try { if (inputEl && typeof inputEl.focus === 'function') inputEl.focus(); } catch (_) {}
        } catch (e) {
            console.error('showInputModal 异常：', e);
            resolve(null);
        }
    });
}