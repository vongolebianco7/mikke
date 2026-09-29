import test from 'node:test';
import assert from 'node:assert/strict';
import { loadWatches } from '../src/domain/watchStore.js';

function storageWith(value){return{getItem:()=>JSON.stringify(value)}}

test('loadWatches normalizes a legacy maxPrice Watch without changing readable legacy meaning', () => {
  const [watch]=loadWatches(storageWith([{id:'legacy-1',type:'shopping',title:'NB 996',rawQuery:'NB 996、24.5cm、1万円以下',conditions:{maxPrice:10000,size:'24.5cm'},requiredKeys:['maxPrice','size'],preferredKeys:[]}]))
  assert.equal(watch.schemaVersion,3);
  assert.equal(watch.domain,'fashion');
  assert.equal(watch.conditions.maxPrice,10000);
  assert.equal(watch.conditions.attributes.size,'24.5cm');
  assert.deepEqual(watch.conditions.priceTriggers,[{type:'below_absolute',value:10000,reference:'explicit',role:'required'}]);
  assert.deepEqual(watch.requiredKeys,['maxPrice','size']);
  assert.ok(watch.domainConditions.some((c)=>c.fieldId==='price'&&c.role==='required'));
  assert.ok(watch.domainConditions.some((c)=>c.fieldId==='size'&&c.role==='required'));
});

test('loadWatches supplies safe defaults without discarding legacy fields', () => {
  const [watch]=loadWatches(storageWith([{id:'legacy-2',type:'shopping',conditions:{colors:['グレー']},requiredKeys:[],preferredKeys:['colors'],customLegacyField:'keep-me'}]));
  assert.deepEqual(watch.conditions.attributes.colors,['グレー']);
  assert.deepEqual(watch.conditions.priceTriggers,[]);
  assert.deepEqual(watch.conditions.stateTriggers,[]);
  assert.deepEqual(watch.baseline,{initialObservedAt:null,initialPriceByCandidate:{}});
  assert.deepEqual(watch.behavior,{decisionHistory:[]});
  assert.equal(watch.customLegacyField,'keep-me');
  assert.deepEqual(watch.preferredKeys,['colors']);
});

test('loadWatches accepts mixed legacy through v4 records without dropping entries',()=>{
  const watches=loadWatches(storageWith([
    {id:'v1',type:'flight',conditions:{origin:'東京',destination:'札幌'},requiredKeys:['origin','destination']},
    {id:'v2',schemaVersion:2,target:{categoryId:'appliances',subcategoryId:'refrigerator'},genericConditions:[{attributeId:'capacity',operator:'gte',value:500,unit:'L',role:'required',source:'category'}]},
    {id:'v3',schemaVersion:3,domain:'hotel',target:{title:'軽井沢'},domainConditions:[{fieldId:'freeCancellation',operator:'is_true',value:true,role:'preferred'}]},
  ]));
  assert.deepEqual(watches.map((w)=>w.id),['v1','v2','v3']);
  assert.deepEqual(watches.map((w)=>w.schemaVersion),[4,3,3]);
  assert.deepEqual(watches.map((w)=>w.domain),['flight','appliance','hotel']);
  assert.deepEqual(watches[0].travelIntent.originSet.places,['東京']);
  assert.deepEqual(watches[0].travelIntent.destinationSet.places,['札幌']);
});
