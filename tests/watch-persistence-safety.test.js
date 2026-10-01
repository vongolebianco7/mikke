import test from 'node:test';
import assert from 'node:assert/strict';
import { saveWatches } from '../src/domain/watchStore.js';

test('saveWatches returns ok on successful browser storage write', () => {
  const writes = [];
  const result = saveWatches({ setItem: (...args) => writes.push(args) }, [{ id: 'w1' }]);
  assert.deepEqual(result, { ok: true });
  assert.equal(writes.length, 1);
});

test('saveWatches converts quota/private-mode storage errors into an explicit safe result', () => {
  const storage = { setItem() { throw new DOMException('quota', 'QuotaExceededError'); } };
  const result = saveWatches(storage, [{ id: 'w1' }]);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'storage_unavailable');
  assert.equal('error' in result, false);
});
