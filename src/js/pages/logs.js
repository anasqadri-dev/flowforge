import { getRuns } from '../core/database.js';

let allLogs = [];
let runSavedListenerRegistered = false;

export function renderLogs() {
    return `
        <section class="page-container logs-page">
            <header class="page-heading">
                <div>
                    <h1>Execution Logs</h1>
                    <p>Every message written by a Write to Log node, across current and previous workflow runs.</p>
                </div>
                <button type="button" class="btn" id="refresh-logs">
                    <i data-lucide="refresh-cw" aria-hidden="true"></i> Refresh
                </button>
            </header>

            <div class="stats-grid logs-stats">
                <article class="stat-card"><h3 id="logs-total">0</h3><p>Total log entries</p></article>
                <article class="stat-card"><h3 id="logs-workflows">0</h3><p>Workflows represented</p></article>
                <article class="stat-card"><h3 id="logs-runs">0</h3><p>Executions represented</p></article>
            </div>

            <section class="logs-toolbar" aria-label="Log filters">
                <label class="logs-search">
                    <i data-lucide="search" aria-hidden="true"></i>
                    <input id="logs-search" type="search" placeholder="Search messages, workflows, or node IDs..." autocomplete="off">
                </label>
                <select id="logs-status" aria-label="Filter by execution status">
                    <option value="all">All statuses</option>
                    <option value="success">Successful steps</option>
                    <option value="error">Failed steps</option>
                </select>
                <select id="logs-period" aria-label="Filter by date">
                    <option value="all">All time</option>
                    <option value="today">Today</option>
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                </select>
            </section>

            <div class="logs-results-heading">
                <h2>Log entries</h2>
                <span id="logs-result-count" class="muted-text">Loading...</span>
            </div>
            <div id="logs-list" class="logs-list" aria-live="polite">
                <p class="empty">Loading execution logs...</p>
            </div>
            <p class="logs-retention-note">Logs are stored with their workflow execution record in this browser's local IndexedDB. Deleting a run from Run History also deletes its associated log entries.</p>
        </section>
    `;
}

function escapeHTML(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
}

function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Unknown date' : new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium', timeStyle: 'medium'
    }).format(date);
}

function collectLogs(runs) {
    return runs.flatMap(run => (run.steps || [])
        .filter(step => step.type === 'Write to Log')
        .map((step, index) => ({
            id: `${run.id || run.startedAt}-${step.nodeId || index}-${step.iteration ?? 0}`,
            runId: run.id || 'Unknown run',
            workflowId: run.workflowId || '',
            workflowName: run.workflowName || 'Untitled Workflow',
            runStatus: run.status || 'unknown',
            startedAt: run.startedAt,
            finishedAt: run.finishedAt,
            duration: run.duration,
            nodeId: step.nodeId || 'Unknown node',
            iteration: step.iteration ?? null,
            stepStatus: step.status || 'unknown',
            stepDuration: step.duration ?? 0,
            configuredMessage: step.configuredMessage,
            message: step.output?.message ?? step.message ?? '',
            error: step.error || ''
        })))
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

function matchesPeriod(log, period) {
    if (period === 'all') return true;
    const timestamp = new Date(log.startedAt).getTime();
    if (!Number.isFinite(timestamp)) return false;
    const now = new Date();
    if (period === 'today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        return timestamp >= start;
    }
    return timestamp >= Date.now() - Number(period) * 24 * 60 * 60 * 1000;
}

function renderLogCards(logs) {
    const list = document.getElementById('logs-list');
    const count = document.getElementById('logs-result-count');
    if (!list || !count) return;

    count.textContent = `${logs.length} of ${allLogs.length} entries`;
    if (!logs.length) {
        list.innerHTML = `
            <div class="logs-empty-state">
                <i data-lucide="file-text" aria-hidden="true"></i>
                <h3>No log entries found</h3>
                <p>When a workflow runs a Write to Log node, its message will appear here and remain available in this browser.</p>
            </div>`;
        window.lucide?.createIcons();
        return;
    }

    list.innerHTML = logs.map(log => `
        <article class="log-entry ${log.stepStatus === 'error' ? 'log-entry-error' : ''}">
            <div class="log-entry-top">
                <div class="log-entry-title">
                    <span class="log-entry-icon"><i data-lucide="file-text" aria-hidden="true"></i></span>
                    <div>
                        <h3>${escapeHTML(log.workflowName)}</h3>
                        <p>${escapeHTML(formatDate(log.startedAt))}</p>
                    </div>
                </div>
                <span class="run-status ${escapeHTML(log.stepStatus)}">${escapeHTML(log.stepStatus.toUpperCase())}</span>
            </div>

            <div class="log-message-block">
                <span class="log-field-label">Message written by workflow</span>
                <pre class="log-message">${escapeHTML(log.message || (log.error ? 'The log node failed before producing a message.' : 'Empty log message'))}</pre>
            </div>

            <details class="log-entry-details">
                <summary>Complete log details</summary>
                <div class="log-detail-grid">
                    <div><span class="log-field-label">Workflow</span><strong>${escapeHTML(log.workflowName)}</strong></div>
                    <div><span class="log-field-label">Workflow execution</span><strong>${escapeHTML(log.runId)}</strong></div>
                    <div><span class="log-field-label">Node ID</span><strong>${escapeHTML(log.nodeId)}</strong></div>
                    <div><span class="log-field-label">Execution status</span><strong>${escapeHTML(log.runStatus.toUpperCase())}</strong></div>
                    <div><span class="log-field-label">Step duration</span><strong>${Number(log.stepDuration)} ms</strong></div>
                    <div><span class="log-field-label">Workflow duration</span><strong>${Number(log.duration || 0)} ms</strong></div>
                    ${log.iteration !== null ? `<div><span class="log-field-label">Loop iteration</span><strong>${Number(log.iteration)}</strong></div>` : ''}
                    ${log.workflowId ? `<div><span class="log-field-label">Workflow ID</span><strong>${escapeHTML(log.workflowId)}</strong></div>` : ''}
                </div>
                ${log.configuredMessage !== undefined ? `
                    <div class="log-configured-message">
                        <span class="log-field-label">Original message template</span>
                        <pre>${escapeHTML(log.configuredMessage)}</pre>
                    </div>` : ''}
                ${log.error ? `<p class="run-error">${escapeHTML(log.error)}</p>` : ''}
            </details>
        </article>
    `).join('');
    window.lucide?.createIcons();
}

function applyFilters() {
    const query = (document.getElementById('logs-search')?.value || '').trim().toLowerCase();
    const status = document.getElementById('logs-status')?.value || 'all';
    const period = document.getElementById('logs-period')?.value || 'all';
    const filtered = allLogs.filter(log => {
        const haystack = [log.workflowName, log.message, log.configuredMessage, log.nodeId, log.runId].join(' ').toLowerCase();
        return (!query || haystack.includes(query))
            && (status === 'all' || log.stepStatus === status)
            && matchesPeriod(log, period);
    });
    renderLogCards(filtered);
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

    page.addEventListener('input', event => {
        if (event.target.id === 'logs-search') applyFilters();
    });
    page.addEventListener('change', event => {
        if (['logs-status', 'logs-period'].includes(event.target.id)) applyFilters();
    });
    page.addEventListener('click', event => {
        if (event.target.closest('#refresh-logs')) {
            refreshLogs().catch(error => {
                console.error('Could not refresh execution logs:', error);
                const list = document.getElementById('logs-list');
                if (list) list.innerHTML = '<p class="empty">Unable to load execution logs. Please try refreshing.</p>';
            });
        }
    });

    if (!runSavedListenerRegistered) {
        document.addEventListener('flowforge:run-saved', () => {
            if (document.querySelector('.logs-page')) refreshLogs();
        });
        runSavedListenerRegistered = true;
    }
    refreshLogs().catch(error => {
        console.error('Could not load execution logs:', error);
        const list = document.getElementById('logs-list');
        if (list) list.innerHTML = '<p class="empty">Unable to load execution logs. Please try refreshing.</p>';
    });
}
