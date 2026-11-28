import assert from 'node:assert/strict';
import { runWorkflow } from '../src/js/core/engine.js';

const events = [];
globalThis.document = {
  dispatchEvent(event) {
    events.push({ type: event.type, detail: event.detail });
    return true;
  }
};

function node(id, type, config = {}) {
  return { id, type, x: 0, y: 0, config };
}
function edge(from, to, branch = null, sourceHandle = null) {
  return { id: `${from}-${to}`, from, to, ...(branch ? { branch } : {}), ...(sourceHandle ? { sourceHandle } : {}) };
}

// Regression: the same in-memory workflow must be executable repeatedly
// without a page reload, with a fresh run ID and a fresh step event stream.
const repeatableNodes = [
  node('start', 'Manual Start'),
  node('log', 'Write to Log', { message: 'Run completed visibly' })
];
const repeatableEdges = [edge('start', 'log')];
const repeatedRuns = [];
for (let index = 0; index < 3; index++) {
  repeatedRuns.push(await runWorkflow(repeatableNodes, repeatableEdges, {}, {
    workflowId: 'repeatable-workflow',
    workflowName: 'Repeated Execution Regression'
  }));
}
assert.deepEqual(repeatedRuns.map(run => run.status), ['success', 'success', 'success']);
assert.equal(new Set(repeatedRuns.map(run => run.id)).size, 3, 'Every run must receive a unique ID');
assert.ok(repeatedRuns.every(run => run.steps.length === 2), 'Every run must execute the complete path');
assert.ok(repeatedRuns.every(run => run.steps[1].output.message === 'Run completed visibly'));
assert.equal(events.filter(event => event.type === 'flowforge:step-started').length, 6);
assert.equal(events.filter(event => event.type === 'flowforge:step-completed').length, 6);

// Regression: only the selected Condition branch is executed.
for (const [flag, expectedMessage] of [['yes', 'true path'], ['no', 'false path']]) {
  const conditionNodes = [
    node('start', 'Manual Start'),
    node('condition', 'Condition', { left: '{{flag}}', operator: '==', right: 'yes' }),
    node('true-log', 'Write to Log', { message: 'true path' }),
    node('false-log', 'Write to Log', { message: 'false path' })
  ];
  const conditionEdges = [
    edge('start', 'condition'),
    edge('condition', 'true-log', 'true', 'output_1'),
    edge('condition', 'false-log', 'false', 'output_2')
  ];
  const result = await runWorkflow(conditionNodes, conditionEdges, { flag });
  assert.equal(result.status, 'success');
  const executedMessages = result.steps
    .filter(step => step.type === 'Write to Log')
    .map(step => step.output.message);
  assert.deepEqual(executedMessages, [expectedMessage]);
}

// Regression: loop body steps execute in every iteration and continuation
// executes once after the loop.
const loopNodes = [
  node('start', 'Manual Start'),
  node('loop', 'Loop', { count: 3, bodyNodeIds: ['body'] }),
  node('body', 'Write to Log', { message: 'iteration output' }),
  node('after', 'Write to Log', { message: 'after loop' })
];
const loopResult = await runWorkflow(loopNodes, [
  edge('start', 'loop'),
  edge('loop', 'body'),
  edge('loop', 'after'),
  edge('body', 'after')
]);
assert.equal(loopResult.status, 'success', loopResult.error);
assert.equal(loopResult.steps.filter(step => step.nodeId === 'body').length, 3);
assert.deepEqual(
  loopResult.steps.filter(step => step.nodeId === 'body').map(step => step.iteration),
  [1, 2, 3]
);
assert.equal(loopResult.steps.filter(step => step.nodeId === 'after').length, 1);

// Invalid graphs must fail cleanly instead of leaving a run in a stale state.
const invalid = await runWorkflow([node('action', 'Write to Log', { message: 'no trigger' })], []);
assert.equal(invalid.status, 'error');
assert.match(invalid.error, /exactly one start node/i);

console.log('Validated repeated runs, fresh execution events, Condition branching, Loop iterations, and invalid-graph handling.');
