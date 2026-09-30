import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFlightWatch } from '../src/domain/parseFlightWatch.js';

const byField=(r,id)=>r.domainConditions?.find((c)=>c.fieldId===id);
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

test('compiles multiple destination alternatives into one Travel Intent',()=>{
  const r=parseFlightWatch('東京からホノルルかシドニー、往復、直行便');
  assert.equal(r.schemaVersion,4);
  assert.equal(r.travelIntent.destinationSet.mode,'any_of');
  assert.deepEqual(r.travelIntent.destinationSet.places.map((p)=>p.label),['ホノルル','シドニー']);
  assert.equal(r.travelIntent.tripPattern,'round_trip');
  assert.ok(r.flightFilters.some((f)=>f.fieldId==='nonstopOnly'&&f.value===true));
});

test('compiles multiple exact date alternatives without replacing either option',()=>{
  const r=parseFlightWatch('東京からホノルル、2027-01-10〜2027-01-14 または 2027-02-07〜2027-02-11');
  assert.equal(r.travelIntent.dateSet.mode,'any_of');
  assert.deepEqual(r.travelIntent.dateSet.options,[
    {kind:'exact',outboundDate:'2027-01-10',returnDate:'2027-01-14'},
    {kind:'exact',outboundDate:'2027-02-07',returnDate:'2027-02-11'},
  ]);
});

test('compiles month range and anytime date intents with stay length',()=>{
  const month=parseFlightWatch('東京からホノルル、2027年2月のどこか、5〜7泊');
  assert.deepEqual(month.travelIntent.dateSet.options,[{kind:'month',year:2027,month:2,stayLength:{minNights:5,maxNights:7}}]);
  const range=parseFlightWatch('東京からホノルル、2027-03-20から2027-03-31の間、3〜5泊');
  assert.deepEqual(range.travelIntent.dateSet.options,[{kind:'range',startDate:'2027-03-20',endDate:'2027-03-31',stayLength:{minNights:3,maxNights:5}}]);
  const anytime=parseFlightWatch('東京からどこでも、いつでも、4〜8泊');
  assert.equal(anytime.travelIntent.destinationSet.mode,'anywhere');
  assert.deepEqual(anytime.travelIntent.dateSet.options,[{kind:'anytime',stayLength:{minNights:4,maxNights:8}}]);
});
