import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFlightWatch } from '../src/domain/parseFlightWatch.js';

const byField=(r,id)=>r.domainConditions.find((c)=>c.fieldId===id);
const byMetric=(r,id)=>r.triggers.find((t)=>t.metric===id);

test('parses route trip type nonstop and stop limit without swallowing later clauses',()=>{
  const r=parseFlightWatch('東京からホノルル、往復、直行便、乗り換え1回まで');
  assert.equal(r.domain,'flight');
  assert.equal(byField(r,'origin').value,'東京');
  assert.equal(byField(r,'destination').value,'ホノルル');
  assert.equal(byField(r,'tripType').value,'round_trip');
  assert.equal(byField(r,'nonstopOnly').value,true);
  assert.equal(byField(r,'maxStops').value,1);
});

test('parses airport inclusion and exclusion, and does not invent origin for anywhere',()=>{
  const specific=parseFlightWatch('東京からホノルル、羽田のみ、成田除外');
  assert.deepEqual(byField(specific,'departureAirports').value,['HND']);
  assert.deepEqual(specific.domainConditions.find((c)=>c.fieldId==='departureAirports'&&c.operator==='not_in').value,['NRT']);
  const anywhere=parseFlightWatch('どこからでもホノルル、航空券');
  assert.equal(byField(anywhere,'origin'),undefined);
  assert.equal(byField(anywhere,'destination').value,'ホノルル');
});

test('parses airline schedule cabin baggage flexibility passengers and award constraints',()=>{
  const r=parseFlightWatch('東京からホノルル、ANAかJAL、LCC除外、午前発、エコノミー、受託手荷物込み、変更可、払い戻し可、大人2人、子ども1人、乳児1人、10万マイル以下、諸費用3万円以下');
  assert.deepEqual(byField(r,'allowedAirlines').value,['ANA','JAL']);
  assert.equal(byField(r,'lccAllowed').value,false);
  assert.deepEqual(byField(r,'departureTimeRange').value,['00:00','11:59']);
  assert.equal(byField(r,'cabinClass').value,'economy');
  assert.equal(byField(r,'checkedBaggageIncluded').value,true);
  assert.equal(byField(r,'changeable').value,true);
  assert.equal(byField(r,'refundable').value,true);
  assert.equal(byField(r,'adults').value,2);
  assert.equal(byField(r,'children').value,1);
  assert.equal(byField(r,'infants').value,1);
  assert.equal(byField(r,'maxMiles').value,100000);
  assert.equal(byField(r,'maxTaxesAndFees').value,30000);
});

test('parses flight notification triggers without claiming current availability',()=>{
  const r=parseFlightWatch('東京からホノルル、10万円以下になったら、10%以上値下がり、登録後最安値、特典航空券の空席が出たら');
  assert.equal(byMetric(r,'price').value,100000);
  assert.ok(r.triggers.some((t)=>t.metric==='discount_percent'&&t.value===10));
  assert.ok(r.triggers.some((t)=>t.metric==='price'&&t.reference==='watch_low'));
  assert.ok(r.triggers.some((t)=>t.metric==='availability'&&t.scope==='award'));
});

test('ambiguous unsupported date wording is preserved in metadata rather than fabricated',()=>{
  const r=parseFlightWatch('東京からホノルル、来月の安い日');
  assert.equal(byField(r,'outboundDate'),undefined);
  assert.match(r.metadata.unparsedClauses.join(' '),/来月/);
});
