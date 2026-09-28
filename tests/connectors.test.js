import test from 'node:test';
import assert from 'node:assert/strict';
import { runWatchCheck } from '../src/connectors/runWatchCheck.js';
import { searchOfficialShopping } from '../src/connectors/officialShopping.js';

test('shopping check returns evaluated candidates sorted by score then price', async () => {
  const watch = { id:'w1', type:'shopping', title:'996', rawQuery:'New Balance 996、24.5cm、グレー、1万円以下', conditions:{ maxPrice:10000, size:'24.5cm', colors:['グレー'] }, requiredKeys:['maxPrice','size'], preferredKeys:['colors'], createdAt:new Date().toISOString() };
  const result = await runWatchCheck(watch);
  assert.equal(result.candidates.length > 0, true);
  assert.equal(result.candidates[0].evaluation.score >= result.candidates.at(-1).evaluation.score, true);
  assert.equal(result.events.some((event) => event.kind === 'condition_match'), true);
});

test('unsupported connector type returns a clear empty state instead of throwing', async () => {
  const watch = { id:'f1', type:'flight', title:'Tokyo Honolulu', rawQuery:'', conditions:{}, requiredKeys:[], preferredKeys:[], createdAt:new Date().toISOString() };
  const result = await runWatchCheck(watch);
  assert.deepEqual(result.candidates, []);
  assert.equal(result.status, 'connector_pending');
});

test('official shopping connector posts the watch to the same-origin API', async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ items: [{ id:'yahoo:x', title:'NB 996', price:9000, available:true, attributes:{} }], providers:[{ name:'yahoo', status:'ok' }] }) };
  };
  const result = await searchOfficialShopping({ type:'shopping', rawQuery:'NB 996', conditions:{} }, fetchImpl);
  assert.equal(request.url, '/api/shopping-search');
  assert.equal(request.options.method, 'POST');
  assert.equal(JSON.parse(request.options.body).watch.rawQuery, 'NB 996');
  assert.equal(result.mode, 'official');
  assert.equal(result.items.length, 1);
});

test('official connector returns unavailable without throwing when the API route is absent', async () => {
  const result = await searchOfficialShopping({ type:'shopping', rawQuery:'NB 996', conditions:{} }, async () => ({ ok:false, status:404 }));
  assert.equal(result.mode, 'unavailable');
  assert.deepEqual(result.items, []);
});
