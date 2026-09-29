import test from 'node:test';
import assert from 'node:assert/strict';
import { createWatchRecord, loadWatches, saveWatches } from '../src/domain/watchStore.js';

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
}

test('createWatchRecord creates a stable watch shape from a parsed draft', () => {
  const record = createWatchRecord({ type:'shopping', title:'996', rawQuery:'996', conditions:{ maxPrice:10000 }, requiredKeys:['maxPrice'], preferredKeys:[] }, 'watch-fixed');
  assert.equal(record.id, 'watch-fixed');
  assert.equal(record.status, 'watching');
  assert.equal(record.conditions.maxPrice, 10000);
  assert.equal(record.conditions.priceTriggers[0].type, 'below_absolute');
});

test('save and load watches normalizes valid records and survives malformed storage', () => {
  const storage = memoryStorage();
  saveWatches(storage, [{ id:'w1' }]);
  const loaded = loadWatches(storage);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].id, 'w1');
  assert.deepEqual(loaded[0].conditions.attributes, {});
  assert.deepEqual(loaded[0].conditions.priceTriggers, []);
  assert.deepEqual(loaded[0].conditions.stateTriggers, []);
  storage.setItem('mikke.watches.v1', '{broken');
  assert.deepEqual(loadWatches(storage), []);
});

test('direct shopping composer conditions and notification triggers survive save and load',()=>{
  const storage=memoryStorage();
  const draft={schemaVersion:3,domain:'appliance',target:{title:'冷蔵庫',subcategoryId:'refrigerator'},domainConditions:[
    {id:'capacity',fieldId:'totalCapacity',operator:'gte',value:500,unit:'L',role:'required'},
    {id:'width',fieldId:'width',operator:'lte',value:700,unit:'mm',role:'required'},
    {id:'color',fieldId:'color',operator:'in',value:['白'],role:'required'},
  ],triggers:[{id:'price',metric:'price',operator:'lte',value:150000,unit:'JPY',role:'notification'}],metadata:{rawQuery:'冷蔵庫'}};
  const record=createWatchRecord(draft,'direct-shopping');
  saveWatches(storage,[record]);
  const loaded=loadWatches(storage)[0];
  assert.equal(loaded.domain,'appliance');
  assert.equal(loaded.domainConditions.find((c)=>c.fieldId==='totalCapacity')?.value,500);
  assert.equal(loaded.domainConditions.find((c)=>c.fieldId==='width')?.value,700);
  assert.deepEqual(loaded.domainConditions.find((c)=>c.fieldId==='color')?.value,['白']);
  assert.equal(loaded.triggers.find((t)=>t.metric==='price')?.value,150000);
});

test('direct hotel composer conditions and notification triggers survive save and load',()=>{
  const storage=memoryStorage();
  const draft={schemaVersion:3,domain:'hotel',target:{title:'軽井沢'},domainConditions:[
    {id:'destination',fieldId:'destination',operator:'eq',value:'軽井沢',role:'required'},
    {id:'checkin',fieldId:'checkIn',operator:'eq',value:'2026-10-26',role:'required'},
    {id:'checkout',fieldId:'checkOut',operator:'eq',value:'2026-10-28',role:'required'},
    {id:'breakfast',fieldId:'breakfastIncluded',operator:'is_true',value:true,role:'required'},
    {id:'cancel',fieldId:'freeCancellation',operator:'is_true',value:true,role:'required'},
  ],triggers:[{id:'availability',metric:'availability',operator:'eq',value:true,role:'notification'}],metadata:{rawQuery:'軽井沢のホテル'}};
  saveWatches(storage,[createWatchRecord(draft,'direct-hotel')]);
  const loaded=loadWatches(storage)[0];
  assert.equal(loaded.domain,'hotel');
  assert.equal(loaded.domainConditions.find((c)=>c.fieldId==='destination')?.value,'軽井沢');
  assert.equal(loaded.domainConditions.find((c)=>c.fieldId==='breakfastIncluded')?.value,true);
  assert.equal(loaded.domainConditions.find((c)=>c.fieldId==='freeCancellation')?.value,true);
  assert.equal(loaded.triggers.find((t)=>t.metric==='availability')?.value,true);
});
