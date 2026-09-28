# Mikke

**欲しい条件になったら、見つけておいてくれる。**

Mikke is a condition-monitoring app concept that starts with shopping and expands to flights, hotels, tickets, cars, and other watchable conditions.

## Current milestone

The first vertical slice is dependency-free so the product can be tested immediately:

- Natural-language Watch creation in Japanese
- Watch type inference: shopping / flight / hotel
- Shopping condition extraction: maximum price, shoe size, color, used/display preferences
- Flight condition extraction: route, direct flight, trip type, maximum price
- Required/preferred condition evaluation
- Event derivation for condition match, new result, price drop, and restock
- Local browser persistence for Watches, observations, and meaningful events
- iPhone-first Today / Watch / Create / History flows
- Deterministic shopping sample connector for development without external credentials

The shared Watch/Event domain is provider-independent. Official Rakuten and Yahoo! Shopping connectors can plug into the same candidate interface in the next milestone.

## Run

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Test

```bash
npm test
```

No npm install is required for this milestone; tests use Node's built-in test runner. The current suite covers parsing, candidate evaluation, connector behavior, Watch persistence, and observation/event history.

## Product constraints

- Free-first: no mandatory metered AI API
- Official APIs / permitted data sources first
- Scraping only after per-site terms, robots policy, and load are reviewed
- iPhone is the primary client
- Meaningful events only; avoid noisy repeated notifications

## Next

1. Connect Rakuten Ichiba official API.
2. Connect Yahoo! Shopping official API.
3. Add a flight connector behind the same Watch/Event model.
4. Add in-app notification controls and richer history detail.
5. Migrate persistence to Supabase when shared accounts and multi-device sync become necessary.
