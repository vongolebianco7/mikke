import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const requireText = (file, text, message) => {
  if (!read(file).includes(text)) failures.push(message || `${file} missing ${text}`);
};

// API boundary and abuse controls.
requireText('api/shopping-search.js', "Cache-Control', 'no-store", 'API must disable caching');
requireText('api/shopping-search.js', "X-Content-Type-Options', 'nosniff", 'API must send nosniff');
requireText('api/shopping-search.js', "Referrer-Policy', 'no-referrer", 'API must suppress referrer leakage');
requireText('api/shopping-search.js', 'MAX_CONDITION_BYTES', 'structured input must have a byte limit');
requireText('api/shopping-search.js', 'MAX_CONDITION_DEPTH', 'structured input must have a depth limit');
requireText('api/shopping-search.js', 'MAX_CONDITION_NODES', 'structured input must have a node limit');
requireText('api/shopping-search.js', "log('rate_limited', 429)", '429 outcomes must be observable');
requireText('api/shopping-search.js', "log('server_error', 500)", '5xx outcomes must be observable');

// Provider resilience and cost controls.
requireText('src/server/shoppingProviders.js', 'AbortSignal.timeout(5000)', 'provider calls must retain a 5s timeout');
requireText('src/server/shoppingProviders.js', "hits: '20'", 'Rakuten results must stay capped at 20');
requireText('src/server/shoppingProviders.js', "results: '20'", 'Yahoo results must stay capped at 20');
requireText('src/server/shoppingProviders.js', 'Promise.all', 'independent providers must execute concurrently');

// Sanitized operational telemetry: allowlist fields only.
const telemetry = read('src/server/operationalTelemetry.js');
for (const forbidden of ['rawQuery', 'query', 'url', 'accessKey', 'applicationId', 'authorization']) {
  if (telemetry.includes(`'${forbidden}'`) || telemetry.includes(`\"${forbidden}\"`)) {
    failures.push(`operational telemetry allowlist must not include ${forbidden}`);
  }
}
requireText('src/server/operationalTelemetry.js', "const API_FIELDS = ['route', 'outcome', 'statusCode', 'durationMs']", 'API telemetry fields must remain allowlisted');
requireText('src/server/operationalTelemetry.js', "const PROVIDER_FIELDS = ['provider', 'outcome', 'statusCode', 'durationMs']", 'provider telemetry fields must remain allowlisted');

// Release governance must keep the manual/public boundary explicit.
requireText('docs/NONFUNCTIONAL_REQUIREMENTS.md', 'merge != publish', 'non-functional baseline must preserve merge != publish');
requireText('docs/NONFUNCTIONAL_REQUIREMENTS.md', '**RTO:**', 'RTO must remain documented');
requireText('docs/INCIDENT_RUNBOOK.md', 'rollback', 'incident runbook must include rollback');
requireText('docs/PUBLIC_RELEASE_GATE.md', 'PUBLIC_BETA = BLOCKED', 'public release must remain blocked until manual gates are completed');
requireText('docs/PUBLIC_RELEASE_GATE.md', 'Inject a 5xx condition', 'release gate must require 5xx fault injection');
requireText('docs/PUBLIC_RELEASE_GATE.md', 'Inject consecutive provider failures', 'release gate must require provider-failure injection');
requireText('docs/PUBLIC_RELEASE_GATE.md', 'Inject 429', 'release gate must require rate-limit injection');
requireText('docs/PUBLIC_RELEASE_GATE.md', 'Sanitized API/provider outcome telemetry', 'release gate must verify sanitized telemetry');
requireText('docs/PUBLIC_RELEASE_GATE.md', '`nonfunctional-static` passes', 'Gate A must include the non-functional static job');

if (failures.length) {
  console.error('non-functional check: FAIL');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('non-functional check: PASS');
