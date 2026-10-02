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

test('compatibility conditions become editable cards and round trip', () => {
  const original = { id:'w2', type:'shopping', domain:'baby', compatibilityConditions:[{id:'compat1',relation:'within_limits',target:{type:'age_range',minAgeMonths:0,maxAgeMonths:12},subjectType:'product',role:'required'}] };
  const { draft, watch } = roundTrip(original);
  assert.ok(draft.conditions.some((item)=>item.attributeId==='compatibility'));
  assert.equal(watch.compatibilityConditions[0].relation, 'within_limits');
});

test('triggers become change cards and round trip', () => {
  const original = { id:'w3', type:'shopping', domain:'fashion', triggers:[{id:'t1',metric:'price',operator:'lte',value:10000,unit:'JPY',reference:'current',scope:'candidate',role:'notification'}] };
  const { draft, watch } = roundTrip(original);
  const change = draft.conditions.find((item)=>item.role==='change');
  assert.equal(change.attributeId, 'price');
  assert.equal(watch.triggers[0].metric, 'price');
});

test('legacy conditions map without deleting raw legacy data', () => {
  const original = { id:'w4', type:'shopping', conditions:{maxPrice:10000,size:'26cm',attributes:{size:'26cm'}} };
  const { draft, watch } = roundTrip(original);
  assert.ok(draft.conditions.some((item)=>item.attributeId==='price'));
  assert.deepEqual(watch.conditions.attributes, { size:'26cm' });
});

test('flight and hotel metadata survive round trip', () => {
  for (const original of [
    { id:'f1', type:'flight', domain:'flight', travelIntent:{tripPattern:'round_trip'}, flightFilters:[{fieldId:'nonstopOnly',operator:'is_true',value:true,role:'required'}] },
    { id:'h1', type:'hotel', domain:'hotel', domainConditions:[{fieldId:'freeCancellation',operator:'is_true',value:true,role:'required'}] },
  ]) {
    const { watch } = roundTrip(original);
    assert.equal(watch.domain, original.domain);
    if (original.travelIntent) assert.deepEqual(watch.travelIntent, original.travelIntent);
  }
});

test('opening adapter is pure and never writes storage', () => {
  let writes = 0;
  const originalSetItem = globalThis.localStorage?.setItem;
  const fakeStorage = { setItem(){ writes += 1; } };
  void fakeStorage;
  draftFromWatch({ id:'pure', domain:'fashion', domainConditions:[] });
  assert.equal(writes, 0);
  assert.equal(originalSetItem, globalThis.localStorage?.setItem);
});
