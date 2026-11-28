import { getRuns } from '../core/database.js';

let allLogs = [];
let runSavedListenerRegistered = false;

export function renderLogs() {
    return `
        <section class="page-container logs-page">
            <header class="page-heading">
                <div><h1>Execution Logs</h1><p>Messages and useful information recorded while your workflows run.</p></div>
                <button type="button" class="btn" id="refresh-logs"><i data-lucide="refresh-cw" aria-hidden="true"></i> Refresh</button>
            </header>
            <div class="stats-grid logs-stats">
                <article class="stat-card"><h3 id="logs-total">0</h3><p>Total log entries</p></article>
                <article class="stat-card"><h3 id="logs-workflows">0</h3><p>Workflows represented</p></article>
                <article class="stat-card"><h3 id="logs-runs">0</h3><p>Executions represented</p></article>
            </div>
            <section class="logs-toolbar" aria-label="Log filters">
                <label class="logs-search"><i data-lucide="search" aria-hidden="true"></i><input id="logs-search" type="search" placeholder="Search messages or workflow names..." autocomplete="off"></label>
                <select id="logs-status" aria-label="Filter by status"><option value="all">All statuses</option><option value="success">Successful</option><option value="error">Needs attention</option></select>
                <select id="logs-period" aria-label="Filter by date"><option value="all">All time</option><option value="today">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select>
            </section>
            <div class="logs-results-heading"><h2>Log entries</h2><span id="logs-result-count" class="muted-text">Loading...</span></div>
            <div id="logs-list" class="logs-list" aria-live="polite"><p class="empty">Loading execution logs...</p></div>
            <p class="logs-retention-note">Logs are saved in this browser with their workflow run. Deleting a run from Run History also deletes its log entries.</p>
        </section>`;
}

function escapeHTML(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Unknown date' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' }).format(date);
}
function collectLogs(runs) {
    return runs.flatMap(run => (run.steps || []).filter(step => step.type === 'Write to Log').map((step, index) => ({
        id: `${run.id || run.startedAt}-${step.nodeId || index}-${step.iteration ?? 0}`,
        runId: run.id || 'Unknown run', workflowId: run.workflowId || '',
        workflowName: run.workflowName || 'Untitled Workflow', runStatus: run.status || 'unknown',
        startedAt: run.startedAt, duration: run.duration, nodeId: step.nodeId || '',
        iteration: step.iteration ?? null, stepStatus: step.status || 'unknown',
        stepDuration: step.duration ?? 0, configuredMessage: step.configuredMessage,
        message: step.output?.message ?? step.message ?? '', error: step.error || ''
    }))).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}
function matchesPeriod(log, period) {
    if (period === 'all') return true;
    const timestamp = new Date(log.startedAt).getTime();
    if (!Number.isFinite(timestamp)) return false;
    const now = new Date();
    if (period === 'today') return timestamp >= new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return timestamp >= Date.now() - Number(period) * 86400000;
}
function renderFriendlyMessage(message) {
    let value = message;
    let prefix = '';
    if (typeof value === 'string') {
        const trimmed = value.trim();
        try {
            value = JSON.parse(trimmed);
        } catch {
            // Workflow messages often include a short sentence before their JSON response.
            const candidates = [trimmed.indexOf('{'), trimmed.indexOf('[')].filter(index => index >= 0);
            let parsed = false;
            for (const index of candidates.sort((a, b) => a - b)) {
                try {
                    value = JSON.parse(trimmed.slice(index));
                    prefix = trimmed.slice(0, index).trim();
                    parsed = true;
                    break;
                } catch { /* Try the next possible JSON opening character. */ }
            }
            if (!parsed) value = message;
        }
    }
    if (value && typeof value === 'object') {
        const entries = Array.isArray(value) ? value.map((item, index) => [`Item ${index + 1}`, item]) : Object.entries(value);
        return `${prefix ? `<p class="log-plain-message">${escapeHTML(prefix)}</p>` : ''}
            <dl class="log-friendly-data">${entries.map(([key, item]) => `
                <div class="log-friendly-field"><dt>${escapeHTML(String(key).replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').replace(/^./, c => c.toUpperCase()))}</dt>
                <dd>${item !== null && typeof item === 'object' ? `<pre>${escapeHTML(JSON.stringify(item, null, 2))}</pre>` : escapeHTML(item === null ? '—' : String(item))}</dd></div>`).join('')}</dl>
            <details class="log-raw-data"><summary>View formatted data</summary><pre>${escapeHTML(JSON.stringify(value, null, 2))}</pre></details>`;
    }
    return `<p class="log-plain-message">${escapeHTML(String(value ?? ''))}</p>`;
}
function renderLogCards(logs) {
    const list = document.getElementById('logs-list');
    const count = document.getElementById('logs-result-count');
    if (!list || !count) return;
    count.textContent = `${logs.length} of ${allLogs.length} entries`;
    if (!logs.length) {
        list.innerHTML = '<div class="logs-empty-state"><i data-lucide="file-text" aria-hidden="true"></i><h3>No log entries found</h3><p>Messages recorded by your workflows will appear here.</p></div>';
        window.lucide?.createIcons();
        return;
    }
    list.innerHTML = logs.map(log => `
        <article class="log-entry ${log.stepStatus === 'error' ? 'log-entry-error' : ''}">
            <div class="log-entry-top"><div class="log-entry-title"><span class="log-entry-icon"><i data-lucide="file-text" aria-hidden="true"></i></span><div><h3>${escapeHTML(log.workflowName)}</h3><p>${escapeHTML(formatDate(log.startedAt))}</p></div></div>
            <span class="run-status ${escapeHTML(log.stepStatus)}">${escapeHTML(log.stepStatus === 'success' ? 'COMPLETED' : String(log.stepStatus).toUpperCase())}</span></div>
            <div class="log-message-block"><span class="log-field-label">Workflow message</span><div class="log-message log-friendly-message">${renderFriendlyMessage(log.message || (log.error ? 'This step could not complete.' : 'No message was provided.'))}</div></div>
            <details class="log-entry-details"><summary>More information</summary>
                <div class="log-detail-grid">
                    <div><span class="log-field-label">Workflow</span><strong>${escapeHTML(log.workflowName)}</strong></div>
                    <div><span class="log-field-label">Run date</span><strong>${escapeHTML(formatDate(log.startedAt))}</strong></div>
                    <div><span class="log-field-label">Step time</span><strong>${Number(log.stepDuration)} ms</strong></div>
                    <div><span class="log-field-label">Total workflow time</span><strong>${Number(log.duration || 0)} ms</strong></div>
                    ${log.iteration !== null ? `<div><span class="log-field-label">Repeat number</span><strong>${Number(log.iteration)}</strong></div>` : ''}
                </div>
                ${log.configuredMessage !== undefined ? `<div class="log-configured-message"><span class="log-field-label">Message setup</span><p>${escapeHTML(log.configuredMessage)}</p></div>` : ''}
                ${log.error ? `<p class="run-error">${escapeHTML(log.error)}</p>` : ''}
            </details>
        </article>`).join('');
    window.lucide?.createIcons();
}
function applyFilters() {
    const query = (document.getElementById('logs-search')?.value || '').trim().toLowerCase();
    const status = document.getElementById('logs-status')?.value || 'all';
    const period = document.getElementById('logs-period')?.value || 'all';
    renderLogCards(allLogs.filter(log => {
        const haystack = [log.workflowName, log.message, log.configuredMessage].join(' ').toLowerCase();
        return (!query || haystack.includes(query)) && (status === 'all' || log.stepStatus === status) && matchesPeriod(log, period);
    }));
}
async function refreshLogs() {
    const runs = await getRuns();
    allLogs = collectLogs(runs);
    const total = document.getElementById('logs-total');
    const workflows = document.getElementById('logs-workflows');
    const executions = document.getElementById('logs-runs');
    if (total) total.textContent = allLogs.length;
    if (workflows) workflows.textContent = new Set(allLogs.map(log => log.workflowId || log.workflowName)).size;
    if (executions) executions.textContent = new Set(allLogs.map(log => log.runId)).size;
    applyFilters();
}
export function initLogs() {
    const page = document.querySelector('.logs-page');
    if (!page) return;
    page.addEventListener('input', event => { if (event.target.id === 'logs-search') applyFilters(); });
    page.addEventListener('change', event => { if (['logs-status', 'logs-period'].includes(event.target.id)) applyFilters(); });
    page.addEventListener('click', event => {
        if (event.target.closest('#refresh-logs')) refreshLogs().catch(error => {
            console.error('Could not refresh execution logs:', error);
            const list = document.getElementById('logs-list');
            if (list) list.innerHTML = '<p class="empty">Unable to load execution logs. Please try refreshing.</p>';
        });
    });
    if (!runSavedListenerRegistered) {
        document.addEventListener('flowforge:run-saved', () => {
            if (document.querySelector('.logs-page')) refreshLogs().catch(console.error);
        });
        runSavedListenerRegistered = true;
    }
    refreshLogs().catch(error => {
        console.error('Could not load execution logs:', error);
        const list = document.getElementById('logs-list');
        if (list) list.innerHTML = '<p class="empty">Unable to load execution logs. Please try refreshing.</p>';
    });
}
