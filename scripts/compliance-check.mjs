import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const exists = (p) => fs.existsSync(path.join(root, p));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const failures = [];

for (const p of ['docs/COMPLIANCE.md','docs/PUBLIC_RELEASE_GATE.md','docs/PROVIDER_REGISTRY.md','PRIVACY.md','TERMS.md','.github/pull_request_template.md']) {
  if (!exists(p)) failures.push(`missing ${p}`);
}

if (exists('docs/PROVIDER_REGISTRY.md')) {
  const registry = read('docs/PROVIDER_REGISTRY.md');
  if (!/Rakuten Ichiba[\s\S]*Review Required/.test(registry)) failures.push('Rakuten registry state is not Review Required');
  if (!/Yahoo! Shopping[\s\S]*Review Required/.test(registry)) failures.push('Yahoo registry state is not Review Required');
}

const app = read('src/app.js');
if (!app.includes('clearMikkeLocalData')) failures.push('delete-all-data action missing');
if (!app.includes('デモデータを表示中')) failures.push('demo label missing');
if (!app.includes('providerCreditsHtml')) failures.push('provider credits module not used');

const guard = read('src/server/requestGuard.js');
if (!guard.includes('createRateLimiter')) failures.push('rate limiter missing');
if (!guard.includes('withInFlightDedup')) failures.push('in-flight dedup missing');

const api = read('api/shopping-search.js');
if (!api.includes('createRateLimiter') || !api.includes('withInFlightDedup')) failures.push('shopping API does not enforce guards');

const css = read('styles.css');
if (/provider-credit[^}]*color\s*:/.test(css) || /provider-credit[^}]*font-size\s*:/.test(css)) failures.push('provider credit CSS mutation detected');

if (failures.length) {
  console.error('compliance check: FAIL');
  failures.forEach((f)=>console.error(`- ${f}`));
  process.exit(1);
}
console.log('compliance check: PASS');
