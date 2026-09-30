import test from 'node:test';
import assert from 'node:assert/strict';
import { getAttributeDefinition } from '../src/domain/attributeRegistry.js';
import { getCategoryTemplate, inferProductCategory, suggestedAttributesForCategory } from '../src/domain/categoryTemplates.js';

const requiredAttributes = [
  'brand','model','color','size','width','height','depth','weight','capacity','quantity','condition','material','release_year','origin_country','warranty','seller',
  'mileage','repair_history','freezer_capacity','allergens',
];

test('attribute registry exposes common and category-specific definitions', () => {
  for (const id of requiredAttributes) {
    const def = getAttributeDefinition(id);
    assert.equal(def.attributeId, id);
    assert.ok(def.label);
    assert.ok(Array.isArray(def.operators) && def.operators.length > 0);
  }
});

test('phase 1 category templates expose useful defaults and recommendations', () => {
  const expectations = {
    fashion: ['brand','size','color','condition'],
    appliances: ['brand','model','capacity','width'],
    furniture: ['width','height','depth','material'],
    food: ['quantity','weight','origin_country'],
    used_car: ['manufacturer','model','model_year','mileage','repair_history'],
  };
  for (const [categoryId, ids] of Object.entries(expectations)) {
    const template = getCategoryTemplate(categoryId);
    assert.equal(template.categoryId, categoryId);
    const all = suggestedAttributesForCategory(categoryId);
    for (const id of ids) assert.ok(all.includes(id), `${categoryId} should suggest ${id}`);
  }
});

test('infers category and useful subcategory hints from representative Japanese product text', () => {
  assert.deepEqual(inferProductCategory('500L 冷蔵庫'), { categoryId: 'appliances', subcategoryId: 'refrigerator' });
  assert.deepEqual(inferProductCategory('グレーのソファ'), { categoryId: 'furniture', subcategoryId: 'sofa' });
  assert.deepEqual(inferProductCategory('コーヒー豆 1kg'), { categoryId: 'food', subcategoryId: 'coffee' });
  assert.deepEqual(inferProductCategory('ホンダ ヴェゼル 中古車'), { categoryId: 'used_car', subcategoryId: 'car' });
  assert.deepEqual(inferProductCategory('New Balance スニーカー'), { categoryId: 'fashion', subcategoryId: 'shoes' });
});

test('expands universal product templates beyond the original five categories', () => {
  const expectations = {
    baby: ['brand','condition','price'],
    sports: ['brand','model','size','condition','price'],
    electronics: ['brand','model','condition','price','warranty'],
    daily_goods: ['brand','quantity','price'],
    beauty: ['brand','condition','price'],
    pet: ['brand','quantity','price'],
    hobby: ['brand','condition','price'],
  };
  for (const [categoryId, ids] of Object.entries(expectations)) {
    const template = getCategoryTemplate(categoryId);
    assert.equal(template.categoryId, categoryId);
    const all = suggestedAttributesForCategory(categoryId);
    for (const id of ids) assert.ok(all.includes(id), `${categoryId} should suggest ${id}`);
  }
});

test('infers expanded product categories from common Japanese shopping terms', () => {
  assert.deepEqual(inferProductCategory('ベビーカー 軽量'), { categoryId: 'baby', subcategoryId: 'stroller' });
  assert.deepEqual(inferProductCategory('ランニングシューズ 26cm'), { categoryId: 'sports', subcategoryId: 'running_shoes' });
  assert.deepEqual(inferProductCategory('ワイヤレスイヤホン ノイズキャンセリング'), { categoryId: 'electronics', subcategoryId: 'audio' });
  assert.deepEqual(inferProductCategory('洗剤 詰め替え 大容量'), { categoryId: 'daily_goods', subcategoryId: 'household_consumable' });
  assert.deepEqual(inferProductCategory('化粧水 敏感肌'), { categoryId: 'beauty', subcategoryId: 'skincare' });
  assert.deepEqual(inferProductCategory('猫 フード 2kg'), { categoryId: 'pet', subcategoryId: 'pet_food' });
  assert.deepEqual(inferProductCategory('クリスマスツリー 180cm'), { categoryId: 'hobby', subcategoryId: 'seasonal_decor' });
});
