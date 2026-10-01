import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/shopping-search.js';

function responseRecorder() {
  return {
    statusCode: 200, headers: {}, payload: undefined,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.payload = value; return this; },
  };
}

test('shopping API rejects non-POST methods without contacting providers', async () => {
  const res = responseRecorder();
  await handler({ method: 'GET' }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.payload.error, 'method_not_allowed');
});

test('shopping API sends defensive response headers on every response', async () => {
  const res = responseRecorder();
  await handler({ method: 'GET' }, res);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.equal(res.headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(res.headers['Referrer-Policy'], 'no-referrer');
});

test('shopping API validates a shopping watch before provider access', async () => {
  const res = responseRecorder();
  await handler({ method: 'POST', body: { watch: { type: 'flight', rawQuery: '東京 ホノルル' } } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.error, 'invalid_watch');
});

test('shopping API rejects pathological structured conditions before provider access', async () => {
  const res = responseRecorder();
  let calls = 0;
  const deep = {};
  let cursor = deep;
  for (let i = 0; i < 12; i += 1) {
    cursor.next = {};
    cursor = cursor.next;
  }

  await handler({
    method: 'POST', headers: { 'x-forwarded-for': '203.0.113.12' },
    body: { watch: { type: 'shopping', rawQuery: 'test', conditions: deep } },
  }, res, {
    searchProviders: async () => { calls += 1; return { items: [], providers: [] }; },
  });

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.error, 'invalid_watch');
  assert.equal(calls, 0);
});

test('shopping API rejects oversized structured conditions before provider access', async () => {
  const res = responseRecorder();
  let calls = 0;
  const oversized = { note: 'x'.repeat(20 * 1024) };
  await handler({
    method: 'POST', headers: { 'x-forwarded-for': '203.0.113.14' },
    body: { watch: { type: 'shopping', rawQuery: 'test', conditions: oversized } },
  }, res, {
    searchProviders: async () => { calls += 1; return { items: [], providers: [] }; },
  });
  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.error, 'invalid_watch');
  assert.equal(calls, 0);
});

test('shopping API never exposes provider credentials in its response', async () => {
  const res = responseRecorder();
  await handler({
    method: 'POST', headers: { 'x-forwarded-for': '203.0.113.10' },
    body: { watch: { type: 'shopping', rawQuery: 'New Balance 996', conditions: {} } },
  }, res, {
    env: { RAKUTEN_APPLICATION_ID: 'secret-app', RAKUTEN_ACCESS_KEY: 'secret-key', YAHOO_APP_ID: 'secret-yahoo' },
    fetchImpl: async (url) => ({ ok: true, json: async () => url.includes('rakuten') ? { items: [] } : { hits: [] } }),
  });
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.stringify(res.payload).includes('secret-'), false);
  assert.equal(res.headers['Cache-Control'], 'no-store');
});

test('rate-limited shopping request returns 429, emits safe telemetry, and never calls upstream provider', async () => {
  const res = responseRecorder();
  let calls = 0;
  const events = [];
  const logger = { api: (event) => events.push(event), provider: () => {} };
  const rawQuery = 'private rate limited search';
  await handler({
    method: 'POST', headers: { 'x-forwarded-for': '203.0.113.11' },
    body: { watch: { type: 'shopping', rawQuery, conditions: {} } },
  }, res, {
    logger,
    rateLimiter: { check: () => ({ allowed: false, retryAfter: 7 }) },
    fetchImpl: async () => { calls += 1; throw new Error('must not be called'); },
  });
  assert.equal(res.statusCode, 429);
  assert.equal(res.headers['Retry-After'], '7');
  assert.equal(res.payload.error, 'rate_limited');
  assert.equal(calls, 0);
  assert.equal(events.at(-1).outcome, 'rate_limited');
  assert.equal(events.at(-1).statusCode, 429);
  assert.equal(JSON.stringify(events).includes(rawQuery), false);
});

test('unexpected server failure becomes controlled 500 and sanitized telemetry', async () => {
  const res = responseRecorder();
  const events = [];
  const logger = { api: (event) => events.push(event), provider: () => {} };
  const rawQuery = 'private search phrase';

  await handler({
    method: 'POST', headers: { 'x-forwarded-for': '203.0.113.13' },
    body: { watch: { type: 'shopping', rawQuery, conditions: {} } },
  }, res, {
    logger,
    searchProviders: async () => { throw new Error('secret-stack-value'); },
  });

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.payload, { error: 'internal_error' });
  assert.equal(JSON.stringify(res.payload).includes('secret-stack-value'), false);
  assert.equal(JSON.stringify(events).includes(rawQuery), false);
  assert.equal(events.at(-1).route, '/api/shopping-search');
  assert.equal(events.at(-1).outcome, 'server_error');
  assert.equal(events.at(-1).statusCode, 500);
});
