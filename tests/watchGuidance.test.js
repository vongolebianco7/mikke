import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateStrictness, suggestRelaxations } from '../src/domain/watchGuidance.js';

function watch(requiredKeys=[], preferredKeys=[], conditions={}) {
  return { id:'w1', type:'shopping', requiredKeys, preferredKeys, conditions:{ attributes:{}, priceTriggers:[], stateTriggers:[], ...conditions } };
}

test('strictness heuristic spans broad through very strict and is always labeled as an estimate', () => {
  assert.deepEqual(estimateStrictness(watch()), { level:'broad', label:'広め', isEstimate:true });
  assert.deepEqual(estimateStrictness(watch(['maxPrice'],[],{maxPrice:30000})), { level:'balanced', label:'ちょうどよい', isEstimate:true });
  assert.deepEqual(estimateStrictness(watch(['maxPrice','size'],[],{maxPrice:10000,size:'24.5cm'})), { level:'strict', label:'厳しめ', isEstimate:true });
  assert.deepEqual(estimateStrictness(watch(['maxPrice','size','excludeUsed','colors'],[],{maxPrice:10000,size:'24.5cm',excludeUsed:true,colors:['グレー']})), { level:'very_strict', label:'かなり厳しい', isEstimate:true });
});

test('v3 strictness uses domain condition roles', () => {
  const v3={id:'w1',schemaVersion:3,domain:'flight',domainConditions:[
    {fieldId:'origin',role:'required'},
    {fieldId:'destination',role:'required'},
    {fieldId:'nonstopOnly',role:'required'},
    {fieldId:'allowedAirlines',role:'preferred'},
  ]};
  assert.deepEqual(estimateStrictness(v3),{level:'strict',label:'厳しめ',isEstimate:true});
});

test('relaxations require repeated observations with no full match and never mutate the Watch', () => {
  const input=watch(['maxPrice','size','colors'],[],{maxPrice:10000,size:'24.5cm',colors:['グレー']});
  const before=structuredClone(input);
  const history={w1:{observations:[{candidateId:'a',price:11200},{candidateId:'b',price:10900},{candidateId:'c',price:10800}],events:[]}};
  const latest={candidates:[
    {price:10800,attributes:{sizes:['24.5cm'],colors:['ネイビー']},evaluation:{requiredMatch:false,failedRequired:['maxPrice','colors']}},
  ]};
  const suggestions=suggestRelaxations(input,history,latest);
  assert.ok(suggestions.some((item)=>item.kind==='raise_max_price' && item.suggestedValue===11000));
  assert.ok(suggestions.some((item)=>item.kind==='required_to_preferred' && item.key==='colors'));
  assert.deepEqual(input,before);
});

test('v3 relaxation suggestions use human-readable domain labels', () => {
  const input={id:'w1',schemaVersion:3,domain:'flight',domainConditions:[
    {fieldId:'origin',operator:'eq',value:'東京',role:'required'},
    {fieldId:'checkedBaggageIncluded',operator:'is_true',value:true,role:'required'},
  ]};
  const history={w1:{observations:[{candidateId:'a'},{candidateId:'a'},{candidateId:'a'}],events:[]}};
  const latest={candidates:[{evaluation:{requiredMatch:false,failedRequired:['checkedBaggageIncluded']}}]};
  const suggestions=suggestRelaxations(input,history,latest);
  assert.ok(suggestions.some((item)=>item.kind==='required_to_preferred' && item.key==='checkedBaggageIncluded' && item.label.includes('受託手荷物込み')));
});

test('relaxations stay empty with too little evidence or a current full match', () => {
  const input=watch(['maxPrice','size'],[],{maxPrice:10000,size:'24.5cm'});
  assert.deepEqual(suggestRelaxations(input,{w1:{observations:[{candidateId:'a',price:11000}],events:[]}},{candidates:[]}),[]);
  assert.deepEqual(suggestRelaxations(input,{w1:{observations:[{candidateId:'a',price:11000},{candidateId:'a',price:10800},{candidateId:'a',price:10500}],events:[]}},{candidates:[{evaluation:{requiredMatch:true}}]}),[]);
});
