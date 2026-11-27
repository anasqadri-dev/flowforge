import { renderBuilder } from '../pages/builder.js';
import { initDrawflow } from '../components/editor.js';
import { initNodes } from '../components/nodes.js';
import { WorkflowHistoryManager } from '../components/history.js';
import { loadFromLocal, saveToLocal } from '../components/persistence.js';
import { setupConnectionGuard } from '../components/connections.js';
import { copySelectedNode, pasteNode } from '../components/clipboard.js';

let historyManager = null;
let builderInitialized = false;

export function initializeNavigation(showNotification) {
  const upcomingLinks = document.querySelectorAll("[data-coming-soon]");
  upcomingLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showNotification(`${link.textContent.trim()} is coming soon!`);
    });
  });
}

function handleRoute() {
  if (window.location.hash !== '#builder') {
    builderInitialized = false;
    return;
  }

  const content = document.querySelector('.content');
  if (!content) return;
  if (builderInitialized) return;

  content.innerHTML = renderBuilder();
  builderInitialized = true;

  setTimeout(() => {
    const editor = initDrawflow();
    if (!editor) {
      builderInitialized = false;
      return;
    }

    loadFromLocal(editor);

    historyManager = new WorkflowHistoryManager();
    historyManager.push(editor);
    historyManager.bindKeyboard(editor);

    setupConnectionGuard(editor);
    initNodes();

    editor.on('nodeCreated nodeRemoved connectionCreated connectionRemoved nodeMoved nodeDataChanged', () => {
      if (historyManager && historyManager._locked) return;
      if (historyManager) historyManager.push(editor);
      saveToLocal(editor);
    });

    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea, select')) return;
      const isCtrl = e.ctrlKey || e.metaKey;
      if (!isCtrl) return;

      if (e.key === 'c') {
        e.preventDefault();
        if (copySelectedNode(editor)) {
          const notif = document.getElementById('notification');
          if (notif) {
            notif.textContent = 'Node copied';
            notif.classList.add('show');
            setTimeout(() => notif.classList.remove('show'), 2000);
          }
        }
      } else if (e.key === 'v') {
        e.preventDefault();
        const newId = pasteNode(editor);
        if (newId) {
          if (historyManager && !historyManager._locked) historyManager.push(editor);
          saveToLocal(editor);
          const notif = document.getElementById('notification');
          if (notif) {
            notif.textContent = 'Node pasted';
            notif.classList.add('show');
            setTimeout(() => notif.classList.remove('show'), 2000);
          }
        }
      }
    });
  }, 0);
}

window.addEventListener('hashchange', handleRoute);
window.addEventListener('DOMContentLoaded', handleRoute);