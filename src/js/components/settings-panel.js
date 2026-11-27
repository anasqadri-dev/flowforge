
// src/js/components/settings-panel.js

import { state } from '../core/state.js';

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function inputField(label, name, value = '', type = 'text', placeholder = '') {
  return `
    <div class="form-group">
      <label for="${name}">${label}</label>
      <input
        type="${type}"
        id="${name}"
        name="${name}"
        value="${escapeHTML(value)}"
        placeholder="${escapeHTML(placeholder)}"
        required
      />
    </div>
  `;
}

function selectField(label, name, options, selected) {
  return `
    <div class="form-group">
      <label for="${name}">${label}</label>
      <select id="${name}" name="${name}">
        ${options.map(option => `
          <option value="${escapeHTML(option)}"
            ${selected === option ? 'selected' : ''}>
            ${escapeHTML(option)}
          </option>
        `).join('')}
      </select>
    </div>
  `;
}

function textareaField(label, name, value = '', placeholder = '', required = true) {
  return `
    <div class="form-group">
      <label for="${name}">${label}</label>
      <textarea
        id="${name}"
        name="${name}"
        placeholder="${escapeHTML(placeholder)}"
        rows="4"
        ${required ? "required" : ""}
      >${escapeHTML(value)}</textarea>
    </div>
  `;
}

export function renderSettingsPanel(boxName, config = {}, currentNodeId = null) {
  if (!boxName) return '';

  let formFields = '';

  switch (boxName) {

    case 'Manual Start':
      formFields = `
        <p class="no-settings">
          This workflow starts manually. No configuration is required.
        </p>
      `;
      break;

    case 'Timer (Schedule)':
      formFields = inputField(
        'Schedule Date & Time',
        'schedule-time',
        config.scheduleTime || '',
        'datetime-local'
      );
      break;

    case 'HTTP Request':
      formFields = `
        ${inputField(
          'Request URL',
          'http-url',
          config.url || '',
          'url',
          'https://api.example.com'
        )}

        ${selectField(
          'HTTP Method',
          'http-method',
          ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
          config.method || 'GET'
        )}

        ${textareaField(
          'Request Headers (JSON)',
          'http-headers',
          config.headers || '',
          '{"Content-Type": "application/json"}',
          false
        )}

        ${textareaField(
          'Request Body (JSON)',
          'http-body',
          config.body || '',
          '{"name": "FlowForge"}',
          false
        )}
      `;
      break;

    case 'Transform Data':
      formFields = textareaField(
        'Input / Transformation Data',
        'transform-input',
        config.input || '',
        'Enter text or use {{variable}}'
      );
      break;

    case 'Set Variable':
      formFields = `
        ${inputField(
          'Variable Name',
          'variable-name',
          config.name || '',
          'text',
          'username'
        )}

        ${textareaField(
          'Variable Value',
          'variable-value',
          config.value || '',
          'Enter a value or {{anotherVariable}}'
        )}
      `;
      break;

    case 'Wait':
      formFields = inputField(
        'Wait Duration (seconds)',
        'wait-time',
        config.seconds ?? 5,
        'number'
      );
      break;

    case 'Condition':
      formFields = `
        ${inputField(
          'Left Value',
          'condition-left',
          config.left || '',
          'text',
          '{{status}}'
        )}

        ${selectField(
          'Operator',
          'condition-operator',
          ['==', '!=', '>', '<', '>=', '<='],
          config.operator || '=='
        )}

        ${inputField(
          'Right Value',
          'condition-right',
          config.right || '',
          'text',
          '200'
        )}
      `;
      break;

    case 'Loop': {
      const candidates = state.nodes.filter(node => node.id !== currentNodeId);
      const selectedIds = Array.isArray(config.bodyNodeIds) ? config.bodyNodeIds : [];
      formFields = `
        ${inputField(
          'Number of Iterations',
          'loop-count',
          config.count ?? 3,
          'number'
        )}
        <div class="form-group">
          <label>Loop Body Nodes</label>
          <p class="field-help">Select the action nodes that should run during each iteration. The selected nodes must form one connected path.</p>
          <div class="loop-node-options">
            ${candidates.map(node => `
              <label class="loop-node-option">
                <input type="checkbox" name="loop-body-node" value="${escapeHTML(node.id)}" ${selectedIds.includes(node.id) ? 'checked' : ''}>
                <span>${escapeHTML(node.type)}</span>
              </label>
            `).join('') || '<p class="no-settings">Add action nodes before configuring a loop body.</p>'}
          </div>
        </div>
      `;
      break;
    }

    case 'Send Notification':
      formFields = textareaField(
        'Notification Message',
        'notification-message',
        config.message || '',
        'Your workflow has completed!'
      );
      break;

    case 'Write to Log':
      formFields = textareaField(
        'Log Message',
        'log-message',
        config.message || '',
        'Workflow executed successfully!'
      );
      break;

    default:
      formFields = `
        <p class="no-settings">
          No configuration is available for this box.
        </p>
      `;
  }

  return `
    <aside class="settings-panel" id="settings-panel">

      <div class="panel-header">
        <h3>Configure: ${escapeHTML(boxName)}</h3>

        <button
          type="button"
          id="close-settings"
          class="close-settings"
          aria-label="Close settings"
        >
          <i data-lucide="panel-right-close" aria-hidden="true"></i>
        </button>
      </div>

      <form id="settings-form" class="settings-form">

        ${formFields}

        <button
          type="submit"
          class="btn-primary save-settings-btn"
        >
          Save Configuration
        </button>

      </form>

    </aside>
  `;
}