import { state, replaceWorkflowState } from '../core/state.js';
import { saveSetting, getSetting } from '../core/database.js';
import { saveCurrentWorkflow } from '../core/persistence.js';
import { showNotification } from '../components/notifications.js';
import { refreshIcons } from '../core/icons.js';

const BUILT_IN_TEMPLATES = [
  {
    id: 'http-log',
    name: 'HTTP Request Logger',
    description: 'Send an HTTP request and log the response.',
    category: 'API Automation',
    nodes: [
      {
        id: 'n1',
        type: 'Manual Start',
        x: 80,
        y: 100,
        config: {}
      },
      {
        id: 'n2',
        type: 'HTTP Request',
        x: 300,
        y: 100,
        config: {
          url: 'https://jsonplaceholder.typicode.com/posts/1',
          method: 'GET',
          headers: '',
          body: ''
        }
      },
      {
        id: 'n3',
        type: 'Write to Log',
        x: 520,
        y: 100,
        config: {
          message: 'API request completed'
        }
      }
    ],
    connections: [
      { id: 'c1', from: 'n1', to: 'n2' },
      { id: 'c2', from: 'n2', to: 'n3' }
    ]
  },
  {
    id: 'variable-workflow',
    name: 'Variable Manager',
    description: 'Create a variable, wait, and display its value.',
    category: 'Data Automation',
    nodes: [
      {
        id: 'n1',
        type: 'Manual Start',
        x: 80,
        y: 100,
        config: {}
      },
      {
        id: 'n2',
        type: 'Set Variable',
        x: 300,
        y: 100,
        config: {
          name: 'username',
          value: 'FlowForge User'
        }
      },
      {
        id: 'n3',
        type: 'Wait',
        x: 520,
        y: 100,
        config: {
          seconds: 2
        }
      },
      {
        id: 'n4',
        type: 'Write to Log',
        x: 740,
        y: 100,
        config: {
          message: 'Workflow completed'
        }
      }
    ],
    connections: [
      { id: 'c1', from: 'n1', to: 'n2' },
      { id: 'c2', from: 'n2', to: 'n3' },
      { id: 'c3', from: 'n3', to: 'n4' }
    ]
  },
  {
    id: 'notification-workflow',
    name: 'Notification Automation',
    description: 'Wait for a short duration and send a notification.',
    category: 'Productivity',
    nodes: [
      {
        id: 'n1',
        type: 'Manual Start',
        x: 80,
        y: 100,
        config: {}
      },
      {
        id: 'n2',
        type: 'Wait',
        x: 300,
        y: 100,
        config: {
          seconds: 3
        }
      },
      {
        id: 'n3',
        type: 'Send Notification',
        x: 520,
        y: 100,
        config: {
          message: 'Your FlowForge workflow has finished!'
        }
      }
    ],
    connections: [
      { id: 'c1', from: 'n1', to: 'n2' },
      { id: 'c2', from: 'n2', to: 'n3' }
    ]
  }
];

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

async function getAllTemplates() {
  const saved = await getSetting('customTemplates') || [];

  return [
    ...BUILT_IN_TEMPLATES,
    ...saved
  ];
}

export async function renderTemplatesPage(container) {
  const templates = await getAllTemplates();

  container.innerHTML = `
    <section class="templates-page">

      <div class="page-heading">
        <div>
          <h1>Workflow Templates</h1>
          <p>Start quickly with ready-made automation workflows.</p>
        </div>

        <button id="save-current-template" class="btn-primary">
          + Save Current Workflow as Template
        </button>
      </div>

      <div class="template-grid">

        ${templates.map(template => `
          <article class="template-card">

            <div class="template-card-icon"><i data-lucide="zap" aria-hidden="true"></i></div>

            <span class="template-category">
              ${escapeHTML(template.category)}
            </span>

            <h3>${escapeHTML(template.name)}</h3>

            <p>${escapeHTML(template.description)}</p>

            <div class="template-meta">
              ${template.nodes.length} workflow boxes
            </div>

            <button
              class="btn-primary use-template"
              data-template-id="${escapeHTML(template.id)}"
            >
              Use Template
            </button>

            ${template.custom ? `
              <button
                class="delete-template"
                data-template-id="${escapeHTML(template.id)}"
              >
                Delete Template
              </button>
            ` : ''}

          </article>
        `).join('')}

      </div>

    </section>
  `;

  refreshIcons(container);

  container.querySelectorAll('.use-template').forEach(button => {
    button.addEventListener('click', async () => {
      const template = templates.find(
        item => item.id === button.dataset.templateId
      );

      if (!template) return;

      state.workflowId = null;
      state.workflowName = template.name;
      state.createdAt = Date.now();

      replaceWorkflowState({
        nodes: structuredClone(template.nodes),
        connections: structuredClone(template.connections)
      });

      document.dispatchEvent(
        new CustomEvent('flowforge:workflow-loaded', {
          detail: {
            workflowId: null,
            workflowName: state.workflowName
          }
        })
      );

      await saveCurrentWorkflow();

      showNotification(
        `${template.name} loaded successfully!`
      );

      window.location.hash = '#builder';
    });
  });

  container.querySelector('#save-current-template')
    .addEventListener('click', async () => {

      if (!state.nodes.length) {
        showNotification('Add some workflow boxes first.');
        return;
      }

      const name = prompt('Enter a name for your template:');

      if (!name || !name.trim()) return;

      const description = prompt(
        'Enter a short template description:'
      ) || 'Custom workflow template';

      const templates = await getSetting('customTemplates') || [];

      templates.push({
        id: crypto.randomUUID(),
        name: name.trim(),
        description: description.trim(),
        category: 'My Templates',
        custom: true,
        nodes: structuredClone(state.nodes),
        connections: structuredClone(state.connections)
      });

      await saveSetting('customTemplates', templates);

      showNotification('Template saved successfully!');

      renderTemplatesPage(container);
    });

  container.querySelectorAll('.delete-template')
    .forEach(button => {
      button.addEventListener('click', async () => {
        const preferences = await getSetting('preferences') || { confirmDelete: true };
        if (preferences.confirmDelete !== false && !confirm('Delete this template?')) return;

        const templates =
          await getSetting('customTemplates') || [];

        const updated = templates.filter(
          item => item.id !== button.dataset.templateId
        );

        await saveSetting('customTemplates', updated);

        showNotification('Template deleted.');

        renderTemplatesPage(container);
      });
    });
}