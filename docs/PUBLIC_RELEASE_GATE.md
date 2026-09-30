# Mikke Public Release Gate

Status: INTERNAL_BETA

> `merge != publish`

PUBLIC_BETA is allowed only when Gate A, Gate B, and Gate C all pass.

## Gate A — Automated CI

Latest integrated feature evidence before this documentation-only refresh:

- Feature code head: `0b92615b72e0660719a4055ae0eed9b6fd4f759b`
- GitHub Actions release-gates run: `36725486982`
- [x] `test` passes
- [x] `security` passes
- [x] `compliance-static` passes
- [x] `build` passes

This evidence covers the integrated Product Watch / Compatibility work, including:
- broad product-domain support
- required / preferred / notification / comparison roles
- compatibility evaluation and ranking
- explicit compatible / incompatible / unknown / unsupported evidence states
- connector-boundary compatibility evidence handling
- generic cross-category exclusion clauses such as `除外 / 不可 / 不要`

Because this file update changes the branch HEAD, a fresh release-gates run for the documentation-refresh commit must also pass before release.

## Release-candidate environment

- Git repository: `vongolebianco7/mikke`
- Feature branch: `feat/mikke-mvp`
- Validated PUBLIC_BETA release-candidate URL: _pending_
- Existing Vercel deployment status on feature code head `0b92615b...`: **deployment rate limited**
- Vercel status description: `Deployment rate limited — retry in 24 hours.`
- Therefore no stable release-candidate environment is currently accepted as Gate C evidence.
- Existing `main` deployment remains separate from this feature branch.

## Gate B — Manual compliance

### Rakuten Ichiba
- Provider: Rakuten Ichiba
- Public-doc research date: 2026-09-29
- Operator review/acceptance: _pending_
- API/version confirmed from current docs: Ichiba Item Search API `2026-07-01`
- Official references:
  - https://webservice.rakuten.co.jp/documentation/ichiba-item-search
  - https://webservice.rakuten.co.jp/guide/credit
  - https://webservice.rakuten.co.jp/guide
  - https://webservice.rakuten.co.jp/guide/rule
- Research result:
  - [x] current API endpoint/version identified
  - [x] current credit requirement identified
  - [x] current supplied-HTML requirement identified
  - [x] short-time repeated-identical-URL warning identified
  - [x] app registration requirement identified
  - [ ] operator completes Rakuten app registration and accepts current terms
  - [ ] deployed Mikke credit is visually verified against current official snippet
- Decision: **Review Required** until the operator-side items above are complete.

### Yahoo! Shopping
- Provider: Yahoo! Shopping
- Public-doc research date: 2026-09-29
- Operator review/acceptance: _pending_
- API/version: Shopping Web API v3
- Official references:
  - https://developer.yahoo.co.jp/webapi/shopping/
  - https://developer.yahoo.co.jp/attribution/
- Research result:
  - [x] developer-guideline agreement requirement identified
  - [x] registered Client ID requirement identified
  - [x] 1 query/second note identified
  - [x] prescribed credit HTML requirement identified
  - [x] prohibition on HTML modification / CSS color changes / extremely small credit identified
  - [x] bottom-of-app/site placement rule identified
  - [ ] operator completes Yahoo application registration and accepts current terms
  - [ ] deployed Mikke credit is visually verified against the prescribed HTML/placement
- Decision: **Review Required** until the operator-side items above are complete.

### Manual checklist
- [x] Current public provider documentation researched for every enabled provider (2026-09-29)
- [ ] Operator has reviewed/accepted current provider terms for every enabled provider
- [ ] Provider app registration completed by operator
- [ ] Production credentials configured server-side only
- [ ] iPhone Safari attribution visually verified
- [ ] Demo/live distinction visually verified
- [ ] Compatibility state wording visually verified (`compatible / incompatible / unknown / unsupported`)
- [ ] Privacy notice matches production data flow
- [ ] Pricing wording checked for misleading claims
- [ ] Contact path verified
- [ ] Git history / secret review completed at release-candidate HEAD

## Gate C — Production smoke

Environment URL: _pending_
Review date: _pending_
Reviewer: _pending_

- [ ] App loads in current iPhone Safari
- [ ] Watch creation works
- [ ] Watch edit / save / reload works
- [ ] Every enabled live provider works
- [ ] Provider attribution is visible and unmodified
- [ ] Demo mode is unmistakable
- [ ] Provider failure never masquerades as live data
- [ ] Missing compatibility evidence never becomes a confirmed match
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

Reason: automated Gate A is green for the integrated feature code, but operator-side provider registration/acceptance, a stable release-candidate deployment, deployed iPhone attribution verification, and production smoke testing remain incomplete.
