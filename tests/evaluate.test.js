import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveEvents } from '../src/domain/evaluate.js';

const matched = { requiredMatch: true, score: 100, reasons: [], nearMatch:false };

function current(price) {
  return { candidateId: 'c1', price, available: true, observedAt: '2026-09-29T00:10:00.000Z' };
}

test('emits observed previous-price and percentage-drop events only when thresholds are met', () => {
  const events = deriveEvents(
    { candidateId: 'c1', price: 12000, available: true, observedAt: '2026-09-29T00:00:00.000Z' },
    current(10000),
    matched,
    { priceTriggers: [{ type: 'below_previous' }, { type: 'drop_percent', percent: 10, reference: 'previous' }] },
  );
  assert.ok(events.some((event) => event.kind === 'price_drop' && event.delta === 2000));
  assert.ok(events.some((event) => event.kind === 'percent_drop' && event.percent === 17 && event.reference === 'previous'));
});

test('percentage drop can explicitly use the initial Mikke-observed price', () => {
  const events=deriveEvents(
    {candidateId:'c1',price:11500,available:true,observedAt:'t2'},
    current(10000),
    matched,
    {priceTriggers:[{type:'drop_percent',percent:20,reference:'initial'}],initialPrice:13000},
  );
  assert.ok(events.some(event=>event.kind==='percent_drop'&&event.percent===23&&event.reference==='initial'&&event.referencePrice===13000));
});

test('emits initial-price trigger evidence from Mikke-observed baseline', () => {
  const events = deriveEvents(
    { candidateId: 'c1', price: 10500, available: true, observedAt: '2026-09-29T00:05:00.000Z' },
    current(9900),
    matched,
    { priceTriggers: [{ type: 'below_initial' }], initialPrice: 11000 },
  );
  assert.ok(events.some((event) => event.kind === 'initial_price_drop' && event.referencePrice === 11000 && event.currentPrice === 9900));
});

test('emits target reached and Watch low using explicit and observed evidence only', () => {
  const events = deriveEvents(
    { candidateId: 'c1', price: 10200, available: true, observedAt: '2026-09-29T00:05:00.000Z' },
    current(9800),
    matched,
    {
      priceTriggers: [{ type: 'below_absolute', value: 10000 }, { type: 'new_watch_low' }],
      observedLow: 9900,
    },
  );
  assert.ok(events.some((event) => event.kind === 'target_price_reached' && event.targetPrice === 10000));
  assert.ok(events.some((event) => event.kind === 'watch_low' && event.previousLow === 9900 && event.currentPrice === 9800));
});

test('near match is emitted only when entering a conservative near-match state',()=>{
  const near={requiredMatch:false,score:75,reasons:[],nearMatch:true,failedRequired:['colors']};
  const first=deriveEvents(undefined,current(10000),near,{});
  assert.ok(first.some(event=>event.kind==='near_match'&&event.failedRequired[0]==='colors'));
  const repeat=deriveEvents({candidateId:'c1',price:10500,available:true,nearMatch:true},current(10000),near,{});
  assert.ok(!repeat.some(event=>event.kind==='near_match'));
});

test('first observation or missing numeric history never fabricates relative-price events', () => {
  const events = deriveEvents(undefined, current(9800), matched, {
    priceTriggers: [{ type: 'below_previous' }, { type: 'below_initial' }, { type: 'drop_percent', percent: 10 }, { type: 'new_watch_low' }],
    initialPrice: undefined,
    observedLow: undefined,
  });
  assert.ok(!events.some((event) => ['price_drop', 'percent_drop', 'initial_price_drop', 'watch_low'].includes(event.kind)));
});
