# Mikke Public Release Gate

Status: INTERNAL_BETA

> `merge != publish`

PUBLIC_BETA is allowed only when Gate A, Gate B, and Gate C all pass.

## Gate A — Automated CI

Evidence recorded from GitHub Actions run `36486907491` on branch head `9aa8da46b93485e6ad0af2a61c5f669297609c8a`:

- [x] `test` passes
- [x] `security` passes
- [x] `compliance-static` passes
- [x] `build` passes

Any code change after this evidence requires a fresh Gate A run before release.

## Preview environment

- Vercel project: `mikke-preview`
- Git repository: `vongolebianco7/mikke`
- Git integration: connected
- Intended preview branch: `feat/mikke-mvp`
- Purpose: iPhone/manual review only; this is not production approval.

## Gate B — Manual compliance

### Rakuten Ichiba
- Provider: Rakuten Ichiba
- Review date: _not reviewed for public launch_
- API/version: Ichiba Item Search API / current production version to be confirmed
- Official references: https://webservice.rakuten.co.jp/
- Reviewer: _pending_
- Decision: Review Required
- Notes: Provider registration, current terms, attribution, rate/usage, cache/retention must be reviewed before public launch.

### Yahoo! Shopping
- Provider: Yahoo! Shopping
- Review date: _not reviewed for public launch_
- API/version: Shopping API v3 / current production version to be confirmed
- Official references: https://developer.yahoo.co.jp/
- Reviewer: _pending_
- Decision: Review Required
- Notes: Provider registration, current terms, attribution, rate/usage, cache/retention must be reviewed before public launch.

### Manual checklist
- [ ] Current provider terms reviewed for every enabled provider
- [ ] Provider app registration completed by operator
- [ ] Production credentials configured server-side only
- [ ] iPhone Safari attribution visually verified
- [ ] Demo/live distinction visually verified
- [ ] Privacy notice matches production data flow
- [ ] Pricing wording checked for misleading claims
- [ ] Contact path verified
- [ ] Git history / secret review completed

## Gate C — Production smoke

Environment URL: _pending_
Review date: _pending_
Reviewer: _pending_

- [ ] App loads in current iPhone Safari
- [ ] Watch creation works
- [ ] Every enabled live provider works
- [ ] Provider attribution is visible and unmodified
- [ ] Demo mode is unmistakable
- [ ] Provider failure never masquerades as live data
- [ ] Rate limiting returns 429 without calling upstream
- [ ] Product links open safely
- [ ] Privacy notice is reachable
- [ ] Terms/disclaimer is reachable
- [ ] Delete-all-data clears only Mikke-owned local data
- [ ] No provider secrets appear in client/network responses

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

Reason: Gate B and Gate C are intentionally incomplete until operator/provider review and a real production smoke test are performed.
