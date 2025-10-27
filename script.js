// 会话管理按钮事件
document.getElementById('conversationsBtn').addEventListener('click', () => {
    window.location.href = 'conversations.html';
});

// 本地存储工具：读取并安全写入 JSON
function storageGetJson(key, defaultValue) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : defaultValue;
    } catch (e) {
        console.error('解析 localStorage 数据失败：', key, e);
        return defaultValue;
    }
}

function storageSetJson(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error('写入 localStorage 失败：', key, e);
    }
}