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

The automated suite must cover product/compatibility behavior plus the non-functional boundary work: sanitized telemetry, input bounds, controlled server errors, provider isolation/concurrency, safe URLs, deletion behavior, and release/compliance checks.

## Release-candidate environment

- Git repository: `vongolebianco7/mikke`
- Feature branch: `feat/mikke-mvp`
- Exact release-candidate commit SHA: _pending_
- Validated PUBLIC_BETA release-candidate URL: _pending_
- Previous Vercel feature deployment was rate-limited; that is not valid Gate C evidence.
- A stable release-candidate environment must exist before Gate C can pass.
- Existing `main` deployment remains separate from the feature branch until explicit release approval.

## Gate B — Manual compliance and operations

### Rakuten Ichiba
- Provider: Rakuten Ichiba
- Public-doc research date: 2026-09-29
- Operator review/acceptance: _pending_
- API/version confirmed from current docs: Ichiba Item Search API `2026-07-01`
- [x] current API endpoint/version identified
- [x] current credit requirement identified
- [x] current supplied-HTML requirement identified
- [x] short-time repeated-identical-URL warning identified
- [x] app registration requirement identified
- [ ] operator completes Rakuten app registration and accepts current terms
- [ ] deployed Mikke credit is visually verified against current official snippet
- Decision: **Review Required** until operator-side items are complete.

### Yahoo! Shopping
- Provider: Yahoo! Shopping
- Public-doc research date: 2026-09-29
- Operator review/acceptance: _pending_
- API/version: Shopping Web API v3
- [x] developer-guideline agreement requirement identified
- [x] registered Client ID requirement identified
- [x] 1 query/second note identified
- [x] prescribed credit HTML requirement identified
- [x] prohibition on HTML modification / CSS color changes / extremely small credit identified
- [x] bottom-of-app/site placement rule identified
- [ ] operator completes Yahoo application registration and accepts current terms
- [ ] deployed Mikke credit is visually verified against prescribed HTML/placement
- Decision: **Review Required** until operator-side items are complete.

### Manual checklist
- [x] Current public provider documentation researched for every enabled provider (2026-09-29)
- [ ] Operator has reviewed/accepted current provider terms for every enabled provider
- [ ] Provider app registration completed by operator
- [ ] Every production-enabled provider is explicitly `Approved` in `docs/PROVIDER_REGISTRY.md`
- [ ] Production credentials configured server-side only
- [ ] iPhone Safari attribution visually verified
- [ ] Demo/live distinction visually verified
- [ ] Compatibility state wording visually verified (`compatible / incompatible / unknown / unsupported`)
- [ ] Privacy notice matches production data flow and operational logging
- [ ] Pricing wording checked for misleading claims
- [ ] Working contact path verified
- [ ] One operator incident-alert path configured and tested
- [ ] `docs/NONFUNCTIONAL_REQUIREMENTS.md` reviewed against the actual RC environment
- [ ] `docs/INCIDENT_RUNBOOK.md` rollback / connector-disable path is executable
- [ ] Git history / secret review completed at release-candidate HEAD
- [ ] Repository protection/ruleset for `main` reviewed; required CI/status checks configured if the hosting/account permissions allow it

## Gate C — Production / release-candidate smoke

Environment URL: _pending_
Exact commit SHA: _pending_
Review date: _pending_
Reviewer: _pending_

### Core user flow
- [ ] App loads in current iPhone Safari
- [ ] Watch creation works
- [ ] Watch edit / save / reload works
- [ ] Every enabled live provider works
- [ ] Provider attribution is visible and unmodified
- [ ] Demo mode is unmistakable
- [ ] Product links open safely
- [ ] Privacy notice is reachable
- [ ] Terms/disclaimer is reachable
- [ ] Delete-all-data clears only Mikke-owned local data

### Failure and resilience smoke
- [ ] Provider failure never masquerades as live data
- [ ] One provider failure does not suppress valid results from another provider
- [ ] Missing compatibility evidence never becomes a confirmed match
- [ ] Rate limiting returns 429 without calling upstream
- [ ] Forced unexpected API error returns controlled 5xx without stack/query/secret leakage
- [ ] Deep/oversized structured conditions are rejected without provider access
- [ ] Provider timeout/failure causes no automatic retry storm
- [ ] Sanitized API/provider outcome telemetry appears in operational logs
- [ ] Raw Watch text, full credential-bearing upstream URLs, and provider secrets do not appear in those operational logs
- [ ] No provider secrets appear in browser bundle/client/network responses

### Incident readiness smoke
- [ ] Inject a 5xx condition and verify it can be identified from logs/metrics
- [ ] Inject consecutive provider failures and verify affected-provider isolation
- [ ] Inject 429 and verify upstream calls are blocked/reduced as designed
- [ ] Verify the configured operator alert path receives a test incident notification
- [ ] Verify affected connector can be disabled without taking down unaffected functionality
- [ ] Verify a known-good rollback target is identifiable and deployable
- [ ] After recovery: manual check -> several live checks -> 5-10 minutes stable before declaring resolved

## Accepted public-beta limitations

These are acceptable only if documented and verified to degrade safely:

- Serverless in-memory rate limiting and in-flight de-duplication are per runtime/process, not a globally consistent distributed quota.
- Provider availability is outside Mikke control.
- Watch/history data is browser-local with no Mikke cloud backup or multi-device sync.
- Initial incident monitoring may use hosting logs plus one operator notification path rather than paid APM.

## Decision

```text
AUTO_GATE == PASS
AND MANUAL_GATE == PASS
AND PROD_SMOKE == PASS
=> PUBLIC_BETA = GO

otherwise
=> PUBLIC_BETA = BLOCKED
```

Current decision: **PUBLIC_BETA = BLOCKED**

Reason: Gate A must be re-recorded at the final integrated release-candidate HEAD, while operator provider approval/credentials, a stable RC environment, iPhone/live-provider verification, incident notification path, repository protection review, and production smoke remain incomplete.
