# Mikke Public Release Gate

Status: INTERNAL_BETA

> `merge != publish`

PUBLIC_BETA is allowed only when Gate A, Gate B, and Gate C all pass.

## Gate A — Automated CI

A release candidate must use an exact commit whose GitHub Actions `release-gates` run passes:

- [ ] `test` passes
- [ ] `security` passes
- [ ] `compliance-static` passes
- [ ] `nonfunctional-static` passes
- [ ] `build` passes

The automated suite must cover product/compatibility behavior plus sanitized telemetry, input bounds, controlled server errors, provider isolation/concurrency, explicit provider enablement, upstream 429 classification, minimal alert thresholds, safe URLs, deletion behavior, deployment security headers, dependency locking and release/compliance checks.

## Release-candidate environment

- Git repository: `vongolebianco7/mikke`
- Feature branch: `feat/mikke-mvp`
- Gate A tested commit SHA: _pending_
- Deployed release-candidate commit SHA: _pending_
- Validated PUBLIC_BETA release-candidate URL: _pending_
- [ ] The **deployed SHA exactly matches** the Gate A tested SHA.
- Previous Vercel feature deployment was rate-limited; that is not valid Gate C evidence.
- A stable release-candidate environment must exist before Gate C can pass.
- Existing `main` deployment remains separate from the feature branch until explicit release approval.

## Product Promise Gate

Before PUBLIC_BETA, the deployed product copy and actual behavior must agree.

- [ ] If scheduled/background monitoring and user notification are not implemented, the UI must not imply that Mikke autonomously watches conditions while the user is away.
- [ ] If UI uses terms such as `通知` / `見張ります`, the actual delivery/monitoring behavior is clearly explained.
- [ ] Any accepted manual-check beta limitation is visible in onboarding/core UI and documentation, not only in repository notes.

## Gate B — Manual compliance and operations

### Provider approval and runtime enablement

For every production-enabled provider:

- [ ] Operator completed current provider registration/terms acceptance.
- [ ] `docs/PROVIDER_REGISTRY.md` state is explicitly `Approved`.
- [ ] Required production credentials are configured server-side only.
- [ ] The matching `MIKKE_*_ENABLED=true` runtime flag is set only after approval.
- [ ] Credentials alone do not enable the provider.
- [ ] Setting the provider enable flag to false is verified as a kill switch.

Rakuten and Yahoo remain **Review Required** until their operator-side items and deployed attribution checks are complete.

### Manual checklist

- [x] Current public provider documentation researched for existing shopping connectors (2026-09-29; re-check at release if stale/materially changed)
- [ ] iPhone Safari attribution visually verified and only contacted providers are credited
- [ ] Demo/live distinction visually verified
- [ ] Compatibility state wording visually verified (`compatible / incompatible / unknown / unsupported`)
- [ ] Privacy notice matches production data flow and operational logging
- [ ] Hosting **log retention and access policy** verified and recorded
- [ ] Pricing wording checked for misleading claims
- [ ] Working user contact path verified
- [ ] One operator incident-alert path configured and tested
- [ ] `docs/NONFUNCTIONAL_REQUIREMENTS.md` reviewed against the actual RC environment
- [ ] `docs/INCIDENT_RUNBOOK.md` rollback / connector-disable path is executable
- [ ] Git history / secret review completed at release-candidate HEAD
- [ ] Repository protection/ruleset for `main` reviewed; required CI/status checks configured if hosting/account permissions allow it

## Gate C — Production / release-candidate smoke

Environment URL: _pending_
Gate A SHA: _pending_
Deployed SHA: _pending_
Review date: _pending_
Reviewer: _pending_

### Core user flow

- [ ] App loads in current iPhone Safari
- [ ] Watch creation works
- [ ] Watch edit / save / reload works
- [ ] Every enabled live provider works
- [ ] Provider attribution is visible, unmodified, and limited to contacted providers
- [ ] Demo mode is unmistakable
- [ ] Product links open safely
- [ ] Privacy notice is reachable
- [ ] Terms/disclaimer is reachable
- [ ] Delete-all-data clears only Mikke-owned local data

### Security / deployment response

- [ ] HTTPS is active on the RC URL
- [ ] Actual RC response includes `Content-Security-Policy`
- [ ] CSP blocks framing and does not contain `unsafe-eval`
- [ ] Actual RC response includes `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and HSTS as configured
- [ ] Security headers do not break the current iPhone Safari core flow
- [ ] No provider secrets appear in browser bundle/client/network responses

### Failure and resilience smoke

- [ ] Provider failure never masquerades as live data
- [ ] One provider failure does not suppress valid results from another provider
- [ ] Missing compatibility evidence never becomes a confirmed match
- [ ] Mikke-side rate limiting returns 429 without calling upstream
- [ ] Provider-side 429 is identifiable as provider `rate_limited`, retains status code, and causes no automatic retry
- [ ] Forced unexpected API error returns controlled 5xx without stack/query/secret leakage
- [ ] Deep/oversized structured conditions are rejected without provider access
- [ ] Provider timeout/failure causes no automatic retry storm
- [ ] Sanitized API/provider outcome telemetry appears in operational logs
- [ ] Raw Watch text, full credential-bearing upstream URLs, and provider secrets do not appear in those operational logs

### Incident readiness smoke

- [ ] Inject a 5xx condition and verify it can be identified from logs/metrics
- [ ] Inject consecutive provider failures and verify affected-provider isolation
- [ ] Inject 429 on both Mikke-side and provider-side paths and verify the two are distinguishable
- [ ] Verify threshold semantics: 5xx >=5 & >=5%, API 429 >=5 or >=10%, provider WARN=3 and CRITICAL=5, 30-minute duplicate cooldown
- [ ] Verify the configured operator alert path receives a test incident notification; the in-process evaluator alone is not sufficient production alerting
- [ ] Verify affected connector can be disabled with `MIKKE_RAKUTEN_ENABLED=false` / `MIKKE_YAHOO_ENABLED=false` without taking down unaffected functionality
- [ ] Verify a known-good rollback target is identifiable and deployable
- [ ] After recovery: manual check -> several live checks -> 5-10 minutes stable before declaring resolved

### Reproducibility / release integrity

- [ ] `package-lock.json` is present at the RC SHA
- [ ] CI uses `npm ci`
- [ ] GitHub Actions used by release gates are pinned to immutable full SHAs
- [ ] Deployed RC SHA exactly equals the SHA whose five Gate A jobs passed

## Accepted public-beta limitations

These are acceptable only if documented and verified to degrade safely:

- Serverless in-memory rate limiting, in-flight de-duplication, and the in-process alert evaluator are per runtime/process, not globally consistent distributed controls.
- Provider availability is outside Mikke control.
- Watch/history data is browser-local with no Mikke cloud backup or multi-device sync.
- Initial incident monitoring may use hosting logs plus one operator notification path rather than paid APM.

## Decision

```text
AUTO_GATE == PASS
AND PRODUCT_PROMISE_GATE == PASS
AND MANUAL_GATE == PASS
AND PROD_SMOKE == PASS
AND TESTED_SHA == DEPLOYED_SHA
=> PUBLIC_BETA = GO

otherwise
=> PUBLIC_BETA = BLOCKED
```

Current decision: **PUBLIC_BETA = BLOCKED**

Reason: final integrated Gate A evidence, product-promise alignment, provider approvals/credentials/enable flags, stable RC environment, iPhone/live-provider verification, log retention/access verification, incident notification path, repository protection review, exact deployed-SHA evidence, and production smoke remain incomplete.
