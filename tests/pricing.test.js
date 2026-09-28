import test from 'node:test';
import assert from 'node:assert/strict';
import { displayPriceModel } from '../src/domain/pricing.js';

test('live item without documented reference price does not show discount claims', () => {
  assert.deepEqual(displayPriceModel({ price: 9800, previousPrice: 12800, dataMode: 'live' }), {
    currentPrice: 9800, referencePrice: null, percentOff: null,
    note: '最終価格・在庫は販売ページで確認してください',
  });
});

test('sample item may show explicitly defined sample reference price', () => {
  const model = displayPriceModel({ price: 8000, previousPrice: 10000, dataMode: 'sample', referencePriceDefined: true });
  assert.equal(model.referencePrice, 10000);
  assert.equal(model.percentOff, 20);
});

test('pricing model never produces cheapest claim', () => {
  assert.equal('cheapest' in displayPriceModel({ price: 1000 }), false);
});
