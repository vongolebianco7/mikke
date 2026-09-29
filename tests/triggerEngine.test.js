import test from 'node:test';
import assert from 'node:assert/strict';
import { factKnown, factUnknown } from '../src/domain/candidateFacts.js';
import { evaluateTrigger } from '../src/domain/triggerEngine.js';

const current=(overrides={})=>({price:factKnown(9800),availability:factKnown('in_stock'),shipping_fee:factKnown(0),...overrides});
const previous=(overrides={})=>({price:factKnown(11000),availability:factKnown('out_of_stock'),shipping_fee:factKnown(500),...overrides});

test('evaluates absolute, previous-price, percentage and Watch-low triggers without category branching', () => {
  assert.equal(evaluateTrigger({metric:'price',operator:'lte',value:10000,reference:'current'},current(),previous(),{}).kind,'target_price_reached');
  assert.equal(evaluateTrigger({metric:'price',operator:'lt',reference:'previous_observation'},current(),previous(),{}).kind,'price_drop');
  assert.equal(evaluateTrigger({metric:'discount_percent',operator:'gte',value:10,reference:'previous_observation'},current(),previous(),{}).kind,'percent_drop');
  assert.equal(evaluateTrigger({metric:'price',operator:'lt',reference:'watch_low'},current(),previous(),{observedLow:9900}).kind,'watch_low');
});

test('evaluates restock, free shipping, coupon, release and preorder transitions', () => {
  assert.equal(evaluateTrigger({metric:'availability',operator:'changed_to',value:'in_stock',reference:'previous_observation'},current(),previous(),{}).kind,'restock');
  assert.equal(evaluateTrigger({metric:'shipping_fee',operator:'eq',value:0,reference:'current'},current(),previous(),{}).kind,'free_shipping');
  assert.equal(evaluateTrigger({metric:'coupon_available',operator:'changed_to',value:true,reference:'previous_observation'},
    current({coupon_available:factKnown(true)}),previous({coupon_available:factKnown(false)}),{}).kind,'coupon_available');
  assert.equal(evaluateTrigger({metric:'coupon_discount_percent',operator:'gte',value:10,reference:'current'},
    current({coupon_discount_percent:factKnown(15),coupon_eligibility:factKnown('eligible')}),previous(),{}).kind,'coupon_discount');
  assert.equal(evaluateTrigger({metric:'release_status',operator:'changed_to',value:'released',reference:'previous_observation'},
    current({release_status:factKnown('released')}),previous({release_status:factKnown('announced')}),{}).kind,'released');
  assert.equal(evaluateTrigger({metric:'preorder_status',operator:'changed_to',value:'open',reference:'previous_observation'},
    current({preorder_status:factKnown('open')}),previous({preorder_status:factKnown('closed')}),{}).kind,'preorder_open');
});

test('already-satisfied equality and threshold conditions do not notify again', () => {
  assert.equal(evaluateTrigger({metric:'shipping_fee',operator:'eq',value:0,reference:'current'},
    current({shipping_fee:factKnown(0)}),previous({shipping_fee:factKnown(0)}),{}),null);
  assert.equal(evaluateTrigger({metric:'price',operator:'lte',value:10000,reference:'current'},
    current({price:factKnown(9500)}),previous({price:factKnown(9800)}),{}),null);
});

test('missing current or reference evidence suppresses trigger events', () => {
  assert.equal(evaluateTrigger({metric:'shipping_fee',operator:'eq',value:0},current({shipping_fee:factUnknown()}),previous(),{}),null);
  assert.equal(evaluateTrigger({metric:'price',operator:'lt',reference:'previous_observation'},current(),{price:factUnknown()},{}),null);
  assert.equal(evaluateTrigger({metric:'price',operator:'lt',reference:'watch_low'},current(),previous(),{}),null);
  assert.equal(evaluateTrigger({metric:'coupon_discount_percent',operator:'gte',value:10},
    current({coupon_discount_percent:factKnown(15),coupon_eligibility:factUnknown()}),previous(),{}),null);
});
