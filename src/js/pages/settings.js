import {
    getSetting,
    saveSetting,
    getWorkflows,
    deleteWorkflow,
    clearRuns,
    clearCustomTemplates,
    deleteSetting
} from '../core/database.js';
import { showNotification } from '../components/notifications.js';
import { setTheme } from '../core/theme.js';
import { state, replaceWorkflowState } from '../core/state.js';
import { cancelPendingAutoSave } from '../core/persistence.js';
import { mountSettingsTools } from '../components/settings-tools.js';

export async function renderSettingsPage(container, isCurrent = () => true) {
    const databaseTheme = await getSetting('theme');
    let savedTheme = databaseTheme || 'light';
    if (!databaseTheme) {
        try { savedTheme = localStorage.getItem('theme') || 'light'; }
        catch (error) { console.warn('Local theme preference is unavailable.', error); }
    }
    const preferences = await getSetting('preferences') || {
        confirmDelete: true,
        defaultWorkflowName: 'Untitled Workflow'
    };
    if (!isCurrent()) return;

    container.innerHTML = `
        <section class="settings-page">
            <div class="page-heading">
                <div><h1>Application Settings</h1><p>Manage your FlowForge preferences and application data.</p></div>
            </div>
            <div class="settings-core-grid">
                <section class="settings-card settings-appearance-card">
                    <div class="settings-card-heading">
                        <div><h2>Appearance</h2><p>Choose the look that feels most comfortable.</p></div>
                        <i data-lucide="palette" aria-hidden="true"></i>
                    </div>
                    <div class="settings-row">
                        <div><strong>Application theme</strong><p>Switch between Light and Dark appearance.</p></div>
                        <select id="app-theme" aria-label="Application theme">
                            <option value="light" ${savedTheme === 'light' ? 'selected' : ''}>Light</option>
                            <option value="dark" ${savedTheme === 'dark' ? 'selected' : ''}>Dark</option>
                        </select>
                    </div>
                </section>
                <section class="settings-card settings-preferences-card">
                    <div class="settings-card-heading">
                        <div><h2>Workflow Preferences</h2><p>Set sensible defaults for your workflows.</p></div>
                        <i data-lucide="sliders-horizontal" aria-hidden="true"></i>
                    </div>
                    <div class="settings-row">
                        <div><strong>Confirm before deleting</strong><p>Ask before deleting saved data and templates.</p></div>
                        <input type="checkbox" id="confirm-delete" ${preferences.confirmDelete !== false ? 'checked' : ''}>
                    </div>
                    <div class="settings-row">
                        <div><strong>Default workflow name</strong><p>Name used when creating a new workflow.</p></div>
                        <input type="text" id="default-workflow-name" maxlength="100" value="${escapeHTML(preferences.defaultWorkflowName || 'Untitled Workflow')}">
                    </div>
                    <button id="save-preferences" class="btn-primary" type="button"><i data-lucide="check" aria-hidden="true"></i> Save Preferences</button>
                </section>
                <section class="settings-card danger-zone settings-card-wide">
                    <div class="settings-card-heading">
                        <div><h2>Data Management</h2><p>Remove saved information from this browser when you no longer need it.</p></div>
                        <i data-lucide="database" aria-hidden="true"></i>
                    </div>
                    <p>Permanently removes saved workflows, execution history, and custom templates. This action cannot be undone.</p>
                    <button id="clear-application-data" class="danger-button" type="button"><i data-lucide="trash-2" aria-hidden="true"></i> Clear Application Data</button>
                </section>
                <section class="settings-card settings-about-card settings-card-wide">
                    <div class="settings-card-heading">
                        <div><h2>About FlowForge</h2><p>Your browser-based visual workflow automation workspace.</p></div>
                        <i data-lucide="workflow" aria-hidden="true"></i>
                    </div>
                    <div class="settings-about-meta"><span>FlowForge — Visual Workflow Automation Platform</span><span>Web Engineering Theory project</span><span>Version 1.0</span></div>
                </section>
            </div>
        </section>
    `;

    await mountSettingsTools(container);

    container.querySelector('#app-theme').addEventListener('change', async event => {
        await setTheme(event.target.value);
        showNotification('Theme updated successfully.');
    });

    container.querySelector('#save-preferences').addEventListener('click', async () => {
        const updated = {
            confirmDelete: container.querySelector('#confirm-delete').checked,
            defaultWorkflowName: container.querySelector('#default-workflow-name').value.trim() || 'Untitled Workflow'
        };
        await saveSetting('preferences', updated);
        showNotification('Preferences saved successfully.');
    });

    container.querySelector('#clear-application-data').addEventListener('click', async () => {
        const confirmDelete = container.querySelector('#confirm-delete').checked;
        if (confirmDelete && !window.confirm('Permanently delete all saved workflows, runs, and custom templates?')) return;

        // Stop a queued autosave before deleting records so it cannot recreate
        // the active workflow while the clear operation is in progress.
        cancelPendingAutoSave();

        try {
            const workflows = await getWorkflows();
            await Promise.all(workflows.map(workflow => deleteWorkflow(workflow.id)));
            await clearRuns();
            await clearCustomTemplates();
            await Promise.all(['globalVariables', 'environmentProfiles', 'workflowVersions', 'schedules'].map(deleteSetting));
            state.workflowId = null;
            state.workflowName = 'Untitled Workflow';
            state.createdAt = null;
            replaceWorkflowState({ nodes: [], connections: [] });
            cancelPendingAutoSave();
            try { localStorage.removeItem('flowforge-active-workflow'); }
            catch (storageError) { console.warn('Could not clear the active workflow pointer.', storageError); }
            showNotification('Application data cleared successfully.');
            window.location.hash = '#dashboard';
        } catch (error) {
            console.error('Failed to clear application data:', error);
            showNotification('Unable to clear application data.');
        }
    });
}

function escapeHTML(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
}
