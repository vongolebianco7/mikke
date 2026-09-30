import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(new URL('../src/watchListUi.js',import.meta.url),'utf8');

test('saved watch cards use one shared hierarchy for subject, conditions and notification',()=>{
  assert.match(source,/watch-card-subject/);
  assert.match(source,/watch-card-conditions/);
  assert.match(source,/watch-card-notification/);
  assert.match(source,/summarizeWatchCard/);
  assert.doesNotMatch(source,/rawQuery/);
});
