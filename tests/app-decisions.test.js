import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');

test('result UI exposes local decision actions and learned suggestions',()=>{
  assert.match(app,/recordDecision/);
  assert.match(app,/suggestLearnedPriceTrigger/);
  assert.match(app,/data-decision/);
  assert.match(app,/買う/);
  assert.match(app,/もう少し待つ/);
  assert.match(app,/条件変更/);
  assert.match(app,/監視終了/);
});

test('Today integrates conservative product grouping and provider offers',()=>{
  assert.match(app,/groupProducts/);
  assert.match(app,/offers/);
  assert.match(app,/ショップ別/);
});
