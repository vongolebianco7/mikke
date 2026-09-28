import test from 'node:test';
import assert from 'node:assert/strict';
import { factKnown, factUnknown, factUnsupported, factsFromCandidate } from '../src/domain/candidateFacts.js';
import { evaluateCondition, evaluateGenericConditions } from '../src/domain/conditionEngine.js';

test('evaluates equality list boolean and text operators', () => {
  const facts = {
    brand: factKnown('Panasonic'),
    color: factKnown(['white','gray']),
    features: factKnown(['eco','quiet']),
    repair_history: factKnown(false),
    title: factKnown('Panasonic refrigerator 500L white'),
  };
  assert.equal(evaluateCondition({attributeId:'brand',operator:'eq',value:'Panasonic'},facts).state,'pass');
  assert.equal(evaluateCondition({attributeId:'brand',operator:'neq',value:'Sony'},facts).state,'pass');
  assert.equal(evaluateCondition({attributeId:'color',operator:'in',value:['gray']},facts).state,'pass');
  assert.equal(evaluateCondition({attributeId:'color',operator:'not_in',value:['black']},facts).state,'pass');
  assert.equal(evaluateCondition({attributeId:'features',operator:'contains',value:'eco'},facts).state,'pass');
  assert.equal(evaluateCondition({attributeId:'features',operator:'contains_all',value:['eco','quiet']},facts).state,'pass');
  assert.equal(evaluateCondition({attributeId:'repair_history',operator:'is_false'},facts).state,'pass');
  assert.equal(evaluateCondition({attributeId:'title',operator:'contains_text',value:'500L'},facts).state,'pass');
  assert.equal(evaluateCondition({attributeId:'title',operator:'not_contains_text',value:'used'},facts).state,'pass');
});

test('normalizes safe units for numeric comparisons', () => {
  const facts = factsFromCandidate({
    price: 138000,
    attributes: { capacity:'501L', width:'70cm', mileage:'28000km' },
  });
  assert.equal(evaluateCondition({attributeId:'capacity',operator:'gte',value:500,unit:'L'},facts).state,'pass');
  assert.equal(evaluateCondition({attributeId:'width',operator:'lte',value:700,unit:'mm'},facts).state,'pass');
  assert.equal(evaluateCondition({attributeId:'mileage',operator:'lte',value:30000,unit:'km'},facts).state,'pass');
});

test('unknown and unsupported required evidence never become confirmed matches', () => {
  const required = [
    {id:'shipping',attributeId:'shipping_fee',operator:'eq',value:0,unit:'JPY',role:'required'},
  ];
  for (const fact of [factUnknown({provider:'x'}), factUnsupported({provider:'x'})]) {
    const result = evaluateGenericConditions(required,{shipping_fee:fact});
    assert.equal(result.requiredMatch,false);
    assert.deepEqual(result.unknownRequired,['shipping']);
    assert.equal(result.outcomes[0].state,'unknown');
  }
});

test('preferred unknown evidence does not count as passed', () => {
  const result = evaluateGenericConditions([
    {id:'color',attributeId:'color',operator:'in',value:['gray'],role:'preferred'},
  ],{color:factUnknown()});
  assert.equal(result.preferredPassed,0);
  assert.equal(result.outcomes[0].state,'unknown');
});

test('facts keep unsupported and unknown distinct', () => {
  assert.equal(factUnknown().state,'unknown');
  assert.equal(factUnsupported().state,'unsupported');
  assert.equal(factKnown(0).state,'known');
});
