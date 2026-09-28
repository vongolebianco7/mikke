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
    method: 'POST',
    body: { watch: { type: 'shopping', rawQuery: 'New Balance 996', conditions: {} } },
  }, res, {
    env: { RAKUTEN_APPLICATION_ID: 'secret-app', RAKUTEN_ACCESS_KEY: 'secret-key', YAHOO_APP_ID: 'secret-yahoo' },
    fetchImpl: async (url) => ({ ok: true, json: async () => url.includes('rakuten') ? { items: [] } : { hits: [] } }),
  });
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.stringify(res.payload).includes('secret-'), false);
  assert.equal(res.headers['Cache-Control'], 'no-store');
});
