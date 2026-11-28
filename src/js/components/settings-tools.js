import { downloadApplicationBackup, restoreApplicationBackup } from '../core/backup.js';
import { getGlobalVariables, saveGlobalVariables } from '../core/advanced.js';
import { showNotification } from './notifications.js';

export async function mountSettingsTools(container) {
    const page = container.querySelector('.settings-page');
    if (!page) return;

    const variables = await getGlobalVariables();
    const section = document.createElement('div');
    section.className = 'settings-advanced-tools';
    section.innerHTML = `
        <section class="settings-card settings-card-wide">
            <div class="settings-card-heading">
                <div><h2>Backup &amp; Restore</h2><p>Keep a copy of your saved workflows and important application data, or restore it later.</p></div>
                <i data-lucide="database-backup" aria-hidden="true"></i>
            </div>
            <div class="settings-actions">
                <button id="download-app-backup" class="btn-primary" type="button">Download Complete Backup</button>
                <button id="restore-app-backup" class="btn" type="button">Restore from Backup</button>
                <input id="app-backup-file" type="file" accept=".json,application/json" hidden>
            </div>
            <p class="muted-text">Includes workflows, run history, preferences, variables and saved application data. Templates are excluded because they are already included with FlowForge. A safety backup is downloaded before restoring.</p>
        </section>
        <section class="settings-card">
            <div class="settings-card-heading">
                <div><h2>Global Variables</h2><p>Save reusable values that workflows can use when they run.</p></div>
                <i data-lucide="braces" aria-hidden="true"></i>
            </div>
            <label class="settings-field-label" for="global-variables-json">Variables (JSON)</label>
            <textarea id="global-variables-json" rows="7" spellcheck="false" aria-describedby="global-variables-help"></textarea>
            <p id="global-variables-help" class="muted-text">Enter a valid JSON object, for example: { "customerName": "Ayesha" }</p>
            <button id="save-global-variables" class="btn-primary" type="button">Save Global Variables</button>
        </section>
        <section class="settings-card">
            <div class="settings-card-heading">
                <div><h2>Keyboard Shortcuts</h2><p>Quick ways to work in the workflow builder.</p></div>
                <i data-lucide="keyboard" aria-hidden="true"></i>
            </div>
            <div class="settings-shortcuts">
                <div class="settings-row"><strong>Save workflow</strong><kbd>Ctrl / Cmd + S</kbd></div>
                <div class="settings-row"><strong>Undo / Redo</strong><kbd>Ctrl / Cmd + Z / Shift + Z</kbd></div>
                <div class="settings-row"><strong>Run workflow</strong><kbd>Ctrl / Cmd + Enter</kbd></div>
                <div class="settings-row"><strong>Pause / resume debugger</strong><kbd>Ctrl / Cmd + Shift + D</kbd></div>
            </div>
        </section>`;
    page.appendChild(section);

    section.querySelector('#global-variables-json').value = JSON.stringify(variables, null, 2);

    section.querySelector('#download-app-backup').addEventListener('click', async () => {
        try {
            const result = await downloadApplicationBackup();
            showNotification(`Backup downloaded: ${result.workflowCount} workflows and ${result.runCount} runs.`);
        } catch (error) {
            showNotification(error.message || 'Backup could not be created.');
        }
    });

    section.querySelector('#restore-app-backup').addEventListener('click', () => section.querySelector('#app-backup-file').click());
    section.querySelector('#app-backup-file').addEventListener('change', async event => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        try {
            const result = await restoreApplicationBackup(file);
            if (result.cancelled) return;
            showNotification('Backup restored. Reloading FlowForge...');
            setTimeout(() => window.location.reload(), 700);
        } catch (error) {
            showNotification(error.message || 'Backup restore failed.');
        }
    });

    section.querySelector('#save-global-variables').addEventListener('click', async () => {
        try {
            const values = JSON.parse(section.querySelector('#global-variables-json').value || '{}');
            await saveGlobalVariables(values);
            showNotification('Global variables saved.');
        } catch (error) {
            showNotification(error.message || 'Global variables must be a valid JSON object.');
        }
    });

    window.lucide?.createIcons();
}
