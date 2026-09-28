# Mikke Public Release Gate

Status: INTERNAL_BETA

> `merge != publish`

PUBLIC_BETA is allowed only when Gate A, Gate B, and Gate C all pass.

## Gate A — Automated CI

- [ ] `test` passes
- [ ] `security` passes
- [ ] `compliance-static` passes
- [ ] `build` passes

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
