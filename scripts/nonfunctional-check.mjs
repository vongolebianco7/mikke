import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
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

// Provider resilience, approval gating and cost controls.
requireText('src/server/shoppingProviders.js', 'AbortSignal.timeout(5000)', 'provider calls must retain a 5s timeout');
requireText('src/server/shoppingProviders.js', "hits: '20'", 'Rakuten results must stay capped at 20');
requireText('src/server/shoppingProviders.js', "results: '20'", 'Yahoo results must stay capped at 20');
requireText('src/server/shoppingProviders.js', 'Promise.all', 'independent providers must execute concurrently');
requireText('src/server/shoppingProviders.js', 'MIKKE_RAKUTEN_ENABLED', 'Rakuten must require an explicit runtime enable flag');
requireText('src/server/shoppingProviders.js', 'MIKKE_YAHOO_ENABLED', 'Yahoo must require an explicit runtime enable flag');
requireText('src/server/shoppingProviders.js', "status: 'disabled'", 'disabled provider state must be explicit');
requireText('src/server/shoppingProviders.js', "'rate_limited'", 'upstream 429 must be distinct from generic provider errors');
requireText('.env.example', 'MIKKE_RAKUTEN_ENABLED=false', 'Rakuten must default disabled');
requireText('.env.example', 'MIKKE_YAHOO_ENABLED=false', 'Yahoo must default disabled');

// Minimal alert evaluator invariants.
if (!exists('src/server/alertEvaluator.js')) failures.push('alert evaluator must exist');
else {
  requireText('src/server/alertEvaluator.js', '5 * 60 * 1000', 'alert evaluator must use a five-minute window');
  requireText('src/server/alertEvaluator.js', '30 * 60 * 1000', 'alert evaluator must retain a 30-minute cooldown');
  requireText('src/server/alertEvaluator.js', 'ratio >= 0.05', '5xx ratio threshold must remain 5 percent');
  requireText('src/server/alertEvaluator.js', 'ratio >= 0.10', '429 ratio threshold must remain 10 percent');
  requireText('src/server/alertEvaluator.js', 'consecutive >= 5', 'provider CRITICAL threshold must remain five consecutive failures');
  requireText('src/server/alertEvaluator.js', 'consecutive >= 3', 'provider WARN threshold must remain three consecutive failures');
}

// Sanitized operational telemetry: allowlist fields only.
const telemetry = read('src/server/operationalTelemetry.js');
for (const forbidden of ['rawQuery', 'query', 'url', 'accessKey', 'applicationId', 'authorization']) {
  if (telemetry.includes(`'${forbidden}'`) || telemetry.includes(`\"${forbidden}\"`)) {
    failures.push(`operational telemetry allowlist must not include ${forbidden}`);
  }
}
requireText('src/server/operationalTelemetry.js', "const API_FIELDS = ['route', 'outcome', 'statusCode', 'durationMs']", 'API telemetry fields must remain allowlisted');
requireText('src/server/operationalTelemetry.js', "const PROVIDER_FIELDS = ['provider', 'outcome', 'statusCode', 'durationMs']", 'provider telemetry fields must remain allowlisted');

// Reproducible CI and supply-chain controls.
if (!exists('package-lock.json')) failures.push('package-lock.json must be committed');
const workflow = read('.github/workflows/test.yml');
if (!workflow.includes('npm ci --no-audit --no-fund')) failures.push('release CI must install from package-lock using npm ci');
if (workflow.includes('actions/checkout@v4')) failures.push('checkout action must be pinned to an immutable SHA');
if (workflow.includes('actions/setup-node@v4')) failures.push('setup-node action must be pinned to an immutable SHA');
if (!/actions\/checkout@[0-9a-f]{40}/.test(workflow)) failures.push('checkout action full SHA pin missing');
if (!/actions\/setup-node@[0-9a-f]{40}/.test(workflow)) failures.push('setup-node action full SHA pin missing');

// Repo-owned deployment security headers.
if (!exists('vercel.json')) failures.push('deployment security-header config must be committed');
else {
  const deployment = read('vercel.json');
  for (const header of ['Content-Security-Policy', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy', 'Strict-Transport-Security']) {
    if (!deployment.includes(header)) failures.push(`deployment header missing: ${header}`);
  }
  if (deployment.includes("'unsafe-eval'")) failures.push('CSP must not allow unsafe-eval');
  if (!deployment.includes("frame-ancestors 'none'")) failures.push('CSP must block framing');
}

// Release governance must keep the manual/public boundary explicit.
requireText('docs/NONFUNCTIONAL_REQUIREMENTS.md', 'merge != publish', 'non-functional baseline must preserve merge != publish');
requireText('docs/NONFUNCTIONAL_REQUIREMENTS.md', '**RTO:**', 'RTO must remain documented');
requireText('docs/NONFUNCTIONAL_REQUIREMENTS.md', 'credentials alone', 'NFR must state credentials alone cannot enable a provider');
requireText('docs/NONFUNCTIONAL_REQUIREMENTS.md', 'provider-side 429', 'NFR must distinguish provider-side 429');
requireText('docs/INCIDENT_RUNBOOK.md', 'rollback', 'incident runbook must include rollback');
requireText('docs/INCIDENT_RUNBOOK.md', 'MIKKE_RAKUTEN_ENABLED', 'runbook must document the provider kill switch');
requireText('docs/PUBLIC_RELEASE_GATE.md', 'PUBLIC_BETA = BLOCKED', 'public release must remain blocked until manual gates are completed');
requireText('docs/PUBLIC_RELEASE_GATE.md', 'Inject a 5xx condition', 'release gate must require 5xx fault injection');
requireText('docs/PUBLIC_RELEASE_GATE.md', 'Inject consecutive provider failures', 'release gate must require provider-failure injection');
requireText('docs/PUBLIC_RELEASE_GATE.md', 'Inject 429', 'release gate must require rate-limit injection');
requireText('docs/PUBLIC_RELEASE_GATE.md', 'Sanitized API/provider outcome telemetry', 'release gate must verify sanitized telemetry');
requireText('docs/PUBLIC_RELEASE_GATE.md', '`nonfunctional-static` passes', 'Gate A must include the non-functional static job');
requireText('docs/PUBLIC_RELEASE_GATE.md', 'deployed SHA exactly matches', 'release gate must bind deployed RC to tested SHA');
requireText('docs/PUBLIC_RELEASE_GATE.md', 'Content-Security-Policy', 'release gate must verify deployed CSP');
requireText('docs/PUBLIC_RELEASE_GATE.md', 'log retention', 'release gate must verify hosting log retention/access policy');

if (failures.length) {
  console.error('non-functional check: FAIL');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('non-functional check: PASS');
