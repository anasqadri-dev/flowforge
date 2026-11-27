export const state = {
    workflowId: null,
    workflowName: 'Untitled Workflow',
    createdAt: null,
    nodes: [],
    connections: [],
    selectedNodeId: null,
    history: [],
    historyIndex: -1
};

const HISTORY_LIMIT = 100;

function clone(value) {
    return structuredClone(value);
}

function notifyStateChange() {
    document.dispatchEvent(new CustomEvent('flowforge:state-changed'));
}

function snapshot() {
    return JSON.stringify({
        nodes: state.nodes,
        connections: state.connections
    });
}

export function initializeHistory() {
    state.history = [snapshot()];
    state.historyIndex = 0;
}

export function pushHistory() {
    const next = snapshot();
    if (state.history[state.historyIndex] === next) return;

    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(next);

    if (state.history.length > HISTORY_LIMIT) state.history.shift();

    state.historyIndex = state.history.length - 1;
    notifyStateChange();
}

export function addNode({ id, type, x, y, config = {} }) {
    if (!id || !type) throw new Error('A node requires an ID and type.');
    if (state.nodes.some(node => node.id === id)) throw new Error('A node with this ID already exists.');
    state.nodes.push({ id, type, x: Number(x) || 0, y: Number(y) || 0, config: clone(config) });
    pushHistory();
}

export function updateNodeConfig(nodeId, config) {
    const node = state.nodes.find(item => item.id === nodeId);
    if (!node) return false;
    node.config = { ...node.config, ...clone(config) };
    pushHistory();
    return true;
}

export function moveNode(nodeId, x, y) {
    const node = state.nodes.find(item => item.id === nodeId);
    if (!node) return false;
    const nextX = Number(x);
    const nextY = Number(y);
    if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) return false;
    if (node.x === nextX && node.y === nextY) return true;
    node.x = nextX;
    node.y = nextY;
    pushHistory();
    return true;
}

export function deleteNode(nodeId) {
    const previousLength = state.nodes.length;
    state.nodes = state.nodes.filter(node => node.id !== nodeId);
    state.connections = state.connections.filter(connection =>
        connection.from !== nodeId && connection.to !== nodeId
    );
    if (state.selectedNodeId === nodeId) state.selectedNodeId = null;
    if (state.nodes.length !== previousLength) pushHistory();
}

function createsCycle(from, to) {
    const adjacency = new Map();
    state.connections.forEach(connection => {
        if (!adjacency.has(connection.from)) adjacency.set(connection.from, []);
        adjacency.get(connection.from).push(connection.to);
    });

    const pending = [to];
    const visited = new Set();
    while (pending.length) {
        const current = pending.pop();
        if (current === from) return true;
        if (visited.has(current)) continue;
        visited.add(current);
        pending.push(...(adjacency.get(current) || []));
    }
    return false;
}

export function addConnection({ from, to, branch = null, sourceHandle = null }) {
    if (!state.nodes.some(node => node.id === from) || !state.nodes.some(node => node.id === to)) return null;
    if (from === to || createsCycle(from, to)) return null;
    if (state.connections.some(connection => connection.from === from && connection.to === to)) return null;

    const connection = {
        id: crypto.randomUUID(),
        from,
        to,
        ...(branch ? { branch } : {}),
        ...(sourceHandle ? { sourceHandle } : {})
    };
    state.connections.push(connection);
    pushHistory();
    return connection;
}

export function deleteConnection(connectionId) {
    const previousLength = state.connections.length;
    state.connections = state.connections.filter(connection => connection.id !== connectionId);
    if (state.connections.length !== previousLength) pushHistory();
}

export function replaceWorkflowState({ nodes = [], connections = [] }) {
    state.nodes = clone(nodes);
    state.connections = clone(connections);
    state.selectedNodeId = null;
    initializeHistory();
    notifyStateChange();
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
    const data = JSON.parse(state.history[state.historyIndex]);
    state.nodes = data.nodes;
    state.connections = data.connections;
    state.selectedNodeId = null;
    notifyStateChange();
}
