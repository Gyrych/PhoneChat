/**
 * 文件名：logger.js
 * 功能描述：前端轻量日志库，记录原始请求/响应（遮蔽 Authorization），支持本地环形存储与导出/清空
 * 设计目标：
 * 1. 统一的事件结构：start/append/end/error；
 * 2. 环形缓冲：超过最大条目数淘汰最旧；
 * 3. 健壮性：任何异常不影响主流程；
 * 4. 隐私：遮蔽 Authorization；不采集额外指纹。
 */
(function () {
    if (window.Logger) return;

    // 本地存储键名
    const STORAGE_KEY_LOGS = 'freechat.logs';
    const STORAGE_KEY_MAX = 'freechat.log.maxEntries';
    const STORAGE_KEY_ENABLE = 'freechat.log.enable';

    // 默认配置
    const DEFAULT_MAX = 1000;

    // 内部状态（内存态，不持久化）
    const state = {
        maxEntries: DEFAULT_MAX,
        enable: true,
        idSeq: 0,
        // 仅用于当前会话内快速定位，刷新后丢失
        idToIndex: Object.create(null)
    };

    // 工具：安全读取 JSON
    function readJson(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (_) {
            return fallback;
        }
    }

    // 工具：安全写入 JSON
    function writeJson(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (_) {
            // 忽略写入失败，避免影响主流程
        }
    }

    // 初始化配置
    (function initConfig() {
        const m = Number(readJson(STORAGE_KEY_MAX, DEFAULT_MAX)) || DEFAULT_MAX;
        state.maxEntries = Math.max(10, m);
        const en = localStorage.getItem(STORAGE_KEY_ENABLE);
        state.enable = (en === null || en === '' || en === 'true');
    })();

    // 读取日志数组
    function readLogsArray() {
        const logs = readJson(STORAGE_KEY_LOGS, []);
        return Array.isArray(logs) ? logs : [];
    }

    // 写入并裁剪
    function writeLogsArray(logs) {
        if (!Array.isArray(logs)) return;
        // 裁剪到最大条数
        if (logs.length > state.maxEntries) {
            const cut = logs.length - state.maxEntries;
            logs.splice(0, cut);
            // 重建索引
            state.idToIndex = Object.create(null);
            for (let i = 0; i < logs.length; i++) {
                if (logs[i] && logs[i].id) state.idToIndex[logs[i].id] = i;
            }
        }
        writeJson(STORAGE_KEY_LOGS, logs);
    }

    // 生成事件 ID
    function genId() {
        const ts = Date.now();
        state.idSeq = (state.idSeq + 1) % 1000000;
        return `evt_${ts}_${String(state.idSeq).padStart(6, '0')}`;
    }

    // 合并（浅合并 + 特殊数组追加）
    function mergeEvent(target, patch) {
        if (!patch || typeof patch !== 'object') return target;
        for (const k of Object.keys(patch)) {
            const v = patch[k];
            if (k === 'res' && v && typeof v === 'object') {
                target.res = target.res || {};
                // 处理流式片段追加
                if (Array.isArray(v.streamChunks)) {
                    target.res.streamChunks = target.res.streamChunks || [];
                    for (const item of v.streamChunks) {
                        // 控制数组长度，避免过大（最多保留 200 片段）
                        if (typeof item === 'string') {
                            target.res.streamChunks.push(item);
                            if (target.res.streamChunks.length > 200) {
                                target.res.streamChunks.shift();
                                target.res.truncated = true;
                            }
                        }
                    }
                }
                // 其他字段浅合并
                for (const kk of Object.keys(v)) {
                    if (kk === 'streamChunks') continue;
                    target.res[kk] = v[kk];
                }
                continue;
            }
            if (k === 'req' && v && typeof v === 'object') {
                target.req = target.req || {};
                // 浅合并请求
                for (const kk of Object.keys(v)) target.req[kk] = v[kk];
                continue;
            }
            target[k] = v;
        }
        return target;
    }

    // 触发下载
    function triggerDownload(filename, content, mime) {
        try {
            const blob = new Blob([content], { type: mime });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (_) {
            // 忽略下载失败
        }
    }

    // 公共 API
    const Logger = {
        /** 配置最大保存条目与开关 */
        config(opts) {
            try {
                if (!opts || typeof opts !== 'object') return;
                if (typeof opts.maxEntries === 'number') {
                    state.maxEntries = Math.max(10, Math.floor(opts.maxEntries));
                    writeJson(STORAGE_KEY_MAX, state.maxEntries);
                }
                if (typeof opts.enable === 'boolean') {
                    state.enable = !!opts.enable;
                    localStorage.setItem(STORAGE_KEY_ENABLE, String(state.enable));
                }
            } catch (_) { /* 忽略异常 */ }
        },
        /** 获取日志（程序化接口，支持 scope 与 conversationId） */
        getLogs(opts) {
            try {
                const scope = (opts && opts.scope) || 'all';
                const allLogs = readLogsArray();
                if (scope === 'all') return allLogs;
                if (scope === 'current') {
                    const cid = (localStorage.getItem('deepseekConversationId') || null);
                    return cid ? allLogs.filter(x => x && x.conversationId === cid) : [];
                }
                if (scope === 'byConversationId') {
                    const cid = opts && opts.conversationId;
                    return cid ? allLogs.filter(x => x && x.conversationId === cid) : [];
                }
                return allLogs;
            } catch (_) { return []; }
        },
        /** 获取当前配置（只读） */
        getConfig() {
            return { maxEntries: state.maxEntries, enable: state.enable };
        },

        /** 开始一个事件，返回 eventId */
        start(eventLike) {
            try {
                if (!state.enable) return null;
                const id = genId();
                const nowIso = new Date().toISOString();
                const evt = Object.assign({
                    id,
                    ts: nowIso,
                    type: 'unknown',
                    endpoint: '',
                    model: '',
                    conversationId: (localStorage.getItem('deepseekConversationId') || null),
                    groupId: (localStorage.getItem('deepseekConversationGroupId') || null),
                    req: { headersMasked: {}, body: null },
                    res: null,
                    error: null,
                    durationMs: null,
                    _t0: (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()
                }, (eventLike || {}));

                const logs = readLogsArray();
                logs.push(evt);
                state.idToIndex[id] = logs.length - 1;
                writeLogsArray(logs);
                return id;
            } catch (_) {
                return null;
            }
        },

        /** 追加信息（用于流式片段等） */
        append(eventId, patch) {
            try {
                if (!state.enable || !eventId || !patch) return;
                const logs = readLogsArray();
                let idx = state.idToIndex[eventId];
                if (typeof idx !== 'number') {
                    idx = logs.findIndex(x => x && x.id === eventId);
                    if (idx === -1) return;
                    state.idToIndex[eventId] = idx;
                }
                const evt = logs[idx] || {};
                mergeEvent(evt, patch);
                logs[idx] = evt;
                writeLogsArray(logs);
            } catch (_) { /* 忽略异常 */ }
        },

        /** 结束事件（写入最终信息与耗时） */
        end(eventId, finalPatch) {
            try {
                if (!state.enable || !eventId) return;
                const logs = readLogsArray();
                let idx = state.idToIndex[eventId];
                if (typeof idx !== 'number') {
                    idx = logs.findIndex(x => x && x.id === eventId);
                    if (idx === -1) return;
                    state.idToIndex[eventId] = idx;
                }
                const evt = logs[idx] || {};
                const t1 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
                if (typeof evt._t0 === 'number') {
                    evt.durationMs = Math.max(0, Math.round(t1 - evt._t0));
                }
                delete evt._t0;
                if (finalPatch) mergeEvent(evt, finalPatch);
                logs[idx] = evt;
                writeLogsArray(logs);
            } catch (_) { /* 忽略异常 */ }
        },

        /** 记录错误事件（独立） */
        error(contextLike, err) {
            try {
                if (!state.enable) return null;
                const id = genId();
                const nowIso = new Date().toISOString();
                const logs = readLogsArray();
                const evt = Object.assign({
                    id,
                    ts: nowIso,
                    type: 'error',
                    endpoint: '',
                    model: '',
                    conversationId: (localStorage.getItem('deepseekConversationId') || null),
                    groupId: (localStorage.getItem('deepseekConversationGroupId') || null),
                    error: { message: (err && err.message) ? String(err.message) : String(err || '未知错误') }
                }, (contextLike || {}));
                logs.push(evt);
                state.idToIndex[id] = logs.length - 1;
                writeLogsArray(logs);
                return id;
            } catch (_) {
                return null;
            }
        },

        /** 导出日志（json/ndjson）
         * 支持范围：
         * - scope: 'current' | 'all' | 'byConversationId'（默认 'current'）
         * - conversationId: 当 scope==='byConversationId' 时使用
         */
        export(opts) {
            try {
                const format = (opts && opts.format) || 'ndjson';
                const scope = (opts && opts.scope) || 'current';
                const allLogs = readLogsArray();

                let data = allLogs;
                let suffix = '';
                if (scope === 'current') {
                    const cid = (localStorage.getItem('deepseekConversationId') || null);
                    data = cid ? allLogs.filter(x => x && x.conversationId === cid) : [];
                    suffix = '-current';
                } else if (scope === 'byConversationId') {
                    const cid = opts && opts.conversationId;
                    data = cid ? allLogs.filter(x => x && x.conversationId === cid) : [];
                    suffix = cid ? (`-cid-${String(cid).slice(-8)}`) : '-cid-unknown';
                } else {
                    // 'all'
                    data = allLogs;
                    suffix = '-all';
                }

                const ts = new Date();
                const pad = (n) => String(n).padStart(2, '0');
                const fname = `freechat-logs${suffix}-${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.${format}`;
                if (format === 'json') {
                    triggerDownload(fname, JSON.stringify(data, null, 2), 'application/json');
                } else {
                    // ndjson：每行一个 JSON 对象
                    const lines = data.map(x => {
                        try { return JSON.stringify(x); } catch (_) { return '{}'; }
                    }).join('\n');
                    triggerDownload(fname, lines + '\n', 'application/x-ndjson');
                }
            } catch (_) { /* 忽略导出异常 */ }
        },

        /** 分析当前日志并返回聚合统计（用于快速定位延迟/错误热点） */
        summarize() {
            try {
                const all = readLogsArray();
                const total = all.length;
                if (!total) return { total: 0, avgDurationMs: 0, maxDurationMs: 0, errors: 0, topEndpoints: [] };
                let sum = 0;
                let max = 0;
                let errors = 0;
                const endpointCounts = Object.create(null);
                let totalStreamChunks = 0;
                for (const e of all) {
                    if (!e) continue;
                    const d = Number(e.durationMs) || 0;
                    sum += d;
                    if (d > max) max = d;
                    if (e.error) errors++;
                    const ep = (e.endpoint || 'unknown').toString();
                    endpointCounts[ep] = (endpointCounts[ep] || 0) + 1;
                    if (e.res && Array.isArray(e.res.streamChunks)) totalStreamChunks += e.res.streamChunks.length;
                }
                const avg = Math.round(sum / total);
                const topEndpoints = Object.keys(endpointCounts).sort((a,b)=>endpointCounts[b]-endpointCounts[a]).slice(0,8).map(k=>({ endpoint:k, count:endpointCounts[k] }));
                return { total, avgDurationMs: avg, maxDurationMs: max, errors, avgStreamChunksPerEvent: total ? (totalStreamChunks/total) : 0, topEndpoints };
            } catch (e) { return { total:0 }; }
        },

        /** 清空日志 */
        clear() {
            try {
                writeJson(STORAGE_KEY_LOGS, []);
                state.idToIndex = Object.create(null);
            } catch (_) { /* 忽略异常 */ }
        }
    };

    // 授出全局对象
    window.Logger = Logger;
})();


