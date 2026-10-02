import test from 'node:test';
import assert from 'node:assert/strict';
import { createComposerDraftStore } from '../src/domain/composerDraftStore.js';

function condition(id, attributeId, operator, value, role = 'required') {
  return { id, attributeId, operator, value, role, supportState: 'confirmed', source: 'manual', manuallyEdited: false };
}

test('upsert preserves stable id for the same attribute', () => {
  const store = createComposerDraftStore({ conditions: [condition('c1', 'color', 'one_of', ['white'])] });
  store.upsertCondition(condition('new-id', 'color', 'one_of', ['black']));
  const [saved] = store.getDraft().conditions;
  assert.equal(saved.id, 'c1');
  assert.deepEqual(saved.value, ['black']);
});

test('search condition and change condition can coexist for the same attribute', () => {
  const store = createComposerDraftStore({ conditions: [condition('hard-price', 'price', 'lte', 10000, 'required')] });
  store.upsertCondition(condition('change-price', 'price', 'relative_change', undefined, 'change'));
  const prices = store.getDraft().conditions.filter((item) => item.attributeId === 'price');
  assert.equal(prices.length, 2);
  assert.ok(prices.some((item) => item.role === 'required'));
  assert.ok(prices.some((item) => item.role === 'change'));
});

test('role change does not recreate the condition', () => {
  const store = createComposerDraftStore({ conditions: [condition('c1', 'color', 'eq', 'white')] });
  store.setConditionRole('c1', 'preferred');
  const [saved] = store.getDraft().conditions;
  assert.equal(saved.id, 'c1');
  assert.equal(saved.role, 'preferred');
  assert.equal(saved.manuallyEdited, true);
});

test('remove condition deletes only the requested id', () => {
  const store = createComposerDraftStore({ conditions: [condition('a', 'color', 'eq', 'white'), condition('b', 'size', 'eq', '24.5cm')] });
  store.removeCondition('a');
  assert.deepEqual(store.getDraft().conditions.map((item) => item.id), ['b']);
});

test('unresolved fragments are preserved and individually removable', () => {
  const store = createComposerDraftStore();
  store.setUnresolved([{ id: 'u1', text: '安っぽくない', state: 'unresolved' }, { id: 'u2', text: 'バッテリー大きめ', state: 'needs_review' }]);
  store.removeUnresolved('u1');
  assert.deepEqual(store.getDraft().unresolvedFragments.map((item) => item.id), ['u2']);
});

test('category changes preserve conditions instead of truncating them', () => {
  const store = createComposerDraftStore({ domain: 'appliance', categoryId: 'refrigerator', conditions: [condition('c1', 'width', 'lte', 680)] });
  store.setCategory({ domain: 'appliance', categoryId: 'washing_machine' });
  assert.equal(store.getDraft().conditions.length, 1);
  assert.equal(store.getDraft().categoryId, 'washing_machine');
});

test('validate reports contradictory required bounds on the same attribute', () => {
  const store = createComposerDraftStore({ conditions: [
    condition('min', 'price', 'gte', 20000),
    condition('max', 'price', 'lte', 10000),
  ] });
  const validation = store.validate();
  assert.equal(validation.saveable, false);
  assert.equal(validation.conflicts.length, 1);
  assert.equal(validation.conflicts[0].attributeId, 'price');
});

test('store keeps 20+ conditions without truncation and returns isolated snapshots', () => {
  const conditions = Array.from({ length: 25 }, (_, index) => condition(`c${index}`, `attr${index}`, 'eq', index));
  const store = createComposerDraftStore({ conditions });
  const snapshot = store.getDraft();
  assert.equal(snapshot.conditions.length, 25);
  snapshot.conditions.pop();
  assert.equal(store.getDraft().conditions.length, 25);
});
