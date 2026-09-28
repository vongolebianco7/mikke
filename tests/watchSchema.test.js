import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCondition, normalizeTrigger, normalizeGenericWatch } from '../src/domain/watchSchema.js';

test('normalizes generic conditions and triggers without semantic changes', () => {
  const watch = normalizeGenericWatch({
    target: { categoryId: 'appliances', title: '冷蔵庫' },
    genericConditions: [
      { id: 'c1', attributeId: 'capacity', operator: 'gte', value: 500, unit: 'L', role: 'required', source: 'category' },
    ],
    triggers: [
      { id: 't1', metric: 'price', operator: 'lte', value: 150000, unit: 'JPY', reference: 'current', scope: 'best_match', role: 'notification' },
    ],
    metadata: { rawQuery: '冷蔵庫、500L以上、15万円以下', inputMode: 'text' },
  });

  assert.equal(watch.schemaVersion, 2);
  assert.equal(watch.target.categoryId, 'appliances');
  assert.deepEqual(watch.genericConditions[0], {
    id: 'c1', attributeId: 'capacity', operator: 'gte', value: 500, unit: 'L', role: 'required', source: 'category',
  });
  assert.deepEqual(watch.triggers[0], {
    id: 't1', metric: 'price', operator: 'lte', value: 150000, unit: 'JPY', reference: 'current', scope: 'best_match', role: 'notification',
  });
});

test('malformed arrays normalize to empty arrays instead of throwing', () => {
  const watch = normalizeGenericWatch({ genericConditions: 'bad', triggers: {}, metadata: null, target: null });
  assert.deepEqual(watch.genericConditions, []);
  assert.deepEqual(watch.triggers, []);
  assert.deepEqual(watch.target, {});
  assert.deepEqual(watch.metadata, {});
});

test('condition and trigger helpers drop unsupported role defaults safely', () => {
  assert.deepEqual(normalizeCondition({ attributeId: 'color', operator: 'in', value: ['gray'] }), {
    attributeId: 'color', operator: 'in', value: ['gray'], unit: undefined, role: 'preferred', source: 'custom', id: undefined,
  });
  assert.deepEqual(normalizeTrigger({ metric: 'availability', operator: 'changed_to', value: 'in_stock' }), {
    metric: 'availability', operator: 'changed_to', value: 'in_stock', unit: undefined, reference: 'current', scope: 'candidate', role: 'notification', id: undefined,
  });
});
