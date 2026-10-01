import test from 'node:test';
import assert from 'node:assert/strict';
import { tryAppendCheckHistory } from '../src/domain/historyStore.js';
import { tryRecordDecision } from '../src/domain/decisionStore.js';

const failingStorage = {
  getItem(){ return null; },
  setItem(){ throw new DOMException('quota', 'QuotaExceededError'); },
};

test('history persistence failure returns explicit safe result without throwing', () => {
  const result = tryAppendCheckHistory(failingStorage, 'w1', {
    candidates: [{ observation: { candidateId: 'c1', price: 1000 } }],
    events: [],
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'storage_unavailable');
  assert.equal(result.history.w1.observations.length, 1);
});

test('decision persistence failure returns explicit safe result without throwing', () => {
  const result = tryRecordDecision(failingStorage, 'w1', {
    type: 'wait', candidateId: 'c1', price: 1000,
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'storage_unavailable');
  assert.equal(result.state.w1.length, 1);
});
