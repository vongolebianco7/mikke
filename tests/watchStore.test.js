import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWatch } from '../src/domain/normalizeWatch.js';

test('legacy required max price becomes a required generic price condition', () => {
  const watch = normalizeWatch({
    type: 'shopping',
    title: '冷蔵庫',
    rawQuery: '冷蔵庫、15万円以下',
    conditions: { maxPrice: 150000, attributes: {}, priceTriggers: [], stateTriggers: [] },
    requiredKeys: ['maxPrice'],
    preferredKeys: [],
  });
  assert.equal(watch.schemaVersion, 2);
  assert.ok(watch.genericConditions.some((c) => c.attributeId === 'price' && c.operator === 'lte' && c.value === 150000 && c.role === 'required'));
});

test('legacy notification max price becomes a generic notification trigger', () => {
  const watch = normalizeWatch({
    type: 'shopping',
    title: '996',
    conditions: { maxPrice: 10000, attributes: {}, priceTriggers: [{ type: 'below_absolute', value: 10000, reference: 'explicit', role: 'notification' }], stateTriggers: [] },
    requiredKeys: [],
    preferredKeys: [],
  });
  assert.ok(watch.triggers.some((t) => t.metric === 'price' && t.operator === 'lte' && t.value === 10000 && t.role === 'notification'));
});

test('legacy size colors and excludeUsed preserve required/preferred semantics', () => {
  const watch = normalizeWatch({
    conditions: { size: '24.5cm', colors: ['グレー'], excludeUsed: true },
    requiredKeys: ['size', 'excludeUsed'],
    preferredKeys: ['colors'],
  });
  const byId = Object.fromEntries(watch.genericConditions.map((c) => [c.attributeId, c]));
  assert.equal(byId.size.role, 'required');
  assert.equal(byId.color.role, 'preferred');
  assert.equal(byId.condition.role, 'required');
  assert.equal(byId.condition.operator, 'eq');
  assert.equal(byId.condition.value, 'new');
});

test('legacy price trigger variants become generic trigger objects', () => {
  const watch = normalizeWatch({
    conditions: {
      priceTriggers: [
        { type: 'below_previous', reference: 'previous', role: 'notification' },
        { type: 'drop_percent', percent: 10, reference: 'initial', role: 'notification' },
        { type: 'new_watch_low', reference: 'observed_watch', role: 'notification' },
      ],
    },
  });
  assert.ok(watch.triggers.some((t) => t.metric === 'price' && t.operator === 'lt' && t.reference === 'previous_observation'));
  assert.ok(watch.triggers.some((t) => t.metric === 'discount_percent' && t.operator === 'gte' && t.value === 10 && t.reference === 'initial_observation'));
  assert.ok(watch.triggers.some((t) => t.metric === 'price' && t.operator === 'lt' && t.reference === 'watch_low'));
});
