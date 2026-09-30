import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCandidate } from '../src/domain/evaluate.js';
import { factUnknown, factUnsupported } from '../src/domain/candidateFacts.js';
import { summarizeEvidenceState } from '../src/domain/resultEvidence.js';

test('candidate evaluation preserves unsupported separately from unknown for result UI', () => {
  const watch={schemaVersion:3,domain:'fashion',domainConditions:[
    {fieldId:'material',operator:'eq',value:'cotton',role:'required'},
    {fieldId:'color',operator:'in',value:['gray'],role:'preferred'},
  ]};
  const candidate={facts:{material:factUnsupported({provider:'x'}),color:factUnknown({provider:'x'})}};
  const evaluation=evaluateCandidate(watch,candidate);
  assert.equal(evaluation.requiredMatch,false);
  assert.equal(evaluation.outcomes[0].evidence.state,'unsupported');
  assert.equal(evaluation.outcomes[1].evidence.state,'unknown');
});

test('result evidence summary gives distinct Japanese labels for unsupported and unknown', () => {
  const summary=summarizeEvidenceState({
    requiredMatch:false,
    outcomes:[
      {condition:{fieldId:'material',role:'required'},state:'unknown',evidence:{state:'unsupported'}},
      {condition:{fieldId:'color',role:'preferred'},state:'unknown',evidence:{state:'unknown'}},
      {condition:{fieldId:'size',role:'required'},state:'pass',evidence:{state:'known'}},
    ],
  });
  assert.deepEqual(summary.map((x)=>x.status),['unsupported','unknown']);
  assert.equal(summary[0].label,'このデータ元では判定不可');
  assert.equal(summary[1].label,'未確認');
});
