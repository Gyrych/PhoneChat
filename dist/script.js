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