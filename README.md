# Mikke

**欲しい条件になったら、見つけておいてくれる。**

Mikke is a condition-monitoring app concept that starts with shopping and expands to flights, hotels, tickets, cars, and other watchable conditions.

## Current milestone

The first vertical slice is dependency-free and free-first:

- Natural-language Watch creation in Japanese
- Watch type inference: shopping / flight / hotel
- Shopping condition extraction and Product Watch condition roles
- Required/preferred condition evaluation and compatibility evidence states
- Event derivation for condition match, new result, price drop, and restock
- Local browser persistence for Watches, observations, and meaningful events
- iPhone-first Today / Watch / Create / History flows
- Server-side adapters for the official Rakuten Ichiba and Yahoo! Shopping APIs
- Explicitly labeled deterministic demo data when no official provider is configured/available
- Provider attribution shown only when the corresponding provider is actually contacted
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

For a deployment/runtime that supports the `api/` server route, configure these **server-side only** environment variables after you have registered the relevant developer applications and accepted the providers' current terms:

```text
RAKUTEN_APPLICATION_ID=
RAKUTEN_ACCESS_KEY=
YAHOO_APP_ID=
```

Never put real credentials in `.env.example`, browser code, logs, or Git.

## Test

```bash
npm test
```

No npm install is required for this milestone; tests use Node's built-in test runner. The suite covers parsing, candidate evaluation, provider request/normalization behavior, secure API boundaries, Watch persistence, history, attribution visibility, operational telemetry, and failure-path behavior.

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
- Meaningful events only; avoid noisy repeated notifications
- Demo data must never look like live offers
- Browser-local Watch/history data has no Mikke cloud backup or multi-device recovery
- In-memory serverless rate limiting and in-flight de-duplication are best-effort per runtime/process, not global distributed quotas
- `merge != publish`; public beta requires automated, manual-compliance, and release-candidate smoke gates

See:

- [`docs/NONFUNCTIONAL_REQUIREMENTS.md`](docs/NONFUNCTIONAL_REQUIREMENTS.md) — public-beta availability, performance, security, privacy, recovery, cost, and client baseline
- [`docs/INCIDENT_RUNBOOK.md`](docs/INCIDENT_RUNBOOK.md) — 5xx/provider/429 containment, diagnosis, rollback, and staged recovery
- [`docs/COMPLIANCE.md`](docs/COMPLIANCE.md) — launch checklist and connector guardrails
- [`docs/PUBLIC_RELEASE_GATE.md`](docs/PUBLIC_RELEASE_GATE.md) — exact release decision gate

## Still required before PUBLIC_BETA

1. Operator registration/terms acceptance and `Approved` state for each enabled provider.
2. Production credentials configured server-side only.
3. Stable release-candidate environment pinned to an exact commit SHA.
4. Current iPhone Safari verification of live providers, attribution, demo/live distinction, compatibility wording, Privacy/Terms, and delete-all-data.
5. Fault-injection smoke for controlled 5xx, provider isolation, 429, safe logs, and rollback/connector disablement.
6. One working operator contact path and one working incident-alert path.
7. Final Git-history, browser-bundle, network-response, and operational-log secret review.

## Later product work

- Scheduled monitoring with conservative request de-duplication/rate control
- In-app notification controls and richer history detail
- Compliant free flight-data source research before enabling a flight connector
- Cloud persistence only when accounts/shared multi-device sync are actually required
