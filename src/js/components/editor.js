import { state, replaceWorkflowState } from '../core/state.js';

let editor = null;
let importing = false;

const nodePorts = {
    'Manual Start': { inputs: 0, outputs: 1 },
    'Timer (Schedule)': { inputs: 0, outputs: 1 },
    'HTTP Request': { inputs: 1, outputs: 1 },
    'Transform Data': { inputs: 1, outputs: 1 },
    'Set Variable': { inputs: 1, outputs: 1 },
    'Wait': { inputs: 1, outputs: 1 },
    'Condition': { inputs: 1, outputs: 2 },
    'Loop': { inputs: 1, outputs: 1 },
    'Send Notification': { inputs: 1, outputs: 0 },
    'Write to Log': { inputs: 1, outputs: 0 }
};

const icons = {
    'Manual Start': 'play', 'Timer (Schedule)': 'clock',
    'HTTP Request': 'globe', 'Transform Data': 'sliders-horizontal',
    'Set Variable': 'variable', 'Wait': 'timer',
    'Condition': 'git-branch', 'Loop': 'repeat',
    'Send Notification': 'bell', 'Write to Log': 'file-text'
};

function drawflowNodeId(appId, index) { return String(index + 1); }

export function getDrawflowEditor() { return editor; }
export function isImportingDrawflow() { return importing; }

export function createDrawflowNodeHtml(type, config = {}) {
    const icon = icons[type] || 'workflow';
    const suffix = type === 'HTTP Request' && config.method ? ' · ' + config.method
        : type === 'Wait' && config.seconds !== undefined ? ' · ' + config.seconds + 's'
        : type === 'Set Variable' && config.name ? ' · ' + config.name
        : type === 'Loop' && config.count ? ' · ' + config.count + ' iterations' : '';
    return '<div class="drawflow-node-inner"><span class="node-icon"><i data-lucide="' + icon + '" aria-hidden="true"></i></span><span class="node-text">' + type + suffix + '</span></div>';
}

export function getNodePortCounts(type) {
    return nodePorts[type] || { inputs: 1, outputs: 1 };
}

export function getAppNodeId(drawflowId) {
    const node = editor?.getNodeFromId(drawflowId);
    return node?.data?.appNodeId || null;
}

export function exportStateToDrawflow() {
    const data = {};
    const ids = new Map();
    state.nodes.forEach((node, index) => ids.set(node.id, drawflowNodeId(node.id, index)));
    state.nodes.forEach((node, index) => {
        const id = drawflowNodeId(node.id, index);
        const ports = getNodePortCounts(node.type);
        const inputs = {};
        const outputs = {};
        for (let i = 1; i <= ports.inputs; i++) inputs['input_' + i] = { connections: [] };
        for (let i = 1; i <= ports.outputs; i++) outputs['output_' + i] = { connections: [] };
        data[id] = {
            id: Number(id), name: node.type, data: { appNodeId: node.id, nodeType: node.type, config: structuredClone(node.config || {}) },
            class: node.type.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            html: createDrawflowNodeHtml(node.type, node.config || {}),
            typenode: false, inputs, outputs, pos_x: Number(node.x) || 0, pos_y: Number(node.y) || 0
        };
    });
    state.connections.forEach(edge => {
        const sourceId = ids.get(edge.from), targetId = ids.get(edge.to);
        if (!sourceId || !targetId) return;
        const source = data[sourceId], target = data[targetId];
        const output = edge.branch === 'false' || edge.sourceHandle === 'output_2' ? 'output_2' : 'output_1';
        const input = 'input_1';
        if (!source.outputs[output] || !target.inputs[input]) return;
        source.outputs[output].connections.push({ node: targetId, output: input });
        target.inputs[input].connections.push({ node: sourceId, input: output });
    });
    return { drawflow: { Home: { data } } };
}

export function syncStateFromDrawflow() {
    if (!editor || importing) return;
    const exported = editor.export();
    const moduleName = editor.getModule() || 'Home';
    const data = exported?.drawflow?.[moduleName]?.data || {};
    const nodes = Object.values(data).map(node => ({
        id: node.data?.appNodeId || String(node.id),
        type: node.data?.nodeType || node.name,
        x: Number(node.pos_x) || 0, y: Number(node.pos_y) || 0,
        config: structuredClone(node.data?.config || {})
    }));
    const connections = [];
    Object.values(data).forEach(node => {
        const from = node.data?.appNodeId || String(node.id);
        Object.entries(node.outputs || {}).forEach(([outputKey, output]) => {
            (output.connections || []).forEach(connection => {
                const target = data[connection.node];
                const to = target?.data?.appNodeId || (target ? String(target.id) : null);
                if (!to) return;
                connections.push({
                    from, to,
                    ...(node.name === 'Condition' ? { branch: outputKey === 'output_2' ? 'false' : 'true', sourceHandle: outputKey } : {})
                });
            });
        });
    });
    replaceWorkflowState({ nodes, connections });
}

export function renderDrawflowFromState() {
    if (!editor) return;
    importing = true;
    try { editor.import(exportStateToDrawflow()); }
    finally { importing = false; }
}

export function initDrawflow(containerId = 'drawflow-container') {
    const container = document.getElementById(containerId);
    if (!container || !window.Drawflow) {
        console.error('Drawflow container or library is unavailable.');
        return null;
    }
    if (editor) {
        editor = null;
    }
    editor = new window.Drawflow(container);
    editor.reroute = true;
    editor.zoom_max = 1.6;
    editor.zoom_min = 0.5;
    editor.zoom_value = 0.1;
    editor.start();
    renderDrawflowFromState();
    window.__flowforgeEditor = editor;
    return editor;
}
