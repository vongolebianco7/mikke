import test from 'node:test';
import assert from 'node:assert/strict';
import { factKnown, factUnknown } from '../src/domain/candidateFacts.js';
import { derivePurchaseMetrics } from '../src/domain/purchaseMetrics.js';

test('derives landed price only from known price and shipping evidence', () => {
  const metrics=derivePurchaseMetrics({price:factKnown(12000,{source:'shop'}),shipping_fee:factKnown(500,{source:'shop'})});
  assert.equal(metrics.landed_price.state,'known');
  assert.equal(metrics.landed_price.value,12500);
  assert.deepEqual(metrics.landed_price.meta.dependsOn,['price','shipping_fee']);
  const missing=derivePurchaseMetrics({price:factKnown(12000),shipping_fee:factUnknown()});
  assert.equal(missing.landed_price.state,'unknown');
});

test('subtracts coupon only when eligibility and value are verified', () => {
  const eligible=derivePurchaseMetrics({
    price:factKnown(12000),shipping_fee:factKnown(500),coupon_discount_amount:factKnown(2000),coupon_eligibility:factKnown('eligible'),
  });
  assert.equal(eligible.coupon_adjusted_price.state,'known');
  assert.equal(eligible.coupon_adjusted_price.value,10500);
  const unknown=derivePurchaseMetrics({
    price:factKnown(12000),shipping_fee:factKnown(500),coupon_discount_amount:factKnown(2000),coupon_eligibility:factKnown('unknown'),
  });
  assert.equal(unknown.coupon_adjusted_price.state,'unknown');
});

test('points remain a separately labeled effective metric', () => {
  const metrics=derivePurchaseMetrics({price:factKnown(10000),shipping_fee:factKnown(0),point_value:factKnown(1000)});
  assert.equal(metrics.landed_price.value,10000);
  assert.equal(metrics.effective_price_after_points.value,9000);
  assert.equal(metrics.effective_price_after_points.meta.cashEquivalent,false);
});
