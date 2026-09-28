import test from 'node:test';
import assert from 'node:assert/strict';
import { createWatchRecord, loadWatches, saveWatches } from '../src/domain/watchStore.js';

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
}

test('createWatchRecord creates a stable watch shape from a parsed draft', () => {
  const record = createWatchRecord({ type:'shopping', title:'996', rawQuery:'996', conditions:{ maxPrice:10000 }, requiredKeys:['maxPrice'], preferredKeys:[] }, 'watch-fixed');
  assert.equal(record.id, 'watch-fixed');
  assert.equal(record.status, 'watching');
  assert.equal(record.conditions.maxPrice, 10000);
});

test('save and load watches survives malformed storage by returning an empty list', () => {
  const storage = memoryStorage();
  saveWatches(storage, [{ id:'w1' }]);
  assert.deepEqual(loadWatches(storage), [{ id:'w1' }]);
  storage.setItem('mikke.watches.v1', '{broken');
  assert.deepEqual(loadWatches(storage), []);
});
