const Drawflow = window.Drawflow;

let editor = null;

export function initDrawflow(containerId = 'drawflow-container') {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('❌ Drawflow container not found:', containerId);
    return null;
  }

  if (editor) {
    console.warn('⚠️ Drawflow editor already initialized');
    return editor;
  }

  if (!Drawflow) {
    console.error('❌ Drawflow library not loaded. Check CDN script tag in index.html');
    return null;
  }

  editor = new Drawflow(container);
  editor.reroute = true;
  editor.zoom_max = 1.6;
  editor.zoom_min = 0.5;
  editor.zoom_value = 0.1;
  editor.start();

  window.__flowforgeEditor = editor;
  console.log('✅ Drawflow initialized on #' + containerId);
  return editor;
}

export function getDrawflowEditor() {
  return editor;
}

export function resetDrawflow() {
  editor = null;
}