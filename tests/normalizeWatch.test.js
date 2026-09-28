import test from 'node:test';
import assert from 'node:assert/strict';
import { loadWatches } from '../src/domain/watchStore.js';

function storageWith(value) {
  return { getItem: () => JSON.stringify(value) };
}

test('loadWatches normalizes a legacy maxPrice Watch without changing its meaning', () => {
  const [watch] = loadWatches(storageWith([{
    id: 'legacy-1',
    type: 'shopping',
    title: 'NB 996',
    rawQuery: 'NB 996、24.5cm、1万円以下',
    conditions: { maxPrice: 10000, size: '24.5cm' },
    requiredKeys: ['maxPrice', 'size'],
    preferredKeys: [],
  }]));

  assert.equal(watch.conditions.maxPrice, 10000);
  assert.equal(watch.conditions.attributes.size, '24.5cm');
  assert.deepEqual(watch.conditions.priceTriggers, [
    { type: 'below_absolute', value: 10000, reference: 'explicit', role: 'required' },
  ]);
  assert.deepEqual(watch.conditions.stateTriggers, []);
  assert.deepEqual(watch.requiredKeys, ['maxPrice', 'size']);
  assert.deepEqual(watch.preferredKeys, []);
});

test('loadWatches supplies safe intelligence defaults without discarding legacy fields', () => {
  const [watch] = loadWatches(storageWith([{
    id: 'legacy-2',
    type: 'shopping',
    conditions: { colors: ['グレー'] },
    requiredKeys: [],
    preferredKeys: ['colors'],
    customLegacyField: 'keep-me',
  }]));

  assert.deepEqual(watch.conditions.attributes.colors, ['グレー']);
  assert.deepEqual(watch.conditions.priceTriggers, []);
  assert.deepEqual(watch.conditions.stateTriggers, []);
  assert.deepEqual(watch.baseline, { initialObservedAt: null, initialPriceByCandidate: {} });
  assert.deepEqual(watch.behavior, { decisionHistory: [] });
  assert.equal(watch.customLegacyField, 'keep-me');
  assert.deepEqual(watch.preferredKeys, ['colors']);
});
