import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDomainSchema,
  getDomainField,
  listDomainFields,
  inferWatchDomain,
  getDomainTriggerSuggestions,
} from '../src/domain/domainSchemas.js';

const domains=['flight','hotel','fashion','appliance','furniture','food','used_car'];

test('exposes all seven initial domains with deep representative fields',()=>{
  for(const id of domains) assert.equal(getDomainSchema(id)?.domainId,id);
  for(const id of ['origin','destination','tripType','maxStops','allowedAirlines','checkedBaggageIncluded','refundable','maxMiles','maxTaxesAndFees']) {
    assert.ok(getDomainField('flight',id),`missing flight field ${id}`);
  }
  for(const id of ['checkIn','checkOut','maxWalkingMinutes','minRoomArea','breakfastIncluded','freeCancellation']) {
    assert.ok(getDomainField('hotel',id),`missing hotel field ${id}`);
  }
  for(const id of ['totalCapacity','freezerCapacity','installationWidth']) {
    assert.ok(getDomainField('appliance',id,'refrigerator'),`missing refrigerator field ${id}`);
  }
});

test('field metadata drives progressive disclosure and required/preferred support',()=>{
  const flight=getDomainSchema('flight');
  const fields=flight.fields;
  for(const field of fields){
    assert.ok(field.id);
    assert.ok(field.label);
    assert.ok(field.type);
    assert.ok(Array.isArray(field.operators));
    assert.ok(field.group);
    assert.ok(field.priority);
    assert.equal(typeof field.supportsRequired,'boolean');
    assert.equal(typeof field.supportsPreferred,'boolean');
  }
  const levels=new Set(fields.map((field)=>field.level));
  for(const level of ['basic','common','detailed','advanced']) assert.ok(levels.has(level));
  assert.equal(listDomainFields('flight','basic').some((field)=>field.id==='maxMiles'),false);
});

test('infers flight hotel and product domains without losing appliance compatibility',()=>{
  assert.deepEqual(inferWatchDomain('東京からホノルルの航空券'),{domain:'flight'});
  assert.deepEqual(inferWatchDomain('軽井沢のホテル'),{domain:'hotel'});
  assert.deepEqual(inferWatchDomain('500Lの冷蔵庫'),{domain:'appliance',subcategoryId:'refrigerator'});
  assert.ok(getDomainTriggerSuggestions('flight').some((item)=>item.id==='availability'));
});

test('supports broader product domains with shared generic trigger semantics',()=>{
  const productDomains=['baby','sports','electronics','daily_goods','beauty','pet','hobby'];
  for(const id of productDomains){
    const schema=getDomainSchema(id);
    assert.equal(schema?.domainId,id,`missing domain ${id}`);
    assert.ok(getDomainField(id,'price'),`${id} should expose price`);
    assert.ok(getDomainField(id,'condition'),`${id} should expose condition`);
    assert.ok(getDomainTriggerSuggestions(id).some((item)=>item.id==='price'),`${id} should support price trigger`);
  }
});

test('infers broader product domains and useful subcategories',()=>{
  assert.deepEqual(inferWatchDomain('ベビーカー 軽量'),{domain:'baby',subcategoryId:'stroller'});
  assert.deepEqual(inferWatchDomain('ランニングシューズ 26cm'),{domain:'sports',subcategoryId:'running_shoes'});
  assert.deepEqual(inferWatchDomain('ワイヤレスイヤホン'),{domain:'electronics',subcategoryId:'audio'});
  assert.deepEqual(inferWatchDomain('洗剤 詰め替え'),{domain:'daily_goods',subcategoryId:'household_consumable'});
  assert.deepEqual(inferWatchDomain('化粧水 敏感肌'),{domain:'beauty',subcategoryId:'skincare'});
  assert.deepEqual(inferWatchDomain('猫 フード 2kg'),{domain:'pet',subcategoryId:'pet_food'});
  assert.deepEqual(inferWatchDomain('クリスマスツリー 180cm'),{domain:'hobby',subcategoryId:'seasonal_decor'});
});
