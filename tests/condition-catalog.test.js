import test from 'node:test';
import assert from 'node:assert/strict';
import { getConditionDefinition, searchConditionDefinitions, recommendedConditions } from '../src/domain/conditionCatalog.js';

const requiredOperators = ['eq','neq','gte','lte','range','one_of','contains','not_contains','boolean','compatible_with','changed_to','relative_change','rank'];

test('catalog exposes all primitive operators across definitions', () => {
  const defs = searchConditionDefinitions('shopping', '');
  const operators = new Set(defs.flatMap((item) => item.operators || []));
  for (const operator of requiredOperators) assert.ok(operators.has(operator), `missing operator ${operator}`);
});

test('recommends refrigerator conditions', () => {
  const ids = recommendedConditions({ domain: 'appliance', categoryId: 'refrigerator', targetText: '冷蔵庫' }).map((item) => item.attributeId);
  for (const id of ['totalCapacity','installationWidth','doorOrientation','freezerCapacity','color','condition','price']) assert.ok(ids.includes(id), id);
});

test('recommends running-shoe conditions', () => {
  const ids = recommendedConditions({ domain: 'sports', categoryId: 'running_shoes', targetText: 'ランニングシューズ' }).map((item) => item.attributeId);
  for (const id of ['size','width','terrain','cushioning','stability','color','model','condition','price']) assert.ok(ids.includes(id), id);
});

test('covers used cars, baby, furniture, electronics, beauty, pet, flights and hotels', () => {
  const cases = [
    ['used_car','mileage'],['baby','ageRange'],['furniture','depth'],['electronics','storageCapacity'],
    ['beauty','fragranceFree'],['pet','proteinSource'],['flight','origin'],['hotel','freeCancellation'],
  ];
  for (const [domain, attributeId] of cases) assert.ok(getConditionDefinition(domain, attributeId), `${domain}:${attributeId}`);
});

test('search finds localized labels and keywords', () => {
  const results = searchConditionDefinitions('used_car', '修復');
  assert.ok(results.some((item) => item.attributeId === 'repairHistory'));
});
