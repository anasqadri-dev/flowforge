import { getSetting, saveSetting, getWorkflows, getWorkflow, saveWorkflow, getRuns, saveRun } from './database.js';

export async function getGlobalVariables() {
    return (await getSetting('globalVariables')) || {};
}
export async function saveGlobalVariables(values) {
    if (!values || typeof values !== 'object' || Array.isArray(values)) throw new Error('Global variables must be a JSON object.');
    await saveSetting('globalVariables', values);
}
export async function getEnvironmentProfiles() {
    return (await getSetting('environmentProfiles')) || {
        active: 'Development',
        profiles: { Development: {}, Testing: {}, Production: {} }
    };
}
export async function saveEnvironmentProfiles(value) {
    if (!value || !value.profiles || typeof value.profiles !== 'object') throw new Error('Invalid environment profile configuration.');
    await saveSetting('environmentProfiles', value);
}

export async function duplicateWorkflow(id) {
    const workflows = await getWorkflows();
    const source = workflows.find(item => item.id === id);
    if (!source) throw new Error('Workflow not found.');
    const copy = structuredClone(source);
    copy.id = crypto.randomUUID();
    copy.name = `${source.name || 'Untitled Workflow'} (Copy)`;
    copy.createdAt = Date.now();
    copy.updatedAt = Date.now();
    await saveWorkflow(copy);
    return copy;
}

export async function saveWorkflowVersion(workflow) {
    const all = (await getSetting('workflowVersions')) || {};
    const versions = all[workflow.id] || [];
    const fingerprint = JSON.stringify({ name: workflow.name, nodes: workflow.nodes, connections: workflow.connections });
    if (versions[0]?.fingerprint === fingerprint) return;
    versions.unshift({
        id: crypto.randomUUID(),
        name: workflow.name,
        createdAt: Date.now(),
        fingerprint,
        snapshot: structuredClone(workflow)
    });
    all[workflow.id] = versions.slice(0, 30);
    await saveSetting('workflowVersions', all);
}
export async function restoreWorkflowVersion(workflowId, versionId) {
    const all = (await getSetting('workflowVersions')) || {};
    const version = (all[workflowId] || []).find(item => item.id === versionId);
    if (!version) throw new Error('Workflow version not found.');
    const restored = structuredClone(version.snapshot);
    restored.updatedAt = Date.now();
    await saveWorkflow(restored);
    return restored;
}

export function parseCSV(text) {
    const rows = [];
    let row = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i], next = text[i + 1];
        if (char === '"' && quoted && next === '"') { cell += '"'; i++; }
        else if (char === '"') quoted = !quoted;
        else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
        else if ((char === '\n' || char === '\r') && !quoted) {
            if (char === '\r' && next === '\n') i++;
            row.push(cell); rows.push(row); row = []; cell = '';
        } else cell += char;
    }
    if (quoted) throw new Error('CSV contains an unclosed quoted field.');
    if (cell.length || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(record => record.some(value => value !== ''));
}
export function stringifyCSV(rows) {
    return rows.map(row => row.map(value => {
        const text = String(value ?? '');
        return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }).join(',')).join('\r\n');
}
export function downloadTextFile(content, filename, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
}

export async function exportRunReport(runId, format = 'csv') {
    const reportWindow = format === 'pdf' ? window.open('about:blank', '_blank') : null;
    if (format === 'pdf' && !reportWindow) throw new Error('Allow pop-ups to open the printable PDF report.');
    const runs = await getRuns();
    const run = runs.find(item => item.id === runId);
    if (!run) throw new Error('Execution record not found.');
    if (format === 'csv') {
        const rows = [['Step', 'Node ID', 'Type', 'Status', 'Duration (ms)', 'Output', 'Error']];
        (run.steps || []).forEach((step, index) => rows.push([
            index + 1, step.nodeId, step.type, step.status, step.duration || 0,
            JSON.stringify(step.output ?? ''), step.error || ''
        ]));
        downloadTextFile(stringifyCSV(rows), `flowforge-run-${run.id}.csv`, 'text/csv;charset=utf-8');
        return;
    }
    const safe = value => String(value ?? '').replace(/[&<>"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[char]));
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>FlowForge Execution Report</title><style>body{font:14px Arial;margin:36px;color:#222}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:8px;text-align:left}pre{white-space:pre-wrap}</style></head><body><h1>FlowForge Execution Report</h1><h2>${safe(run.workflowName)}</h2><p>Status: ${safe(run.status)} | Started: ${new Date(run.startedAt).toLocaleString()} | Duration: ${run.duration} ms</p><table><thead><tr><th>Step</th><th>Node</th><th>Status</th><th>Duration</th><th>Output / Error</th></tr></thead><tbody>${(run.steps || []).map((step, index) => `<tr><td>${index + 1}</td><td>${safe(step.type)}</td><td>${safe(step.status)}</td><td>${step.duration || 0} ms</td><td><pre>${safe(JSON.stringify(step.output ?? step.error ?? '', null, 2))}</pre></td></tr>`).join('')}</tbody></table><script>window.print()</script></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    reportWindow.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export async function scheduleWorkflow(workflowId, runAt) {
    const date = new Date(runAt);
    if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) throw new Error('Choose a future date and time.');
    const schedules = (await getSetting('schedules')) || [];
    schedules.push({ id: crypto.randomUUID(), workflowId, runAt: date.getTime(), status: 'pending' });
    await saveSetting('schedules', schedules);
    return schedules.at(-1);
}
export async function getSchedules() { return (await getSetting('schedules')) || []; }
export async function updateSchedules(schedules) { await saveSetting('schedules', schedules); }

export async function buildAnalytics() {
    const [workflows, runs] = await Promise.all([getWorkflows(), getRuns()]);
    const successful = runs.filter(run => run.status === 'success').length;
    const failed = runs.filter(run => run.status !== 'success').length;
    const averageDuration = runs.length ? Math.round(runs.reduce((sum, run) => sum + (run.duration || 0), 0) / runs.length) : 0;
    return { workflowCount: workflows.length, runCount: runs.length, successful, failed, successRate: runs.length ? Math.round(successful / runs.length * 100) : 0, averageDuration };
}

let schedulerTimer = null;
export function startLocalScheduler() {
    if (schedulerTimer) return;
    const tick = async () => {
        const schedules = await getSchedules().catch(() => []);
        let changed = false;
        for (const item of schedules) {
            if (item.status !== 'pending' || item.runAt > Date.now()) continue;
            item.status = 'running'; item.startedAt = Date.now(); changed = true;
            try {
                const workflow = await getWorkflow(item.workflowId);
                if (!workflow) throw new Error('Scheduled workflow no longer exists.');
                const { runWorkflow } = await import('./engine.js');
                const result = await runWorkflow(workflow.nodes, workflow.connections, {}, { workflowId: workflow.id, workflowName: workflow.name });
                await saveRun(result);
                document.dispatchEvent(new CustomEvent('flowforge:run-saved', { detail: result }));
                item.status = result.status === 'success' ? 'completed' : 'failed';
                item.resultId = result.id; item.error = result.error || null;
                document.dispatchEvent(new CustomEvent('flowforge:scheduled-run-completed', { detail: { scheduleId: item.id, result } }));
            } catch (error) {
                item.status = 'failed'; item.error = error.message;
                document.dispatchEvent(new CustomEvent('flowforge:scheduled-run-failed', { detail: { scheduleId: item.id, error: error.message } }));
            }
            item.finishedAt = Date.now();
        }
        if (changed) await updateSchedules(schedules);
    };
    tick();
    schedulerTimer = setInterval(tick, 10000);
}
