import { downloadApplicationBackup, restoreApplicationBackup } from '../core/backup.js';
import { getGlobalVariables, saveGlobalVariables, getEnvironmentProfiles, saveEnvironmentProfiles, getSchedules, scheduleWorkflow, restoreWorkflowVersion } from '../core/advanced.js';
import { getSetting, saveSetting, getWorkflows } from '../core/database.js';
import { showNotification } from './notifications.js';
import { loadWorkflowById } from '../core/persistence.js';

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export async function mountSettingsTools(container) {
    const page = container.querySelector('.settings-page');
    if (!page) return;
    const [variables, environment, schedules, workflows, versions] = await Promise.all([
        getGlobalVariables(), getEnvironmentProfiles(), getSchedules(), getWorkflows(), getSetting('workflowVersions')
    ]);
    const section = document.createElement('div');
    section.className = 'settings-advanced-tools';
    section.innerHTML = '<section class="settings-card"><h2>Backup &amp; Restore</h2><p>Download workflows, execution history, settings, global variables, environment profiles and schedules. Built-in and custom templates are excluded.</p><div class="settings-actions"><button id="download-app-backup" class="btn-primary" type="button">Download Complete Backup</button><button id="restore-app-backup" class="btn" type="button">Restore Backup</button><input id="app-backup-file" type="file" accept=".json,application/json" hidden></div><p class="muted-text">A safety backup is downloaded before restoration. Review the file before replacing local data.</p></section>' +
    '<section class="settings-card"><h2>Global Variables</h2><p>Reusable JSON values available to workflows during execution.</p><textarea id="global-variables-json" rows="7" spellcheck="false"></textarea><button id="save-global-variables" class="btn-primary" type="button">Save Global Variables</button></section>' +
    '<section class="settings-card"><h2>Environment Profiles</h2><p>Maintain Development, Testing and Production values independently.</p><div class="settings-row"><strong>Active environment</strong><select id="active-environment"></select></div><textarea id="environment-profiles-json" rows="8" spellcheck="false"></textarea><button id="save-environment-profiles" class="btn-primary" type="button">Save Environment Profiles</button></section>' +
    '<section class="settings-card"><h2>Local Workflow Scheduler</h2><p>Schedules run only while this browser tab remains open.</p><div class="settings-row"><select id="schedule-workflow" aria-label="Workflow to schedule"></select><input id="schedule-run-at" type="datetime-local" aria-label="Scheduled date and time"><button id="create-schedule" class="btn-primary" type="button">Schedule</button></div><ul id="schedule-list" class="run-list"></ul></section>' +
    '<section class="settings-card"><h2>Workflow Version History</h2><p>Restore a previous snapshot of a saved workflow.</p><div class="settings-row"><select id="version-workflow" aria-label="Workflow"></select><select id="version-snapshot" aria-label="Saved version"></select><button id="restore-version" class="btn" type="button">Restore Version</button></div><p class="muted-text">Up to 30 versions per workflow are retained when snapshots are created.</p></section>' +
    '<section class="settings-card"><h2>Keyboard Shortcuts</h2><div class="settings-row"><strong>Save workflow</strong><kbd>Ctrl / Cmd + S</kbd></div><div class="settings-row"><strong>Undo / Redo</strong><kbd>Ctrl / Cmd + Z / Shift + Z</kbd></div><div class="settings-row"><strong>Run workflow</strong><kbd>Ctrl / Cmd + Enter</kbd></div><div class="settings-row"><strong>Pause / resume debugger</strong><kbd>Ctrl / Cmd + Shift + D</kbd></div></section>';
    page.appendChild(section);

    section.querySelector('#global-variables-json').value = JSON.stringify(variables, null, 2);
    section.querySelector('#environment-profiles-json').value = JSON.stringify(environment.profiles || {}, null, 2);
    const activeSelect = section.querySelector('#active-environment');
    Object.keys(environment.profiles || {}).forEach(name => activeSelect.add(new Option(name, name, false, environment.active === name)));
    const workflowSelect = section.querySelector('#schedule-workflow');
    const versionWorkflow = section.querySelector('#version-workflow');
    workflows.forEach(workflow => {
        workflowSelect.add(new Option(workflow.name || 'Untitled Workflow', workflow.id));
        versionWorkflow.add(new Option(workflow.name || 'Untitled Workflow', workflow.id));
    });
    const renderSchedules = () => getSchedules().then(items => {
        const list = section.querySelector('#schedule-list');
        list.innerHTML = items.map(item => '<li><strong>' + escapeHTML(workflows.find(w => w.id === item.workflowId)?.name || 'Deleted workflow') + '</strong><p>' + new Date(item.runAt).toLocaleString() + ' · ' + escapeHTML(item.status) + '</p></li>').join('') || '<li class="empty">No scheduled workflows.</li>';
    });
    await renderSchedules();

    section.querySelector('#download-app-backup').addEventListener('click', async () => {
        try {
            const result = await downloadApplicationBackup();
            showNotification('Backup downloaded: ' + result.workflowCount + ' workflows, ' + result.runCount + ' runs.');
        } catch (error) { showNotification(error.message || 'Backup could not be created.'); }
    });
    section.querySelector('#restore-app-backup').addEventListener('click', () => section.querySelector('#app-backup-file').click());
    section.querySelector('#app-backup-file').addEventListener('change', async event => {
        const file = event.target.files?.[0]; event.target.value = '';
        if (!file) return;
        try {
            const result = await restoreApplicationBackup(file);
            if (result.cancelled) return;
            showNotification('Backup restored. Reloading FlowForge...');
            setTimeout(() => window.location.reload(), 700);
        } catch (error) { showNotification(error.message || 'Backup restore failed.'); }
    });
    section.querySelector('#save-global-variables').addEventListener('click', async () => {
        try { await saveGlobalVariables(JSON.parse(section.querySelector('#global-variables-json').value || '{}')); showNotification('Global variables saved.'); }
        catch (error) { showNotification(error.message || 'Global variables must be valid JSON.'); }
    });
    section.querySelector('#save-environment-profiles').addEventListener('click', async () => {
        try {
            const profiles = JSON.parse(section.querySelector('#environment-profiles-json').value || '{}');
            const active = activeSelect.value;
            if (!profiles[active]) throw new Error('The active environment must exist in the profiles object.');
            await saveEnvironmentProfiles({ active, profiles });
            showNotification('Environment profiles saved.');
        } catch (error) { showNotification(error.message || 'Environment profiles must be valid JSON.'); }
    });
    section.querySelector('#create-schedule').addEventListener('click', async () => {
        try {
            if (!workflowSelect.value) throw new Error('Save a workflow before scheduling it.');
            await scheduleWorkflow(workflowSelect.value, section.querySelector('#schedule-run-at').value);
            await renderSchedules();
            showNotification('Workflow scheduled. Keep FlowForge open until its scheduled time.');
        } catch (error) { showNotification(error.message || 'Unable to schedule workflow.'); }
    });
    const versionSelect = section.querySelector('#version-snapshot');
    const refreshVersions = () => {
        const items = versions?.[versionWorkflow.value] || [];
        versionSelect.innerHTML = items.map(item => '<option value="' + escapeHTML(item.id) + '">' + new Date(item.createdAt).toLocaleString() + '</option>').join('') || '<option value="">No saved versions</option>';
    };
    versionWorkflow.addEventListener('change', refreshVersions); refreshVersions();
    section.querySelector('#restore-version').addEventListener('click', async () => {
        try {
            if (!versionSelect.value) throw new Error('No saved version is available.');
            if (!window.confirm('Restore this workflow version?')) return;
            const restored = await restoreWorkflowVersion(versionWorkflow.value, versionSelect.value);
            await loadWorkflowById(restored.id);
            showNotification('Workflow version restored and loaded.');
            window.location.hash = '#builder';
        } catch (error) { showNotification(error.message || 'Unable to restore version.'); }
    });
}
