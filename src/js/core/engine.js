import { handlers } from './handlers.js';

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

    return { nodeMap, adjacency, reverse, start: starts[0] };
}

export function getExecutionOrder(nodes, connections) {
    const { nodeMap, adjacency, reverse, start } = validateGraph(nodes, connections);
    const order = [];
    const visited = new Set();
    const pending = [start.id];

    while (pending.length) {
        const id = pending.shift();
        if (visited.has(id)) continue;
        visited.add(id);
        order.push(nodeMap.get(id));
        for (const edge of adjacency.get(id)) pending.push(edge.to);
    }

    if (order.length === 1 && adjacency.get(start.id).length === 0) return order;
    return order;
}

function chooseConditionEdge(edges, result) {
    const explicit = edges.find(edge => {
        const branch = String(edge.branch || edge.sourceHandle || '').toLowerCase();
        return result
            ? ['true', 'yes', 'success'].includes(branch)
            : ['false', 'no', 'failure'].includes(branch);
    });
    if (explicit) return explicit;

    // The current Builder exposes an unlabeled output. Until it supports
    // labeled handles, the first outgoing edge represents true and the second false.
    return edges[result ? 0 : 1] || null;
}

function chooseLoopBodyEdge(edges) {
    return edges.find(edge => ['body', 'loop', 'repeat'].includes(
        String(edge.branch || edge.sourceHandle || '').toLowerCase()
    )) || edges[0] || null;
}

function findLoopRegion(loopId, bodyStart, adjacency, nodeMap) {
    const body = [];
    const visited = new Set([loopId]);
    let current = bodyStart;
    while (current && !visited.has(current)) {
        visited.add(current);
        const node = nodeMap.get(current);
        if (!node) break;
        body.push(node);
        const outgoing = adjacency.get(current) || [];
        if (outgoing.length === 0) {
            current = null;
            break;
        }
        if (outgoing.length !== 1) {
            throw new Error('A Loop body must be a single connected path with one outgoing connection per step.');
        }
        current = outgoing[0].to;
    }
    return { body, continuationId: current && !visited.has(current) ? current : null };
}

export async function runWorkflow(nodes, connections, initialContext = {}, metadata = {}) {
    const runId = crypto.randomUUID();
    const startedAt = Date.now();
    const context = { ...initialContext };
    const steps = [];
    let status = 'success';
    let errorMessage = null;
    let graph;

    try {
        graph = validateGraph(nodes, connections);
    } catch (error) {
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

    async function executeNode(node, iteration = null) {
        if (++stepCount > maxSteps) throw new Error('Execution safety limit reached.');
        const started = Date.now();
        const handler = handlers[node.type];
        if (!handler) throw new Error(`No handler found for ${node.type}`);
        try {
            const output = await handler(node.config || {}, context);
            context[node.id] = output;
            steps.push({
                nodeId: node.id, type: node.type, status: 'success',
                output, duration: Date.now() - started,
                ...(iteration !== null ? { iteration } : {})
            });
            return output;
        } catch (error) {
            steps.push({
                nodeId: node.id, type: node.type, status: 'error',
                error: error.message, duration: Date.now() - started,
                ...(iteration !== null ? { iteration } : {})
            });
            throw error;
        }
    }

    try {
        while (currentId) {
            const node = graph.nodeMap.get(currentId);
            if (!node) break;
            if (executed.has(currentId)) throw new Error('A workflow path attempted to execute the same node more than once.');
            executed.add(currentId);

            const output = await executeNode(node);
            const outgoing = graph.adjacency.get(currentId) || [];

            if (node.type === 'Condition') {
                const selected = chooseConditionEdge(outgoing, Boolean(output.result));
                currentId = selected?.to || null;
                continue;
            }

            if (node.type === 'Loop') {
                const count = Number(node.config?.count);
                if (!Number.isInteger(count) || count < 1 || count > 100) {
                    throw new Error('Loop count must be between 1 and 100.');
                }
                const bodyEdge = chooseLoopBodyEdge(outgoing);
                const continuationEdge = outgoing.find(edge => edge !== bodyEdge && !['body', 'loop', 'repeat'].includes(String(edge.branch || edge.sourceHandle || '').toLowerCase()));
                if (!bodyEdge) {
                    context[node.id] = { ...output, completedIterations: 0 };
                    currentId = null;
                    continue;
                }

                const region = findLoopRegion(node.id, bodyEdge.to, graph.adjacency, graph.nodeMap);
                if (!region.body.length) throw new Error('The Loop body is empty.');
                const bodyIds = new Set(region.body.map(item => item.id));
                for (let iteration = 1; iteration <= count; iteration++) {
                    for (const bodyNode of region.body) {
                        await executeNode(bodyNode, iteration);
                    }
                }
                region.body.forEach(item => executed.add(item.id));
                context[node.id] = { ...output, completedIterations: count };
                currentId = region.continuationId || continuationEdge?.to || null;
                if (currentId && bodyIds.has(currentId)) currentId = null;
                continue;
            }

            if (outgoing.length > 1) {
                throw new Error(`Node "${node.type}" has multiple outgoing paths but does not support branching.`);
            }
            currentId = outgoing[0]?.to || null;
        }
    } catch (error) {
        status = 'error';
        errorMessage = error.message;
    }

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
