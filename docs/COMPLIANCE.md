# Mikke Compliance and Safety Policy

This document is a development guardrail, not legal advice. Provider terms can change, so re-check the current official terms before public launch and whenever a connector changes.

## Core rules

1. Use official APIs or other explicitly permitted data sources first.
2. Do not scrape or crawl a provider unless its current terms, robots policy, access pattern, and load implications have been separately reviewed and documented.
3. Keep provider credentials server-side only. Never embed them in browser JavaScript, HTML, logs, URLs shown to users, or committed source files.
4. Do not use paid or metered AI/API services for the default Mikke flow. A future paid integration requires an explicit product decision.
5. Send only the minimum search data required for a Watch to the selected provider.
6. Do not silently substitute demo/sample data for live data. Sample mode must be visibly identified in the UI.
7. Preserve required provider attribution/credits whenever provider data is shown.
8. Avoid aggressive traffic. Current adapters make one request per configured provider per user check, cap results at 20, apply a 5-second timeout, and do not automatically retry failures.
9. A provider failure must degrade safely: show unavailable/demo state rather than repeatedly hitting the provider.
10. New connectors require a terms-and-data-use review before implementation is enabled in production.

## Rakuten Ichiba

- Connector uses the official Rakuten Ichiba Item Search API endpoint configured in `src/server/shoppingProviders.js`.
- Credentials: `RAKUTEN_APPLICATION_ID` and `RAKUTEN_ACCESS_KEY`, server-side only.
- Results are limited to 20 and in-stock products.
- Mikke includes the official text attribution snippet when Rakuten is actually contacted.
- Before launch, the operator must create/maintain the required Rakuten developer account, accept current terms, and verify that the selected API version and attribution requirements remain valid.

## Yahoo! Shopping

- Connector uses the official Yahoo! Shopping Item Search API v3 endpoint configured in `src/server/shoppingProviders.js`.
- Credential: `YAHOO_APP_ID`, server-side only.
- Results are limited to 20 and requests prefer in-stock/new items when the Watch requests new-only products.
- Mikke displays a Yahoo! JAPAN web-service attribution link when Yahoo is actually contacted.
- Before launch, the operator must create/maintain the required Yahoo developer application, accept current terms, and verify current rate/attribution requirements.

## Data handling

For the current MVP:

- Watch definitions, observations, and events are stored in browser `localStorage`.
- No user account, payment data, or personal profile is collected by the application.
- For live shopping search, the Watch search phrase and relevant structured conditions are sent to Mikke's same-origin server route, which then calls configured official provider APIs.
- Provider API secrets are not returned to the browser.
- API responses use `Cache-Control: no-store`.

## Pre-launch checklist

- [ ] Review current Rakuten API terms, API version, attribution requirements, and credential handling.
- [ ] Review current Yahoo! JAPAN developer/API terms, rate rules, attribution requirements, and credential handling.
- [ ] Register provider applications and accept their terms manually.
- [ ] Add production credentials only through server-side environment variables.
- [ ] Confirm no secrets are present in Git history or browser bundles.
- [ ] Run CI and security/compliance tests.
- [ ] Verify provider attribution visually on iPhone-size screens.
- [ ] Confirm sample/demo data is unmistakably labeled and cannot be confused with live offers.
- [ ] Review privacy notice before collecting any account or analytics data in a future milestone.
