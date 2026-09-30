import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCompatibilityCondition,
  normalizeCompatibilityEvidence,
  evaluateCompatibilityCondition,
  evaluateCompatibilityConditions,
} from '../src/domain/compatibilityEngine.js';
import { getCompatibilitySemantics } from '../src/domain/categorySemantics.js';

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

test('representative product domains expose compatibility semantics',()=>{
  assert.deepEqual(getCompatibilitySemantics('electronics','audio').map(x=>x.conceptId),['device','os','connector']);
  assert.deepEqual(getCompatibilitySemantics('baby','stroller').map(x=>x.conceptId),['age_range','weight_range']);
  assert.deepEqual(getCompatibilitySemantics('used_car').map(x=>x.conceptId),['vehicle_model','model_year','vehicle_code']);
  assert.deepEqual(getCompatibilitySemantics('appliance','refrigerator').map(x=>x.conceptId),['installation_space']);
});
