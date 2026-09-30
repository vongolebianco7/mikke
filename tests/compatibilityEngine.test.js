import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCompatibilityCondition,
  normalizeCompatibilityEvidence,
  evaluateCompatibilityCondition,
  evaluateCompatibilityConditions,
} from '../src/domain/compatibilityEngine.js';
import { getCompatibilitySemantics } from '../src/domain/categorySemantics.js';
import { normalizeDomainWatch } from '../src/domain/watchSchema.js';
import { parseWatchQuery } from '../src/domain/parseWatch.js';
import { evaluateCandidate } from '../src/domain/evaluate.js';

test('compatibility condition keeps relation, target and role separate from normal field conditions',()=>{
  const c=normalizeCompatibilityCondition({
    id:'phone-fit',relation:'compatible_with',subjectType:'accessory',target:{type:'device',brand:'Apple',model:'iPhone 17 Pro'},role:'required'
  });
  assert.equal(c.relation,'compatible_with');
  assert.equal(c.role,'required');
  assert.equal(c.target.model,'iPhone 17 Pro');
});

test('compatibility evaluation distinguishes compatible incompatible unknown and unsupported',()=>{
  const condition=normalizeCompatibilityCondition({id:'fit',relation:'compatible_with',target:{type:'device',model:'iPhone 17 Pro'},role:'required'});
  assert.equal(evaluateCompatibilityCondition(condition,normalizeCompatibilityEvidence({state:'compatible'})).state,'compatible');
  assert.equal(evaluateCompatibilityCondition(condition,normalizeCompatibilityEvidence({state:'incompatible'})).state,'incompatible');
  assert.equal(evaluateCompatibilityCondition(condition,normalizeCompatibilityEvidence({state:'unknown'})).state,'unknown');
  assert.equal(evaluateCompatibilityCondition(condition,normalizeCompatibilityEvidence({state:'unsupported'})).state,'unsupported');
});

test('unknown or unsupported required compatibility never becomes a match',()=>{
  const conditions=[normalizeCompatibilityCondition({id:'fit',relation:'compatible_with',target:{type:'vehicle',model:'VEZEL',modelYear:2027},role:'required'})];
  const unknown=evaluateCompatibilityConditions(conditions,{fit:normalizeCompatibilityEvidence({state:'unknown'})});
  const unsupported=evaluateCompatibilityConditions(conditions,{fit:normalizeCompatibilityEvidence({state:'unsupported'})});
  assert.equal(unknown.requiredMatch,false);
  assert.deepEqual(unknown.unknownRequired,['fit']);
  assert.equal(unsupported.requiredMatch,false);
  assert.deepEqual(unsupported.unsupportedRequired,['fit']);
});

test('preferred compatibility affects ranking but not filtering',()=>{
  const conditions=[normalizeCompatibilityCondition({id:'fit',relation:'compatible_with',target:{type:'device',model:'iPhone 17 Pro'},role:'preferred'})];
  const result=evaluateCompatibilityConditions(conditions,{fit:normalizeCompatibilityEvidence({state:'compatible'})});
  assert.equal(result.requiredMatch,true);
  assert.equal(result.preferredCompatible,1);
});

test('candidate evaluation blocks incompatible required compatibility and keeps unknown separate',()=>{
  const watch={
    domain:'electronics',
    domainConditions:[],
    compatibilityConditions:[{id:'phone-fit',relation:'compatible_with',target:{type:'device',model:'iPhone 17 Pro'},role:'required'}],
  };
  const incompatible=evaluateCandidate(watch,{candidateId:'a',price:9000,compatibilityEvidence:{'phone-fit':{state:'incompatible',source:'provider'}}});
  const unknown=evaluateCandidate(watch,{candidateId:'b',price:8500,compatibilityEvidence:{'phone-fit':{state:'unknown'}}});
  assert.equal(incompatible.requiredMatch,false);
  assert.deepEqual(incompatible.failedCompatibilityRequired,['phone-fit']);
  assert.equal(unknown.requiredMatch,false);
  assert.deepEqual(unknown.unknownCompatibilityRequired,['phone-fit']);
});

test('preferred compatibility improves candidate score without becoming a hard filter',()=>{
  const watch={
    domain:'electronics',
    domainConditions:[],
    compatibilityConditions:[{id:'phone-fit',relation:'compatible_with',target:{type:'device',model:'iPhone 17 Pro'},role:'preferred'}],
  };
  const compatible=evaluateCandidate(watch,{candidateId:'a',price:9000,compatibilityEvidence:{'phone-fit':{state:'compatible'}}});
  const unknown=evaluateCandidate(watch,{candidateId:'b',price:8500,compatibilityEvidence:{'phone-fit':{state:'unknown'}}});
  assert.equal(compatible.requiredMatch,true);
  assert.equal(unknown.requiredMatch,true);
  assert.ok(compatible.score>unknown.score);
});

test('representative product domains expose compatibility semantics',()=>{
  assert.deepEqual(getCompatibilitySemantics('electronics','audio').map(x=>x.conceptId),['device','os','connector']);
  assert.deepEqual(getCompatibilitySemantics('baby','stroller').map(x=>x.conceptId),['age_range','weight_range']);
  assert.deepEqual(getCompatibilitySemantics('used_car').map(x=>x.conceptId),['vehicle_model','model_year','vehicle_code']);
  assert.deepEqual(getCompatibilitySemantics('appliance','refrigerator').map(x=>x.conceptId),['installation_space']);
});

test('domain watches normalize compatibility conditions separately from field conditions',()=>{
  const watch=normalizeDomainWatch({
    domain:'electronics',
    domainConditions:[{fieldId:'price',operator:'lte',value:10000,unit:'JPY',role:'notification'}],
    compatibilityConditions:[{id:'phone-fit',relation:'not-a-relation',target:{type:'device',model:'iPhone 17 Pro'},role:'not-a-role'}],
  });
  assert.equal(watch.domainConditions.length,1);
  assert.equal(watch.compatibilityConditions.length,1);
  assert.equal(watch.compatibilityConditions[0].target.model,'iPhone 17 Pro');
  assert.equal(watch.compatibilityConditions[0].relation,'compatible_with');
  assert.equal(watch.compatibilityConditions[0].role,'required');
});

test('natural language device compatibility enters Structured Watch separately',()=>{
  const watch=parseWatchQuery('iPhone 17 Pro対応のワイヤレスイヤホン、1万円以下になったら');
  assert.equal(watch.domain,'electronics');
  assert.equal(watch.compatibilityConditions.length,1);
  assert.equal(watch.compatibilityConditions[0].relation,'compatible_with');
  assert.deepEqual(watch.compatibilityConditions[0].target,{type:'device',model:'iPhone 17 Pro'});
  assert.equal(watch.compatibilityConditions[0].role,'required');
});

test('natural language baby limits become compatibility requirements instead of generic size fields',()=>{
  const watch=parseWatchQuery('ベビーカー、0ヶ月から、15kgまで');
  assert.equal(watch.domain,'baby');
  assert.deepEqual(watch.compatibilityConditions.map(x=>x.target.type),['age_range','weight_range']);
  assert.equal(watch.compatibilityConditions[0].target.minAgeMonths,0);
  assert.equal(watch.compatibilityConditions[1].target.maxWeightKg,15);
});
