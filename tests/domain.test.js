import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWatchQuery } from '../src/domain/parseWatch.js';
import { evaluateCandidate, deriveEvents } from '../src/domain/evaluate.js';

test('parses shopping price, size and color without inventing conditions', () => {
  const draft = parseWatchQuery('New Balance 996、24.5cm、グレー、1万円以下');
  assert.equal(draft.type, 'shopping');
  assert.equal(draft.conditions.maxPrice, 10000);
  assert.equal(draft.conditions.size, '24.5cm');
  assert.deepEqual(draft.conditions.colors, ['グレー']);
  assert.equal(draft.conditions.directOnly, undefined);
});

test('parses flight intent into a flight watch', () => {
  const draft = parseWatchQuery('東京からホノルル、直行便、往復10万円以下');
  assert.equal(draft.type, 'flight');
  assert.equal(draft.conditions.origin, '東京');
  assert.equal(draft.conditions.destination, 'ホノルル');
  assert.equal(draft.conditions.maxPrice, 100000);
  assert.equal(draft.conditions.directOnly, true);
});

test('missing candidate attributes never count as a hard-condition match', () => {
  const watch = { id:'w1', type:'shopping', title:'996', rawQuery:'', conditions:{ maxPrice:10000, size:'24.5cm', colors:['グレー'] }, requiredKeys:['maxPrice','size'], preferredKeys:['colors'], createdAt:'2026-09-29T00:00:00.000Z' };
  const evaluation = evaluateCandidate(watch, { id:'c1', source:'sample', title:'996', price:9800, attributes:{ color:'グレー' }, url:'#' });
  assert.equal(evaluation.requiredMatch, false);
  assert.equal(evaluation.score < 100, true);
});

test('condition match event is emitted only on transition', () => {
  const evaluation = { requiredMatch:true, score:100, reasons:[] };
  const current = { candidateId:'c1', price:9800, available:true, observedAt:'2026-09-29T00:01:00.000Z' };
  assert.equal(deriveEvents(undefined, current, evaluation).some((event) => event.kind === 'condition_match'), true);
  const previous = { ...current, observedAt:'2026-09-29T00:00:00.000Z' };
  assert.equal(deriveEvents(previous, current, evaluation).some((event) => event.kind === 'condition_match'), false);
});
