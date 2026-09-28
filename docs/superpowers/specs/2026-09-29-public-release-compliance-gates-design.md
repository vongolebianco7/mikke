# Mikke Public Release Compliance Gates — Design Spec

Date: 2026-09-29
Status: Proposed for implementation
Scope: Shopping-monitoring MVP only

## 1. Goal

Make Mikke's public-release decision deterministic, auditable, and safe by separating compliance controls into three gates:

1. **Gate A — Automated CI gate**: machine-verifiable code, security, and compliance conditions.
2. **Gate B — Manual compliance gate**: provider terms, attribution presentation, privacy wording, pricing semantics, and other judgment-based checks.
3. **Gate C — Production smoke gate**: post-deploy verification in the real production environment before declaring PUBLIC BETA.

A release is approved only when all three gates pass. `merge != publish` remains a core rule.

## 2. Product constraints

- Free-first: no required paid or metered AI/API service.
- Official APIs / explicitly permitted sources first.
- No scraping/crawling is added by this work.
- Provider credentials remain server-side only.
- iPhone/Safari is the primary manual visual target.
- Provider terms are external and mutable; manual review dates must be recorded.
- New providers/categories do not inherit approval from existing providers.

## 3. Release states

- **BLOCKED**: any required automated/manual/production gate is incomplete or failing.
- **INTERNAL_BETA**: development/demo use only; production release prohibited.
- **PUBLIC_BETA**: all mandatory automated, manual, and production smoke gates pass.
- **PUBLIC**: mandatory gates pass and recommended operational controls are substantially complete.

Current status at design time: **INTERNAL_BETA**.

## 4. Gate A — Automated CI

### 4.1 Required CI jobs

GitHub Actions must expose four clearly named jobs/checks:

- `test`
- `security`
- `compliance-static`
- `build`

All four are mandatory for a release candidate.

### 4.2 `test`

Must verify:

- Watch parsing and condition extraction.
- Candidate evaluation.
- Missing/unknown attributes never satisfy hard requirements.
- Event derivation.
- Persistence and history behavior.
- Live/demo source handling.
- Rate limiting behavior.
- Duplicate in-flight request suppression.
- Provider timeout behavior.
- No automatic retry amplification.
- Delete-all local data behavior.
- Safe external URL handling.

### 4.3 `security`

Must verify at minimum:

- No obvious production credential patterns committed in tracked files.
- `.env`/secret files are ignored.
- Client bundle/source does not reference provider secret environment variable names as runtime values.
- API responses never include provider secrets.
- Dangerous URL schemes such as `javascript:` are rejected before rendering as outbound links.
- Dynamic text rendering does not create raw HTML injection paths from provider-controlled fields.

Use dependency-free checks where feasible. A free OSS secret scanner may be added only if it remains free and does not require a paid SaaS account.

### 4.4 `compliance-static`

Must verify repository artifacts and invariant implementation rules:

- `docs/COMPLIANCE.md` exists.
- `docs/PUBLIC_RELEASE_GATE.md` exists.
- `docs/PROVIDER_REGISTRY.md` exists.
- `PRIVACY.md` (or equivalent public privacy artifact) exists.
- `TERMS.md` / disclaimer artifact exists before public release.
- Delete-all-data action is implemented and covered by tests.
- Demo/live labeling logic exists and is covered by tests.
- Rakuten required attribution snippet is represented without app-defined mutation of the snippet itself.
- Yahoo! JAPAN required attribution snippet is represented using the provider-prescribed HTML form and is not styled by Mikke-specific CSS selectors.
- Public shopping API endpoint has server-side abuse controls enabled.
- Production-enabled providers must appear in `PROVIDER_REGISTRY.md` as `Approved`.

Static checks do not claim legal compliance; they prove that the repository contains the controls that humans have approved.

### 4.5 `build`

Must verify that the deployable app/API can be assembled without secrets and without paid dependencies. The build must fail if required release artifacts referenced by the app are missing.

## 5. Server-side abuse protection

### 5.1 Rate limit

The same-origin `/api/shopping-search` route must enforce a server-side limit before contacting external providers.

MVP design:

- Identify caller conservatively from platform-provided request IP headers, falling back to a non-identifying bucket when unavailable.
- Use a small in-memory fixed/sliding window suitable for a single serverless instance as a first layer.
- Return HTTP `429` with `Retry-After` when exceeded.
- Never contact Rakuten/Yahoo after the limit is exceeded.
- Do not treat the limiter as a billing/security boundary; production-scale distributed limiting is a future deployment concern.

The implementation must remain free and dependency-light.

### 5.2 Duplicate suppression

Concurrent identical searches should share one in-flight provider request per runtime instance.

Key should be derived from normalized search inputs, not secrets or raw IP.

This prevents double clicks / concurrent UI requests from multiplying provider traffic.

### 5.3 Provider traffic rules

Preserve the existing conservative behavior:

- one request per configured provider per check,
- max 20 results,
- 5-second timeout,
- no automatic retry,
- safe degradation on provider error.

These values may change only after a provider review and explicit documentation update.

## 6. Provider attribution

### 6.1 Rakuten

Current official Rakuten guidance requires credit for apps using Rakuten APIs and instructs developers to use the supplied HTML snippet as-is.

Mikke will:

- use one of the official supplied snippets verbatim,
- not rewrite the snippet's HTML,
- not present Mikke as a Rakuten service,
- visually verify placement on iPhone before release.

### 6.2 Yahoo! JAPAN

Current Yahoo! JAPAN developer guidance requires credit on sites/apps using its API, requires the prescribed HTML source, and prohibits modifications including CSS-based color changes or extremely small sizing.

Mikke will:

- use the prescribed Yahoo! attribution snippet verbatim,
- place it at the lower portion of the application according to the published placement rule,
- ensure no Mikke CSS selector alters the snippet/link color or text size,
- visually verify the link and rendering on iPhone before release.

### 6.3 Visibility model

For a production build configured to use a provider, the provider credit should be present consistently rather than relying solely on whether that provider happened to be contacted during the current browser session. Runtime source labels may still indicate which provider produced an individual result.

## 7. Privacy and data handling

A public MVP needs a privacy notice even without accounts.

The notice must accurately describe:

- Watch text and structured conditions sent to Mikke's same-origin API.
- Search terms/parameters transmitted onward to enabled official providers.
- Watch/history data stored locally in browser `localStorage`.
- Hosting/platform logs that may contain technical request information such as IP address, user agent, timestamps, and route metadata.
- No payment/account/profile data collected by the current MVP.
- Retention behavior for browser-local data.
- How users delete local Watch/history data.
- Contact method for privacy/compliance questions before general public release.

No analytics/tracking SDK is introduced by this release-gate work.

## 8. User data deletion

The UI must expose a clear action such as **「Watchと履歴をすべて削除」**.

Requirements:

- delete all Mikke-owned localStorage keys,
- require an explicit confirmation step,
- not delete unrelated origin storage,
- immediately update UI state,
- be covered by automated tests.

If cloud persistence is added later, this gate must be redesigned to cover server-side deletion and account deletion.

## 9. Pricing and result claims

Before PUBLIC BETA, Mikke must document the meaning of every displayed monetary field.

Rules:

- Never synthesize a reference/original price that the provider did not supply or that Mikke cannot justify.
- Only show percent-off when both comparison values have a defined, documented source and semantics.
- Do not call an offer “cheapest” unless the searched universe and comparison basis justify that claim.
- Clearly distinguish product price from shipping, points, membership-only pricing, coupons, taxes, or other adjustments unless explicitly included.
- Provider timestamps/availability may become stale; UI/disclaimer must direct the user to verify the final price/stock on the merchant page.

Until provider-normalized reference-price semantics are implemented, live cards should prefer the current price only and omit unsupported discount claims.

## 10. Gate B — Manual compliance checklist

`docs/PUBLIC_RELEASE_GATE.md` must contain owner-editable checkboxes and evidence fields.

Mandatory manual checks:

- Rakuten current terms reviewed.
- Rakuten API version / registration / attribution requirements reviewed.
- Yahoo! current terms reviewed.
- Yahoo! API rate/usage and attribution requirements reviewed.
- Review date recorded for every enabled provider.
- Reviewer/operator recorded.
- Provider app registration completed by the operator (never automated acceptance on the user's behalf).
- Production credentials configured only in server-side environment variables.
- iPhone Safari attribution visually verified.
- Demo/live distinction visually verified.
- Privacy notice checked against actual production data flow.
- Pricing wording checked for misleading claims.
- Contact path verified.
- Secret scan/Git history review completed before first public launch.

Each manual provider review records:

- provider,
- reviewed date,
- API/version,
- official reference URL(s),
- reviewer,
- decision (`Approved`, `Blocked`, `Needs follow-up`),
- notes.

## 11. Provider registry

`docs/PROVIDER_REGISTRY.md` is the source of truth for connectors.

Fields:

- Provider
- Connector/data method
- Production state
- Terms reviewed date
- API/version
- Attribution requirement
- Rate/usage notes
- Data retention/cache notes
- Affiliate state
- Manual review required again when

States:

- `Disabled`
- `Review Required`
- `Approved`
- `Suspended`

No provider may be enabled for production while its registry state is not `Approved`.

Initial entries:

- Rakuten Ichiba — official API — Review Required until operator completes current terms/app registration review.
- Yahoo! Shopping — official API — Review Required until operator completes current terms/app registration review.
- All other providers — Disabled.

## 12. Pull request compliance workflow

Add `.github/pull_request_template.md` with two sections.

### Automated

- tests
- security
- compliance-static
- build

### Manual impact declaration

Author must state whether the PR changes:

- external provider,
- endpoint/API version,
- requested fields,
- caching/retention,
- scheduled monitoring frequency,
- analytics/logging,
- pricing/discount display,
- affiliate behavior,
- user/account data handling,
- category (shopping/flight/hotel/etc.).

Any `yes` triggers manual compliance review and relevant documentation updates.

## 13. Gate C — Production smoke test

A successful merge does not mean release approval.

After deployment to a release/preview environment, manually verify:

1. App loads on current iPhone Safari.
2. Watch creation works.
3. Live provider search works for every enabled provider.
4. Provider attribution is visible, unmodified, and links correctly.
5. Demo mode is unmistakable when provider credentials are unavailable.
6. Provider failure does not masquerade as live results.
7. Rate limiting returns a safe 429 and does not hit upstream providers after the limit.
8. Product links open safely.
9. Privacy notice is reachable.
10. Terms/disclaimer is reachable.
11. Delete-all-data clears Mikke local data.
12. No secrets appear in client/network responses.

Record date, environment URL, reviewer, and pass/fail evidence in the release gate document or release issue.

## 14. Release decision rule

The release decision is mechanical:

```text
AUTO_GATE == PASS
AND MANUAL_GATE == PASS
AND PROD_SMOKE == PASS
=> PUBLIC_BETA = GO

otherwise
=> PUBLIC_BETA = BLOCKED
```

No silent exceptions. A deliberate exception requires an explicit documented risk acceptance by the operator and must not override provider terms or law.

## 15. Re-review triggers

Manual compliance review must run again when any of these change:

- new provider,
- API endpoint/version,
- requested provider fields,
- cache/storage behavior,
- automated check frequency,
- affiliate monetization,
- analytics/tracking,
- server logging behavior,
- account/cloud persistence,
- pricing/discount calculations,
- new product/service category,
- provider terms materially change.

## 16. Out of scope for this implementation

- Flight/hotel production connectors.
- Scraping/crawling.
- Affiliate monetization.
- User accounts / cloud persistence.
- Paid observability/security services.
- Automated acceptance of third-party terms.
- Automatic production publishing after merge.

## 17. Implementation deliverables after spec approval

1. `docs/PUBLIC_RELEASE_GATE.md`
2. `docs/PROVIDER_REGISTRY.md`
3. public privacy artifact and terms/disclaimer artifact
4. `.github/pull_request_template.md`
5. expanded GitHub Actions jobs (`test`, `security`, `compliance-static`, `build`)
6. dependency-free static compliance/security scripts
7. rate limit + in-flight deduplication in `/api/shopping-search`
8. delete-all local data UI + tests
9. safe outbound URL utility + tests
10. attribution implementation corrected to provider-prescribed snippets
11. pricing-display guardrails
12. final branch verification and PR update

## 18. Official references checked for this design

- Rakuten Web Service — branding/credit guidance: https://webservice.rakuten.co.jp/guide/credit
- Rakuten Web Service — usage/app registration guidance: https://webservice.rakuten.co.jp/guide
- Yahoo! Developer Network — attribution guidance: https://developer.yahoo.co.jp/attribution/

These external references are mutable. Their inclusion here is evidence of the design-time review, not a substitute for the manual pre-release review.
