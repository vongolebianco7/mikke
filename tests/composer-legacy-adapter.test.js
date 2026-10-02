import test from 'node:test';
import assert from 'node:assert/strict';
import { draftFromWatch, watchFromDraft } from '../src/domain/composerLegacyAdapter.js';

function roundTrip(watch) {
  const draft = draftFromWatch(watch);
  return { draft, watch:watchFromDraft(draft, watch) };
}

test('shopping Watch maps domain conditions and preserves unknown fields', () => {
  const original = { id:'w1', type:'shopping', domain:'appliance', target:{title:'冷蔵庫'}, domainConditions:[{id:'d1',fieldId:'totalCapacity',operator:'gte',value:500,unit:'L',role:'required'}], customFutureField:{ keep:true } };
  const { draft, watch } = roundTrip(original);
  assert.equal(draft.conditions[0].attributeId, 'totalCapacity');
  assert.equal(watch.domainConditions[0].fieldId, 'totalCapacity');
  assert.deepEqual(watch.customFutureField, { keep:true });
});

test('compatibility and change conditions round trip', () => {
  const original = { id:'w2', type:'shopping', domain:'baby', compatibilityConditions:[{id:'compat1',relation:'within_limits',target:{type:'age_range',minAgeMonths:0,maxAgeMonths:12},subjectType:'product',role:'required'}], triggers:[{id:'t1',metric:'price',operator:'lte',value:10000,unit:'JPY',reference:'current',scope:'candidate',role:'notification'}] };
  const { draft, watch } = roundTrip(original);
  assert.ok(draft.conditions.some((item)=>item.attributeId==='compatibility'));
  assert.ok(draft.conditions.some((item)=>item.role==='change'));
  assert.equal(watch.compatibilityConditions[0].relation, 'within_limits');
  assert.equal(watch.triggers[0].metric, 'price');
});

test('new compatibility card ids save back as compatibility conditions instead of domain fields', () => {
  const draft = {
    domain:'fashion',
    target:{title:'ヴェゼル対応フロアマット'},
    conditions:[{
      id:'compat-vehicle',
      attributeId:'compatibility:compat-vehicle',
      operator:'compatible_with',
      value:{type:'vehicle',model:'ヴェゼル'},
      role:'required',
      supportState:'confirmed',
      source:'text',
      manuallyEdited:false,
      subjectType:'accessory',
      compatibilityRelation:'compatible_with',
    }],
    unresolvedFragments:[],
    metadata:{rawQuery:'ヴェゼル対応フロアマット'},
  };
  const watch = watchFromDraft(draft, { type:'shopping', domain:'fashion' });
  assert.equal(watch.domainConditions.length, 0);
  assert.equal(watch.compatibilityConditions.length, 1);
  assert.equal(watch.compatibilityConditions[0].id, 'compat-vehicle');
  assert.equal(watch.compatibilityConditions[0].subjectType, 'accessory');
  assert.deepEqual(watch.compatibilityConditions[0].target, {type:'vehicle',model:'ヴェゼル'});
});

test('legacy conditions map without deleting raw legacy data', () => {
  const original = { id:'w4', type:'shopping', conditions:{maxPrice:10000,size:'26cm',attributes:{size:'26cm'}} };
  const { draft, watch } = roundTrip(original);
  assert.ok(draft.conditions.some((item)=>item.attributeId==='price'));
  assert.deepEqual(watch.conditions.attributes, { size:'26cm' });
});

test('flight and hotel structures survive round trip', () => {
  for (const original of [
    { id:'f1', type:'flight', domain:'flight', travelIntent:{tripPattern:'round_trip'}, flightFilters:[{fieldId:'nonstopOnly',operator:'is_true',value:true,role:'required'}] },
    { id:'h1', type:'hotel', domain:'hotel', domainConditions:[{fieldId:'freeCancellation',operator:'is_true',value:true,role:'required'}] },
  ]) {
    const { watch } = roundTrip(original);
    assert.equal(watch.domain, original.domain);
    if (original.travelIntent) assert.deepEqual(watch.travelIntent, original.travelIntent);
    if (original.flightFilters) assert.deepEqual(watch.flightFilters, original.flightFilters);
  }
});

test('switching away from flight clears flight-only state and updates legacy type', () => {
  const original = {
    id:'switch', type:'flight', domain:'flight', target:{title:'東京からホノルル'},
    travelIntent:{tripPattern:'round_trip'},
    flightFilters:[{fieldId:'nonstopOnly',operator:'is_true',value:true,role:'required'}],
  };
  const draft = { domain:'hotel', target:{title:'軽井沢ホテル'}, conditions:[], unresolvedFragments:[], metadata:{} };
  const watch = watchFromDraft(draft, original);
  assert.equal(watch.domain, 'hotel');
  assert.equal(watch.type, 'hotel');
  assert.equal('travelIntent' in watch, false);
  assert.equal('flightFilters' in watch, false);
});

test('opening adapter is pure and does not mutate the source Watch', () => {
  const original = { id:'pure', domain:'fashion', domainConditions:[{fieldId:'color',operator:'eq',value:'gray',role:'required'}] };
  const before = structuredClone(original);
  void draftFromWatch(original);
  assert.deepEqual(original, before);
});
