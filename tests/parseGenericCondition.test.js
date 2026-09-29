import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGenericConditionClauses } from '../src/domain/parseGenericCondition.js';

function byAttr(result,id){return result.conditions.find((item)=>item.attributeId===id)}
function byMetric(result,id){return result.triggers.find((item)=>item.metric===id)}

test('parses fashion conditions and notification price into generic rules',()=>{
  const result=parseGenericConditionClauses('New Balance 996、24.5cm、グレー、新品、1万円以下になったら');
  assert.equal(result.target.categoryId,'fashion');
  assert.equal(byAttr(result,'size').value,'24.5cm');
  assert.deepEqual(byAttr(result,'color').value,['gray']);
  assert.equal(byAttr(result,'condition').value,'new');
  assert.equal(byMetric(result,'price').value,10000);
});

test('parses appliance capacity width colors and hard price',()=>{
  const result=parseGenericConditionClauses('冷蔵庫、500L以上、幅70cm以下、白かグレー、15万円以下');
  assert.equal(result.target.categoryId,'appliances');
  assert.equal(result.target.subcategoryId,'refrigerator');
  assert.deepEqual(byAttr(result,'capacity'),expectCondition('capacity','gte',500,'L','required'));
  assert.deepEqual(byAttr(result,'width'),expectCondition('width','lte',700,'mm','required'));
  assert.deepEqual(byAttr(result,'color').value,['white','gray']);
  assert.equal(byAttr(result,'price').value,150000);
});

test('parses furniture shipping-inclusive target as landed price trigger',()=>{
  const result=parseGenericConditionClauses('ソファ、幅180cm以下、グレー、送料込み8万円以下');
  assert.equal(result.target.categoryId,'furniture');
  assert.equal(byAttr(result,'width').value,1800);
  assert.equal(byMetric(result,'landed_price').value,80000);
});

test('parses food quantity and free-shipping trigger',()=>{
  const result=parseGenericConditionClauses('コーヒー豆、1kg以上、送料無料、3000円以下');
  assert.equal(result.target.categoryId,'food');
  assert.equal(byAttr(result,'weight').value,1000);
  assert.equal(byAttr(result,'weight').unit,'g');
  assert.equal(byMetric(result,'shipping_fee').value,0);
  assert.equal(byAttr(result,'price').value,3000);
});

test('parses used-car model year mileage repair history and price',()=>{
  const result=parseGenericConditionClauses('ヴェゼル、2027年式以降、3万km以下、修復歴なし、300万円以下');
  assert.equal(result.target.categoryId,'used_car');
  assert.equal(byAttr(result,'model_year').value,2027);
  assert.equal(byAttr(result,'mileage').value,30000);
  assert.equal(byAttr(result,'repair_history').operator,'is_false');
  assert.equal(byAttr(result,'price').value,3000000);
});

test('parses cross-category notification trigger phrases without claiming evidence',()=>{
  const result=parseGenericConditionClauses('冷蔵庫、在庫復活、送料無料、10%OFFクーポン、予約開始、発売されたら');
  assert.ok(result.triggers.some((t)=>t.metric==='availability'&&t.operator==='changed_to'&&t.value==='in_stock'));
  assert.ok(result.triggers.some((t)=>t.metric==='shipping_fee'&&t.operator==='eq'&&t.value===0));
  assert.ok(result.triggers.some((t)=>t.metric==='coupon_discount_percent'&&t.operator==='gte'&&t.value===10));
  assert.ok(result.triggers.some((t)=>t.metric==='preorder_status'&&t.operator==='changed_to'&&t.value==='open'));
  assert.ok(result.triggers.some((t)=>t.metric==='release_status'&&t.operator==='changed_to'&&t.value==='released'));
  assert.ok(result.triggers.every((t)=>t.role==='notification'));
});

function expectCondition(attributeId,operator,value,unit,role){
  return {id:undefined,attributeId,operator,value,unit,role,source:'category'};
}
