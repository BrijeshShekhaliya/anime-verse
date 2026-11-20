import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createThrottle } = require('../src/services/http.js');
const { inBackground } = require('../src/services/priority.js');
const provider = require('../src/providers/index.js');
const dubs = require('../src/services/dubs.js');

const { breakers, trip, heal, healthyFirst, ORDER } = provider._breakers;
const [primary, backup] = ORDER;

test('background work never takes the last request slot', async () => {
  const throttle = createThrottle(0, 3);
  const stuck = () => new Promise(() => {}); // e.g. a request frozen while Vercel pauses the server
  for (let i = 0; i < 5; i += 1) inBackground(() => throttle(stuck));
  let visitorRan = false;
  await Promise.race([throttle(async () => { visitorRan = true; }), new Promise((r) => setTimeout(r, 300))]);
  assert.ok(visitorRan, 'a visitor request starts even with background requests stuck');
});

test('background failures do not make visitors skip a source', () => {
  heal(primary);
  inBackground(() => trip(primary, new Error('This operation was aborted')));
  assert.equal(breakers[primary].openUntil, 0);
  assert.deepEqual(healthyFirst(ORDER), ORDER);
});

test('a skipped source is still tried last instead of failing early', () => {
  trip(primary, new Error('HTTP 429'));
  try {
    assert.ok(breakers[primary].openUntil > Date.now());
    assert.deepEqual(healthyFirst(ORDER), [backup, primary]);
  } finally {
    heal(primary);
  }
});

test('waiting for the dub list is capped, so pages never hang on it', async () => {
  const started = Date.now();
  await dubs.ready(150);
  assert.ok(Date.now() - started < 2000);
});
