import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDomainCondition } from '../src/domain/watchSchema.js';
import { evaluateDomainConditions } from '../src/domain/conditionEngine.js';
import { getDomainField } from '../src/domain/domainSchemas.js';

const known=(value,unit)=>({state:'known',value,meta:unit?{unit}:{}});

test('condition roles preserve required preferred notification and comparison semantics',()=>{
  for(const role of ['required','preferred','notification','comparison']){
    const normalized=normalizeDomainCondition({fieldId:'price',operator:'lte',value:10000,unit:'JPY',role});
    assert.equal(normalized.role,role);
  }
});

test('notification conditions never filter or rank while comparison conditions can rank without filtering',()=>{
  const conditions=[
    normalizeDomainCondition({fieldId:'condition',operator:'eq',value:'new',role:'required'}),
    normalizeDomainCondition({fieldId:'color',operator:'eq',value:'gray',role:'preferred'}),
    normalizeDomainCondition({fieldId:'warrantyMonths',operator:'gte',value:12,role:'comparison'}),
    normalizeDomainCondition({fieldId:'returnable',operator:'is_true',value:true,role:'notification'}),
  ];
  const result=evaluateDomainConditions(conditions,{
    condition:known('new'),color:known('black'),warrantyMonths:known(24),returnable:known(false),
  });
  assert.equal(result.requiredMatch,true);
  assert.equal(result.preferredPassed,0);
  assert.equal(result.comparisonPassed,1);
  assert.equal(result.notificationPassed,0);
  assert.equal(result.score,75);
});

test('all product domains expose shared commerce conditions without category-specific branching',()=>{
  const domains=['fashion','appliance','furniture','food','used_car','baby','sports','electronics','daily_goods','beauty','pet','hobby'];
  const shared=['sellerType','shippingFee','deliveryDays','returnable','warrantyMonths'];
  for(const domain of domains){
    for(const fieldId of shared) assert.ok(getDomainField(domain,fieldId),`${domain} should expose ${fieldId}`);
  }
});

test('semantic concepts resolve to domain-specific fields instead of collapsing unlike capacities into one field',async()=>{
  const semantic=await import('../src/domain/semanticFields.js').catch(()=>({}));
  assert.equal(typeof semantic.resolveSemanticField,'function');
  assert.equal(semantic.resolveSemanticField({conceptId:'capacity',domain:'appliance',subcategoryId:'refrigerator'}),'totalCapacity');
  assert.equal(semantic.resolveSemanticField({conceptId:'capacity',domain:'food'}),'volume');
  assert.equal(semantic.resolveSemanticField({conceptId:'size',domain:'fashion'}),'size');
  assert.equal(semantic.resolveSemanticField({conceptId:'capacity',domain:'fashion'}),null);
});
