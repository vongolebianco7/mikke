import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('security static check passes on repository policy', () => {
  const result = spawnSync(process.execPath, ['scripts/security-check.mjs'], { encoding: 'utf8' });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /security check: PASS/i);
});
