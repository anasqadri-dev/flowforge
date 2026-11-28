import {
    saveWorkflow,
    getWorkflows,
    getWorkflow,
    getSetting
} from './database.js';
import { state, replaceWorkflowState } from './state.js';
import { handlers } from './handlers.js';
import { saveWorkflowVersion } from './advanced.js';

let saveTimer = null;
let notificationCallback = null;
let restorePromise = Promise.resolve();
let isRestoring = false;

function readActiveWorkflowId() {
    try { return localStorage.getItem('flowforge-active-workflow'); }
    catch (error) { console.warn('Local Storage is unavailable; using IndexedDB workflow ordering.', error); return null; }
}

function writeActiveWorkflowId(id) {
    try { localStorage.setItem('flowforge-active-workflow', id); }
    catch (error) { console.warn('The active workflow pointer could not be stored in Local Storage.', error); }
}

function notify(message) {
    if (notificationCallback) notificationCallback(message);
    else {
        const element = document.getElementById('notification');
        if (!element) return;
        element.textContent = message;
        element.classList.add('show');
        setTimeout(() => element.classList.remove('show'), 2500);
    }
}

function createWorkflowData() {
    return {
        id: state.workflowId || crypto.randomUUID(),
        name: state.workflowName || 'Untitled Workflow',
        nodes: structuredClone(state.nodes),
        connections: structuredClone(state.connections),
        createdAt: state.createdAt || Date.now(),
        updatedAt: Date.now()
    };
}

export async function saveCurrentWorkflow(showMessage = true) {
    try {
        const workflow = createWorkflowData();
        await saveWorkflow(workflow);
        await saveWorkflowVersion(workflow).catch(error => console.warn('Workflow version snapshot was not saved:', error));
        state.workflowId = workflow.id;
        state.createdAt = workflow.createdAt;
        writeActiveWorkflowId(workflow.id);
        if (showMessage) notify('Workflow saved successfully.');
        return workflow;
    } catch (error) {
        console.error('Workflow save failed:', error);
        notify('Unable to save workflow.');
        return null;
    }
}

function scheduleAutoSave() {
    if (isRestoring) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveCurrentWorkflow(false), 700);
}

export async function loadWorkflowById(id) {
    try {
        const workflow = await getWorkflow(id);
        if (!workflow) return false;
        validateWorkflow(workflow);
        state.workflowId = workflow.id;
        state.workflowName = workflow.name || 'Untitled Workflow';
        state.createdAt = workflow.createdAt || Date.now();
        replaceWorkflowState({
            nodes: workflow.nodes,
            connections: workflow.connections
        });
        writeActiveWorkflowId(workflow.id);
        document.dispatchEvent(new CustomEvent('flowforge:workflow-loaded', { detail: workflow }));
        return true;
    } catch (error) {
        console.error('Workflow loading failed:', error);
        notify('Unable to restore the saved workflow.');
        return false;
    }
}

async function restoreLatestWorkflow() {
    isRestoring = true;
    try {
        const workflows = await getWorkflows();
        const activeId = readActiveWorkflowId();
        const active = activeId ? await getWorkflow(activeId) : null;
        const workflow = active || workflows[0];
        if (workflow) {
            await loadWorkflowById(workflow.id);
        } else {
            const preferences = await getSetting('preferences').catch(() => null);
            state.workflowName = preferences?.defaultWorkflowName || 'Untitled Workflow';
            replaceWorkflowState({ nodes: [], connections: [] });
        }
    } catch (error) {
        console.error('Unable to restore workflow:', error);
        replaceWorkflowState({ nodes: [], connections: [] });
    } finally {
        isRestoring = false;
    }
}

export async function createNewWorkflow() {
    await waitForWorkflowRestore();
    cancelPendingAutoSave();

    // Preserve the current workflow before switching to a new empty one.
    if (state.workflowId || state.nodes.length || state.connections.length) {
        const saved = await saveCurrentWorkflow(false);
        if (!saved) throw new Error('The current workflow could not be saved.');
    }

    const preferences = await getSetting('preferences').catch(() => null);
    state.workflowId = crypto.randomUUID();
    state.workflowName = preferences?.defaultWorkflowName || 'Untitled Workflow';
    state.createdAt = Date.now();
    replaceWorkflowState({ nodes: [], connections: [] });
    cancelPendingAutoSave();

    const created = await saveCurrentWorkflow(false);
    if (!created) throw new Error('A new workflow could not be created.');
    return created;
}

export function waitForWorkflowRestore() {
    return restorePromise;
}

export function cancelPendingAutoSave() {
    clearTimeout(saveTimer);
    saveTimer = null;
}

export function exportWorkflow() {
    try {
        const workflow = createWorkflowData();
        const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${workflow.name.replace(/[^a-z0-9-_]/gi, '_') || 'workflow'}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        notify('Workflow exported successfully.');
    } catch (error) {
        console.error('Export failed:', error);
        notify('Unable to export workflow.');
    }
}

export function validateWorkflow(workflow, { requireStart = false, strictConnections = false } = {}) {
    if (!workflow || typeof workflow !== 'object' ||
        !Array.isArray(workflow.nodes) || !Array.isArray(workflow.connections)) {
        throw new Error('Invalid workflow file structure.');
    }

    // Keep persisted/imported workflows aligned with the actual executable box library.
    const allowedTypes = new Set(Object.keys(handlers));
    const ids = new Set();
    for (const node of workflow.nodes) {
        if (!node || typeof node.id !== 'string' || !node.id.trim() ||
            typeof node.type !== 'string' || !node.type.trim() ||
            !Number.isFinite(Number(node.x)) || !Number.isFinite(Number(node.y)) ||
            !node.config || typeof node.config !== 'object' || Array.isArray(node.config)) {
            throw new Error('Workflow contains an invalid node.');
        }
        if (!allowedTypes.has(node.type)) throw new Error(`Unsupported workflow node type: ${node.type}`);
        if (ids.has(node.id)) throw new Error('Workflow contains duplicate node IDs.');
        ids.add(node.id);
    }

    const edges = new Set();
    const nodeById = new Map(workflow.nodes.map(node => [node.id, node]));
    const outgoingById = new Map(workflow.nodes.map(node => [node.id, []]));
    const conditionPorts = new Set();

    for (const connection of workflow.connections) {
        if (!connection || !ids.has(connection.from) || !ids.has(connection.to) ||
            connection.from === connection.to) {
            throw new Error('Workflow contains an invalid connection.');
        }

        const sourceNode = nodeById.get(connection.from);
        const targetNode = nodeById.get(connection.to);
        const key = `${connection.from}->${connection.to}`;
        if (edges.has(key)) throw new Error('Workflow contains duplicate connections.');
        edges.add(key);

        if (strictConnections) {
            if (['Manual Start', 'Timer (Schedule)'].includes(targetNode.type)) {
                throw new Error('Start nodes cannot receive incoming connections.');
            }
            if (['Send Notification', 'Write to Log'].includes(sourceNode.type)) {
                throw new Error('Output nodes cannot have outgoing connections.');
            }

            const outgoing = outgoingById.get(connection.from);
            if (sourceNode.type === 'Condition') {
                const port = connection.sourceHandle || (connection.branch === 'false' ? 'output_2' : 'output_1');
                if (!['output_1', 'output_2'].includes(port)) {
                    throw new Error('Condition connections must use a valid output port.');
                }
                if (connection.branch && connection.branch !== (port === 'output_2' ? 'false' : 'true')) {
                    throw new Error('Condition branch labels do not match their output ports.');
                }
                const portKey = `${connection.from}:${port}`;
                if (conditionPorts.has(portKey)) {
                    throw new Error('Each Condition output port can have only one connection.');
                }
                conditionPorts.add(portKey);
            } else if (outgoing.length > 0) {
                throw new Error('Ordinary nodes can have only one outgoing connection.');
            }
            outgoing.push(connection);
        }
    }
    const starts = workflow.nodes.filter(node => ['Manual Start', 'Timer (Schedule)'].includes(node.type));
    if ((strictConnections && starts.length > 1) || (requireStart && starts.length !== 1)) {
        throw new Error('Workflow must contain exactly one start node.');
    }
    const indegree = new Map(workflow.nodes.map(node => [node.id, 0]));
    const adjacency = new Map(workflow.nodes.map(node => [node.id, []]));
    workflow.connections.forEach(edge => { adjacency.get(edge.from).push(edge.to); indegree.set(edge.to, indegree.get(edge.to) + 1); });
    const queue = workflow.nodes.filter(node => indegree.get(node.id) === 0).map(node => node.id);
    let visited = 0;
    while (queue.length) { const id = queue.shift(); visited++; for (const next of adjacency.get(id)) { indegree.set(next, indegree.get(next) - 1); if (indegree.get(next) === 0) queue.push(next); } }
    if (visited !== workflow.nodes.length) throw new Error('Workflow contains a circular connection.');
    return true;
}

async function importWorkflow(file) {
    try {
        if (!file || file.size > 5 * 1024 * 1024) throw new Error('Workflow file must be smaller than 5 MB.');
        const workflow = JSON.parse(await file.text());
        validateWorkflow(workflow, { requireStart: true, strictConnections: true });

        state.workflowId = crypto.randomUUID();
        state.workflowName = String(workflow.name || 'Imported Workflow').slice(0, 100);
        state.createdAt = Date.now();
        replaceWorkflowState({
            nodes: workflow.nodes.map(node => ({
                ...node,
                x: Number(node.x),
                y: Number(node.y),
                config: structuredClone(node.config)
            })),
            connections: workflow.connections.map(connection => ({
                ...connection,
                id: crypto.randomUUID()
            }))
        });
        document.dispatchEvent(new CustomEvent('flowforge:workflow-loaded', { detail: workflow }));
        await saveCurrentWorkflow(false);
        notify('Workflow imported successfully.');
    } catch (error) {
        console.error('Import failed:', error);
        notify(error instanceof SyntaxError ? 'The selected file is not valid JSON.' : error.message || 'Unable to import workflow.');
    }
}

export function initializePersistence(showNotification) {
    notificationCallback = showNotification;
    restorePromise = restoreLatestWorkflow();

    document.addEventListener('flowforge:state-changed', scheduleAutoSave);

    document.addEventListener('click', event => {
        if (event.target.closest('#save-workflow')) saveCurrentWorkflow();
        if (event.target.closest('#export-workflow')) exportWorkflow();
        if (event.target.closest('#import-workflow')) document.getElementById('workflow-file')?.click();
    });

    document.addEventListener('change', event => {
        if (event.target.id === 'workflow-name') {
            state.workflowName = event.target.value.trim() || 'Untitled Workflow';
            scheduleAutoSave();
        }
        if (event.target.id === 'workflow-file') {
            const file = event.target.files?.[0];
            if (file) importWorkflow(file);
            event.target.value = '';
        }
    });
}
