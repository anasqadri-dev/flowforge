
import {
    getRuns,
    getRun,
    deleteRun,
    clearRuns
} from '../core/database.js';

export function renderRuns() {
    return `
        <section class="page-container runs-page">

            <div class="page-heading">
                <div>
                    <h1>Run History</h1>
                    <p>Monitor your workflow executions.</p>
                </div>

                <button
                    id="clear-runs"
                    class="btn"
                    type="button"
                >
                    Clear History
                </button>
            </div>

            <div class="stats-grid">
                <article class="stat-card">
                    <h3 id="runs-total">0</h3>
                    <p>Total Runs</p>
                </article>

                <article class="stat-card">
                    <h3 id="runs-success">0</h3>
                    <p>Successful</p>
                </article>

                <article class="stat-card">
                    <h3 id="runs-failed">0</h3>
                    <p>Failed</p>
                </article>
            </div>

            <section class="runs-list-section">
                <h2>Execution Records</h2>

                <div id="runs-list">
                    <p class="empty">Loading run history...</p>
                </div>
            </section>

            <section id="run-details" class="run-details" hidden>
            </section>

        </section>
    `;
}

function escapeHTML(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
}

function formatDate(timestamp) {
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(new Date(timestamp));
}

function renderRunList(runs) {
    const container = document.getElementById('runs-list');

    if (!container) return;

    if (!runs.length) {
        container.innerHTML = `
            <p class="empty">
                No workflow executions yet.
                Run a workflow to see its history here.
            </p>
        `;
        return;
    }

    container.innerHTML = runs.map(run => `
        <article class="run-card">

            <div class="run-card-info">
                <h3>Workflow Execution</h3>

                <p>${formatDate(run.startedAt)}</p>

                <p>
                    Duration: ${run.duration} ms
                    |
                    Steps: ${run.steps?.length || 0}
                </p>
            </div>

            <span class="run-status ${run.status}">
                ${escapeHTML(run.status.toUpperCase())}
            </span>

            <div class="run-actions">
                <button
                    class="btn view-run"
                    data-run-id="${escapeHTML(run.id)}"
                    type="button"
                >
                    View
                </button>

                <button
                    class="btn delete-run"
                    data-run-id="${escapeHTML(run.id)}"
                    type="button"
                >
                    Delete
                </button>
            </div>

        </article>
    `).join('');
}

function renderRunDetails(run) {
    const container = document.getElementById('run-details');

    if (!container) return;

    container.hidden = false;

    container.innerHTML = `
        <div class="page-heading">
            <h2>Execution Details</h2>

            <button
                type="button"
                class="btn"
                id="close-run-details"
            >
                Close
            </button>
        </div>

        <p>
            <strong>Status:</strong>
            ${escapeHTML(run.status)}
        </p>

        <p>
            <strong>Started:</strong>
            ${formatDate(run.startedAt)}
        </p>

        <p>
            <strong>Duration:</strong>
            ${run.duration} ms
        </p>

        ${run.error ? `
            <p class="run-error">
                ${escapeHTML(run.error)}
            </p>
        ` : ''}

        <h3>Execution Steps</h3>

        <div class="run-steps">

            ${(run.steps || []).map((step, index) => `
                <article class="run-step">

                    <div>
                        <strong>
                            ${index + 1}. ${escapeHTML(step.type)}
                        </strong>

                        <p>
                            Duration: ${step.duration} ms
                        </p>

                        ${step.error ? `
                            <p class="run-error">
                                ${escapeHTML(step.error)}
                            </p>
                        ` : ''}

                        ${step.output !== undefined ? `
                            <pre>${escapeHTML(
                                JSON.stringify(step.output, null, 2)
                            )}</pre>
                        ` : ''}
                    </div>

                    <span class="run-status ${step.status}">
                        ${escapeHTML(step.status.toUpperCase())}
                    </span>

                </article>
            `).join('')}

        </div>
    `;

    container.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

async function refreshRuns() {
    const runs = await getRuns();

    const total = document.getElementById('runs-total');
    const success = document.getElementById('runs-success');
    const failed = document.getElementById('runs-failed');

    if (total) total.textContent = runs.length;

    if (success) {
        success.textContent = runs.filter(
            run => run.status === 'success'
        ).length;
    }

    if (failed) {
        failed.textContent = runs.filter(
            run => run.status === 'error'
        ).length;
    }

    renderRunList(runs);
}

export function initRuns() {
    const page = document.querySelector('.runs-page');

    if (!page) return;

    refreshRuns().catch(console.error);

    page.addEventListener('click', async event => {
        const button = event.target.closest('button');

        if (!button) return;

        try {
            if (button.id === 'clear-runs') {
                if (!confirm('Delete all execution history?')) return;

                await clearRuns();

                document.getElementById('run-details').hidden = true;

                await refreshRuns();
            }

            if (button.classList.contains('delete-run')) {
                const id = button.dataset.runId;

                await deleteRun(id);

                await refreshRuns();

                document.getElementById('run-details').hidden = true;
            }

            if (button.classList.contains('view-run')) {
                const run = await getRun(button.dataset.runId);

                if (run) renderRunDetails(run);
            }

            if (button.id === 'close-run-details') {
                document.getElementById('run-details').hidden = true;
            }

        } catch (error) {
            console.error('Run history error:', error);
            alert('Unable to complete the requested action.');
        }
    });
}
