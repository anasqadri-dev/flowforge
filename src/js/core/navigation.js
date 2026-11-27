
import { renderBuilder } from '../pages/builder.js';
import { renderRuns, initRuns } from '../pages/runs.js';
import { initNodes } from '../components/nodes.js';

function renderDashboard() {
    return `
        <h1>Dashboard</h1>

        <section class="stats-grid">
            <article class="stat-card">
                <h3 id="stat-workflows">0</h3>
                <p>Workflows</p>
            </article>

            <article class="stat-card">
                <h3 id="stat-runs">0</h3>
                <p>Total Runs</p>
            </article>

            <article class="stat-card">
                <h3 id="stat-success">—</h3>
                <p>Success Rate</p>
            </article>
        </section>

        <section class="quick-actions">
            <a href="#builder" class="btn-primary">+ New Workflow</a>
            <a href="#templates" class="btn">Browse Templates</a>
        </section>

        <section>
            <h2>Recent Runs</h2>
            <ul id="recent-runs" class="run-list">
                <li class="empty">No runs yet.</li>
            </ul>
        </section>
    `;
}

export function initializeNavigation(showNotification) {

    function handleRoute() {
        const route = window.location.hash || '#dashboard';
        const content = document.querySelector('.content');

        if (!content) return;

        try {
            switch (route) {

                case '#dashboard':
                    content.innerHTML = renderDashboard();
                    break;

                case '#builder':
                    content.innerHTML = renderBuilder();

                    requestAnimationFrame(() => {
                        initNodes();
                    });
                    break;

                case '#runs':
                    content.innerHTML = renderRuns();

                    requestAnimationFrame(() => {
                        initRuns();
                    });
                    break;

                case '#templates':
                case '#settings':
                    showNotification(
                        'This module is being implemented.'
                    );
                    break;

                default:
                    window.location.hash = '#dashboard';
            }

        } catch (error) {
            console.error('Navigation failed:', error);
            showNotification('Unable to open this page.');
        }
    }

    window.addEventListener('hashchange', handleRoute);

    handleRoute();
}
