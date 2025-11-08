/**
 * 文件名：script.js
 * 功能描述：FreeChat 共用工具函数，提供localStorage的JSON读写功能和页面导航功能
 */
// 会话管理按钮事件
document.getElementById('conversationsBtn').addEventListener('click', () => {
    window.location.href = 'conversations.html';
});

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