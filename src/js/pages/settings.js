import {
    getSetting,
    saveSetting,
    getWorkflows,
    deleteWorkflow,
    clearRuns,
    clearCustomTemplates
} from '../core/database.js';
import { showNotification } from '../components/notifications.js';
import { setTheme } from '../core/theme.js';
import { state, replaceWorkflowState } from '../core/state.js';
import { cancelPendingAutoSave } from '../core/persistence.js';

export async function renderSettingsPage(container, isCurrent = () => true) {
    const savedTheme = await getSetting('theme') || localStorage.getItem('theme') || 'light';
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
            <div class="settings-card">
                <h2>Appearance</h2>
                <div class="settings-row">
                    <div><strong>Application Theme</strong><p>Choose your preferred interface appearance.</p></div>
                    <select id="app-theme" aria-label="Application theme">
                        <option value="light" ${savedTheme === 'light' ? 'selected' : ''}>Light</option>
                        <option value="dark" ${savedTheme === 'dark' ? 'selected' : ''}>Dark</option>
                    </select>
                </div>
            </div>
            <div class="settings-card">
                <h2>Workflow Preferences</h2>
                <div class="settings-row">
                    <div><strong>Confirm Before Deleting</strong><p>Ask before deleting saved data and templates.</p></div>
                    <input type="checkbox" id="confirm-delete" ${preferences.confirmDelete !== false ? 'checked' : ''}>
                </div>
                <div class="settings-row">
                    <div><strong>Default Workflow Name</strong><p>Name used when creating a new workflow.</p></div>
                    <input type="text" id="default-workflow-name" maxlength="100" value="${escapeHTML(preferences.defaultWorkflowName || 'Untitled Workflow')}">
                </div>
                <button id="save-preferences" class="btn-primary" type="button">Save Preferences</button>
            </div>
            <div class="settings-card danger-zone">
                <h2>Data Management</h2>
                <p>Permanently remove saved workflows, execution history, and custom templates from this browser.</p>
                <button id="clear-application-data" class="danger-button" type="button">Clear Application Data</button>
            </div>
            <div class="settings-card">
                <h2>About FlowForge</h2>
                <p>FlowForge — Visual Workflow Automation Platform.</p>
                <p>Developed as a Web Engineering Theory final project.</p>
                <p>Version 1.0</p>
            </div>
        </section>
    `;

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
