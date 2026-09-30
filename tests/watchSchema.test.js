import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCondition,
  normalizeTrigger,
  normalizeGenericWatch,
  normalizeDomainCondition,
  normalizeDomainWatch,
} from '../src/domain/watchSchema.js';

test('normalizes generic v2 conditions and triggers without semantic changes', () => {
  const watch = normalizeGenericWatch({
    target: { categoryId: 'appliances', title: '冷蔵庫' },
    genericConditions: [{ id:'c1', attributeId:'capacity', operator:'gte', value:500, unit:'L', role:'required', source:'category' }],
    triggers: [{ id:'t1', metric:'price', operator:'lte', value:150000, unit:'JPY', reference:'current', scope:'best_match', role:'notification' }],
    metadata: { rawQuery:'冷蔵庫、500L以上、15万円以下', inputMode:'text' },
  });
  assert.equal(watch.schemaVersion,2);
  assert.equal(watch.target.categoryId,'appliances');
});

test('normalizes a v3 domain Watch and canonical domain conditions',()=>{
  const watch=normalizeDomainWatch({
    domain:'flight',
    target:{title:'東京→ホノルル'},
    domainConditions:[{id:'c1',fieldId:'maxStops',operator:'lte',value:1,role:'required'}],
    triggers:[{id:'t1',metric:'price',operator:'lte',value:100000,unit:'JPY'}],
    metadata:{rawQuery:'東京からホノルル、乗り換え1回まで'},
  });
  assert.equal(watch.schemaVersion,3);
  assert.equal(watch.domain,'flight');
  assert.deepEqual(watch.domainConditions[0],{
    id:'c1',fieldId:'maxStops',operator:'lte',value:1,unit:undefined,role:'required',evidencePolicy:'known_required',
  });
  assert.equal(watch.triggers[0].role,'notification');
});

test('v3 malformed condition and trigger collections become empty arrays',()=>{
  const watch=normalizeDomainWatch({domain:'hotel',domainConditions:'bad',triggers:{},target:null,metadata:null});
  assert.deepEqual(watch.domainConditions,[]);
  assert.deepEqual(watch.triggers,[]);
  assert.deepEqual(watch.target,{});
  assert.deepEqual(watch.metadata,{});
});

test('domain condition defaults preferred unknown-tolerant policy safely',()=>{
  assert.deepEqual(normalizeDomainCondition({fieldId:'parking',operator:'is_true',value:true}),{
    id:undefined,fieldId:'parking',operator:'is_true',value:true,unit:undefined,role:'preferred',evidencePolicy:'allow_unknown',
  });
});

test('legacy helper behavior remains available during compatibility window', () => {
  assert.deepEqual(normalizeCondition({ attributeId:'color', operator:'in', value:['gray'] }), {
    attributeId:'color', operator:'in', value:['gray'], unit:undefined, role:'preferred', source:'custom', id:undefined,
  });
  assert.deepEqual(normalizeTrigger({ metric:'availability', operator:'changed_to', value:'in_stock' }), {
    metric:'availability', operator:'changed_to', value:'in_stock', unit:undefined, reference:'current', scope:'candidate', role:'notification', id:undefined,
  });
});
