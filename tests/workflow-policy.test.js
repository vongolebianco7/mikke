import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync(new URL('../.github/workflows/test.yml', import.meta.url), 'utf8');

test('release workflow exposes four required jobs and commands', () => {
  for (const job of ['test:', 'security:', 'compliance-static:', 'build:']) assert.match(workflow, new RegExp(`\\n  ${job.replace(':','')}:`));
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run security/);
  assert.match(workflow, /npm run compliance/);
  assert.match(workflow, /npm run build/);
});
