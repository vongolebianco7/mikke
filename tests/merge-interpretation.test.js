import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeInterpretation } from '../src/domain/mergeInterpretation.js';

const base = (conditions = []) => ({ domain:'shopping', categoryId:'fashion', target:{ title:'シャツ' }, conditions, unresolved:[] });
const c = (id, attributeId, value, extra={}) => ({ id, attributeId, operator:'eq', value, role:'required', supportState:'supported', source:'manual', manuallyEdited:true, ...extra });

test('same attribute replacement preserves id', () => {
  const result = mergeInterpretation(base([c('color-1','color','gray')]), { conditionProposals:[{ attributeId:'color', operator:'eq', value:'black', role:'required', state:'confirmed', confidence:0.95, sourceText:'黒' }], unresolvedFragments:[] }, { explicitReplacement:true });
  assert.equal(result.draft.conditions.length, 1);
  assert.equal(result.draft.conditions[0].id, 'color-1');
  assert.equal(result.draft.conditions[0].value, 'black');
});

test('one_of proposal replaces same attribute as one condition', () => {
  const result = mergeInterpretation(base([c('color-1','color','gray')]), { conditionProposals:[{ attributeId:'color', operator:'one_of', value:['white','black'], role:'required', state:'confirmed', confidence:0.98, sourceText:'白か黒' }], unresolvedFragments:[] }, { explicitReplacement:true });
  assert.deepEqual(result.draft.conditions[0].value, ['white','black']);
  assert.equal(result.draft.conditions[0].operator, 'one_of');
});

test('unrelated low-confidence interpretation does not overwrite a manual edit', () => {
  const draft = base([c('color-1','color','gray'), c('size-1','size','L')]);
  const result = mergeInterpretation(draft, { conditionProposals:[{ attributeId:'price', operator:'lte', value:10000, role:'required', state:'confirmed', confidence:0.8, sourceText:'1万円以下' }], unresolvedFragments:[] });
  assert.equal(result.draft.conditions.find((x)=>x.attributeId==='color').value, 'gray');
  assert.equal(result.draft.conditions.find((x)=>x.attributeId==='size').value, 'L');
  assert.equal(result.draft.conditions.find((x)=>x.attributeId==='price').value, 10000);
});

test('same conditions only color black preserves all unrelated edits', () => {
  const draft = base([c('color-1','color','gray'), c('size-1','size','L'), c('price-1','price',12000,{operator:'lte'})]);
  const result = mergeInterpretation(draft, { targetProposal:{ sourceText:'同じ条件で色だけ黒' }, conditionProposals:[{ attributeId:'color', operator:'eq', value:'black', role:'required', state:'confirmed', confidence:0.99, sourceText:'色だけ黒' }], unresolvedFragments:[] });
  assert.equal(result.draft.conditions.length, 3);
  assert.equal(result.draft.conditions.find((x)=>x.attributeId==='color').value, 'black');
  assert.equal(result.draft.conditions.find((x)=>x.attributeId==='size').value, 'L');
});

test('exception wording is merged as reviewable condition and unresolved note', () => {
  const result = mergeInterpretation(base([c('condition-1','condition','new')]), { conditionProposals:[{ attributeId:'condition', operator:'one_of', value:['new','open_box'], role:'required', state:'needs_review', confidence:0.7, sourceText:'中古不可だが未使用開封品ならOK' }], unresolvedFragments:[{ id:'u1', text:'未使用開封品', state:'unresolved' }] });
  assert.equal(result.draft.conditions.find((x)=>x.attributeId==='condition').supportState, 'needs_review');
  assert.ok(result.draft.unresolved.some((x)=>x.text==='未使用開封品'));
});

test('conflicting hard ranges are surfaced', () => {
  const result = mergeInterpretation(base([c('min','price',20000,{operator:'gte',manuallyEdited:false})]), { conditionProposals:[{ attributeId:'price', operator:'lte', value:10000, role:'required', state:'confirmed', confidence:0.99, sourceText:'1万円以下' }], unresolvedFragments:[] });
  assert.ok(result.conflicts.length >= 1);
});

test('category switch preserves conditions and marks unknown applicability for review', () => {
  const draft = base([c('color-1','color','gray'), c('lapel','lapelStyle','notch')]);
  const result = mergeInterpretation(draft, { inferredDomain:'electronics', inferredCategory:'smartphone', conditionProposals:[], unresolvedFragments:[] }, { switchCategory:true, supportedAttributes:new Set(['color','storageCapacity']) });
  assert.equal(result.draft.domain, 'electronics');
  assert.equal(result.draft.conditions.length, 2);
  assert.equal(result.draft.conditions.find((x)=>x.attributeId==='lapelStyle').supportState, 'needs_review');
});

test('unresolved fragments are retained across merges', () => {
  const draft = { ...base(), unresolved:[{ id:'old', text:'安っぽくない', state:'unresolved' }] };
  const result = mergeInterpretation(draft, { conditionProposals:[], unresolvedFragments:[{ id:'new', text:'店舗で試着', state:'unresolved' }] });
  assert.deepEqual(result.draft.unresolved.map((x)=>x.text).sort(), ['安っぽくない','店舗で試着'].sort());
});
