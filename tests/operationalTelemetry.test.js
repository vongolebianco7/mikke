import test from 'node:test';
import assert from 'node:assert/strict';
import { createOperationalLogger } from '../src/server/operationalTelemetry.js';

test('operational telemetry emits only approved metadata fields', () => {
  const events = [];
  const logger = createOperationalLogger({
    sink: (event) => events.push(event),
    now: () => 1_700_000_000_000,
  });

  logger.api({
    route: '/api/shopping-search',
    outcome: 'server_error',
    statusCode: 500,
    durationMs: 123,
    rawQuery: 'New Balance 996 24.5cm',
    url: 'https://example.invalid/?appid=secret-yahoo&query=private',
    accessKey: 'secret-rakuten',
  });

  assert.deepEqual(events, [{
    timestamp: '2023-11-14T22:13:20.000Z',
    kind: 'api',
    route: '/api/shopping-search',
    outcome: 'server_error',
    statusCode: 500,
    durationMs: 123,
  }]);
  assert.equal(JSON.stringify(events).includes('New Balance'), false);
  assert.equal(JSON.stringify(events).includes('secret-'), false);
  assert.equal(JSON.stringify(events).includes('example.invalid'), false);
});

test('provider telemetry keeps provider outcome and duration without provider request data', () => {
  const events = [];
  const logger = createOperationalLogger({ sink: (event) => events.push(event), now: () => 0 });

  logger.provider({
    provider: 'rakuten',
    outcome: 'error',
    statusCode: 503,
    durationMs: 5010,
    rawQuery: 'secret search phrase',
    requestUrl: 'https://openapi.rakuten.co.jp/?applicationId=secret-app',
  });

  assert.deepEqual(events, [{
    timestamp: '1970-01-01T00:00:00.000Z',
    kind: 'provider',
    provider: 'rakuten',
    outcome: 'error',
    statusCode: 503,
    durationMs: 5010,
  }]);
});
