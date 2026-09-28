import test from 'node:test';
import assert from 'node:assert/strict';
import { MIKKE_LOCAL_KEYS, clearMikkeLocalData } from '../src/domain/localData.js';

function storage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return { getItem:k=>map.has(k)?map.get(k):null, setItem:(k,v)=>map.set(k,String(v)), removeItem:k=>map.delete(k), keys:()=>[...map.keys()] };
}

test('clears only Mikke-owned local storage keys', () => {
  const s = storage({ 'mikke.watches.v1':'[]', 'mikke.history.v1':'{}', other:'keep' });
  const result = clearMikkeLocalData(s);
  assert.deepEqual(result.cleared.sort(), [...MIKKE_LOCAL_KEYS].sort());
  assert.equal(s.getItem('mikke.watches.v1'), null);
  assert.equal(s.getItem('mikke.history.v1'), null);
  assert.equal(s.getItem('other'), 'keep');
});
