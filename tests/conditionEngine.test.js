import test from 'node:test';
import assert from 'node:assert/strict';
import { factKnown, factUnknown, factUnsupported, factsFromCandidate } from '../src/domain/candidateFacts.js';
import { evaluateCondition, evaluateGenericConditions, evaluateDomainConditions } from '../src/domain/conditionEngine.js';

test('evaluates equality list boolean and text operators', () => {
  const facts={brand:factKnown('Panasonic'),color:factKnown(['white','gray']),features:factKnown(['eco','quiet']),repair_history:factKnown(false),title:factKnown('Panasonic refrigerator 500L white')};
  assert.equal(evaluateCondition({attributeId:'brand',operator:'eq',value:'Panasonic'},facts).state,'pass');
  assert.equal(evaluateCondition({attributeId:'brand',operator:'neq',value:'Sony'},facts).state,'pass');
  assert.equal(evaluateCondition({attributeId:'color',operator:'in',value:['gray']},facts).state,'pass');
  assert.equal(evaluateCondition({attributeId:'color',operator:'not_in',value:['black']},facts).state,'pass');
  assert.equal(evaluateCondition({attributeId:'features',operator:'contains',value:'eco'},facts).state,'pass');
  assert.equal(evaluateCondition({attributeId:'features',operator:'contains_all',value:['eco','quiet']},facts).state,'pass');
  assert.equal(evaluateCondition({attributeId:'repair_history',operator:'is_false'},facts).state,'pass');
  assert.equal(evaluateCondition({attributeId:'title',operator:'contains_text',value:'500L'},facts).state,'pass');
});

test('v3 fieldId conditions preserve unknown and unsupported evidence separately',()=>{
  const facts={checkedBaggageIncluded:factUnknown(),parking:factUnsupported()};
  const result=evaluateDomainConditions([
    {id:'bag',fieldId:'checkedBaggageIncluded',operator:'is_true',value:true,role:'required',evidencePolicy:'known_required'},
    {id:'parking',fieldId:'parking',operator:'is_true',value:true,role:'required',evidencePolicy:'known_required'},
  ],facts);
  assert.equal(result.requiredMatch,false);
  assert.deepEqual(result.unknownRequired,['bag']);
  assert.deepEqual(result.unsupportedRequired,['parking']);
  assert.equal(result.outcomes.find((x)=>x.condition.id==='parking').state,'unsupported');
});

test('normalizes safe units for numeric comparisons', () => {
  const facts=factsFromCandidate({price:138000,attributes:{capacity:'501L',width:'70cm',mileage:'28000km'}});
  assert.equal(evaluateCondition({attributeId:'capacity',operator:'gte',value:500,unit:'L'},facts).state,'pass');
  assert.equal(evaluateCondition({attributeId:'width',operator:'lte',value:700,unit:'mm'},facts).state,'pass');
  assert.equal(evaluateCondition({attributeId:'mileage',operator:'lte',value:30000,unit:'km'},facts).state,'pass');
});

test('evaluates deterministic dates times durations and airline lists for v3 fields',()=>{
  const facts={
    checkIn:factKnown('2026-10-26'),
    departureTime:factKnown('09:30'),
    maxTotalDuration:factKnown(650,{unit:'min'}),
    allowedAirlines:factKnown(['ANA','JAL']),
  };
  assert.equal(evaluateCondition({fieldId:'checkIn',operator:'gte',value:'2026-10-20'},facts).state,'pass');
  assert.equal(evaluateCondition({fieldId:'departureTime',operator:'between',value:['08:00','12:00']},facts).state,'pass');
  assert.equal(evaluateCondition({fieldId:'maxTotalDuration',operator:'lte',value:12,unit:'hour'},facts).state,'pass');
  assert.equal(evaluateCondition({fieldId:'allowedAirlines',operator:'in',value:['ANA']},facts).state,'pass');
});

test('invalid dates ranges and incompatible units become unknown rather than guesses',()=>{
  assert.equal(evaluateCondition({fieldId:'checkIn',operator:'gte',value:'bad-date'},{checkIn:factKnown('2026-10-26')}).state,'unknown');
  assert.equal(evaluateCondition({fieldId:'departureTime',operator:'between',value:['xx','12:00']},{departureTime:factKnown('09:30')}).state,'unknown');
  assert.equal(evaluateCondition({fieldId:'maxTotalDuration',operator:'lte',value:12,unit:'kg'},{maxTotalDuration:factKnown(650,{unit:'min'})}).state,'unknown');
});

test('unknown and unsupported required evidence never become confirmed matches', () => {
  const required=[{id:'shipping',attributeId:'shipping_fee',operator:'eq',value:0,unit:'JPY',role:'required'}];
  const unknown=evaluateGenericConditions(required,{shipping_fee:factUnknown({provider:'x'})});
  assert.equal(unknown.requiredMatch,false);assert.deepEqual(unknown.unknownRequired,['shipping']);assert.deepEqual(unknown.unsupportedRequired,[]);assert.equal(unknown.outcomes[0].state,'unknown');
  const unsupported=evaluateGenericConditions(required,{shipping_fee:factUnsupported({provider:'x'})});
  assert.equal(unsupported.requiredMatch,false);assert.deepEqual(unsupported.unknownRequired,[]);assert.deepEqual(unsupported.unsupportedRequired,['shipping']);assert.equal(unsupported.outcomes[0].state,'unsupported');
});

test('facts keep unsupported and unknown distinct',()=>{
  assert.equal(factUnknown().state,'unknown');assert.equal(factUnsupported().state,'unsupported');assert.equal(factKnown(0).state,'known');
});
