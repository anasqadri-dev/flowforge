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

import { parseCSV, stringifyCSV } from './advanced.js';

export const handlers = {
    'Manual Start': async () => ({ startedAt: new Date().toISOString() }),

    'Timer (Schedule)': async config => {
        if (!config.scheduleTime) throw new Error('Please configure the schedule date and time.');
        const scheduledAt = new Date(config.scheduleTime);
        if (Number.isNaN(scheduledAt.getTime())) throw new Error('Invalid schedule date.');
        const delay = scheduledAt.getTime() - Date.now();
        if (delay > 2147483647) {
            throw new Error('Scheduled start must be within approximately 24 days. Keep this browser tab open until execution begins.');
        }
        if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        return { scheduledAt: scheduledAt.toISOString(), triggeredAt: new Date().toISOString() };
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
        if (!['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) throw new Error('Unsupported HTTP method.');
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
        let responseText;
        try {
            response = await fetch(url, options);
            responseText = await response.text();
        } catch (error) {
            if (error.name === 'AbortError') throw new Error(`HTTP request timed out after ${timeout} seconds.`);
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
        let data = responseText;
        try { data = responseText ? JSON.parse(responseText) : null; } catch { /* Keep plain text. */ }
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return { status: response.status, ok: response.ok, data };
    },

    'Transform Data': async (config, context) => ({ result: interpolate(config.input || '', context) }),

    'Set Variable': async (config, context) => {
        const name = (config.name || '').trim();
        if (!name) throw new Error('Variable name is required.');
        if (['__proto__', 'prototype', 'constructor'].includes(name)) throw new Error('This variable name is reserved.');
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

        // Return the message as step output. The notification UI displays it
        // after the workflow completes, so the generic run summary cannot replace it.
        let browserNotificationDelivered = false;
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification('FlowForge', { body: message });
                browserNotificationDelivered = true;
            } catch (error) {
                console.warn('Browser notification could not be displayed:', error);
            }
        }

        return { message, delivered: true, inAppDelivered: true, browserNotificationDelivered };
    },


    'JSON Parse': async (config, context) => {
        const raw = interpolate(config.input || '', context);
        try { return { data: JSON.parse(raw) }; }
        catch { throw new Error('JSON Parse: input is not valid JSON.'); }
    },

    'JSON Stringify': async (config, context) => {
        const raw = interpolate(config.input || '', context);
        let value;
        try { value = JSON.parse(raw); }
        catch { value = raw; }
        return { json: JSON.stringify(value, null, 2) };
    },

    'Validate JSON': async (config, context) => {
        const raw = interpolate(config.input || '', context);
        try { const data = JSON.parse(raw); return { valid: true, data }; }
        catch (error) { return { valid: false, error: error.message }; }
    },

    'Filter Array': async (config, context) => {
        let items;
        try { items = JSON.parse(interpolate(config.input || '[]', context)); }
        catch { throw new Error('Filter Array: input must be a valid JSON array.'); }
        if (!Array.isArray(items)) throw new Error('Filter Array: input must be an array.');
        const expected = interpolate(config.value ?? '', context);
        const actual = item => String(resolvePath({ item }, 'item.' + (config.path || '')) ?? '');
        const filtered = items.filter(item => {
            const value = actual(item);
            switch (config.operator || '==') {
                case '==': return value === expected;
                case '!=': return value !== expected;
                case 'contains': return value.includes(expected);
                case '>': return Number(value) > Number(expected);
                case '<': return Number(value) < Number(expected);
                default: throw new Error('Filter Array: unsupported comparison.');
            }
        });
        return { items: filtered, count: filtered.length };
    },

    'Array Length': async (config, context) => {
        let items;
        try { items = JSON.parse(interpolate(config.input || '[]', context)); }
        catch { throw new Error('Array Length: input must be valid JSON.'); }
        if (!Array.isArray(items)) throw new Error('Array Length: input must be an array.');
        return { length: items.length };
    },

    'Merge Data': async (config, context) => {
        let first, second;
        try {
            first = JSON.parse(interpolate(config.input || '{}', context));
            second = JSON.parse(interpolate(config.second || '{}', context));
        } catch { throw new Error('Merge Data: both inputs must be valid JSON.'); }
        if (!first || Array.isArray(first) || typeof first !== 'object'
            || !second || Array.isArray(second) || typeof second !== 'object') {
            throw new Error('Merge Data: both inputs must be JSON objects.');
        }
        return { data: { ...first, ...second } };
    },

    'Format Text': async (config, context) => ({ text: interpolate(config.template || '', context) }),

    'Replace Text': async (config, context) => {
        const input = interpolate(config.input || '', context);
        const search = interpolate(config.search || '', context);
        if (!search) throw new Error('Replace Text: search text cannot be empty.');
        return { text: input.split(search).join(interpolate(config.replacement || '', context)) };
    },

    'Split Text': async (config, context) => {
        const delimiter = interpolate(config.delimiter ?? ',', context);
        if (!delimiter) throw new Error('Split Text: delimiter cannot be empty.');
        const parts = interpolate(config.input || '', context).split(delimiter);
        return { items: parts, count: parts.length };
    },

    'Join Text': async (config, context) => {
        let items;
        try { items = JSON.parse(interpolate(config.input || '[]', context)); }
        catch { throw new Error('Join Text: input must be a JSON array.'); }
        if (!Array.isArray(items)) throw new Error('Join Text: input must be an array.');
        return { text: items.join(interpolate(config.delimiter ?? ',', context)) };
    },

    'Math Operation': async (config, context) => {
        const left = Number(interpolate(String(config.left ?? ''), context));
        const right = Number(interpolate(String(config.right ?? ''), context));
        if (!Number.isFinite(left) || !Number.isFinite(right)) throw new Error('Math Operation: both operands must be valid numbers.');
        let result;
        switch (config.operation || '+') {
            case '+': result = left + right; break;
            case '-': result = left - right; break;
            case '*': result = left * right; break;
            case '/': if (right === 0) throw new Error('Cannot divide by zero.'); result = left / right; break;
            case '%': if (right === 0) throw new Error('Cannot divide by zero.'); result = left % right; break;
            case '**': result = left ** right; break;
            default: throw new Error('Math Operation: unsupported operation.');
        }
        if (!Number.isFinite(result)) throw new Error('Math Operation produced a non-finite result.');
        return { result };
    },

    'Random Number': async (config, context) => {
        const min = Number(interpolate(String(config.min ?? 1), context));
        const max = Number(interpolate(String(config.max ?? 100), context));
        if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
            throw new Error('Random Number: enter whole numbers with maximum greater than or equal to minimum.');
        }
        return { value: Math.floor(Math.random() * (max - min + 1)) + min };
    },

    'Generate UUID': async () => ({ uuid: crypto.randomUUID() }),
    'Current Date & Time': async () => {
        const now = new Date();
        return { iso: now.toISOString(), timestamp: now.getTime(), date: now.toLocaleDateString(), time: now.toLocaleTimeString() };
    },

    'URL Encode': async (config, context) => ({ value: encodeURIComponent(interpolate(config.input || '', context)) }),
    'URL Decode': async (config, context) => {
        try { return { value: decodeURIComponent(interpolate(config.input || '', context)) }; }
        catch { throw new Error('URL Decode: input contains invalid encoded data.'); }
    },
    'Base64 Encode': async (config, context) => {
        const value = interpolate(config.input || '', context);
        return { value: btoa(unescape(encodeURIComponent(value))) };
    },
    'Base64 Decode': async (config, context) => {
        try { return { value: decodeURIComponent(escape(atob(interpolate(config.input || '', context)))) }; }
        catch { throw new Error('Base64 Decode: input is not valid Base64 text.'); }
    },

    'CSV Parse': async (config, context) => {
        const rows = parseCSV(interpolate(config.input || '', context));
        if (!rows.length) return { headers: [], records: [], count: 0 };
        const headers = rows[0];
        const records = rows.slice(1).map(row => Object.fromEntries(headers.map((key, index) => [key, row[index] ?? ''])));
        return { headers, records, count: records.length };
    },
    'CSV Generate': async (config, context) => {
        let rows;
        try { rows = JSON.parse(interpolate(config.input || '[]', context)); }
        catch { throw new Error('CSV Generate requires a valid JSON array.'); }
        if (!Array.isArray(rows)) throw new Error('CSV Generate input must be an array.');
        const headers = [...new Set(rows.flatMap(row => Object.keys(row || {})))];
        return { filename: config.filename || 'flowforge-export.csv', content: stringifyCSV([headers, ...rows.map(row => headers.map(key => row?.[key] ?? ''))]), mimeType: 'text/csv;charset=utf-8', readyToDownload: true };
    },
    'Read File': async (config, context) => {
        if (typeof context.__selectedFileText !== 'string') throw new Error('Choose an input file in the Builder before running this workflow.');
        return { name: context.__selectedFileName || 'selected-file', size: context.__selectedFileText.length, text: context.__selectedFileText };
    },
    'Create File': async (config, context) => ({
        filename: config.filename || 'flowforge-output.txt',
        content: interpolate(config.content || '', context),
        mimeType: config.mimeType || 'text/plain;charset=utf-8',
        readyToDownload: true
    }),
    'Run Sub-workflow': async (config, context) => {
        if (!config.workflowId) throw new Error('Enter a saved workflow ID in the node settings.');
        const { getWorkflow } = await import('./database.js');
        const workflow = await getWorkflow(config.workflowId);
        if (!workflow) throw new Error('The selected sub-workflow could not be found.');
        const { runWorkflow } = await import('./engine.js');
        const result = await runWorkflow(workflow.nodes, workflow.connections, context, { workflowId: workflow.id, workflowName: workflow.name });
        if (result.status !== 'success') throw new Error('Sub-workflow failed: ' + (result.error || 'Unknown error'));
        return { runId: result.id, workflowName: result.workflowName, steps: result.steps.length, finalContext: result.finalContext };
    },
    'Write to Log': async (config, context) => {
        const message = interpolate(config.message || '', context);
        return { message, loggedInApp: true };
    }
};
