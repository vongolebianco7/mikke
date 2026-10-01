import test from 'node:test';
import assert from 'node:assert/strict';
import { createAlertEvaluator } from '../src/server/alertEvaluator.js';

function api(statusCode, at) {
  return { kind: 'api', statusCode, timestamp: new Date(at).toISOString() };
}
function provider(provider, outcome, at) {
  return { kind: 'provider', provider, outcome, timestamp: new Date(at).toISOString() };
}

test('5xx alerts only at >=5 errors and >=5 percent in five minutes', () => {
  const now = Date.parse('2026-10-01T00:05:00Z');
  const evaluator = createAlertEvaluator({ now: () => now });
  const events = [
    ...Array.from({ length: 95 }, (_, i) => api(200, now - i * 1000)),
    ...Array.from({ length: 5 }, (_, i) => api(500, now - i * 1000)),
  ];
  const alerts = evaluator.evaluate(events);
  assert.equal(alerts.some((a) => a.incidentKey === 'api:5xx' && a.severity === 'CRITICAL'), true);
});

test('429 alerts at >=5 events even when ratio is below 10 percent', () => {
  const now = Date.parse('2026-10-01T00:05:00Z');
  const evaluator = createAlertEvaluator({ now: () => now });
  const events = [
    ...Array.from({ length: 100 }, (_, i) => api(200, now - i * 1000)),
    ...Array.from({ length: 5 }, (_, i) => api(429, now - i * 1000)),
  ];
  const alerts = evaluator.evaluate(events);
  assert.equal(alerts.some((a) => a.incidentKey === 'api:429'), true);
});

test('provider consecutive failures warn at 3 and become critical at 5', () => {
  const now = Date.parse('2026-10-01T00:05:00Z');
  const warn = createAlertEvaluator({ now: () => now }).evaluate([
    provider('yahoo', 'error', now - 3000),
    provider('yahoo', 'error', now - 2000),
    provider('yahoo', 'error', now - 1000),
  ]);
  assert.equal(warn.find((a) => a.incidentKey === 'provider:yahoo')?.severity, 'WARN');

  const critical = createAlertEvaluator({ now: () => now }).evaluate([
    provider('yahoo', 'error', now - 5000),
    provider('yahoo', 'error', now - 4000),
    provider('yahoo', 'error', now - 3000),
    provider('yahoo', 'rate_limited', now - 2000),
    provider('yahoo', 'error', now - 1000),
  ]);
  assert.equal(critical.find((a) => a.incidentKey === 'provider:yahoo')?.severity, 'CRITICAL');
});

test('duplicate incidents are suppressed for 30 minutes', () => {
  let now = Date.parse('2026-10-01T00:05:00Z');
  const evaluator = createAlertEvaluator({ now: () => now });
  const events = Array.from({ length: 5 }, (_, i) => api(500, now - i * 1000));
  assert.equal(evaluator.evaluate(events).length, 1);
  assert.equal(evaluator.evaluate(events).length, 0);
  now += 30 * 60 * 1000;
  assert.equal(evaluator.evaluate(events.map((e) => ({ ...e, timestamp: new Date(now).toISOString() }))).length, 1);
});
