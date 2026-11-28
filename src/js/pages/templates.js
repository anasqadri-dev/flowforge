import { state, replaceWorkflowState } from '../core/state.js';
import { saveSetting, getSetting } from '../core/database.js';
import { saveCurrentWorkflow, cancelPendingAutoSave, validateWorkflow } from '../core/persistence.js';
import { showNotification } from '../components/notifications.js';
import { refreshIcons } from '../core/icons.js';

function makeLinearTemplate({ id, name, description, category, steps }) {
  const nodes = [
    { id: 'n1', type: 'Manual Start', x: 80, y: 140, config: {} },
    ...steps.map((step, index) => ({
      id: 'n' + (index + 2),
      type: step.type,
      x: 80 + (index + 1) * 220,
      y: 140,
      config: structuredClone(step.config || {})
    }))
  ];

  return {
    id, name, description, category, nodes,
    connections: nodes.slice(1).map((node, index) => ({
      id: 'c' + (index + 1),
      from: nodes[index].id,
      to: node.id
    }))
  };
}

function makeDecisionTemplate({ id, name, description, category, variableName, variableValue, left, operator, right, trueMessage, falseMessage }) {
  return {
    id, name, description, category,
    nodes: [
      { id: 'n1', type: 'Manual Start', x: 80, y: 180, config: {} },
      { id: 'n2', type: 'Set Variable', x: 300, y: 180, config: { name: variableName, value: variableValue } },
      { id: 'n3', type: 'Condition', x: 540, y: 180, config: { left, operator, right } },
      { id: 'n4', type: 'Write to Log', x: 800, y: 80, config: { message: trueMessage } },
      { id: 'n5', type: 'Write to Log', x: 800, y: 300, config: { message: falseMessage } }
    ],
    connections: [
      { id: 'c1', from: 'n1', to: 'n2' },
      { id: 'c2', from: 'n2', to: 'n3' },
      { id: 'c3', from: 'n3', to: 'n4', branch: 'true', sourceHandle: 'output_1' },
      { id: 'c4', from: 'n3', to: 'n5', branch: 'false', sourceHandle: 'output_2' }
    ]
  };
}

function makeStatusRouterTemplate() {
  return {
    id: 'api-status-router',
    name: 'API Status Checker',
    description: 'Call a public demo API, check its HTTP status, and log success or failure on separate branches.',
    category: 'API Monitoring',
    nodes: [
      { id: 'n1', type: 'Manual Start', x: 80, y: 180, config: {} },
      { id: 'n2', type: 'HTTP Request', x: 300, y: 180, config: {
        url: 'https://jsonplaceholder.typicode.com/posts/1', method: 'GET', headers: '', body: '', timeoutSeconds: 15
      }},
      { id: 'n3', type: 'Condition', x: 540, y: 180, config: {
        left: '{{n2.status}}', operator: '==', right: '200'
      }},
      { id: 'n4', type: 'Write to Log', x: 800, y: 90, config: {
        message: 'API health check passed. HTTP status: {{n2.status}}'
      }},
      { id: 'n5', type: 'Write to Log', x: 800, y: 300, config: {
        message: 'API health check did not return HTTP 200.'
      }}
    ],
    connections: [
      { id: 'c1', from: 'n1', to: 'n2' },
      { id: 'c2', from: 'n2', to: 'n3' },
      { id: 'c3', from: 'n3', to: 'n4', branch: 'true', sourceHandle: 'output_1' },
      { id: 'c4', from: 'n3', to: 'n5', branch: 'false', sourceHandle: 'output_2' }
    ]
  };
}

const BUILT_IN_TEMPLATES = [
  {
    id: 'http-log',
    name: 'HTTP Request Logger',
    description: 'Fetch a sample API record and log the returned HTTP status and data.',
    category: 'API Automation',
    nodes: [
      { id: 'n1', type: 'Manual Start', x: 80, y: 140, config: {} },
      { id: 'n2', type: 'HTTP Request', x: 300, y: 140, config: {
        url: 'https://jsonplaceholder.typicode.com/posts/1', method: 'GET', headers: '', body: '', timeoutSeconds: 15
      }},
      { id: 'n3', type: 'Write to Log', x: 540, y: 140, config: {
        message: 'Request finished with HTTP {{n2.status}}. Response: {{n2.data}}'
      }}
    ],
    connections: [
      { id: 'c1', from: 'n1', to: 'n2' },
      { id: 'c2', from: 'n2', to: 'n3' }
    ]
  },
  makeLinearTemplate({
    id: 'variable-workflow', name: 'Variable Manager',
    description: 'Set reusable workflow variables, pause briefly, and log a completion message.',
    category: 'Data Automation',
    steps: [
      { type: 'Set Variable', config: { name: 'username', value: 'FlowForge User' } },
      { type: 'Wait', config: { seconds: 2 } },
      { type: 'Write to Log', config: { message: 'Completed task for {{username}}.' } }
    ]
  }),
  makeLinearTemplate({
    id: 'notification-workflow', name: 'Notification Automation',
    description: 'Send a browser notification after a short delay. Browser notification permission is required.',
    category: 'Productivity',
    steps: [
      { type: 'Wait', config: { seconds: 3 } },
      { type: 'Send Notification', config: { message: 'Your FlowForge task is ready for review.' } }
    ]
  }),

  // Additional practical templates (12).
  makeStatusRouterTemplate(),
  makeLinearTemplate({
    id: 'api-record-lookup', name: 'API Record Lookup',
    description: 'Look up a record by an editable ID, then log the returned record. Change the ID variable to reuse it.',
    category: 'API Automation',
    steps: [
      { type: 'Set Variable', config: { name: 'recordId', value: '1' } },
      { type: 'HTTP Request', config: { url: 'https://jsonplaceholder.typicode.com/posts/{{recordId}}', method: 'GET', headers: '', body: '', timeoutSeconds: 15 } },
      { type: 'Write to Log', config: { message: 'Record {{recordId}} response: {{n3.data}}' } }
    ]
  }),
  makeLinearTemplate({
    id: 'json-payload-builder', name: 'JSON Payload Builder',
    description: 'Assemble a reusable JSON-style payload from variables and inspect the result in the execution log.',
    category: 'Data Preparation',
    steps: [
      { type: 'Set Variable', config: { name: 'customerName', value: 'Ayesha Khan' } },
      { type: 'Set Variable', config: { name: 'orderNumber', value: 'ORD-1042' } },
      { type: 'Transform Data', config: { input: '{ "customer": "{{customerName}}", "order": "{{orderNumber}}", "source": "FlowForge" }' } },
      { type: 'Write to Log', config: { message: 'Prepared payload: {{n4.result}}' } }
    ]
  }),
  makeLinearTemplate({
    id: 'text-cleanup', name: 'Text Cleanup Pipeline',
    description: 'Normalize a text value by trimming it and preparing a clean output for downstream steps.',
    category: 'Data Preparation',
    steps: [
      { type: 'Set Variable', config: { name: 'rawText', value: '  New customer inquiry received  ' } },
      { type: 'Transform Data', config: { input: '{{rawText}}' } },
      { type: 'Write to Log', config: { message: 'Cleaned text value: {{n3.result}}' } }
    ]
  }),
  makeLinearTemplate({
    id: 'post-json-webhook', name: 'Send JSON to Webhook',
    description: 'Build a sample event payload and POST it to an HTTP test endpoint. Replace the URL with your own webhook.',
    category: 'API Automation',
    steps: [
      { type: 'Set Variable', config: { name: 'eventType', value: 'order.created' } },
      { type: 'Set Variable', config: { name: 'orderId', value: 'ORD-1042' } },
      { type: 'HTTP Request', config: {
        url: 'https://httpbin.org/post', method: 'POST',
        headers: '{ "Content-Type": "application/json" }',
        body: '{ "event": "{{eventType}}", "orderId": "{{orderId}}" }',
        timeoutSeconds: 20
      }},
      { type: 'Write to Log', config: { message: 'Webhook test returned HTTP {{n4.status}}.' } }
    ]
  }),
  makeLinearTemplate({
    id: 'api-delete-record', name: 'Delete Demo API Record',
    description: 'Demonstrate a DELETE request against a public mock API. The mock service does not persist real deletions.',
    category: 'API Automation',
    steps: [
      { type: 'Set Variable', config: { name: 'recordId', value: '1' } },
      { type: 'HTTP Request', config: {
        url: 'https://jsonplaceholder.typicode.com/posts/{{recordId}}', method: 'DELETE',
        headers: '', body: '', timeoutSeconds: 15
      }},
      { type: 'Write to Log', config: { message: 'Demo DELETE request returned HTTP {{n3.status}} for record {{recordId}}.' } }
    ]
  }),
  makeLinearTemplate({
    id: 'api-data-summary', name: 'API Response Summary',
    description: 'Retrieve a sample post, extract selected fields, and produce a compact human-readable summary.',
    category: 'Reporting',
    steps: [
      { type: 'HTTP Request', config: {
        url: 'https://jsonplaceholder.typicode.com/posts/1', method: 'GET',
        headers: '', body: '', timeoutSeconds: 15
      }},
      { type: 'Transform Data', config: { input: 'Post #{{n2.data.id}} — {{n2.data.title}}' } },
      { type: 'Write to Log', config: { message: '{{n3.result}}' } }
    ]
  }),
  makeLinearTemplate({
    id: 'customer-welcome', name: 'Customer Welcome Notification',
    description: 'Prepare a personalized welcome message and show it as a browser notification.',
    category: 'Customer Operations',
    steps: [
      { type: 'Set Variable', config: { name: 'customerName', value: 'New Customer' } },
      { type: 'Transform Data', config: { input: 'Welcome to our service, {{customerName}}. Your profile is ready.' } },
      { type: 'Send Notification', config: { message: '{{n3.result}}' } }
    ]
  }),
  makeLinearTemplate({
    id: 'order-processing', name: 'Order Processing Checklist',
    description: 'Simulate an order workflow by recording its reference, pausing for processing, and logging completion.',
    category: 'Business Operations',
    steps: [
      { type: 'Set Variable', config: { name: 'orderId', value: 'ORD-2026-001' } },
      { type: 'Set Variable', config: { name: 'orderStatus', value: 'Processing' } },
      { type: 'Wait', config: { seconds: 2 } },
      { type: 'Write to Log', config: { message: 'Order {{orderId}} moved to {{orderStatus}}.' } }
    ]
  }),
  makeDecisionTemplate({
    id: 'support-ticket-triage', name: 'Support Ticket Triage',
    description: 'Evaluate a ticket priority and route high-priority and standard tickets to separate actions.',
    category: 'Customer Operations',
    variableName: 'ticketPriority', variableValue: 'high',
    left: '{{ticketPriority}}', operator: '==', right: 'high',
    trueMessage: 'High-priority ticket: assign for urgent review.',
    falseMessage: 'Standard-priority ticket: add to the normal support queue.'
  }),
  makeDecisionTemplate({
    id: 'data-validation', name: 'Required Field Validation',
    description: 'Check whether a required customer email value is present and report valid or missing data.',
    category: 'Data Quality',
    variableName: 'customerEmail', variableValue: 'customer@example.com',
    left: '{{customerEmail}}', operator: '!=', right: '',
    trueMessage: 'Validation passed: required email field is present.',
    falseMessage: 'Validation failed: customer email is missing.'
  }),
  makeLinearTemplate({
    id: 'delayed-follow-up', name: 'Delayed Follow-up Reminder',
    description: 'Wait for a short configurable interval, then notify the operator to follow up on a pending item.',
    category: 'Productivity',
    steps: [
      { type: 'Set Variable', config: { name: 'followUpItem', value: 'Pending customer response' } },
      { type: 'Wait', config: { seconds: 5 } },
      { type: 'Send Notification', config: { message: 'Follow up: {{followUpItem}}.' } }
    ]
  }),
  makeLinearTemplate({
    id: 'api-post-demo', name: 'Create Demo API Record',
    description: 'Submit a sample JSON record to a mock REST API and log the created response identifier.',
    category: 'API Automation',
    steps: [
      { type: 'HTTP Request', config: {
        url: 'https://jsonplaceholder.typicode.com/posts', method: 'POST',
        headers: '{ "Content-Type": "application/json" }',
        body: '{ "title": "FlowForge demo", "body": "Sample workflow submission", "userId": 1 }',
        timeoutSeconds: 15
      }},
      { type: 'Write to Log', config: { message: 'Mock API accepted the sample request. Returned response: {{n2.data}}' } }
    ]
  })
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

export async function renderTemplatesPage(container, isCurrent = () => true) {
  const templates = await getAllTemplates();
  if (!isCurrent()) return;

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
      if (button.disabled) return;
      const template = templates.find(item => item.id === button.dataset.templateId);
      if (!template) return;

      button.disabled = true;
      try {
        validateWorkflow(template, { requireStart: true, strictConnections: true });

        const reachable = new Set();
        const adjacency = new Map(template.nodes.map(node => [node.id, []]));
        template.connections.forEach(edge => adjacency.get(edge.from).push(edge.to));
        const startNode = template.nodes.find(node => ['Manual Start', 'Timer (Schedule)'].includes(node.type));
        const pending = [startNode.id];
        while (pending.length) {
          const id = pending.pop();
          if (reachable.has(id)) continue;
          reachable.add(id);
          pending.push(...adjacency.get(id));
        }
        if (reachable.size !== template.nodes.length) {
          throw new Error('This template contains nodes that are disconnected from its start node.');
        }

        cancelPendingAutoSave();
        if (state.workflowId || state.nodes.length || state.connections.length) {
          const savedCurrent = await saveCurrentWorkflow(false);
          if (!savedCurrent) throw new Error('Your current workflow could not be saved. The template was not loaded.');
        }

        const idMap = new Map(template.nodes.map(node => [node.id, crypto.randomUUID()]));
        const nodes = template.nodes.map(node => ({
          ...structuredClone(node),
          id: idMap.get(node.id),
          x: Number(node.x) || 0,
          y: Number(node.y) || 0
        }));
        const connections = template.connections.map(edge => ({
          ...structuredClone(edge),
          id: crypto.randomUUID(),
          from: idMap.get(edge.from),
          to: idMap.get(edge.to)
        }));

        state.workflowId = crypto.randomUUID();
        state.workflowName = template.name;
        state.createdAt = Date.now();
        replaceWorkflowState({ nodes, connections });

        const savedTemplateWorkflow = await saveCurrentWorkflow(false);
        if (!savedTemplateWorkflow) {
          throw new Error('The template was loaded in memory but could not be saved to IndexedDB.');
        }

        document.dispatchEvent(new CustomEvent('flowforge:workflow-loaded', {
          detail: {
            workflowId: savedTemplateWorkflow.id,
            workflowName: savedTemplateWorkflow.name
          }
        }));

        showNotification(`${template.name} loaded successfully!`);
        window.location.hash = '#builder';
      } catch (error) {
        console.error('Template could not be loaded:', error);
        showNotification(error.message || 'Unable to load this template.');
      } finally {
        button.disabled = false;
      }
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