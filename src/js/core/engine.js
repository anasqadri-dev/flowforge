import { handlers } from "./handlers.js";

export function getExecutionOrder(nodes, connections) {
  const nodeMap = new Map(nodes.map(node => [node.id, node]));

  const indegree = new Map();
  const adjacency = new Map();

  nodes.forEach(node => {
    indegree.set(node.id, 0);
    adjacency.set(node.id, []);
  });

  connections.forEach(connection => {
    if (
      !nodeMap.has(connection.from) ||
      !nodeMap.has(connection.to)
    ) {
      return;
    }

    adjacency.get(connection.from).push(connection.to);

    indegree.set(
      connection.to,
      indegree.get(connection.to) + 1
    );
  });

  const queue = nodes
    .filter(node => indegree.get(node.id) === 0)
    .map(node => node.id);

  const order = [];

  while (queue.length > 0) {
    const currentId = queue.shift();

    order.push(nodeMap.get(currentId));

    for (const nextId of adjacency.get(currentId)) {
      indegree.set(nextId, indegree.get(nextId) - 1);

      if (indegree.get(nextId) === 0) {
        queue.push(nextId);
      }
    }
  }

  if (order.length !== nodes.length) {
    throw new Error(
      "Workflow contains a cycle. Please remove circular connections."
    );
  }

  return order;
}

export async function runWorkflow(nodes, connections, initialContext = {}) {
  if (!nodes.length) {
    throw new Error("Add at least one node before running.");
  }

  const runId = crypto.randomUUID();
  const startedAt = Date.now();

  const context = { ...initialContext };
  const steps = [];

  let status = "success";
  let errorMessage = null;

  let order;

  try {
    order = getExecutionOrder(nodes, connections);
  } catch (error) {
    return {
      id: runId,
      status: "error",
      error: error.message,
      startedAt,
      finishedAt: Date.now(),
      duration: Date.now() - startedAt,
      steps: []
    };
  }

  for (const node of order) {
    const stepStarted = Date.now();

    const handler = handlers[node.type];

    if (!handler) {
      status = "error";
      errorMessage = `No handler found for ${node.type}`;

      steps.push({
        nodeId: node.id,
        type: node.type,
        status: "error",
        error: errorMessage,
        duration: Date.now() - stepStarted
      });

      break;
    }

    try {
      const output = await handler(
        node.config || {},
        context
      );

      context[node.id] = output;

      steps.push({
        nodeId: node.id,
        type: node.type,
        status: "success",
        output,
        duration: Date.now() - stepStarted
      });

    } catch (error) {
      status = "error";
      errorMessage = error.message;

      steps.push({
        nodeId: node.id,
        type: node.type,
        status: "error",
        error: error.message,
        duration: Date.now() - stepStarted
      });

      break;
    }
  }

  return {
    id: runId,
    status,
    error: errorMessage,
    startedAt,
    finishedAt: Date.now(),
    duration: Date.now() - startedAt,
    steps,
    finalContext: context
  };
}