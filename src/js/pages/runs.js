import { getSetting, getRuns, getRun, deleteRun, clearRuns, getWorkflow, saveRun } from '../core/database.js';
import { runWorkflow } from '../core/engine.js';
import { exportRunReport } from '../core/advanced.js';

export function renderRuns() {
    return `
        <section class="page-container runs-page">
            <div class="page-heading">
                <div><h1>Run History</h1><p>Review previous workflow runs and repeat an execution when needed.</p></div>
                <button id="clear-runs" class="btn" type="button">Clear History</button>
            </div>
            <div class="stats-grid">
                <article class="stat-card"><h3 id="runs-total">0</h3><p>Total Runs</p></article>
                <article class="stat-card"><h3 id="runs-success">0</h3><p>Successful</p></article>
                <article class="stat-card"><h3 id="runs-failed">0</h3><p>Failed</p></article>
            </div>
            <section class="runs-list-section"><h2>Execution Records</h2><div id="runs-list"><p class="empty">Loading run history...</p></div></section>
            <section id="run-details" class="run-details" hidden></section>
        </section>`;
}

function escapeHTML(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function formatDate(timestamp) {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp));
}
function renderRunList(runs) {
    const container = document.getElementById('runs-list');
    if (!container) return;
    if (!runs.length) {
        container.innerHTML = '<p class="empty">No workflow executions yet. Run a workflow to see its history here.</p>';
        return;
    }
    container.innerHTML = runs.map(run => `
        <article class="run-card">
            <div class="run-card-info">
                <h3>${escapeHTML(run.workflowName || 'Workflow Execution')}</h3>
                <p>${formatDate(run.startedAt)}</p>
                <p class="run-workflow-id">${run.workflowId ? `Workflow ID: ${escapeHTML(run.workflowId)}` : 'Saved execution snapshot'}</p>
                <p>Duration: ${Number(run.duration) || 0} ms <span aria-hidden="true">·</span> Steps: ${run.steps?.length || 0}</p>
            </div>
            <span class="run-status ${escapeHTML(run.status)}">${escapeHTML(String(run.status).toUpperCase())}</span>
            <div class="run-actions">
                <button class="btn replay-run" data-run-id="${escapeHTML(run.id)}" type="button">Replay</button>
                <button class="btn report-csv" data-run-id="${escapeHTML(run.id)}" type="button">CSV Report</button>
                <button class="btn report-pdf" data-run-id="${escapeHTML(run.id)}" type="button">PDF Report</button>
                <button class="btn view-run" data-run-id="${escapeHTML(run.id)}" type="button">View</button>
                <button class="btn delete-run" data-run-id="${escapeHTML(run.id)}" type="button">Delete</button>
            </div>
        </article>`).join('');
}
function renderRunDetails(run) {
    const container = document.getElementById('run-details');
    if (!container) return;
    container.hidden = false;
    container.innerHTML = `
        <div class="page-heading"><h2>Execution Details</h2><button type="button" class="btn" id="close-run-details">Close</button></div>
        <p><strong>Status:</strong> ${escapeHTML(run.status)}</p>
        <p><strong>Started:</strong> ${formatDate(run.startedAt)}</p>
        <p><strong>Duration:</strong> ${Number(run.duration) || 0} ms</p>
        ${run.error ? `<p class="run-error">${escapeHTML(run.error)}</p>` : ''}
        <h3>Execution Steps</h3>
        <div class="run-steps">${(run.steps || []).map((step, index) => `
            <article class="run-step"><div><strong>${index + 1}. ${escapeHTML(step.type || 'Workflow step')}</strong>
            <p>Duration: ${Number(step.duration) || 0} ms</p>
            ${step.error ? `<p class="run-error">${escapeHTML(step.error)}</p>` : ''}
            ${step.output !== undefined ? `<pre>${escapeHTML(JSON.stringify(step.output, null, 2))}</pre>` : ''}</div>
            <span class="run-status ${escapeHTML(step.status)}">${escapeHTML(String(step.status).toUpperCase())}</span></article>`).join('')}</div>`;
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
async function refreshRuns() {
    const runs = await getRuns();
    const total = document.getElementById('runs-total');
    const success = document.getElementById('runs-success');
    const failed = document.getElementById('runs-failed');
    if (total) total.textContent = runs.length;
    if (success) success.textContent = runs.filter(run => run.status === 'success').length;
    if (failed) failed.textContent = runs.filter(run => ['error', 'cancelled'].includes(run.status)).length;
    renderRunList(runs);
}

export function initRuns() {
    const page = document.querySelector('.runs-page');
    if (!page) return;
    refreshRuns().catch(error => console.error('Could not load run history:', error));

    page.addEventListener('click', async event => {
        const button = event.target.closest('button');
        if (!button) return;
        if (button.disabled) return;
        try {
            if (button.id === 'clear-runs') {
                const preferences = await getSetting('preferences') || { confirmDelete: true };
                if (preferences.confirmDelete !== false && !window.confirm('Delete all execution history?')) return;
                await clearRuns();
                document.getElementById('run-details').hidden = true;
                await refreshRuns();
                return;
            }
            if (button.classList.contains('delete-run')) {
                const preferences = await getSetting('preferences') || { confirmDelete: true };
                if (preferences.confirmDelete !== false && !window.confirm('Delete this execution record?')) return;
                await deleteRun(button.dataset.runId);
                await refreshRuns();
                document.getElementById('run-details').hidden = true;
                return;
            }
            if (button.classList.contains('replay-run')) {
                button.disabled = true;
                const previous = await getRun(button.dataset.runId);
                if (!previous) throw new Error('This execution record could not be found.');
                const savedWorkflow = previous.workflowId ? await getWorkflow(previous.workflowId) : null;
                const snapshot = previous.workflowSnapshot || savedWorkflow;
                if (!snapshot || !Array.isArray(snapshot.nodes) || !Array.isArray(snapshot.connections)) {
                    throw new Error('This run does not contain a saved workflow snapshot and cannot be replayed.');
                }
                const result = await runWorkflow(
                    structuredClone(snapshot.nodes),
                    structuredClone(snapshot.connections),
                    structuredClone(previous.initialContext || {}),
                    {
                        workflowId: previous.workflowId || null,
                        workflowName: previous.workflowName || savedWorkflow?.name || 'Replayed Workflow',
                        workflowSnapshot: { nodes: structuredClone(snapshot.nodes), connections: structuredClone(snapshot.connections) }
                    }
                );
                await saveRun(result);
                document.dispatchEvent(new CustomEvent('flowforge:run-saved', { detail: result }));
                await refreshRuns();
                return;
            }
            if (button.classList.contains('report-csv')) {
                await exportRunReport(button.dataset.runId, 'csv');
                return;
            }
            if (button.classList.contains('report-pdf')) {
                await exportRunReport(button.dataset.runId, 'pdf');
                return;
            }
            if (button.classList.contains('view-run')) {
                const run = await getRun(button.dataset.runId);
                if (run) renderRunDetails(run);
                return;
            }
            if (button.id === 'close-run-details') document.getElementById('run-details').hidden = true;
        } catch (error) {
            console.error('Run history action failed:', error);
            window.alert(error.message || 'Unable to complete the requested action.');
        } finally {
            button.disabled = false;
        }
    });
}
