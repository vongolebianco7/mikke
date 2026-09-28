import test from 'node:test';
import assert from 'node:assert/strict';
import { runWatchCheck } from '../src/connectors/runWatchCheck.js';

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
