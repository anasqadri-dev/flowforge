import {
  getSetting,
  saveSetting,
  getWorkflows,
  deleteWorkflow,
  clearRuns
} from '../core/database.js';

import { showNotification } from '../components/notifications.js';

export async function renderSettingsPage(container) {
  const savedTheme =
    await getSetting('theme') ||
    localStorage.getItem('theme') ||
    'dark';

  const preferences = await getSetting('preferences') || {
    confirmDelete: true,
    defaultWorkflowName: 'Untitled Workflow'
  };

  container.innerHTML = `
    <section class="settings-page">

      <div class="page-heading">
        <div>
          <h1>Application Settings</h1>
          <p>Manage your FlowForge preferences and application data.</p>
        </div>
      </div>

      <div class="settings-card">

        <h2>Appearance</h2>

        <div class="settings-row">
          <div>
            <strong>Application Theme</strong>
            <p>Choose your preferred interface appearance.</p>
          </div>

          <select id="app-theme">
            <option value="dark" ${savedTheme === 'dark' ? 'selected' : ''}>
              Dark
            </option>
            <option value="light" ${savedTheme === 'light' ? 'selected' : ''}>
              Light
            </option>
          </select>
        </div>

      </div>

      <div class="settings-card">

        <h2>Workflow Preferences</h2>

        <div class="settings-row">
          <div>
            <strong>Confirm Before Deleting</strong>
            <p>Ask for confirmation before deleting saved data.</p>
          </div>

          <input
            type="checkbox"
            id="confirm-delete"
            ${preferences.confirmDelete ? 'checked' : ''}
          />
        </div>

        <div class="settings-row">
          <div>
            <strong>Default Workflow Name</strong>
            <p>Name used when creating a new workflow.</p>
          </div>

          <input
            type="text"
            id="default-workflow-name"
            value="${escapeHTML(preferences.defaultWorkflowName)}"
          />
        </div>

        <button id="save-preferences" class="btn-primary">
          Save Preferences
        </button>

      </div>

      <div class="settings-card danger-zone">

        <h2>Data Management</h2>

        <p>
          Permanently remove saved workflows, execution history,
          and custom templates from this browser.
        </p>

        <button id="clear-application-data" class="danger-button">
          Clear Application Data
        </button>

      </div>

      <div class="settings-card">

        <h2>About FlowForge</h2>

        <p>FlowForge — Visual Workflow Automation Platform.</p>
        <p>Developed as a Web Engineering Theory final project.</p>
        <p>Version 1.0</p>

      </div>

    </section>
  `;

  // Theme selection.
  container.querySelector('#app-theme')
    .addEventListener('change', async (event) => {
      const theme = event.target.value;

      document.body.classList.toggle('dark', theme === 'dark');

      localStorage.setItem('theme', theme);

      await saveSetting('theme', theme);

      showNotification('Theme updated successfully.');
    });

  // Save preferences.
  container.querySelector('#save-preferences')
    .addEventListener('click', async () => {

      const updatedPreferences = {
        confirmDelete: container.querySelector('#confirm-delete').checked,
        defaultWorkflowName:
          container.querySelector('#default-workflow-name').value.trim()
          || 'Untitled Workflow'
      };

      await saveSetting('preferences', updatedPreferences);

      showNotification('Preferences saved successfully.');
    });

  // Clear all application data.
  container.querySelector('#clear-application-data')
    .addEventListener('click', async () => {

      const confirmDelete =
        container.querySelector('#confirm-delete').checked;

      if (
        confirmDelete &&
        !confirm(
          'Are you sure? This will permanently delete all saved workflows, runs, and custom templates.'
        )
      ) {
        return;
      }

      try {
        const workflows = await getWorkflows();

        for (const workflow of workflows) {
          await deleteWorkflow(workflow.id);
        }

        await clearRuns();

        await saveSetting('customTemplates', []);

        showNotification('Application data cleared successfully.');

      } catch (error) {
        console.error('Failed to clear application data:', error);

        showNotification('Unable to clear application data.');
      }
    });
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