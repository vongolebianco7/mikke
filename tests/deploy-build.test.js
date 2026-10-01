import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = new URL('..', import.meta.url);

test('Vercel static build produces the configured public output without copying server code', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'mikke-public-'));
  const result = spawnSync(process.execPath, ['scripts/prepare-vercel-static.mjs', outDir], {
    cwd: root,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(readFileSync(join(outDir, 'index.html'), 'utf8'), /Mikke/);
  assert.doesNotThrow(() => readFileSync(join(outDir, 'src', 'app.js'), 'utf8'));
  assert.throws(() => readFileSync(join(outDir, 'api', 'shopping-search.js'), 'utf8'));
  assert.throws(() => readFileSync(join(outDir, '.env.example'), 'utf8'));
});

test('document title does not promise autonomous background monitoring', () => {
  const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(index, /見つけておいてくれる/);
  assert.match(index, /必要なときに変化を確認する/);
});
