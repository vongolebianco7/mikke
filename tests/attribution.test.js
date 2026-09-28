import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeDataSources } from '../src/domain/providerAttribution.js';

test('summarizeDataSources marks demo mode and only credits providers actually contacted', () => {
  const summary = summarizeDataSources([
    { dataMode:'sample', providers:[] },
    { dataMode:'official', providers:[{ name:'rakuten', status:'ok' }, { name:'yahoo', status:'not_configured' }] },
  ]);
  assert.equal(summary.hasDemo, true);
  assert.equal(summary.rakuten, true);
  assert.equal(summary.yahoo, false);
});
