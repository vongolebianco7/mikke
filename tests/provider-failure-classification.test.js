import test from 'node:test';
import assert from 'node:assert/strict';
import { searchShoppingProviders } from '../src/server/shoppingProviders.js';

const watch = { type: 'shopping', rawQuery: 'test', conditions: {} };

test('upstream 429 is classified separately and retains status without retry', async () => {
  let calls = 0;
  const events = [];
  const result = await searchShoppingProviders(watch, {
    env: { MIKKE_YAHOO_ENABLED: 'true', YAHOO_APP_ID: 'y-app' },
    logger: { provider: (event) => events.push(event) },
    fetchImpl: async () => {
      calls += 1;
      return { ok: false, status: 429, json: async () => ({}) };
    },
  });

  assert.equal(calls, 1);
  assert.deepEqual(result.providers, [
    { name: 'rakuten', status: 'disabled' },
    { name: 'yahoo', status: 'rate_limited' },
  ]);
  assert.deepEqual(events.find((event) => event.provider === 'yahoo'), {
    provider: 'yahoo', outcome: 'rate_limited', statusCode: 429, durationMs: 0,
  });
});

test('upstream 5xx is classified as provider error with status and no retry', async () => {
  let calls = 0;
  const events = [];
  const result = await searchShoppingProviders(watch, {
    env: { MIKKE_YAHOO_ENABLED: 'true', YAHOO_APP_ID: 'y-app' },
    logger: { provider: (event) => events.push({ ...event, durationMs: 0 }) },
    fetchImpl: async () => {
      calls += 1;
      return { ok: false, status: 503, json: async () => ({}) };
    },
  });

  assert.equal(calls, 1);
  assert.equal(result.providers[1].status, 'error');
  assert.equal(events.find((event) => event.provider === 'yahoo').statusCode, 503);
});
