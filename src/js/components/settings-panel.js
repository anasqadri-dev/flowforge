
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

function inputField(label, name, value = '', type = 'text', placeholder = '', required = true) {
  return `
    <div class="form-group">
      <label for="${name}">${label}</label>
      <input
        type="${type}"
        id="${name}"
        name="${name}"
        value="${escapeHTML(value)}"
        placeholder="${escapeHTML(placeholder)}"
        ${required ? 'required' : ''}
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


function recoveryNodeField(config, currentNodeId) {
  const options = state.nodes.filter(node => node.id !== currentNodeId);
  return `<div class="form-group"><label for="on-error-node-id">Recovery Node</label><select id="on-error-node-id" name="on-error-node-id"><option value="">Stop on error</option>${options.map(node => `<option value="${escapeHTML(node.id)}" ${config.onErrorNodeId === node.id ? 'selected' : ''}>${escapeHTML(node.type + ' — ' + node.id.slice(0, 8))}</option>`).join('')}</select><small class="field-help">Choose a node to continue from when this action fails after retries.</small></div>`;
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
      const candidates = state.nodes.filter(node => node.id !== currentNodeId && !['Manual Start', 'Timer (Schedule)', 'Condition', 'Loop'].includes(node.type));
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


    case 'CSV Parse':
    case 'CSV Generate':
      formFields = textareaField('CSV Text / JSON Array', 'data-input', config.input || '', boxName === 'CSV Parse' ? 'name,email\\nAda,ada@example.com' : '[{"name":"Ada","email":"ada@example.com"}]');
      if (boxName === 'CSV Generate') formFields += inputField('Output Filename', 'file-name', config.filename || 'flowforge-export.csv');
      break;
    case 'Read File':
      formFields = '<p class="no-settings">Choose a file using the Builder input-file control before running this workflow.</p>';
      break;
    case 'Create File':
      formFields = inputField('Filename', 'file-name', config.filename || 'flowforge-output.txt') + inputField('MIME Type', 'file-mime', config.mimeType || 'text/plain;charset=utf-8') + textareaField('File Content', 'file-content', config.content || '', 'Use {{variables}} to insert workflow data.');
      break;
    case 'Run Sub-workflow':
      formFields = inputField('Saved Workflow ID', 'sub-workflow-id', config.workflowId || '', 'text', 'Paste a saved workflow ID');
      break;
    case 'CSV Parse':
    case 'CSV Generate':
      formFields = textareaField('CSV Text / JSON Array', 'data-input', config.input || '', boxName === 'CSV Parse' ? 'name,email\\nAda,ada@example.com' : '[{"name":"Ada","email":"ada@example.com"} ]');
      if (boxName === 'CSV Generate') formFields += inputField('Output Filename', 'file-name', config.filename || 'flowforge-export.csv');
      break;
    case 'Read File':
      formFields = '<p class="no-settings">Choose a file using the Builder input-file control before running this workflow.</p>';
      break;
    case 'Create File':
      formFields = inputField('Filename', 'file-name', config.filename || 'flowforge-output.txt') + inputField('MIME Type', 'file-mime', config.mimeType || 'text/plain;charset=utf-8') + textareaField('File Content', 'file-content', config.content || '', 'Use {{variables}} to insert workflow data.');
      break;
    case 'Run Sub-workflow':
      formFields = inputField('Saved Workflow ID', 'sub-workflow-id', config.workflowId || '', 'text', 'Paste a saved workflow ID');
      break;
    case 'JSON Parse':
    case 'JSON Stringify':
    case 'Validate JSON':
    case 'Filter Array':
    case 'Array Length':
    case 'Merge Data':
      formFields = `
        ${textareaField('JSON / Array Input', 'data-input', config.input || '', '[{"name":"Ada","active":true}]')}
        ${boxName === 'Filter Array' ? inputField('Property Path', 'data-path', config.path || 'active', 'text', 'active') : ''}
        ${boxName === 'Filter Array' ? selectField('Comparison', 'data-operator', ['==','!=','contains','>','<'], config.operator || '==') : ''}
        ${boxName === 'Filter Array' ? inputField('Compare Value', 'data-value', config.value || 'true') : ''}
        ${boxName === 'Merge Data' ? textareaField('Second JSON Object', 'data-second', config.second || '{}') : ''}
      `;
      break;

    case 'Format Text':
      formFields = textareaField('Text Template', 'text-template', config.template || '', 'Hello {{name}}, welcome to FlowForge!');
      break;
    case 'Replace Text':
      formFields = `
        ${textareaField('Input Text', 'text-input', config.input || '', 'Text to process')}
        ${inputField('Find', 'text-search', config.search || '', 'text', 'old')}
        ${inputField('Replace With', 'text-replacement', config.replacement || '', 'text', 'new')}
      `;
      break;
    case 'Split Text':
    case 'Join Text':
      formFields = `
        ${textareaField('Input Text / JSON Array', 'text-input', config.input || '', boxName === 'Split Text' ? 'red,green,blue' : '["red","green","blue"]')}
        ${inputField('Delimiter', 'text-delimiter', config.delimiter ?? ',', 'text', ',')}
      `;
      break;
    case 'Math Operation':
      formFields = `
        ${inputField('Left Number', 'math-left', config.left ?? '10', 'number')}
        ${selectField('Operation', 'math-operation', ['+','-','*','/','%','**'], config.operation || '+')}
        ${inputField('Right Number', 'math-right', config.right ?? '5', 'number')}
      `;
      break;
    case 'Random Number':
      formFields = `
        ${inputField('Minimum (inclusive)', 'random-min', config.min ?? '1', 'number')}
        ${inputField('Maximum (inclusive)', 'random-max', config.max ?? '100', 'number')}
      `;
      break;
    case 'URL Encode':
    case 'URL Decode':
    case 'Base64 Encode':
    case 'Base64 Decode':
      formFields = textareaField('Input Value', 'utility-input', config.input || '', 'Enter text or {{variable}}');
      break;
    case 'Generate UUID':
    case 'Current Date & Time':
      formFields = '<p class="no-settings">No configuration is required. This box generates its value when the workflow runs.</p>';
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
        <details class="advanced-node-options"><summary>Reliability options</summary>
          ${inputField('Retry failed step (0–5)', 'retry-count', config.retryCount ?? 0, 'number')}
          ${recoveryNodeField(config, currentNodeId)}
        </details>
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