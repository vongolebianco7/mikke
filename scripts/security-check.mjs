import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const failures = [];

const gitignore = read('.gitignore');
if (!/^\.env$/m.test(gitignore)) failures.push('.env is not ignored');
if (!/^\.env\.local$/m.test(gitignore)) failures.push('.env.local is not ignored');

const scanned = [
  'src/app.js',
  'api/shopping-search.js',
  'src/server/shoppingProviders.js',
  'src/server/requestGuard.js',
  'src/connectors/officialShopping.js',
];
const combined = scanned.map(read).join('\n');
const obviousSecretAssignment = /(RAKUTEN_ACCESS_KEY|RAKUTEN_APPLICATION_ID|YAHOO_APP_ID)\s*[=:]\s*['"][^'"\n]{8,}['"]/;
if (obviousSecretAssignment.test(combined)) failures.push('possible hard-coded provider credential');

const app = read('src/app.js');
for (const secretName of ['RAKUTEN_ACCESS_KEY','RAKUTEN_APPLICATION_ID','YAHOO_APP_ID']) {
  if (app.includes(secretName)) failures.push(`client source references provider secret ${secretName}`);
}
if (!app.includes('safeOutboundUrl')) failures.push('client does not use safeOutboundUrl');
if (!app.includes('esc(')) failures.push('client does not escape provider-controlled text');

const api = read('api/shopping-search.js');
if (!api.includes("Cache-Control', 'no-store")) failures.push('shopping API missing no-store');
if (!api.includes('rate_limited')) failures.push('shopping API missing rate-limit response');

if (failures.length) {
  console.error('security check: FAIL');
  failures.forEach((f)=>console.error(`- ${f}`));
  process.exit(1);
}
console.log('security check: PASS');
