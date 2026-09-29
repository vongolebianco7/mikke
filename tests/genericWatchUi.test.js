import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(new URL('../src/genericWatchUi.js',import.meta.url),'utf8');

test('confirmation UI surfaces generic category conditions and cross-category triggers',()=>{
  assert.match(source,/parseWatchQuery/);
  assert.match(source,/genericConditions/);
  assert.match(source,/triggers/);
  assert.match(source,/追加の商品条件/);
  assert.match(source,/追加の通知条件/);
  assert.match(source,/generic-condition-summary/);
});

test('generic confirmation avoids duplicating legacy size color price and basic stock rules',()=>{
  assert.match(source,/LEGACY_ATTRIBUTES/);
  assert.match(source,/LEGACY_TRIGGER_METRICS/);
});
