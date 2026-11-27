import { renderBuilder } from '../pages/builder.js';
import { renderRuns, initRuns } from '../pages/runs.js';
import { renderTemplatesPage } from '../pages/templates.js';
import { renderSettingsPage } from '../pages/settings.js';
import { initNodes } from '../components/nodes.js';
import { refreshIcons } from './icons.js';
import { waitForWorkflowRestore } from './persistence.js';

function renderDashboard() {
    return `
        <h1>Dashboard</h1>
        <section class="stats-grid">
            <article class="stat-card"><h3 id="stat-workflows">0</h3><p>Workflows</p></article>
            <article class="stat-card"><h3 id="stat-runs">0</h3><p>Total Runs</p></article>
            <article class="stat-card"><h3 id="stat-success">—</h3><p>Success Rate</p></article>
        </section>
        <section class="quick-actions">
            <a href="#builder" class="btn-primary"><i data-lucide="plus" aria-hidden="true"></i> New Workflow</a>
            <a href="#templates" class="btn"><i data-lucide="layers" aria-hidden="true"></i> Browse Templates</a>
        </section>
        <section>
            <h2>Recent Runs</h2>
            <ul id="recent-runs" class="run-list"><li class="empty">No runs yet. Create a workflow to get started.</li></ul>
        </section>
    `;
}

export function initializeNavigation(showNotification) {
    let routeRequest = 0;

    async function handleRoute() {
        const requestId = ++routeRequest;
        const route = window.location.hash || '#dashboard';
        const content = document.querySelector('.content');
        if (!content) return;

        try {
            if (route === '#builder') await waitForWorkflowRestore();
            if (requestId !== routeRequest) return;

            switch (route) {
                case '#dashboard':
                    content.innerHTML = renderDashboard();
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
                case '#templates':
                    await renderTemplatesPage(content);
                    break;
                case '#settings':
                    await renderSettingsPage(content);
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
