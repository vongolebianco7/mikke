# Mikke

**欲しい条件になったら、見つけておいてくれる。**

Mikke is a condition-monitoring app concept that starts with shopping and expands to flights, hotels, tickets, cars, and other watchable conditions.

## Current milestone

The first vertical slice is dependency-free and free-first:

- Natural-language Watch creation in Japanese
- Watch type inference: shopping / flight / hotel
- Shopping condition extraction: maximum price, shoe size, color, used/display preferences
- Flight condition extraction: route, direct flight, trip type, maximum price
- Required/preferred condition evaluation
- Event derivation for condition match, new result, price drop, and restock
- Local browser persistence for Watches, observations, and meaningful events
- iPhone-first Today / Watch / Create / History flows
- Server-side adapters for the official Rakuten Ichiba and Yahoo! Shopping APIs
- Explicitly labeled deterministic demo data when no official provider is configured/available
- Provider attribution shown only when the corresponding provider is actually contacted

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

Never put real credentials in `.env.example`, browser code, or Git.

## Test

```bash
npm test
```

No npm install is required for this milestone; tests use Node's built-in test runner. The suite covers parsing, candidate evaluation, provider request/normalization behavior, secure API boundaries, Watch persistence, history, and attribution visibility.

## Product constraints

- Free-first: no mandatory metered AI/API service
- Official APIs / permitted data sources first
- No scraping in the current implementation
- Scraping can only be considered later after per-site terms, robots policy, access frequency, and load are explicitly reviewed
- Provider secrets are server-side only
- Provider failures are not automatically retried
- Provider result counts are conservatively capped at 20 per check
- iPhone is the primary client
- Meaningful events only; avoid noisy repeated notifications
- Demo data must never look like live offers

See [`docs/COMPLIANCE.md`](docs/COMPLIANCE.md) for the launch checklist and connector guardrails.

## Next

1. Manually register/confirm Rakuten and Yahoo developer applications and accept their current terms; add credentials only to server-side environment variables.
2. Verify live provider responses and attribution on an iPhone-sized preview before public launch.
3. Add scheduled monitoring with conservative request deduplication/rate control.
4. Research a compliant, free flight-data source before implementing the flight connector; do not scrape booking sites by default.
5. Add in-app notification controls and richer history detail.
6. Migrate persistence only when shared accounts/multi-device sync are actually needed.
