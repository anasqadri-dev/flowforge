import assert from 'node:assert/strict';

const listeners = new Map();
const classes = new Set();
const element = {
  textContent: '',
  attributes: {},
  classList: {
    add(name) { classes.add(name); },
    remove(name) { classes.delete(name); },
    contains(name) { return classes.has(name); }
  },
  setAttribute(name, value) { this.attributes[name] = value; }
};

globalThis.document = {
  addEventListener(name, callback) { listeners.set(name, callback); },
  getElementById(id) { return id === 'notification' ? element : null; }
};

// Keep the toast visible during this deterministic UI-component test.
const originalSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = () => 1;

try {
  await import('../src/js/components/notifications.js');

  const onCompleted = listeners.get('flowforge:workflow-completed');
  assert.equal(typeof onCompleted, 'function', 'Notification listener must subscribe to workflow completion');

  onCompleted({
    detail: {
      status: 'success',
      steps: [{
        type: 'Send Notification',
        status: 'success',
        output: { message: 'Welcome, Ada!' }
      }]
    }
  });

  assert.equal(element.textContent, 'Welcome, Ada!');
  assert.equal(classes.has('show'), true, 'Notification toast must become visible');
  assert.equal(element.attributes['aria-live'], 'polite');
  console.log('Validated in-app notification delivery after workflow completion.');
} finally {
  globalThis.setTimeout = originalSetTimeout;
}
