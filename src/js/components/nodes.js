import { renderSettingsPanel } from './settings-panel.js';
import { state, addNode, updateNodeConfig, moveNode, deleteNode, addConnection, deleteConnection, undo, redo } from '../core/state.js';
import { runWorkflow } from '../core/engine.js';
import { refreshIcons } from '../core/icons.js';
import { showNotification } from './notifications.js';
import { getSetting } from '../core/database.js';
import { saveCurrentWorkflow } from '../core/persistence.js';
import { getDrawflowEditor, initDrawflow, getNodePortCounts, createDrawflowNodeHtml, getAppNodeId, registerDrawflowNode, renderDrawflowFromState, isImportingDrawflow } from './editor.js';
import { copySelectedNode, pasteNode } from './clipboard.js';

let keyboardHandlerAttached = false;
let syncingFromEditor = false;
let selectedConnection = null;

function getNodeConfig(drawflowNode) {
    return structuredClone(drawflowNode?.data?.config || {});
}

function getSummary(type, config) {
    if (type === 'HTTP Request' && config.method) return ' · ' + config.method;
    if (type === 'Wait' && config.seconds !== undefined) return ' · ' + config.seconds + 's';
    if (type === 'Set Variable' && config.name) return ' · ' + config.name;
    if (type === 'Loop' && config.count) return ' · ' + config.count + ' iterations';
    return '';
}

function openSettings(drawflowId) {
    const editor = getDrawflowEditor();
    const node = editor?.getNodeFromId(drawflowId);
    const container = document.getElementById('settings-container');
    if (!node || !container) return;
    const type = node.data?.nodeType || node.name;
    const appId = node.data?.appNodeId;
    const config = getNodeConfig(node);
    container.style.display = 'block';
    container.innerHTML = renderSettingsPanel(type, config, appId);
    refreshIcons(container);
    container.querySelector('#close-settings')?.addEventListener('click', () => {
        container.style.display = 'none';
        container.innerHTML = '';
    });
    const form = container.querySelector('#settings-form');
    if (!form) return;
    form.addEventListener('submit', event => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const values = Object.fromEntries(new FormData(form).entries());
        if (type === 'Loop') {
            values.bodyNodeIds = new FormData(form).getAll('loop-body-node');
            delete values['loop-body-node'];
        }
        if (type === 'Wait') {
            const seconds = Number(values['wait-time']);
            if (!Number.isFinite(seconds) || seconds < 0 || seconds > 60) return showNotification('Wait duration must be between 0 and 60 seconds.');
            values.seconds = seconds; delete values['wait-time'];
        }
        if (type === 'Loop') {
            const count = Number(values['loop-count']);
            if (!Number.isInteger(count) || count < 1 || count > 100) return showNotification('Loop count must be an integer between 1 and 100.');
            values.count = count; delete values['loop-count'];
        }
        if (type === 'HTTP Request') {
            try {
                if (values['http-headers'].trim()) JSON.parse(values['http-headers']);
                if (values['http-body'].trim()) JSON.parse(values['http-body']);
            } catch { return showNotification('Headers and request body must contain valid JSON.'); }
            Object.assign(values, { url: values['http-url'], method: values['http-method'], headers: values['http-headers'], body: values['http-body'] });
            ['http-url','http-method','http-headers','http-body'].forEach(key => delete values[key]);
        }
        const mappings = {
            'schedule-time':'scheduleTime','transform-input':'input','variable-name':'name',
            'variable-value':'value','condition-left':'left','condition-operator':'operator',
            'condition-right':'right','notification-message':'message','log-message':'message',
            'data-input':'input','data-path':'path','data-operator':'operator','data-value':'value','data-second':'second',
            'text-template':'template','text-input':'input','text-search':'search','text-replacement':'replacement','text-delimiter':'delimiter',
            'math-left':'left','math-operation':'operation','math-right':'right',
            'random-min':'min','random-max':'max','utility-input':'input'
        };
        Object.entries(mappings).forEach(([from,to]) => { if (from in values) { values[to] = values[from]; delete values[from]; } });
        const configNext = { ...config, ...values };
        syncingFromEditor = true;
        updateNodeConfig(appId, configNext);
        editor.updateNodeDataFromId(drawflowId, { ...node.data, config: configNext });
        const element = document.querySelector('#drawflow-container .drawflow-node[id="node-' + drawflowId + '"] .node-text');
        if (element) element.textContent = type + getSummary(type, configNext);
        syncingFromEditor = false;
        container.style.display = 'none';
        showNotification('Configuration saved successfully.');
    });
}

function setupDrawflowEvents(editor) {
    editor.on('nodeCreated', id => {
        if (isImportingDrawflow()) return;
        const node = editor.getNodeFromId(id);
        if (!node) return;
        const type = node.data?.nodeType || node.name;
        const appId = node.data?.appNodeId || crypto.randomUUID();
        node.data = { ...node.data, appNodeId: appId, nodeType: type, config: node.data?.config || {} };
        registerDrawflowNode(id, appId);
        syncingFromEditor = true;
        addNode({ id: appId, type, x: node.pos_x, y: node.pos_y, config: node.data.config });
        syncingFromEditor = false;
    });

    editor.on('nodeMoved', id => {
        if (isImportingDrawflow()) return;
        const node = editor.getNodeFromId(id);
        const appId = node?.data?.appNodeId;
        if (!appId) return;
        syncingFromEditor = true;
        moveNode(appId, node.pos_x, node.pos_y);
        syncingFromEditor = false;
    });

    editor.on('nodeRemoved', id => {
        if (isImportingDrawflow()) return;
        const appId = getAppNodeId(id);
        if (!appId) return;
        syncingFromEditor = true;
        deleteNode(appId);
        syncingFromEditor = false;
        const panel = document.getElementById('settings-container');
        if (panel) { panel.style.display = 'none'; panel.innerHTML = ''; }
    });

    editor.on('connectionCreated', connection => {
        if (isImportingDrawflow()) return;
        const from = getAppNodeId(connection.output_id);
        const to = getAppNodeId(connection.input_id);
        if (!from || !to) return;
        const sourceNode = editor.getNodeFromId(connection.output_id);
        const branch = sourceNode?.name === 'Condition'
            ? (connection.output_class === 'output_2' ? 'false' : 'true') : null;
        syncingFromEditor = true;
        const added = addConnection({ from, to, branch, sourceHandle: connection.output_class });
        syncingFromEditor = false;
        if (!added) {
            editor.removeSingleConnection(connection.output_id, connection.input_id, connection.output_class, connection.input_class);
            showNotification('That connection is invalid, duplicated, or creates a cycle.');
        }
    });

    editor.on('connectionSelected', connection => {
        selectedConnection = {
            output_id: String(connection.output_id),
            input_id: String(connection.input_id),
            output_class: connection.output_class,
            input_class: connection.input_class
        };
    });

    editor.on('connectionRemoved', connection => {
        if (isImportingDrawflow()) return;
        const from = getAppNodeId(connection.output_id);
        const to = getAppNodeId(connection.input_id);
        const edge = state.connections.find(item => item.from === from
            && item.to === to
            && (item.sourceHandle || 'output_1') === connection.output_class);
        if (selectedConnection
            && selectedConnection.output_id === String(connection.output_id)
            && selectedConnection.input_id === String(connection.input_id)
            && selectedConnection.output_class === connection.output_class
            && selectedConnection.input_class === connection.input_class) {
            selectedConnection = null;
        }
        if (edge) {
            syncingFromEditor = true;
            deleteConnection(edge.id);
            syncingFromEditor = false;
        }
    });

    editor.on('nodeSelected', () => {
        // A single click selects a node only; settings open on double-click.
        selectedConnection = null;
    });

    const canvas = document.getElementById('drawflow-container');
    canvas?.addEventListener('dblclick', event => {
        const nodeElement = event.target.closest('.drawflow-node');
        if (!nodeElement || !canvas.contains(nodeElement)) return;
        const drawflowId = nodeElement.id.replace(/^node-/, '');
        if (drawflowId) openSettings(drawflowId);
    });
    editor.on('click', event => {
        if (!event.target.closest('.drawflow-node')) {
            const panel = document.getElementById('settings-container');
            if (panel) { panel.style.display = 'none'; panel.innerHTML = ''; }
        }
    });
}


let executionStepCount = 0;
let executionCompletedCount = 0;
let executionListenersBound = false;

function getExecutionMonitorElements() {
    return {
        steps: document.getElementById('execution-steps'),
        summary: document.getElementById('execution-summary'),
        status: document.getElementById('execution-status'),
        progress: document.getElementById('execution-progress-bar'),
        finalContext: document.getElementById('execution-final-context')
    };
}

function bindExecutionMonitor() {
    // Bind once to the document, but resolve the Builder elements for every
    // event. The Builder is re-rendered during SPA navigation, so cached
    // references become detached and stop receiving visible updates.
    if (executionListenersBound) return;
    if (!document.getElementById('execution-steps')) return;
    executionListenersBound = true;

    document.addEventListener('flowforge:workflow-started', event => {
        const { steps, summary, status, progress, finalContext } = getExecutionMonitorElements();
        if (!steps) return;
        executionStepCount = event.detail?.totalSteps || 0;
        executionCompletedCount = 0;
        steps.replaceChildren();
        summary.textContent = 'Preparing ' + executionStepCount + ' workflow steps...';
        status.textContent = 'RUNNING';
        status.className = 'run-status running';
        progress.style.width = '0%';
        finalContext.textContent = 'Workflow is running...';
    });

    document.addEventListener('flowforge:step-started', event => {
        const { steps, summary } = getExecutionMonitorElements();
        if (!steps) return;
        const detail = event.detail || {};
        const item = document.createElement('li');
        item.className = 'execution-step running';
        item.dataset.nodeId = detail.nodeId || '';
        const heading = document.createElement('div');
        heading.className = 'execution-step-heading';
        const name = document.createElement('strong');
        name.textContent = (detail.type || 'Workflow step') + (detail.iteration ? ' · iteration ' + detail.iteration : '');
        const badge = document.createElement('span');
        badge.className = 'step-state';
        badge.textContent = 'RUNNING';
        heading.append(name, badge);
        const output = document.createElement('pre');
        output.className = 'execution-step-output';
        output.textContent = 'Executing...';
        item.append(heading, output);
        steps.append(item);
        summary.textContent = 'Currently running: ' + (detail.type || 'workflow step');
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    document.addEventListener('flowforge:step-completed', event => {
        const { steps, summary, progress } = getExecutionMonitorElements();
        if (!steps) return;
        const detail = event.detail || {};
        const candidates = [...steps.querySelectorAll('.execution-step')];
        const item = candidates.reverse().find(element => element.dataset.nodeId === detail.nodeId
            && element.classList.contains('running'));
        if (!item) return;
        item.classList.remove('running');
        item.classList.add(detail.status === 'error' ? 'error' : 'success');
        const badge = item.querySelector('.step-state');
        badge.textContent = String(detail.status || 'success').toUpperCase();
        const output = item.querySelector('.execution-step-output');
        output.textContent = detail.status === 'error'
            ? (detail.error || 'This step failed.')
            : JSON.stringify(detail.output ?? {}, null, 2);
        executionCompletedCount++;
        const percent = executionStepCount
            ? Math.min(100, executionCompletedCount / executionStepCount * 100)
            : 100;
        progress.style.width = percent + '%';
        summary.textContent = executionCompletedCount + ' of ' + executionStepCount + ' steps completed';
    });

    document.addEventListener('flowforge:workflow-completed', event => {
        const { steps, summary, status, progress, finalContext } = getExecutionMonitorElements();
        if (!steps) return;
        const result = event.detail || {};
        const succeeded = result.status === 'success';
        status.textContent = succeeded ? 'SUCCESS' : 'FAILED';
        status.className = 'run-status ' + (succeeded ? 'success' : 'error');
        summary.textContent = (succeeded ? 'Workflow completed' : 'Workflow stopped: ' + (result.error || 'Unknown error'))
            + ' · ' + (result.duration ?? 0) + ' ms';
        progress.style.width = '100%';
        finalContext.textContent = JSON.stringify(result.finalContext || {}, null, 2);
        if (!result.steps?.length && result.error) {
            const item = document.createElement('li');
            item.className = 'execution-step error';
            item.textContent = result.error;
            steps.append(item);
        }
    });
}

function initializeRunButton() {
    const button = document.getElementById('run-workflow');
    if (!button) return;
    button.addEventListener('click', async () => {
        if (button.disabled) return;
        button.disabled = true;
        button.innerHTML = '<i data-lucide="loader-circle" aria-hidden="true"></i> Running...';
        refreshIcons(button);
        try {
            // Request browser permission while the Run button's user gesture is
            // still active; saveCurrentWorkflow() below is asynchronous.
            if (state.nodes.some(node => node.type === 'Send Notification')
                && 'Notification' in window
                && Notification.permission === 'default') {
                try {
                    await Notification.requestPermission();
                } catch (error) {
                    console.warn('Browser notification permission request was unavailable:', error);
                }
            }

            await saveCurrentWorkflow(false);
            document.dispatchEvent(new CustomEvent('flowforge:workflow-started', { detail: { totalSteps: state.nodes.length } }));
            const result = await runWorkflow(state.nodes, state.connections, {}, {
                workflowId: state.workflowId, workflowName: state.workflowName
            });
            showNotification(result.status === 'success'
                ? 'Workflow completed successfully in ' + result.duration + ' ms.'
                : 'Workflow failed: ' + result.error, 4000);
            if (result.status === 'error' && result.steps.length && state.workflowId === result.workflowId) {
                const failed = result.steps.find(step => step.status === 'error');
                if (failed) {
                    const drawflowId = Object.values(getDrawflowEditor()?.export()?.drawflow?.Home?.data || {})
                        .find(node => node.data?.appNodeId === failed.nodeId)?.id;
                    if (drawflowId) getDrawflowEditor().getNodeFromId(drawflowId)?.html && document.querySelector('#drawflow-container #node-' + drawflowId)?.classList.add('selected');
                }
            }
            document.dispatchEvent(new CustomEvent('flowforge:workflow-completed', { detail: result }));
        } catch (error) {
            console.error('Workflow execution failed:', error);
            showNotification('Workflow execution failed.');
        } finally {
            button.disabled = false;
            button.innerHTML = '<i data-lucide="play" aria-hidden="true"></i> Run Workflow';
            refreshIcons(button);
        }
    });
}

function initializeKeyboardShortcuts() {
    if (keyboardHandlerAttached) return;
    keyboardHandlerAttached = true;
    document.addEventListener('keydown', event => {
        if (event.target.matches('input, textarea, select, button') || event.target.isContentEditable) return;
        const editor = getDrawflowEditor();
        if (!editor) return;
        const modifier = event.ctrlKey || event.metaKey;
        if (modifier && event.key.toLowerCase() === 'z') {
            event.preventDefault();
            if (event.shiftKey) redo(); else undo();
            return;
        }
        if (modifier && event.key.toLowerCase() === 'y') {
            event.preventDefault(); redo(); return;
        }
        if (modifier && event.key.toLowerCase() === 'c') {
            if (copySelectedNode(editor)) showNotification('Node copied.');
        }
        if (modifier && event.key.toLowerCase() === 'v') {
            const id = pasteNode(editor);
            if (id) showNotification('Node pasted.');
        }
        if (event.key === 'Delete' || event.key === 'Backspace') {
            if (selectedConnection) {
                event.preventDefault();
                const connection = selectedConnection;
                selectedConnection = null;
                editor.removeSingleConnection(
                    connection.output_id,
                    connection.input_id,
                    connection.output_class,
                    connection.input_class
                );
                return;
            }
            const selected = editor.node_selected;
            if (selected) {
                event.preventDefault();
                editor.removeNodeId(String(selected.id).startsWith('node-') ? selected.id : 'node-' + selected.id);
            }
        }
    });
}

export function initNodes() {
    const container = document.getElementById('drawflow-container');
    if (!container) return;
    const editor = initDrawflow();
    if (!editor) return;
    const boxes = document.querySelectorAll('.box-item');
    const search = document.getElementById('search-box');
    search?.addEventListener('input', event => {
        const term = event.target.value.toLowerCase();
        boxes.forEach(box => { box.style.display = box.textContent.toLowerCase().includes(term) ? 'flex' : 'none'; });
    });
    boxes.forEach(box => {
        box.addEventListener('dragstart', event => event.dataTransfer.setData('node-type', box.dataset.nodeType || box.textContent.trim()));
    });
    container.addEventListener('dragover', event => event.preventDefault());
    container.addEventListener('drop', event => {
        event.preventDefault();
        const type = event.dataTransfer.getData('node-type');
        if (!type) return;
        const ports = getNodePortCounts(type);
        const rect = container.getBoundingClientRect();
        const x = (event.clientX - rect.left) / editor.zoom;
        const y = (event.clientY - rect.top) / editor.zoom;
        editor.addNode(type, ports.inputs, ports.outputs, x, y,
            type.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            { nodeType: type, config: {} }, createDrawflowNodeHtml(type));
        refreshIcons(container);
    });
    setupDrawflowEvents(editor);
    bindExecutionMonitor();
    initializeKeyboardShortcuts();
    initializeRunButton();
    if (!window.__flowforgeDrawflowSyncBound) {
        document.addEventListener('flowforge:state-changed', () => {
            if (!syncingFromEditor) renderDrawflowFromState();
        });
        document.addEventListener('flowforge:workflow-loaded', () => renderDrawflowFromState());
        window.__flowforgeDrawflowSyncBound = true;
    }
    const name = document.getElementById('workflow-name');
    if (name) name.value = state.workflowName || 'Untitled Workflow';
    refreshIcons(container);
}
