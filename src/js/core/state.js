
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

function notifyStateChange() {
    document.dispatchEvent(
        new CustomEvent('flowforge:state-changed')
    );
}

export function addNode({ id, type, x, y, config = {} }) {
    state.nodes.push({ id, type, x, y, config });
    pushHistory();
}

export function updateNodeConfig(nodeId, config) {
    const node = state.nodes.find(n => n.id === nodeId);

    if (node) {
        node.config = { ...node.config, ...config };
        pushHistory();
    }
}

export function moveNode(nodeId, x, y) {
    const node = state.nodes.find(n => n.id === nodeId);

    if (node) {
        node.x = x;
        node.y = y;
        notifyStateChange();
    }
}

export function deleteNode(nodeId) {
    state.nodes = state.nodes.filter(n => n.id !== nodeId);

    state.connections = state.connections.filter(
        c => c.from !== nodeId && c.to !== nodeId
    );

    pushHistory();
}

export function addConnection({ from, to }) {
    const exists = state.connections.some(
        c => c.from === from && c.to === to
    );

    if (exists || from === to) return null;

    const connection = {
        id: crypto.randomUUID(),
        from,
        to
    };

    state.connections.push(connection);
    pushHistory();

    return connection;
}

export function deleteConnection(connectionId) {
    state.connections = state.connections.filter(
        c => c.id !== connectionId
    );

    pushHistory();
}

function snapshot() {
    return JSON.stringify({
        nodes: state.nodes,
        connections: state.connections
    });
}

export function pushHistory() {
    state.history = state.history.slice(
        0,
        state.historyIndex + 1
    );

    state.history.push(snapshot());

    state.historyIndex = state.history.length - 1;

    notifyStateChange();
}

export function undo() {
    if (state.historyIndex <= 0) return false;

    state.historyIndex--;
    restoreSnapshot();

    return true;
}

export function redo() {
    if (state.historyIndex >= state.history.length - 1) {
        return false;
    }

    state.historyIndex++;
    restoreSnapshot();

    return true;
}

function restoreSnapshot() {
    const data = JSON.parse(
        state.history[state.historyIndex]
    );

    state.nodes = data.nodes;
    state.connections = data.connections;

    notifyStateChange();
}
