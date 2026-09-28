import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');

test('composer exposes estimated strictness without claiming market availability',()=>{
  assert.match(app,/estimateStrictness/);
  assert.match(app,/推定/);
});

test('Today uses actionable prioritization and exposes relaxation proposals without auto applying them',()=>{
  assert.match(app,/prioritizeToday/);
  assert.match(app,/suggestRelaxations/);
  assert.match(app,/条件を緩める提案/);
  assert.match(app,/data-relaxation/);
});
