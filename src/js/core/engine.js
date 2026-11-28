import { handlers } from './handlers.js';
import { getGlobalVariables, getEnvironmentProfiles } from './advanced.js';

const activeExecutions = new Map();

export function pauseWorkflow(runId) { const control = activeExecutions.get(runId); if (control) { control.paused = true; publishExecutionEvent('flowforge:debug-paused', { runId }); return true; } return false; }
export function resumeWorkflow(runId) { const control = activeExecutions.get(runId); if (!control) return false; control.paused = false; control.stepBudget = Infinity; control.release?.(); control.release = null; publishExecutionEvent('flowforge:debug-resumed', { runId }); return true; }
export function stepWorkflow(runId) { const control = activeExecutions.get(runId); if (!control) return false; control.stepBudget = 1; control.paused = false; control.release?.(); control.release = null; publishExecutionEvent('flowforge:debug-step', { runId }); return true; }
export function cancelWorkflow(runId) { const control = activeExecutions.get(runId); if (!control) return false; control.cancelled = true; control.paused = false; control.release?.(); control.release = null; publishExecutionEvent('flowforge:debug-cancelled', { runId }); return true; }


function publishExecutionEvent(name, detail) {
    if (typeof document !== 'undefined') {
        document.dispatchEvent(new CustomEvent(name, { detail }));
    }
}

function validateGraph(nodes, connections) {
    if (!Array.isArray(nodes) || !Array.isArray(connections)) {
        throw new Error('Workflow nodes and connections must be arrays.');
    }
    if (!nodes.length) throw new Error('Add at least one node before running.');

    const nodeMap = new Map();
    for (const node of nodes) {
        if (!node || typeof node.id !== 'string' || !node.id || typeof node.type !== 'string') {
            throw new Error('Every workflow node must have a unique ID and a valid type.');
        }
        if (nodeMap.has(node.id)) throw new Error(`Duplicate node ID: ${node.id}`);
        nodeMap.set(node.id, node);
    }

    const edgeKeys = new Set();
    const adjacency = new Map(nodes.map(node => [node.id, []]));
    const reverse = new Map(nodes.map(node => [node.id, []]));

    for (const edge of connections) {
        if (!edge || !nodeMap.has(edge.from) || !nodeMap.has(edge.to)) {
            throw new Error('A connection references a node that does not exist.');
        }
        if (edge.from === edge.to) throw new Error('A node cannot connect to itself.');
        const key = `${edge.from}->${edge.to}`;
        if (edgeKeys.has(key)) throw new Error('Duplicate workflow connections are not allowed.');
        edgeKeys.add(key);
        adjacency.get(edge.from).push(edge);
        reverse.get(edge.to).push(edge);
    }

    const indegree = new Map(nodes.map(node => [node.id, reverse.get(node.id).length]));
    const queue = nodes.filter(node => indegree.get(node.id) === 0).map(node => node.id);
    let visited = 0;
    while (queue.length) {
        const id = queue.shift();
        visited++;
        for (const edge of adjacency.get(id)) {
            indegree.set(edge.to, indegree.get(edge.to) - 1);
            if (indegree.get(edge.to) === 0) queue.push(edge.to);
        }
    }
    if (visited !== nodes.length) {
        throw new Error('Workflow contains a cycle. Please remove circular connections.');
    }

    const starts = nodes.filter(node => ['Manual Start', 'Timer (Schedule)'].includes(node.type));
    if (starts.length !== 1) {
        throw new Error('A workflow must contain exactly one start node (Manual Start or Timer).');
    }

    const reachable = new Set();
    const pending = [starts[0].id];
    while (pending.length) {
        const id = pending.pop();
        if (reachable.has(id)) continue;
        reachable.add(id);
        for (const edge of adjacency.get(id)) pending.push(edge.to);
    }
    if (reachable.size !== nodes.length) {
        throw new Error('Every node must be connected to the workflow start node.');
    }

    return { nodeMap, adjacency, reverse, start: starts[0] };
}

export function getExecutionOrder(nodes, connections) {
    const { nodeMap, adjacency, reverse, start } = validateGraph(nodes, connections);
    const reachable = new Set();
    const pending = [start.id];
    while (pending.length) {
        const id = pending.pop();
        if (reachable.has(id)) continue;
        reachable.add(id);
        for (const edge of adjacency.get(id)) pending.push(edge.to);
    }

    const indegree = new Map([...reachable].map(id => [id, 0]));
    for (const id of reachable) {
        for (const edge of adjacency.get(id)) {
            if (reachable.has(edge.to)) indegree.set(edge.to, indegree.get(edge.to) + 1);
        }
    }

    const queue = [...reachable].filter(id => indegree.get(id) === 0);
    const order = [];
    while (queue.length) {
        const id = queue.shift();
        order.push(nodeMap.get(id));
        for (const edge of adjacency.get(id)) {
            if (!reachable.has(edge.to)) continue;
            indegree.set(edge.to, indegree.get(edge.to) - 1);
            if (indegree.get(edge.to) === 0) queue.push(edge.to);
        }
    }
    return order;
}

function chooseConditionEdge(edges, result) {
    const labels = edges.map(edge => String(edge.branch || edge.sourceHandle || '').toLowerCase());
    const hasExplicitLabels = labels.some(label =>
        ['true', 'yes', 'success', 'false', 'no', 'failure'].includes(label)
    );

    if (hasExplicitLabels) {
        const accepted = result
            ? ['true', 'yes', 'success']
            : ['false', 'no', 'failure'];
        return edges.find(edge => accepted.includes(
            String(edge.branch || edge.sourceHandle || '').toLowerCase()
        )) || null;
    }

    // The current Builder exposes an unlabeled output. Until it supports
    // labeled handles, the first outgoing edge represents true and the second false.
    return edges[result ? 0 : 1] || null;
}

export async function runWorkflow(nodes, connections, initialContext = {}, metadata = {}) {
    const runId = crypto.randomUUID();
    const startedAt = Date.now();
    const [globalVariables, environment] = await Promise.all([getGlobalVariables().catch(() => ({})), getEnvironmentProfiles().catch(() => ({ active: 'Development', profiles: {} }))]);
    const context = { ...globalVariables, ...(environment.profiles?.[environment.active] || {}), ...initialContext };
    const control = { paused: Boolean(metadata.debugPaused), cancelled: false, stepBudget: Infinity, release: null };
    activeExecutions.set(runId, control);
    const steps = [];
    let status = 'success';
    let errorMessage = null;
    let graph;

    try {
        graph = validateGraph(nodes, connections);
    } catch (error) {
        activeExecutions.delete(runId);
        return {
            id: runId, workflowId: metadata.workflowId || null,
            workflowName: metadata.workflowName || 'Untitled Workflow',
            status: 'error', error: error.message, startedAt,
            finishedAt: Date.now(), duration: Date.now() - startedAt,
            steps, finalContext: context
        };
    }

    const executed = new Set();
    const maxSteps = Math.max(1000, nodes.length * 100);
    let currentId = graph.start.id;
    let stepCount = 0;

    async function checkpoint(node) {
        if (control.cancelled) throw new Error('Workflow execution cancelled by user.');
        if (control.stepBudget !== Infinity && control.stepBudget > 0) { control.stepBudget = Infinity; control.pauseAfterStep = true; }
        if (control.paused) {
            publishExecutionEvent('flowforge:debug-waiting', { runId, nodeId: node.id, type: node.type });
            await new Promise(resolve => { control.release = resolve; });
            if (control.cancelled) throw new Error('Workflow execution cancelled by user.');
        }
    }

    async function executeNode(node, iteration = null) {
        if (++stepCount > maxSteps) throw new Error('Execution safety limit reached.');
        const started = Date.now();
        const handler = handlers[node.type];
        if (!handler) throw new Error(`No handler found for ${node.type}`);
        const stepInfo = { runId, nodeId: node.id, type: node.type, iteration };
        await checkpoint(node);
        publishExecutionEvent('flowforge:step-started', stepInfo);
        try {
            let output;
            const retries = Math.min(Math.max(Number(node.config?.retryCount) || 0, 0), 5);
            for (let attempt = 0; attempt <= retries; attempt++) {
                try {
                    output = await handler(node.config || {}, context);
                    break;
                } catch (error) {
                    if (attempt >= retries) throw error;
                    publishExecutionEvent('flowforge:step-retrying', { ...stepInfo, attempt: attempt + 1, maxRetries: retries, error: error.message });
                    await new Promise(resolve => setTimeout(resolve, Math.min(500 * (attempt + 1), 2500)));
                }
            }
            context[node.id] = output;
            const step = {
                nodeId: node.id, type: node.type, status: 'success',
                output, duration: Date.now() - started,
                ...(node.type === 'Write to Log' ? { configuredMessage: String(node.config?.message ?? '') } : {}),
                ...(iteration !== null ? { iteration } : {})
            };
            steps.push(step);
            publishExecutionEvent('flowforge:step-completed', { ...stepInfo, ...step, context: structuredClone(context) });
            if (control.pauseAfterStep) { control.pauseAfterStep = false; control.paused = true; publishExecutionEvent('flowforge:debug-paused', { runId, nodeId: node.id }); }
            return output;
        } catch (error) {
            const step = {
                nodeId: node.id, type: node.type, status: 'error',
                error: error.message, duration: Date.now() - started,
                ...(iteration !== null ? { iteration } : {})
            };
            steps.push(step);
            publishExecutionEvent('flowforge:step-completed', { ...stepInfo, ...step });
            if (control.pauseAfterStep) { control.pauseAfterStep = false; control.paused = true; publishExecutionEvent('flowforge:debug-paused', { runId, nodeId: node.id }); }
            throw error;
        }
    }

    try {
        while (currentId) {
            const node = graph.nodeMap.get(currentId);
            if (!node) break;
            if (executed.has(currentId)) throw new Error('A workflow path attempted to execute the same node more than once.');
            executed.add(currentId);

            let output;
            try {
                output = await executeNode(node);
            } catch (error) {
                const recoveryId = node.config?.onErrorNodeId;
                if (recoveryId && graph.nodeMap.has(recoveryId) && !executed.has(recoveryId)) {
                    context.__lastError = { nodeId: node.id, type: node.type, message: error.message };
                    publishExecutionEvent('flowforge:error-recovered', { runId, nodeId: node.id, recoveryNodeId: recoveryId, error: error.message });
                    currentId = recoveryId;
                    continue;
                }
                throw error;
            }
            const outgoing = graph.adjacency.get(currentId) || [];

            if (node.type === 'Condition') {
                if (outgoing.length > 2) throw new Error('A Condition can have at most two outgoing branches.');
                const selected = chooseConditionEdge(outgoing, Boolean(output.result));
                currentId = selected?.to || null;
                continue;
            }

            if (node.type === 'Loop') {
                const count = Number(node.config?.count);
                const bodyNodeIds = Array.isArray(node.config?.bodyNodeIds)
                    ? node.config.bodyNodeIds
                    : [];
                if (!Number.isInteger(count) || count < 1 || count > 100) {
                    throw new Error('Loop count must be between 1 and 100.');
                }
                if (!bodyNodeIds.length) {
                    throw new Error('Select at least one node for the Loop body in its settings.');
                }

                const bodySet = new Set(bodyNodeIds);
                if (bodySet.size !== bodyNodeIds.length || bodySet.has(node.id)) {
                    throw new Error('Loop body selection contains duplicate or invalid nodes.');
                }
                for (const id of bodySet) {
                    if (!graph.nodeMap.has(id)) throw new Error('Loop body references a node that no longer exists.');
                    if (executed.has(id)) throw new Error('A Loop body node has already executed before the Loop.');
                }

                const bodyIncoming = new Map([...bodySet].map(id => [id, []]));
                const bodyOutgoing = new Map([...bodySet].map(id => [id, []]));
                for (const id of bodySet) {
                    const allOutgoing = graph.adjacency.get(id) || [];
                    if (allOutgoing.length > 1) {
                        throw new Error('Loop body nodes cannot have multiple outgoing connections.');
                    }
                    for (const edge of allOutgoing) {
                        if (bodySet.has(edge.to)) bodyOutgoing.get(id).push(edge.to);
                    }
                    for (const edge of graph.reverse.get(id) || []) {
                        if (bodySet.has(edge.from)) bodyIncoming.get(id).push(edge.from);
                    }
                    if (bodyOutgoing.get(id).length > 1 || bodyIncoming.get(id).length > 1) {
                        throw new Error('Loop body nodes must form a single connected path.');
                    }
                }

                const bodyRoots = [...bodySet].filter(id => bodyIncoming.get(id).length === 0);
                if (bodyRoots.length !== 1) throw new Error('Loop body must have exactly one starting node.');
                for (const id of bodySet) {
                    const incomingOutside = (graph.reverse.get(id) || []).filter(edge => !bodySet.has(edge.from));
                    if (id === bodyRoots[0]) {
                        if (incomingOutside.length !== 1 || incomingOutside[0].from !== node.id) {
                            throw new Error('The Loop node must be the only external connection into the Loop body.');
                        }
                    } else if (incomingOutside.length) {
                        throw new Error('Only the first Loop body node may receive a connection from outside the body.');
                    }
                }
                if (outgoing.filter(edge => !bodySet.has(edge.to)).length > 1) {
                    throw new Error('A Loop can have only one continuation connection.');
                }
                const bodyOrder = [];
                let bodyCursor = bodyRoots[0];
                while (bodyCursor && !bodyOrder.includes(bodyCursor)) {
                    bodyOrder.push(bodyCursor);
                    bodyCursor = bodyOutgoing.get(bodyCursor)[0] || null;
                }
                if (bodyOrder.length !== bodySet.size) {
                    throw new Error('Every selected Loop body node must belong to the same connected path.');
                }

                const loopEntryEdges = outgoing.filter(edge => bodySet.has(edge.to));
                if (loopEntryEdges.length !== 1 || loopEntryEdges[0].to !== bodyRoots[0]) {
                    throw new Error('Connect the Loop node to the first selected Loop body node.');
                }

                const explicitExit = outgoing.find(edge => !bodySet.has(edge.to));
                const lastBodyEdges = graph.adjacency.get(bodyOrder[bodyOrder.length - 1]) || [];
                const bodyExit = lastBodyEdges.find(edge => !bodySet.has(edge.to));
                if (lastBodyEdges.filter(edge => bodySet.has(edge.to)).length > 0) {
                    throw new Error('Loop body path is invalid.');
                }

                for (let iteration = 1; iteration <= count; iteration++) {
                    for (const bodyId of bodyOrder) {
                        await executeNode(graph.nodeMap.get(bodyId), iteration);
                    }
                }
                bodyOrder.forEach(id => executed.add(id));
                context[node.id] = { ...output, completedIterations: count, bodyNodeIds: bodyOrder };
                currentId = explicitExit?.to || bodyExit?.to || null;
                continue;
            }

            if (outgoing.length > 1) {
                throw new Error(`Node "${node.type}" has multiple outgoing paths but does not support branching.`);
            }
            currentId = outgoing[0]?.to || null;
        }
    } catch (error) {
        status = control.cancelled ? 'cancelled' : 'error';
        errorMessage = error.message;
    } finally {
        activeExecutions.delete(runId);
    }

    publishExecutionEvent('flowforge:workflow-finished', { runId, status, duration: Date.now() - startedAt, error: errorMessage });
    return {
        id: runId,
        workflowId: metadata.workflowId || null,
        workflowName: metadata.workflowName || 'Untitled Workflow',
        status,
        error: errorMessage,
        startedAt,
        finishedAt: Date.now(),
        duration: Date.now() - startedAt,
        steps,
        finalContext: context
    };
}
