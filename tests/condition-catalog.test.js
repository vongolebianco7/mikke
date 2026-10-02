import test from 'node:test';
import assert from 'node:assert/strict';
import { getConditionDefinition, searchConditionDefinitions, recommendedConditions, CONDITION_PRIMITIVES } from '../src/domain/conditionCatalog.js';

test('catalog exposes deep representative fields across core domains', () => {
  const cases = [
    ['appliance', 'totalCapacity', 'refrigerator'],
    ['fashion', 'size'],
    ['used_car', 'mileage'],
    ['baby', 'price'],
    ['furniture', 'width'],
    ['electronics', 'model'],
    ['beauty', 'brand'],
    ['pet', 'condition'],
    ['flight', 'destination'],
    ['hotel', 'freeCancellation'],
  ];
  for (const [domain, attributeId, subcategoryId] of cases) {
    const definition = getConditionDefinition(domain, attributeId, subcategoryId);
    assert.ok(definition, `${domain}.${attributeId} should exist`);
    assert.equal(definition.attributeId, attributeId);
    assert.ok(definition.label);
    assert.ok(definition.operators.length > 0);
  }
});

test('catalog normalizes all UI primitive operators', () => {
  for (const primitive of ['eq','neq','gte','lte','range','one_of','contains','not_contains','boolean','compatible_with','changed_to','relative_change','rank']) {
    assert.ok(CONDITION_PRIMITIVES.includes(primitive), `${primitive} primitive missing`);
  }
});

test('search matches labels and keywords without category-specific UI code', () => {
  const fridge = searchConditionDefinitions('appliance', '容量', 'refrigerator');
  assert.ok(fridge.some((item) => item.attributeId === 'totalCapacity'));
  const flight = searchConditionDefinitions('flight', '航空会社');
  assert.ok(flight.some((item) => ['allowedAirlines','preferredAirlines'].includes(item.attributeId)));
});

test('recommendations prioritize high-value fields for representative targets', () => {
  const fridge = recommendedConditions({ domain: 'appliance', subcategoryId: 'refrigerator', targetText: '500Lの冷蔵庫' });
  assert.ok(fridge.slice(0, 8).some((item) => item.attributeId === 'totalCapacity'));
  assert.ok(fridge.slice(0, 12).some((item) => item.attributeId === 'installationWidth' || item.attributeId === 'width'));

  const running = recommendedConditions({ domain: 'fashion', categoryId: 'running_shoes', targetText: 'ランニングシューズ 26cm' });
  assert.ok(running.slice(0, 10).some((item) => item.attributeId === 'size'));

  const car = recommendedConditions({ domain: 'used_car', targetText: 'ヴェゼル 中古車' });
  assert.ok(car.slice(0, 12).some((item) => item.attributeId === 'mileage'));
  assert.ok(car.slice(0, 12).some((item) => item.attributeId === 'modelYear'));
});
