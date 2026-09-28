import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('public release governance artifacts exist with required manual evidence fields', () => {
  const gate = read('docs/PUBLIC_RELEASE_GATE.md');
  const registry = read('docs/PROVIDER_REGISTRY.md');
  const privacy = read('PRIVACY.md');
  const terms = read('TERMS.md');
  const pr = read('.github/pull_request_template.md');

  assert.match(gate, /Gate A/i);
  assert.match(gate, /Gate B/i);
  assert.match(gate, /Gate C/i);
  assert.match(gate, /merge != publish/);
  assert.match(gate, /Reviewer/i);
  assert.match(gate, /Review date/i);
  assert.match(registry, /Rakuten Ichiba[\s\S]*Review Required/);
  assert.match(registry, /Yahoo! Shopping[\s\S]*Review Required/);
  assert.match(registry, /Disabled/);
  assert.match(privacy, /localStorage/);
  assert.match(privacy, /IP address/i);
  assert.match(privacy, /official provider/i);
  assert.match(terms, /price/i);
  assert.match(terms, /availability/i);
  assert.match(pr, /external provider/i);
  assert.match(pr, /pricing/i);
});
