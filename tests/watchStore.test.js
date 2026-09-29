import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWatch } from '../src/domain/normalizeWatch.js';

function byField(watch,id){return watch.domainConditions.find((c)=>c.fieldId===id)}

test('legacy required max price becomes a v3 required price condition while v2 view remains readable', () => {
  const watch = normalizeWatch({
    type:'shopping', title:'冷蔵庫', rawQuery:'冷蔵庫、15万円以下',
    conditions:{ maxPrice:150000, attributes:{}, priceTriggers:[], stateTriggers:[] },
    requiredKeys:['maxPrice'], preferredKeys:[],
  });
  assert.equal(watch.schemaVersion,3);
  assert.equal(watch.domain,'appliance');
  assert.equal(byField(watch,'price').value,150000);
  assert.equal(byField(watch,'price').role,'required');
  assert.ok(watch.genericConditions.some((c)=>c.attributeId==='price'&&c.value===150000));
});

test('legacy product category and snake_case ids map to canonical v3 fields',()=>{
  const watch=normalizeWatch({
    schemaVersion:2,
    target:{categoryId:'appliances',subcategoryId:'refrigerator',title:'冷蔵庫'},
    genericConditions:[
      {attributeId:'installation_width',operator:'lte',value:700,unit:'mm',role:'required',source:'category'},
      {attributeId:'freezer_capacity',operator:'gte',value:100,unit:'L',role:'preferred',source:'subcategory'},
    ],
    triggers:[],conditions:{attributes:{},priceTriggers:[],stateTriggers:[]},requiredKeys:[],preferredKeys:[],
  });
  assert.equal(watch.domain,'appliance');
  assert.equal(byField(watch,'installationWidth').role,'required');
  assert.equal(byField(watch,'freezerCapacity').role,'preferred');
});

test('legacy flight route direct and trip type normalize into v3 conditions',()=>{
  const watch=normalizeWatch({
    type:'flight',title:'東京→ホノルル',
    conditions:{origin:'東京',destination:'ホノルル',directOnly:true,tripType:'roundtrip',attributes:{origin:'東京',destination:'ホノルル',directOnly:true,tripType:'roundtrip'},priceTriggers:[],stateTriggers:[]},
    requiredKeys:['origin','destination','directOnly'],preferredKeys:[],
  });
  assert.equal(watch.domain,'flight');
  assert.equal(byField(watch,'origin').value,'東京');
  assert.equal(byField(watch,'destination').value,'ホノルル');
  assert.equal(byField(watch,'nonstopOnly').value,true);
  assert.equal(byField(watch,'tripType').value,'round_trip');
});

test('legacy notification triggers remain generic notification triggers after v3 normalization', () => {
  const watch = normalizeWatch({
    type:'shopping', title:'996',
    conditions:{ maxPrice:10000, attributes:{}, priceTriggers:[{type:'below_absolute',value:10000,reference:'explicit',role:'notification'}], stateTriggers:[] },
    requiredKeys:[], preferredKeys:[],
  });
  assert.ok(watch.triggers.some((t)=>t.metric==='price'&&t.operator==='lte'&&t.value===10000&&t.role==='notification'));
});
