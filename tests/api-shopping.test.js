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

test('shopping API validates a shopping watch before provider access', async () => {
  const res = responseRecorder();
  await handler({ method: 'POST', body: { watch: { type: 'flight', rawQuery: '東京 ホノルル' } } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.error, 'invalid_watch');
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

test('rate-limited shopping request returns 429 and never calls upstream provider', async () => {
  const res = responseRecorder();
  let calls = 0;
  await handler({
    method: 'POST', headers: { 'x-forwarded-for': '203.0.113.11' },
    body: { watch: { type: 'shopping', rawQuery: 'New Balance 996', conditions: {} } },
  }, res, {
    rateLimiter: { check: () => ({ allowed: false, retryAfter: 7 }) },
    fetchImpl: async () => { calls += 1; throw new Error('must not be called'); },
  });
  assert.equal(res.statusCode, 429);
  assert.equal(res.headers['Retry-After'], '7');
  assert.equal(res.payload.error, 'rate_limited');
  assert.equal(calls, 0);
});
