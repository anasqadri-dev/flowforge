function resolvePath(context, path) {
    return path.split('.').reduce((value, segment) => {
        if (value === null || value === undefined) return undefined;
        if (segment === '__proto__' || segment === 'prototype' || segment === 'constructor') return undefined;
        return value[segment];
    }, context);
}

export function interpolate(value, context) {
    if (typeof value !== 'string') return value;
    return value.replace(/\{\{([^}]+)\}\}/g, (_, expression) => {
        const result = resolvePath(context, expression.trim());
        if (result === undefined || result === null) return '';
        return typeof result === 'object' ? JSON.stringify(result) : String(result);
    });
}

function compareValues(left, operator, right) {
    const a = Number(left);
    const b = Number(right);
    const numeric = String(left).trim() !== '' && String(right).trim() !== ''
        && Number.isFinite(a) && Number.isFinite(b);
    const x = numeric ? a : String(left);
    const y = numeric ? b : String(right);

    switch (operator) {
        case '==': return String(x) === String(y);
        case '!=': return String(x) !== String(y);
        case '>': return x > y;
        case '<': return x < y;
        case '>=': return x >= y;
        case '<=': return x <= y;
        default: throw new Error(`Unsupported operator: ${operator}`);
    }
}

export const handlers = {
    'Manual Start': async () => ({ startedAt: new Date().toISOString() }),

    'Timer (Schedule)': async config => {
        if (!config.scheduleTime) throw new Error('Please configure the schedule date and time.');
        const scheduledAt = new Date(config.scheduleTime);
        if (Number.isNaN(scheduledAt.getTime())) throw new Error('Invalid schedule date.');
        return { scheduledAt: scheduledAt.toISOString() };
    },

    'HTTP Request': async (config, context) => {
        const url = interpolate(config.url || '', context);
        if (!url) throw new Error('Request URL is missing.');
        let parsedUrl;
        try { parsedUrl = new URL(url); } catch { throw new Error('Invalid request URL.'); }
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Only HTTP and HTTPS URLs are supported.');

        let headers = {};
        try {
            headers = config.headers ? JSON.parse(interpolate(config.headers, context)) : {};
            if (!headers || Array.isArray(headers) || typeof headers !== 'object') throw new Error();
        } catch {
            throw new Error('HTTP headers must be a valid JSON object.');
        }

        const method = String(config.method || 'GET').toUpperCase();
        const options = { method, headers };
        if (!['GET', 'HEAD'].includes(method)) {
            const body = interpolate(config.body || '', context);
            if (body) options.body = body;
            if (body && !Object.keys(headers).some(key => key.toLowerCase() === 'content-type')) {
                headers['Content-Type'] = 'application/json';
            }
        }

        const controller = new AbortController();
        const timeout = Math.min(Math.max(Number(config.timeoutSeconds) || 30, 1), 120);
        options.signal = controller.signal;
        const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);
        let response;
        try {
            response = await fetch(url, options);
        } catch (error) {
            if (error.name === 'AbortError') throw new Error(`HTTP request timed out after ${timeout} seconds.`);
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }

        const responseText = await response.text();
        let data = responseText;
        try { data = responseText ? JSON.parse(responseText) : null; } catch { /* Keep plain text. */ }
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return { status: response.status, ok: response.ok, data };
    },

    'Transform Data': async (config, context) => ({ result: interpolate(config.input || '', context) }),

    'Set Variable': async (config, context) => {
        const name = (config.name || '').trim();
        if (!name) throw new Error('Variable name is required.');
        const value = interpolate(config.value || '', context);
        context[name] = value;
        return { name, value };
    },

    'Wait': async config => {
        const seconds = Number(config.seconds);
        if (!Number.isFinite(seconds) || seconds < 0 || seconds > 60) throw new Error('Wait must be between 0 and 60 seconds.');
        await new Promise(resolve => setTimeout(resolve, seconds * 1000));
        return { waitedSeconds: seconds };
    },

    'Condition': async (config, context) => {
        const left = interpolate(config.left || '', context);
        const right = interpolate(config.right || '', context);
        const operator = config.operator || '==';
        return { left, operator, right, result: compareValues(left, operator, right) };
    },

    'Loop': async config => {
        const count = Number(config.count);
        if (!Number.isInteger(count) || count < 1 || count > 100) throw new Error('Loop count must be between 1 and 100.');
        return { iterations: count };
    },

    'Send Notification': async (config, context) => {
        const message = interpolate(config.message || 'Workflow notification', context);
        if (!('Notification' in window)) throw new Error('Browser notifications are not supported.');
        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') throw new Error('Notification permission was not granted.');
        }
        if (Notification.permission !== 'granted') throw new Error('Notification permission is denied.');
        new Notification('FlowForge', { body: message });
        return { message, delivered: true };
    },

    'Write to Log': async (config, context) => {
        const message = interpolate(config.message || '', context);
        console.log('[FlowForge]', message);
        return { message };
    }
};
