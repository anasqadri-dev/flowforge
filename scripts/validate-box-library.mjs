import assert from 'node:assert/strict';
import { handlers } from '../src/js/core/handlers.js';

const required = [
  'Manual Start','Timer (Schedule)','HTTP Request','Transform Data','Set Variable','Wait',
  'Condition','Loop','Send Notification','Write to Log','JSON Parse','JSON Stringify',
  'Merge Data','Validate JSON','Filter Array','Array Length','Format Text','Replace Text',
  'Split Text','Join Text','Math Operation','Random Number','Generate UUID',
  'Current Date & Time','URL Encode','URL Decode','Base64 Encode','Base64 Decode'
];
for (const type of required) assert.equal(typeof handlers[type], 'function', `Missing handler: ${type}`);

assert.deepEqual((await handlers['JSON Parse']({input:'{"ok":true}'}, {})).data, {ok:true});
assert.equal((await handlers['JSON Stringify']({input:'{"a":1}'}, {})).json, '{\n  "a": 1\n}');
assert.equal((await handlers['Validate JSON']({input:'nope'}, {})).valid, false);
assert.deepEqual((await handlers['Merge Data']({input:'{"a":1}',second:'{"b":2}'}, {})).data, {a:1,b:2});
assert.deepEqual((await handlers['Filter Array']({input:'[{"active":true},{"active":false}]',path:'active',operator:'==',value:'true'}, {})).items, [{active:true}]);
assert.equal((await handlers['Array Length']({input:'[1,2,3]'}, {})).length, 3);
assert.equal((await handlers['Format Text']({template:'Hi {{name}}'}, {name:'Ada'})).text, 'Hi Ada');
assert.equal((await handlers['Replace Text']({input:'a-b-a',search:'a',replacement:'x'}, {})).text, 'x-b-x');
assert.deepEqual((await handlers['Split Text']({input:'a,b,c',delimiter:','}, {})).items, ['a','b','c']);
assert.equal((await handlers['Join Text']({input:'["a","b"]',delimiter:'-'}, {})).text, 'a-b');
assert.equal((await handlers['Math Operation']({left:'6',right:'7',operation:'*'}, {})).result, 42);
const random = (await handlers['Random Number']({min:4,max:4}, {})).value;
assert.equal(random, 4);
assert.match((await handlers['Generate UUID']()).uuid, /^[0-9a-f-]{36}$/i);
assert.ok((await handlers['Current Date & Time']()).iso);
assert.equal((await handlers['URL Encode']({input:'hello world'}, {})).value, 'hello%20world');
assert.equal((await handlers['URL Decode']({input:'hello%20world'}, {})).value, 'hello world');
const encoded = (await handlers['Base64 Encode']({input:'FlowForge ✓'}, {})).value;
assert.equal((await handlers['Base64 Decode']({input:encoded}, {})).value, 'FlowForge ✓');
// Notification handlers return their interpolated message for the in-app
// notification component to display after the run has completed.
globalThis.window = {};
const notification = await handlers['Send Notification'](
  { message: 'Welcome, {{customer}}!' },
  { customer: 'Ada' }
);
assert.equal(notification.message, 'Welcome, Ada!');
assert.equal(notification.delivered, true);
assert.equal(notification.inAppDelivered, true);
assert.equal(notification.browserNotificationDelivered, false);

// Write to Log returns a visible step result; it does not rely on DevTools.
const logResult = await handlers['Write to Log']({ message: 'Visible in FlowForge' }, {});
assert.equal(logResult.message, 'Visible in FlowForge');
assert.equal(logResult.loggedInApp, true);

// Every registered handler must also be accepted by workflow persistence.
globalThis.document = { getElementById: () => null };
const { validateWorkflow } = await import('../src/js/core/persistence.js');
for (const type of required) {
  assert.equal(validateWorkflow({
    nodes: [
      { id: 'start', type: 'Manual Start', x: 0, y: 0, config: {} },
      { id: 'action', type, x: 200, y: 0, config: {} }
    ],
    connections: [{ id: 'edge', from: 'start', to: 'action' }]
  }, { requireStart: true, strictConnections: true }), true, `Persistence rejected supported box: ${type}`);
}

console.log(`Validated ${required.length} box handlers and 22 execution scenarios and persistence support for all box types.`);
