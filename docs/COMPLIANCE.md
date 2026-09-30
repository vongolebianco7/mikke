# Mikke Compliance and Safety Policy

This document is a development guardrail, not legal advice. Provider terms can change, so re-check the current official terms before public launch and whenever a connector changes.

## Release governance

Mikke uses three mandatory release gates documented in `docs/PUBLIC_RELEASE_GATE.md`:

- Gate A — automated CI
- Gate B — manual compliance review
- Gate C — production smoke verification

`merge != publish`. A merge never implies PUBLIC_BETA approval. Enabled production connectors are governed by `docs/PROVIDER_REGISTRY.md`; a provider that is not `Approved` must not be treated as production-approved.

The public-beta non-functional baseline is defined in `docs/NONFUNCTIONAL_REQUIREMENTS.md`. Production incident response is defined in `docs/INCIDENT_RUNBOOK.md`. These are release inputs, not optional post-launch documentation.

## Core rules

1. Use official APIs or other explicitly permitted data sources first.
2. Do not scrape or crawl a provider unless its current terms, robots policy, access pattern, and load implications have been separately reviewed and documented.
3. Keep provider credentials server-side only. Never embed them in browser JavaScript, HTML, logs, URLs shown to users, or committed source files.
4. Do not use paid or metered AI/API services for the default Mikke flow. A future paid integration requires an explicit product decision.
5. Send only the minimum search data required for a Watch to the selected provider.
6. Do not silently substitute demo/sample data for live data. Sample mode must be visibly identified in the UI.
7. Preserve required provider attribution/credits whenever provider data is shown.
8. Avoid aggressive traffic. Current adapters make at most one request per configured provider per user check, cap results at 20, apply a 5-second timeout, and do not automatically retry failures. Independent configured providers may run concurrently to avoid additive timeout latency.
9. A provider failure must degrade safely: show unavailable/demo state rather than repeatedly hitting the provider.
10. New connectors require a terms-and-data-use review before implementation is enabled in production.
11. New providers/categories do not inherit approval from existing providers.
12. Pricing claims must not invent unsupported reference prices, discount percentages, or “cheapest” claims.
13. Operational telemetry must be metadata-only. Raw Watch text, full provider request URLs, credentials, localStorage contents, and authorization values must not be intentionally logged.
14. In-memory serverless rate limiting and in-flight deduplication are defense-in-depth controls only; they must not be represented as globally consistent distributed quotas.
15. Unexpected server exceptions must fail closed with controlled responses and must not expose stack traces, credentials, or query content.

## Rakuten Ichiba

- Connector uses the official Rakuten Ichiba Item Search API endpoint configured in `src/server/shoppingProviders.js`.
- Credentials: `RAKUTEN_APPLICATION_ID` and `RAKUTEN_ACCESS_KEY`, server-side only.
- Results are limited to 20 and in-stock products.
- Before launch, the operator must create/maintain the required Rakuten developer account, accept current terms, and verify that the selected API version and attribution requirements remain valid.
- Provider state remains `Review Required` until the manual Gate B review is completed and recorded.

## Yahoo! Shopping

- Connector uses the official Yahoo! Shopping Item Search API endpoint configured in `src/server/shoppingProviders.js`.
- Credential: `YAHOO_APP_ID`, server-side only.
- Results are limited to 20 and requests prefer in-stock/new items when the Watch requests new-only products.
- Before launch, the operator must create/maintain the required Yahoo developer application, accept current terms, and verify current rate/attribution requirements.
- Provider state remains `Review Required` until the manual Gate B review is completed and recorded.

## Data handling

For the current MVP:

- Watch definitions, observations, and events are stored in browser `localStorage`.
- No user account, payment data, or personal profile is intentionally collected by the application.
- For live shopping search, the Watch search phrase and relevant structured conditions are sent to Mikke's same-origin server route, which then calls configured official provider APIs.
- Hosting infrastructure may process technical request information such as IP address, user agent, timestamps and route metadata.
- Mikke operational logs should contain only sanitized route/provider/outcome/status/duration metadata, not Watch text or full provider URLs.
- Provider API secrets are not returned to the browser.
- API responses use `Cache-Control: no-store`.
- Public privacy wording is maintained in `PRIVACY.md`.

## Re-review triggers

Manual compliance review must run again when any of these materially change:

- provider or product/service category,
- API endpoint/version or requested fields,
- cache/storage/retention behavior,
- automated monitoring frequency,
- affiliate monetization,
- analytics/tracking or server logging,
- account/cloud persistence,
- pricing/discount calculations,
- provider terms.

## Pre-launch checklist

- [ ] Gate A automated checks all pass at the exact release-candidate HEAD.
- [ ] Review current Rakuten API terms, API version, attribution requirements, and credential handling.
- [ ] Review current Yahoo! JAPAN developer/API terms, rate rules, attribution requirements, and credential handling.
- [ ] Register provider applications and accept their terms manually.
- [ ] Add production credentials only through server-side environment variables.
- [ ] Confirm no secrets are present in Git history, browser bundles, responses, or production network traces.
- [ ] Verify provider attribution visually on iPhone-size screens.
- [ ] Confirm sample/demo data is unmistakably labeled and cannot be confused with live offers.
- [ ] Confirm `PRIVACY.md` matches the deployed data flow and operational logging.
- [ ] Confirm `TERMS.md` pricing/availability disclaimer matches the deployed UI.
- [ ] Confirm sanitized 5xx/429/provider outcome telemetry is visible in the selected hosting/runtime logs.
- [ ] Configure and verify one operator alert path for release incidents; no paid APM is required.
- [ ] Fault-inject 500, provider failure, and 429 and verify safe user-visible behavior.
- [ ] Verify rollback/connector-disable procedure from `docs/INCIDENT_RUNBOOK.md` against the release-candidate environment.
- [ ] Complete Gate C production smoke verification.
