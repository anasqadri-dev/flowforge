import { renderBuilder } from '../pages/builder.js';
import { renderRuns, initRuns } from '../pages/runs.js';
import { renderLogs, initLogs } from '../pages/logs.js';
import { renderTemplatesPage } from '../pages/templates.js';
import { renderSettingsPage } from '../pages/settings.js';
import { renderShowcase } from '../pages/showcase.js';
import { renderTutorials, initTutorials } from '../pages/tutorials.js';
import { renderAnalytics } from '../pages/analytics.js';
import { initNodes } from '../components/nodes.js';
import { refreshIcons } from './icons.js';
import { waitForWorkflowRestore, createNewWorkflow, loadWorkflowById } from './persistence.js';
import { getWorkflows, getRuns } from './database.js';
import { duplicateWorkflow } from './advanced.js';

function renderDashboard() {
    return `
        <h1>Dashboard</h1>
        <section class="stats-grid">
            <article class="stat-card"><h3 id="stat-workflows">0</h3><p>Workflows</p></article>
            <article class="stat-card"><h3 id="stat-runs">0</h3><p>Total Runs</p></article>
            <article class="stat-card"><h3 id="stat-success">0%</h3><p>Success Rate</p></article>
        </section>
        <section class="quick-actions">
            <button type="button" id="new-workflow" class="btn-primary"><i data-lucide="plus" aria-hidden="true"></i> New Workflow</button>
            <a href="#templates" class="btn"><i data-lucide="layers" aria-hidden="true"></i> Browse Templates</a>
        </section>
        <section>
            <h2>Saved Workflows</h2>
            <ul id="saved-workflows" class="run-list"><li class="empty">Loading workflows...</li></ul>
        </section>
        <section>
            <h2>Recent Runs</h2>
            <ul id="recent-runs" class="run-list"><li class="empty">No runs yet. Create a workflow to get started.</li></ul>
        </section>
    `;
}

function escapeHTML(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
}

async function loadDashboardData(showNotification) {
    const [workflows, runs] = await Promise.all([getWorkflows(), getRuns()]);
    const workflowCount = document.getElementById('stat-workflows');
    const runCount = document.getElementById('stat-runs');
    const successRate = document.getElementById('stat-success');
    if (!workflowCount) return;
    workflowCount.textContent = workflows.length;
    runCount.textContent = runs.length;
    const successful = runs.filter(run => run.status === 'success').length;
    successRate.textContent = runs.length ? `${Math.round(successful / runs.length * 100)}%` : '0%';

    const saved = document.getElementById('saved-workflows');
    if (saved) {
        saved.innerHTML = workflows.slice(0, 5).map(workflow => `
            <li class="dashboard-run-item">
                <div><strong>${escapeHTML(workflow.name || 'Untitled Workflow')}</strong>
                <p>Updated ${new Date(workflow.updatedAt || workflow.createdAt).toLocaleString()}</p></div>
                <div class="dashboard-workflow-actions"><button type="button" class="btn-primary open-workflow" data-workflow-id="${escapeHTML(workflow.id)}">Open</button><button type="button" class="btn duplicate-workflow" data-workflow-id="${escapeHTML(workflow.id)}">Duplicate</button></div>
            </li>
        `).join('') || '<li class="empty">No saved workflows yet. Create your first workflow.</li>';

        saved.querySelectorAll('.duplicate-workflow').forEach(button => button.addEventListener('click', async () => { try { await duplicateWorkflow(button.dataset.workflowId); await loadDashboardData(showNotification); showNotification('Workflow duplicated.'); } catch (error) { showNotification(error.message || 'Unable to duplicate workflow.'); } }));
        saved.querySelectorAll('.open-workflow').forEach(button => {
            button.addEventListener('click', async () => {
                button.disabled = true;
                try {
                    const loaded = await loadWorkflowById(button.dataset.workflowId);
                    if (!loaded) throw new Error('The selected workflow could not be opened.');
                    window.location.hash = '#builder';
                } catch (error) {
                    console.error('Workflow could not be opened:', error);
                    showNotification('Unable to open the selected workflow.');
                } finally {
                    button.disabled = false;
                }
            });
        });
    }

    const recent = document.getElementById('recent-runs');
    if (!recent) return;
    recent.innerHTML = runs.slice(0, 5).map(run => `
        <li class="dashboard-run-item">
            <div><strong>${escapeHTML(run.workflowName || 'Workflow Execution')}</strong>
            <p>${new Date(run.startedAt).toLocaleString()}</p></div>
            <span class="run-status ${run.status}">${escapeHTML(run.status.toUpperCase())}</span>
        </li>
    `).join('') || '<li class="empty">No runs yet. Create a workflow to get started.</li>';
}

export function initializeNavigation(showNotification) {
    let routeRequest = 0;

    async function handleRoute() {
        const requestId = ++routeRequest;
        const route = window.location.hash || '#dashboard';
        const content = document.querySelector('.content');
        if (!content) return;

        try {
            await waitForWorkflowRestore();
            if (requestId !== routeRequest) return;

            switch (route) {
                case '#dashboard':
                    content.innerHTML = renderDashboard();
                    content.querySelector('#new-workflow')?.addEventListener('click', async event => {
                        const button = event.currentTarget;
                        button.disabled = true;
                        try {
                            await createNewWorkflow();
                            window.location.hash = '#builder';
                        } catch (error) {
                            console.error('New workflow could not be created:', error);
                            showNotification('Unable to create a new workflow. Save the current workflow and try again.');
                        } finally {
                            button.disabled = false;
                        }
                    });
                    loadDashboardData(showNotification).catch(error => console.error('Dashboard data could not be loaded:', error));
                    break;
                case '#builder':
                    content.innerHTML = renderBuilder();
                    requestAnimationFrame(() => {
                        if (requestId === routeRequest) initNodes();
                    });
                    break;
                case '#runs':
                    content.innerHTML = renderRuns();
                    requestAnimationFrame(() => {
                        if (requestId === routeRequest) initRuns();
                    });
                    break;
                case '#logs':
                    content.innerHTML = renderLogs();
                    requestAnimationFrame(() => {
                        if (requestId === routeRequest) initLogs();
                    });
                    break;
                case '#templates':
                    await renderTemplatesPage(content, () => requestId === routeRequest);
                    break;
                case '#settings':
                    await renderSettingsPage(content, () => requestId === routeRequest);
                    break;
                case '#showcase':
                    content.innerHTML = renderShowcase();
                    break;
                case '#tutorials':
                    content.innerHTML = renderTutorials();
                    initTutorials(content);
                    break;
                case '#analytics':
                    await renderAnalytics(content, () => requestId === routeRequest);
                    break;
                default:
                    window.location.hash = '#dashboard';
                    return;
            }
            if (requestId === routeRequest) refreshIcons();
        } catch (error) {
            console.error('Navigation failed:', error);
            showNotification('Unable to open this page. Check the browser console for details.');
        }
    }

    window.addEventListener('hashchange', handleRoute);
    handleRoute();
}
