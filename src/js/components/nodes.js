import { getDrawflowEditor } from './editor.js';
import { renderSettingsPanel } from './settings-panel.js';

function getNodeHtml(type) {
  const iconMap = {
    'Manual Start': '▶',
    'Timer': '⏱',
    'HTTP Request': '🌐',
    'Transform Data': '⚙',
    'Set Variable': '📝',
    'Wait': '⏳',
    'Condition': '🔀',
    'Loop': '🔁',
    'Send Notification': '🔔',
    'Write to Log': '📄'
  };
  const icon = iconMap[type] || '⚙';
  return `<div class="drawflow-node-inner"><span class="icon">${icon}</span> ${type}</div>`;
}

function getNodeIO(type) {
  const ioMap = {
    'Manual Start': { inputs: 0, outputs: 1 },
    'Timer': { inputs: 0, outputs: 1 },
    'HTTP Request': { inputs: 1, outputs: 1 },
    'Transform Data': { inputs: 1, outputs: 1 },
    'Set Variable': { inputs: 1, outputs: 1 },
    'Wait': { inputs: 1, outputs: 1 },
    'Condition': { inputs: 1, outputs: 2 },
    'Loop': { inputs: 1, outputs: 1 },
    'Send Notification': { inputs: 1, outputs: 0 },
    'Write to Log': { inputs: 1, outputs: 0 }
  };
  return ioMap[type] || { inputs: 1, outputs: 1 };
}

export function initNodes() {
  const editor = getDrawflowEditor();
  if (!editor) {
    console.error('Drawflow editor not initialized');
    return;
  }

  const boxes = document.querySelectorAll('.box-item');
  const searchBox = document.getElementById('search-box');
  const container = document.getElementById('drawflow-container');

  if (!container) {
    console.error('drawflow-container not found');
    return;
  }

  if (searchBox) {
    searchBox.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      boxes.forEach(box => {
        box.style.display = box.textContent.toLowerCase().includes(term) ? 'flex' : 'none';
      });
    });
  }

  boxes.forEach(box => {
    box.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('node-type', box.dataset.nodeType);
    });
  });

  container.addEventListener('dragover', (e) => e.preventDefault());
  container.addEventListener('drop', (e) => {
    e.preventDefault();
    const nodeType = e.dataTransfer.getData('node-type');
    if (!nodeType) return;

    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / editor.zoom;
    const y = (e.clientY - rect.top) / editor.zoom;

    const io = getNodeIO(nodeType);
    editor.addNode(
      nodeType.toLowerCase().replace(/\s+/g, '-'),
      io.inputs,
      io.outputs,
      x,
      y,
      nodeType.toLowerCase().replace(/\s+/g, '-'),
      { nodeType: nodeType },
      getNodeHtml(nodeType)
    );
  });

  editor.on('nodeSelected', (id) => {
    const node = editor.getNodeFromId(id);
    if (!node) return;

    const settingsContainer = document.getElementById('settings-container');
    if (!settingsContainer) return;

    const nodeType = node.data?.nodeType || node.name;
    settingsContainer.style.display = 'block';
    settingsContainer.innerHTML = renderSettingsPanel(nodeType);

    const closeBtn = document.getElementById('close-settings');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        settingsContainer.style.display = 'none';
      });
    }

    const form = document.getElementById('settings-form');
    if (form) {
      form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        editor.updateNodeDataFromId(id, { ...node.data, ...data });
        settingsContainer.style.display = 'none';
      });
    }
  });
}