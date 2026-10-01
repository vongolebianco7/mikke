import { execFileSync } from 'node:child_process';

const trackedScopes = /^(src\/|api\/|[^/]+\.(?:js|mjs|json|yml|yaml|html)$|\.env(?:\..+)?$)/;
const excluded = /^(tests\/|docs\/|node_modules\/|\.env\.example$)/;
const assignment = /(RAKUTEN_ACCESS_KEY|RAKUTEN_APPLICATION_ID|YAHOO_APP_ID)\s*[=:]\s*['"]([^'"\n]{12,})['"]/g;
const envAssignment = /^(RAKUTEN_ACCESS_KEY|RAKUTEN_APPLICATION_ID|YAHOO_APP_ID)\s*=\s*(\S{12,})\s*$/gm;
const placeholder = /^(?:your[-_]|example|sample|placeholder|changeme|test[-_]|secret[-_])/i;

let objects;
try {
  objects = execFileSync('git', ['rev-list', '--objects', '--all'], { encoding: 'utf8' });
} catch {
  console.error('history secret check: FAIL');
  console.error('- full Git history is unavailable; CI must checkout with fetch-depth: 0');
  process.exit(1);
}

const findings = [];
for (const line of objects.split('\n')) {
  if (!line.trim()) continue;
  const space = line.indexOf(' ');
  if (space < 0) continue;
  const oid = line.slice(0, space);
  const file = line.slice(space + 1);
  if (!trackedScopes.test(file) || excluded.test(file)) continue;

  let type;
  try {
    type = execFileSync('git', ['cat-file', '-t', oid], { encoding: 'utf8' }).trim();
  } catch {
    continue;
  }
  if (type !== 'blob') continue;

  let content;
  try {
    content = execFileSync('git', ['cat-file', '-p', oid], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
  } catch {
    continue;
  }

  for (const regex of [assignment, envAssignment]) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(content))) {
      const value = match[2];
      if (!placeholder.test(value)) findings.push(`${file}: possible committed ${match[1]}`);
    }
  }
}

if (findings.length) {
  console.error('history secret check: FAIL');
  [...new Set(findings)].forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log('history secret check: PASS');
