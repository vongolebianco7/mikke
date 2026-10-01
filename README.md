# Mikke

**欲しい条件を登録して、必要なときに変化を確認する。**

Mikke is a Watch app concept that starts with shopping and expands to flights, hotels, tickets, cars, and other watchable conditions.

> Current PUBLIC_BETA candidate behavior is **manual-check**. Background/scheduled monitoring and external push notification are not implemented yet. The UI must not imply otherwise.

## Current milestone

The first vertical slice is free-first:

- Natural-language Watch creation in Japanese
- Watch type inference: shopping / flight / hotel
- Shopping condition extraction and Product Watch condition roles
- Required/preferred condition evaluation and compatibility evidence states
- Event derivation for condition match, new result, price drop, and restock when a Watch is checked
- Local browser persistence for Watches, observations, decisions, and meaningful events
- Explicit user-facing failure when a Watch cannot be saved to browser storage
- iPhone-first Today / Watch / Create / History flows
- Server-side adapters for the official Rakuten Ichiba and Yahoo! Shopping APIs
- Explicitly labeled deterministic demo data when no official provider is configured/available
- Provider attribution shown only for providers represented as contacted by the live result summary; deployed provider-required HTML/placement still needs release-candidate visual verification
- Bounded shopping API input, controlled unexpected-error responses, and `Cache-Control: no-store`
- Sanitized operational telemetry that excludes raw Watch text, credentials, and full provider request URLs
- Independent shopping providers run concurrently and fail independently; provider calls are not automatically retried

The shared Watch/Event domain is provider-independent. Provider credentials stay on the server; browser code calls only the same-origin `/api/shopping-search` route.

## Run locally

The static UI can run without credentials:

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`. Because a plain static server does not expose the serverless API route, shopping checks use clearly labeled demo data.

For a deployment/runtime that supports the `api/` server route, a provider requires **both** its server-side credential variables and its explicit runtime enable flag. Leave enable flags false until operator registration/terms review is complete and the provider is `Approved` in `docs/PROVIDER_REGISTRY.md`.

```text
MIKKE_RAKUTEN_ENABLED=false
RAKUTEN_APPLICATION_ID=
RAKUTEN_ACCESS_KEY=

MIKKE_YAHOO_ENABLED=false
YAHOO_APP_ID=
```

Credentials alone must not enable provider traffic. Never put real credentials in `.env.example`, browser code, logs, or Git.

## Test

```bash
npm ci
npm test
```

`package-lock.json` is committed so CI and local release verification resolve the same dependency graph. The suite covers parsing, candidate evaluation, provider request/normalization behavior, secure API boundaries, Watch persistence, history, attribution visibility, operational telemetry, and failure-path behavior.

## Product and operating constraints

- Free-first: no mandatory metered AI/API or monitoring service
- Official APIs / permitted data sources first
- No scraping in the current implementation
- Scraping can only be considered later after per-site terms, robots policy, access frequency, and load are explicitly reviewed
- Provider secrets are server-side only
- Provider failures are not automatically retried
- Provider result counts are conservatively capped at 20 per check
- Provider timeout is 5 seconds; independent providers run concurrently
- iPhone Safari is the release-blocking client
- Current beta is manual-check; do not market background monitoring or push notification as implemented
- Meaningful events only; avoid noisy repeated notifications if/when external notification is implemented
- Demo data must never look like live offers
- Browser-local Watch/history/decision data has no Mikke cloud backup or multi-device recovery
- In-memory serverless rate limiting, in-flight de-duplication, and the minimal alert evaluator are best-effort per runtime/process, not global distributed controls
- `merge != publish`; public beta requires Product Promise, automated, manual-compliance, and release-candidate smoke gates

See:

- [`docs/NONFUNCTIONAL_REQUIREMENTS.md`](docs/NONFUNCTIONAL_REQUIREMENTS.md) — public-beta availability, performance, security, privacy, recovery, cost, and client baseline
- [`docs/INCIDENT_RUNBOOK.md`](docs/INCIDENT_RUNBOOK.md) — 5xx/provider/429 containment, diagnosis, rollback, and staged recovery
- [`docs/COMPLIANCE.md`](docs/COMPLIANCE.md) — launch checklist and connector guardrails
- [`docs/PUBLIC_RELEASE_GATE.md`](docs/PUBLIC_RELEASE_GATE.md) — exact release decision gate

## Still required before PUBLIC_BETA

1. Operator registration/terms acceptance and `Approved` state for each enabled provider.
2. Production credentials and explicit provider enable flags configured server-side only.
3. Stable release-candidate environment pinned to the exact Gate A commit SHA.
4. Current iPhone Safari verification of live providers, provider-required attribution, demo/live distinction, compatibility wording, Privacy/Terms, browser-storage behavior, and delete-all-data.
5. VoiceOver/basic accessibility verification including readable labels, tap targets, focus behavior, and user-visible errors.
6. Fault-injection smoke for controlled 5xx, provider isolation, Mikke/provider 429, safe logs, and rollback/connector disablement.
7. One working operator contact path and one working incident-alert path.
8. Final Git-history, browser-bundle, network-response, and operational-log secret review.
9. Hosting log retention/access policy verification.

## Later product work

- Scheduled/background monitoring with conservative request de-duplication/rate control
- External/in-app notification delivery and user controls
- Richer history detail
- Compliant free flight-data source research before enabling a flight connector
- Cloud persistence only when accounts/shared multi-device sync are actually required
