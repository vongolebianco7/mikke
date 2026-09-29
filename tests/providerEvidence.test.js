import test from 'node:test';
import assert from 'node:assert/strict';
import { attachProviderEvidence } from '../src/domain/providerEvidence.js';
import { normalizeRakutenItem, normalizeYahooItem } from '../src/server/shoppingProviders.js';

test('known provider fields carry provenance while unsupported purchase fields stay unsupported',()=>{
  const candidate=attachProviderEvidence({price:12000,available:true,title:'Sample',attributes:{color:'グレー'}},{
    provider:'rakuten',supportedFields:['price','availability','title'],inferredAttributes:['color'],
  });
  assert.equal(candidate.facts.price.state,'known');
  assert.equal(candidate.facts.price.meta.provider,'rakuten');
  assert.equal(candidate.facts.availability.value,'in_stock');
  assert.equal(candidate.facts.shipping_fee.state,'unsupported');
  assert.equal(candidate.facts.coupon_available.state,'unsupported');
  assert.equal(candidate.facts.release_status.state,'unsupported');
  assert.equal(candidate.facts.color.meta.confidence,'inferred');
});

test('supported but absent provider field is unknown rather than false or zero',()=>{
  const candidate=attachProviderEvidence({title:'Sample'},{provider:'x',supportedFields:['price','availability','shipping_fee']});
  assert.equal(candidate.facts.price.state,'unknown');
  assert.equal(candidate.facts.availability.state,'unknown');
  assert.equal(candidate.facts.shipping_fee.state,'unknown');
});

test('coupon eligibility never defaults to eligible',()=>{
  const candidate=attachProviderEvidence({couponDiscountPercent:15},{provider:'x',supportedFields:['coupon_discount_percent','coupon_eligibility']});
  assert.equal(candidate.facts.coupon_discount_percent.value,15);
  assert.equal(candidate.facts.coupon_eligibility.state,'unknown');
});

test('Rakuten normalization does not fabricate shipping coupon release or availability',()=>{
  const item=normalizeRakutenItem({itemCode:'r1',itemName:'商品',itemPrice:1000,itemUrl:'https://example.com/r1'});
  assert.equal(item.available,undefined);
  assert.equal(item.facts.shipping_fee.state,'unsupported');
  assert.equal(item.facts.coupon_available.state,'unsupported');
  assert.equal(item.facts.release_status.state,'unsupported');
});

test('Yahoo normalization does not turn missing stock into false',()=>{
  const item=normalizeYahooItem({code:'y1',name:'商品',price:1000,url:'https://example.com/y1'});
  assert.equal(item.available,undefined);
  assert.equal(item.facts.availability.state,'unknown');
  assert.equal(item.facts.coupon_eligibility.state,'unsupported');
});
