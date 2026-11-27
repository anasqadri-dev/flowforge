
import {
    saveWorkflow,
    getWorkflows,
    getWorkflow
} from './database.js';

import { state } from './state.js';

let saveTimer = null;
let notificationCallback = null;

function notify(message) {
    if (notificationCallback) {
        notificationCallback(message);
        return;
    }

    const element = document.getElementById('notification');

    if (element) {
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

        state.workflowId = workflow.id;
        state.createdAt = workflow.createdAt;

        localStorage.setItem('flowforge-active-workflow', workflow.id);

        if (showMessage) {
            notify('Workflow saved successfully!');
        }

        return workflow;

    } catch (error) {
        console.error('Workflow save failed:', error);
        notify('Unable to save workflow.');
        return null;
    }
}

function scheduleAutoSave() {
    clearTimeout(saveTimer);

    saveTimer = setTimeout(() => {
        saveCurrentWorkflow(false);
    }, 700);
}

export async function loadWorkflowById(id) {
    try {
        const workflow = await getWorkflow(id);

        if (!workflow) return false;

        state.workflowId = workflow.id;
        state.workflowName = workflow.name || 'Untitled Workflow';
        state.createdAt = workflow.createdAt || Date.now();

        state.nodes = structuredClone(workflow.nodes || []);
        state.connections = structuredClone(workflow.connections || []);

        state.history = [];
        state.historyIndex = -1;

        localStorage.setItem('flowforge-active-workflow', workflow.id);

        document.dispatchEvent(
            new CustomEvent('flowforge:workflow-loaded', {
                detail: workflow
            })
        );

        return true;

    } catch (error) {
        console.error('Workflow loading failed:', error);
        notify('Unable to load workflow.');
        return false;
    }
}

async function loadLatestWorkflow() {
    try {
        const workflows = await getWorkflows();

        if (!workflows || workflows.length === 0) return;

        const activeId = localStorage.getItem(
            'flowforge-active-workflow'
        );

        let workflow = activeId
            ? await getWorkflow(activeId)
            : null;

        if (!workflow) {
            workflow = [...workflows].sort(
                (a, b) => b.updatedAt - a.updatedAt
            )[0];
        }

        if (workflow) {
            await loadWorkflowById(workflow.id);
        }

    } catch (error) {
        console.error('Unable to restore workflow:', error);
    }
}

export function exportWorkflow() {
    try {
        const workflow = createWorkflowData();

        const blob = new Blob(
            [JSON.stringify(workflow, null, 2)],
            { type: 'application/json' }
        );

        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');

        link.href = url;
        link.download = `${workflow.name.replace(/[^a-z0-9-_]/gi, '_')}.json`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);

        notify('Workflow exported successfully!');

    } catch (error) {
        console.error('Export failed:', error);
        notify('Unable to export workflow.');
    }
}

async function importWorkflow(file) {
    try {
        const text = await file.text();
        const workflow = JSON.parse(text);

        if (
            !workflow ||
            !Array.isArray(workflow.nodes) ||
            !Array.isArray(workflow.connections)
        ) {
            throw new Error('Invalid workflow file structure.');
        }

        const nodeIds = new Set(
            workflow.nodes.map(node => node.id)
        );

        const validConnections = workflow.connections.filter(
            connection =>
                nodeIds.has(connection.from) &&
                nodeIds.has(connection.to)
        );

        state.workflowId = crypto.randomUUID();
        state.workflowName = workflow.name || 'Imported Workflow';
        state.createdAt = Date.now();

        state.nodes = workflow.nodes.map(node => ({
            ...node,
            config: node.config || {}
        }));

        state.connections = validConnections.map(connection => ({
            ...connection,
            id: crypto.randomUUID()
        }));

        state.history = [];
        state.historyIndex = -1;

        document.dispatchEvent(
            new CustomEvent('flowforge:workflow-loaded', {
                detail: workflow
            })
        );

        await saveCurrentWorkflow(false);

        notify('Workflow imported successfully!');

    } catch (error) {
        console.error('Import failed:', error);
        notify('Invalid workflow JSON file.');
    }
}

export function initializePersistence(showNotification) {
    notificationCallback = showNotification;

    document.addEventListener(
        'flowforge:state-changed',
        scheduleAutoSave
    );

    document.addEventListener('click', event => {

        if (event.target.closest('#save-workflow')) {
            saveCurrentWorkflow();
        }

        if (event.target.closest('#export-workflow')) {
            exportWorkflow();
        }

        if (event.target.closest('#import-workflow')) {
            document.getElementById('workflow-file')?.click();
        }
    });

    document.addEventListener('change', event => {

        if (event.target.id === 'workflow-name') {
            state.workflowName =
                event.target.value.trim() || 'Untitled Workflow';

            scheduleAutoSave();
        }

        if (event.target.id === 'workflow-file') {
            const file = event.target.files?.[0];

            if (file) {
                importWorkflow(file);
            }

            event.target.value = '';
        }
    });

    loadLatestWorkflow();
}
