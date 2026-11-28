import assert from 'node:assert/strict';
import { parseCSV, stringifyCSV } from '../src/js/core/advanced.js';

const source = 'name,email,note\r\nAda,ada@example.com,"Works, remotely"\r\nGrace,grace@example.com,"Said ""hello"""';
const rows = parseCSV(source);
assert.equal(rows.length, 3);
assert.deepEqual(rows[1], ['Ada', 'ada@example.com', 'Works, remotely']);
assert.equal(rows[2][2], 'Said "hello"');

const generated = stringifyCSV([
  ['name', 'note'],
  ['Ada', 'Works, remotely'],
  ['Grace', 'Said "hello"']
]);
assert.deepEqual(parseCSV(generated), [
  ['name', 'note'],
  ['Ada', 'Works, remotely'],
  ['Grace', 'Said "hello"']
]);

assert.throws(() => parseCSV('name,note\nAda,"unfinished'), /unclosed quoted field/i);
console.log('Validated CSV quoting, escaped quotes, CRLF handling, round-trip generation, and malformed input rejection.');
