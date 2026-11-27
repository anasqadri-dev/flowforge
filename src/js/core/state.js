// src/js/core/state.js

export const state = {
  workflowId: null,
  workflowName: 'Untitled Workflow',
  nodes: [],
  connections: [],
  selectedNodeId: null,
  history: [],
  historyIndex: -1,
};

// Initialize history with empty snapshot
pushHistory();

export function addNode({ id, type, x, y, config = {} }) {
  state.nodes.push({ id, type, x, y, config });
  pushHistory();
  return state.nodes[state.nodes.length - 1];
}

export function updateNodeConfig(nodeId, config) {
  const node = state.nodes.find((n) => n.id === nodeId);
  if (node) {
    node.config = { ...node.config, ...config };
    pushHistory();
  }
}

export function moveNode(nodeId, x, y) {
  const node = state.nodes.find((n) => n.id === nodeId);
  if (node) {
    node.x = x;
    node.y = y;
    pushHistory();
  }
}

export function deleteNode(nodeId) {
  state.nodes = state.nodes.filter((n) => n.id !== nodeId);
  state.connections = state.connections.filter(
    (c) => c.from !== nodeId && c.to !== nodeId
  );
  pushHistory();
}

export function addConnection({ from, to }) {
  const exists = state.connections.some(
    (c) => c.from === from && c.to === to
  );
  if (exists || from === to) return null;

  const conn = { id: crypto.randomUUID(), from, to };
  state.connections.push(conn);
  pushHistory();
  return conn;
}

export function deleteConnection(connId) {
  const before = state.connections.length;
  state.connections = state.connections.filter((c) => c.id !== connId);
  if (state.connections.length !== before) {
    pushHistory();
  }
}

function snapshot() {
  return JSON.stringify({
    nodes: state.nodes,
    connections: state.connections,
  });
}

export function pushHistory() {
  const snap = snapshot();
  // Prevent duplicate consecutive snapshots
  if (state.history[state.historyIndex] === snap) return;
  // Clear redo branch
  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push(snap);
  state.historyIndex = state.history.length - 1;
}

export function undo() {
  if (state.historyIndex <= 0) return false;
  state.historyIndex--;
  restoreSnapshot();
  return true;
}

export function redo() {
  if (state.historyIndex >= state.history.length - 1) return false;
  state.historyIndex++;
  restoreSnapshot();
  return true;
}

function restoreSnapshot() {
  const snap = JSON.parse(state.history[state.historyIndex]);
  state.nodes = snap.nodes;
  state.connections = snap.connections;
}