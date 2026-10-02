import test from 'node:test';
import assert from 'node:assert/strict';
import { createComposerDraftStore } from '../src/domain/composerDraftStore.js';

function condition(id, attributeId, value, extra = {}) {
  return { id, attributeId, operator: 'eq', value, role: 'required', supportState: 'supported', source: 'manual', manuallyEdited: true, ...extra };
}

test('upsert keeps an existing condition id stable', () => {
  const store = createComposerDraftStore({ conditions: [condition('c1', 'color', 'gray')] });
  store.upsertCondition({ attributeId: 'color', operator: 'eq', value: 'black', role: 'required' });
  const draft = store.getDraft();
  assert.equal(draft.conditions.length, 1);
  assert.equal(draft.conditions[0].id, 'c1');
  assert.equal(draft.conditions[0].value, 'black');
});

test('role change does not recreate a condition', () => {
  const store = createComposerDraftStore({ conditions: [condition('c1', 'color', 'gray')] });
  store.setConditionRole('c1', 'preferred');
  const [updated] = store.getDraft().conditions;
  assert.equal(updated.id, 'c1');
  assert.equal(updated.role, 'preferred');
});

test('removes conditions and preserves unresolved fragments', () => {
  const store = createComposerDraftStore({
    conditions: [condition('c1', 'color', 'gray'), condition('c2', 'size', '24.5cm')],
    unresolved: [{ id: 'u1', text: '安っぽくない', state: 'unresolved' }],
  });
  store.removeCondition('c1');
  assert.deepEqual(store.getDraft().conditions.map((item) => item.id), ['c2']);
  assert.equal(store.getDraft().unresolved[0].text, '安っぽくない');
});

test('category changes preserve existing conditions', () => {
  const store = createComposerDraftStore({ categoryId: 'fashion', conditions: [condition('c1', 'color', 'gray')] });
  store.setCategory({ domain: 'electronics', categoryId: 'smartphone' });
  const draft = store.getDraft();
  assert.equal(draft.domain, 'electronics');
  assert.equal(draft.categoryId, 'smartphone');
  assert.equal(draft.conditions[0].id, 'c1');
});

test('validate reports contradictory required conditions', () => {
  const store = createComposerDraftStore({ conditions: [
    condition('min', 'price', 20000, { operator: 'gte' }),
    condition('max', 'price', 10000, { operator: 'lte' }),
  ] });
  const validation = store.validate();
  assert.equal(validation.saveable, false);
  assert.equal(validation.conflicts.length, 1);
  assert.equal(validation.conflicts[0].attributeId, 'price');
});

test('stores 20+ conditions without truncation and returns immutable snapshots', () => {
  const conditions = Array.from({ length: 24 }, (_, index) => condition(`c${index}`, `attr${index}`, index));
  const store = createComposerDraftStore({ conditions });
  const snapshot = store.getDraft();
  assert.equal(snapshot.conditions.length, 24);
  snapshot.conditions.pop();
  assert.equal(store.getDraft().conditions.length, 24);
});
