
// src/js/components/nodes.js

import { renderSettingsPanel } from './settings-panel.js';
import { state } from '../core/state.js';
import { runWorkflow } from '../core/engine.js';
import { refreshIcons } from '../core/icons.js';
import { showNotification } from './notifications.js';

function initializeRunButton() {
  const runButton = document.getElementById('run-workflow');

  if (!runButton) return;

  runButton.addEventListener('click', async () => {
    if (runButton.disabled) return;

    runButton.disabled = true;
    runButton.innerHTML = '<i data-lucide="loader-circle" aria-hidden="true"></i> Running...';
    refreshIcons(runButton);

    try {
      const result = await runWorkflow(state.nodes, state.connections, {}, {
        workflowId: state.workflowId,
        workflowName: state.workflowName
      });

      showNotification(
        result.status === 'success'
          ? `Workflow completed successfully in ${result.duration} ms.`
          : `Workflow failed: ${result.error}`,
        4000
      );

      // Highlight failed node if execution fails.
      if (result.status === 'error' && result.steps.length) {
        const failedStep = result.steps.find(
          step => step.status === 'error'
        );

        if (failedStep) {
          const failedNode = document.querySelector(
            `[data-node-id="${failedStep.nodeId}"]`
          );

          failedNode?.classList.add('selected');
        }
      }

      document.dispatchEvent(
        new CustomEvent('flowforge:workflow-completed', {
          detail: result
        })
      );

    } catch (error) {
      console.error('Workflow execution failed:', error);
    } finally {
      runButton.disabled = false;
      runButton.innerHTML = '<i data-lucide="play" aria-hidden="true"></i> Run Workflow';
      refreshIcons(runButton);
    }
  });
}

import {
  addNode,
  updateNodeConfig,
  moveNode,
  deleteNode,
  addConnection,
  deleteConnection
} from '../core/state.js';

let keyboardHandlerAttached = false;

function getBoxName(text) {
  return text
    .replace(/^[^\p{L}\p{N}]*/u, '')
    .trim();
}

function getIcon(boxName) {
  const name = boxName.toLowerCase();

  if (name.includes('http')) return 'globe';
  if (name.includes('wait')) return 'timer';
  if (name.includes('condition')) return 'git-branch';
  if (name.includes('start')) return 'play';
  if (name.includes('timer')) return 'clock';
  if (name.includes('notification')) return 'bell';
  if (name.includes('variable')) return 'variable';
  if (name.includes('loop')) return 'repeat';
  if (name.includes('transform')) return 'sliders-horizontal';
  if (name.includes('log')) return 'file-text';

  return 'settings';
}

function getConfig(node) {
  try {
    return JSON.parse(node.dataset.config || '{}');
  } catch {
    return {};
  }
}

function getNodeSummary(boxName, config) {
  switch (boxName) {
    case 'HTTP Request':
      return config.method ? `(${config.method})` : '';

    case 'Wait':
      return config.seconds !== undefined
        ? `(${config.seconds}s)`
        : '';

    case 'Set Variable':
      return config.name ? `(${config.name})` : '';

    case 'Loop':
      return config.count !== undefined
        ? `(${config.count} times)`
        : '';

    default:
      return '';
  }
}

function updateNodeLabel(node, boxName, config) {
  const label = node.querySelector('.node-text');

  if (label) {
    label.textContent =
      `${boxName} ${getNodeSummary(boxName, config)}`;
  }
}

function openSettings(node, boxName) {
  const container = document.getElementById('settings-container');

  if (!container) return;

  const config = getConfig(node);

  container.style.display = 'block';
  container.innerHTML = renderSettingsPanel(boxName, config, node.dataset.nodeId);
  refreshIcons(container);

  const closeButton = document.getElementById('close-settings');

  closeButton?.addEventListener('click', () => {
    container.style.display = 'none';
    container.innerHTML = '';
  });

  const form = document.getElementById('settings-form');

  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    const formData = new FormData(form);
    const updatedConfig = Object.fromEntries(formData.entries());
    if (boxName === 'Loop') {
      updatedConfig.bodyNodeIds = formData.getAll('loop-body-node');
      delete updatedConfig['loop-body-node'];
    }

    // Validate numeric configurations.
    if (boxName === 'Wait') {
      const seconds = Number(updatedConfig['wait-time']);

      if (!Number.isFinite(seconds) || seconds < 0) {
        alert('Wait duration must be a non-negative number.');
        return;
      }

      updatedConfig.seconds = seconds;
      delete updatedConfig['wait-time'];
    }

    if (boxName === 'Loop') {
      const count = Number(updatedConfig['loop-count']);

      if (!Number.isInteger(count) || count < 1 || count > 100) {
        alert('Loop count must be an integer between 1 and 100.');
        return;
      }

      updatedConfig.count = count;
      delete updatedConfig['loop-count'];
    }

    // Validate HTTP JSON fields.
    if (boxName === 'HTTP Request') {
      try {
        if (updatedConfig['http-headers'].trim()) {
          JSON.parse(updatedConfig['http-headers']);
        }

        if (updatedConfig['http-body'].trim()) {
          JSON.parse(updatedConfig['http-body']);
        }
      } catch {
        alert('Headers and request body must contain valid JSON.');
        return;
      }

      updatedConfig.url = updatedConfig['http-url'];
      updatedConfig.method = updatedConfig['http-method'];
      updatedConfig.headers = updatedConfig['http-headers'];
      updatedConfig.body = updatedConfig['http-body'];

      delete updatedConfig['http-url'];
      delete updatedConfig['http-method'];
      delete updatedConfig['http-headers'];
      delete updatedConfig['http-body'];
    }

    // Normalize other form field names.
    const fieldMappings = {
      'schedule-time': 'scheduleTime',
      'transform-input': 'input',
      'variable-name': 'name',
      'variable-value': 'value',
      'condition-left': 'left',
      'condition-operator': 'operator',
      'condition-right': 'right',
      'notification-message': 'message',
      'log-message': 'message'
    };

    Object.entries(fieldMappings).forEach(([oldKey, newKey]) => {
      if (oldKey in updatedConfig) {
        updatedConfig[newKey] = updatedConfig[oldKey];
        delete updatedConfig[oldKey];
      }
    });

    // Keep existing values if applicable.
    const finalConfig = {
      ...config,
      ...updatedConfig
    };

    // Update central application state.
    updateNodeConfig(node.dataset.nodeId, finalConfig);

    // Keep DOM synchronized.
    node.dataset.config = JSON.stringify(finalConfig);

    updateNodeLabel(node, boxName, finalConfig);

    container.style.display = 'none';

    document.dispatchEvent(new CustomEvent('flowforge:config-updated', {
      detail: {
        nodeId: node.dataset.nodeId,
        config: finalConfig
      }
    }));

    const notification = document.getElementById('notification');

    if (notification) {
      notification.textContent = 'Configuration saved successfully!';
      notification.classList.add('show');

      setTimeout(() => {
        notification.classList.remove('show');
      }, 2500);
    }
  });
}

function getPathD(source, target) {
  const x1 = source.offsetLeft + source.offsetWidth;
  const y1 = source.offsetTop + source.offsetHeight / 2;

  const x2 = target.offsetLeft;
  const y2 = target.offsetTop + target.offsetHeight / 2;

  const controlOffset = Math.max(40, Math.abs(x2 - x1) / 2);

  return `
    M ${x1} ${y1}
    C ${x1 + controlOffset} ${y1},
      ${x2 - controlOffset} ${y2},
      ${x2} ${y2}
  `;
}

function updateConnections(node) {
  if (!node.connections) return;

  node.connections.forEach(connection => {
    const d = connection.isSource
      ? getPathD(node, connection.otherNode)
      : getPathD(connection.otherNode, node);

    connection.path.setAttribute('d', d);
  });
}

function removeConnection(connection) {
  if (!connection) return;

  connection.path.remove();

  deleteConnection(connection.id);
}

function makeDraggable(node, canvas) {
  node.addEventListener('mousedown', (event) => {
    if (
      event.target.classList.contains('dot') ||
      event.target.closest('.delete-btn')
    ) {
      return;
    }

    event.preventDefault();

    const canvasRect = canvas.getBoundingClientRect();

    const startX =
      event.clientX - canvasRect.left - node.offsetLeft;

    const startY =
      event.clientY - canvasRect.top - node.offsetTop;

    function onMouseMove(moveEvent) {
      const x = moveEvent.clientX - canvasRect.left - startX;
      const y = moveEvent.clientY - canvasRect.top - startY;

      node.style.left = `${Math.max(0, x)}px`;
      node.style.top = `${Math.max(0, y)}px`;

      updateConnections(node);
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      moveNode(
        node.dataset.nodeId,
        parseFloat(node.style.left),
        parseFloat(node.style.top)
      );
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}

function drawConnection(
    source,
    target,
    savedConnection = null
) {
  const svg = document.getElementById('svg-layer');

  if (!svg || source === target) return;

  // Add connection to application state.
  const connection = savedConnection || addConnection({
    from: source.dataset.nodeId,
    to: target.dataset.nodeId
});

  if (!connection) return;

  const path = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'path'
  );

  path.setAttribute('d', getPathD(source, target));
  path.setAttribute('stroke', '#5145e5');
  path.setAttribute('stroke-width', '2');
  path.setAttribute('fill', 'none');
  path.setAttribute('marker-end', 'url(#arrowhead)');

  path.dataset.connectionId = connection.id;

  path.style.pointerEvents = 'stroke';
  path.style.cursor = 'pointer';

  path.addEventListener('click', (event) => {
    event.stopPropagation();

    document.querySelectorAll('#svg-layer path[data-connection-id]')
      .forEach(item => {
        item.setAttribute('stroke', '#5145e5');
        item.classList.remove('selected-connection');
      });

    path.setAttribute('stroke', '#ff4444');
    path.classList.add('selected-connection');
  });

  path.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    removeConnection(connection);
  });

  svg.appendChild(path);

  if (!source.connections) source.connections = [];
  if (!target.connections) target.connections = [];

  source.connections.push({
    id: connection.id,
    path,
    otherNode: target,
    isSource: true
  });

  target.connections.push({
    id: connection.id,
    path,
    otherNode: source,
    isSource: false
  });
}

function initializeKeyboardShortcuts() {
  if (keyboardHandlerAttached) return;

  keyboardHandlerAttached = true;

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Delete' && event.key !== 'Backspace') return;

    // Don't delete connections while editing a form.
    if (
      event.target.matches('input, textarea, select, button') ||
      event.target.isContentEditable
    ) {
      return;
    }

    const selectedPath = document.querySelector(
      '#svg-layer path.selected-connection'
    );

    if (!selectedPath) return;

    const connection = {
      id: selectedPath.dataset.connectionId,
      path: selectedPath
    };

    removeConnection(connection);
  });
}

function createNode(
    boxName,
    canvas,
    x,
    y,
    savedNode = null
) {
  const id = savedNode?.id || crypto.randomUUID();
  const icon = getIcon(boxName);

  const node = document.createElement('div');

  node.className = 'canvas-node';
  node.dataset.nodeId = id;
  node.dataset.nodeType = boxName;
  node.dataset.config = JSON.stringify(
    savedNode?.config || {}
);

  node.innerHTML = `
    <span class="icon"><i data-lucide="${icon}" aria-hidden="true"></i></span>

    <span class="node-text">${boxName}</span>

    <button
      type="button"
      class="delete-btn"
      aria-label="Delete node"
    >
      <i data-lucide="trash-2" aria-hidden="true"></i>
    </button>

    <div class="dot dot-left"></div>
    <div class="dot dot-right"></div>
  `;

  node.style.left = `${x}px`;
  node.style.top = `${y}px`;

  canvas.appendChild(node);
  refreshIcons(node);

  // Store node in central application state.
  if (!savedNode) {
    addNode({
        id,
        type: boxName,
        x,
        y,
        config: {}
    });
}

  makeDraggable(node, canvas);

  node.addEventListener('click', (event) => {
    if (
      event.target.classList.contains('dot') ||
      event.target.classList.contains('delete-btn')
    ) {
      return;
    }

    event.stopPropagation();

    document.querySelectorAll('.canvas-node.selected')
      .forEach(item => item.classList.remove('selected'));

    node.classList.add('selected');

    openSettings(node, boxName);
  });

  // Delete node and all associated connections.
  node.querySelector('.delete-btn').addEventListener('click', (event) => {
    event.stopPropagation();

    if (node.connections) {
      [...node.connections].forEach(connection => {
        removeConnection(connection);

        const other = connection.otherNode;

        if (other.connections) {
          other.connections = other.connections.filter(
            item => item.id !== connection.id
          );
        }
      });
    }

    deleteNode(id);

    node.remove();

    const settingsContainer =
      document.getElementById('settings-container');

    if (settingsContainer) {
      settingsContainer.style.display = 'none';
    }

    if (!canvas.querySelector('.canvas-node')) {
      const hint = canvas.querySelector('.canvas-hint');

      if (hint) hint.style.display = 'block';
    }
  });

  // Connection drawing.
  const rightDot = node.querySelector('.dot-right');

  rightDot.addEventListener('mousedown', (event) => {
    event.stopPropagation();
    event.preventDefault();

    const svg = document.getElementById('svg-layer');

    if (!svg) return;

    const preview = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path'
    );

    preview.setAttribute('stroke', '#5145e5');
    preview.setAttribute('stroke-width', '2');
    preview.setAttribute('stroke-dasharray', '5,5');
    preview.setAttribute('fill', 'none');

    svg.appendChild(preview);

    const canvasRect = canvas.getBoundingClientRect();

    const startX = node.offsetLeft + node.offsetWidth;
    const startY = node.offsetTop + node.offsetHeight / 2;

    function onMouseMove(moveEvent) {
      const mouseX = moveEvent.clientX - canvasRect.left;
      const mouseY = moveEvent.clientY - canvasRect.top;

      preview.setAttribute(
        'd',
        `M ${startX} ${startY} L ${mouseX} ${mouseY}`
      );
    }

    function onMouseUp(upEvent) {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      preview.remove();

      const target = document.elementFromPoint(
        upEvent.clientX,
        upEvent.clientY
      )?.closest('.canvas-node');

      if (target && target !== node && canvas.contains(target)) {
        drawConnection(node, target);
      }
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  return node;
}

function renderSavedWorkflow() {
    const canvas = document.getElementById('canvas');

    if (!canvas) return;

    // Remove existing nodes.
    canvas.querySelectorAll('.canvas-node').forEach(node => {
        node.remove();
    });

    // Remove existing connection paths.
    document.querySelectorAll(
        '#svg-layer path[data-connection-id]'
    ).forEach(path => path.remove());

    // Rebuild nodes.
    state.nodes.forEach(savedNode => {
        createNode(
            savedNode.type,
            canvas,
            savedNode.x,
            savedNode.y,
            savedNode
        );
    });

    // Rebuild connections.
    state.connections.forEach(connection => {
        const source = canvas.querySelector(
            `[data-node-id="${connection.from}"]`
        );

        const target = canvas.querySelector(
            `[data-node-id="${connection.to}"]`
        );

        if (source && target) {
            drawConnection(source, target, connection);
        }
    });

    const hint = canvas.querySelector('.canvas-hint');

    if (hint) {
        hint.style.display =
            state.nodes.length ? 'none' : 'block';
    }

    const nameInput = document.getElementById('workflow-name');

    if (nameInput) {
        nameInput.value = state.workflowName;
    }
}

export function initNodes() {
  const boxes = document.querySelectorAll('.box-item');
  const canvas = document.getElementById('canvas');
  const searchBox = document.getElementById('search-box');

  if (!canvas) return;

  initializeKeyboardShortcuts();

  // Search box.
  if (searchBox) {
    searchBox.addEventListener('input', (event) => {
      const term = event.target.value.toLowerCase();

      boxes.forEach(box => {
        box.style.display =
          box.textContent.toLowerCase().includes(term)
            ? 'flex'
            : 'none';
      });
    });
  }

  // Drag from box library.
  boxes.forEach(box => {
    box.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData(
        'text/plain',
        box.textContent.trim()
      );
    });
  });

  canvas.addEventListener('dragover', (event) => {
    event.preventDefault();
  });

  // Drop a new node.
  canvas.addEventListener('drop', (event) => {
    event.preventDefault();

    const boxName = getBoxName(
      event.dataTransfer.getData('text/plain')
    );

    if (!boxName) return;

    const rect = canvas.getBoundingClientRect();

    const x = Math.max(0, event.clientX - rect.left);
    const y = Math.max(0, event.clientY - rect.top);

    createNode(boxName, canvas, x, y);

    const hint = canvas.querySelector('.canvas-hint');

    if (hint) hint.style.display = 'none';
  });
  if (!window.__flowforgeRestoreListener) {
    document.addEventListener(
        'flowforge:workflow-loaded',
        renderSavedWorkflow
    );

    window.__flowforgeRestoreListener = true;
}

renderSavedWorkflow();
  initializeRunButton();
}