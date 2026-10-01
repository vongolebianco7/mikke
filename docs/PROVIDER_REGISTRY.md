# Mikke Provider Registry

This file is the production source of truth for external data-provider approval. A provider must not be enabled for production unless its state is `Approved`.

Runtime enablement is a separate safety layer. Production traffic requires **all three** conditions:

1. Provider state here is `Approved` after operator review/acceptance.
2. The provider-specific runtime flag is explicitly `true`.
3. Required server-side credentials are present.

Credentials alone never enable a provider. Runtime flags are operational kill switches; they are not a substitute for approval.

| Provider | Connector / data method | Production state | Runtime flag | Research date | Operator approval | API / version | Attribution | Rate / usage notes | Cache / retention notes | Affiliate state |
|---|---|---|---|---|---|---|---|---|---|---|
| Rakuten Ichiba | Official API | Review Required | `MIKKE_RAKUTEN_ENABLED` (default `false`) | 2026-09-29 | Pending | Ichiba Item Search API `2026-07-01` | Required. Use current required form and verify deployed presentation. | One request/provider/check, 20 results, 5s timeout, no automatic retry. Provider 429 is surfaced as `rate_limited`. | MVP does not cache provider responses. Re-review before persistent/shared provider-data storage. | Disabled |
| Yahoo! Shopping | Official API | Review Required | `MIKKE_YAHOO_ENABLED` (default `false`) | 2026-09-29 | Pending | Shopping Web API v3 | Required. Verify current prescribed form/placement before launch. | One request/provider/check, 20 results, 5s timeout, no automatic retry. Provider 429 is surfaced as `rate_limited`. | MVP does not cache provider responses. Re-review before cache/retention/cloud persistence. | Disabled |
| Amazon | None | Disabled | — | — | — | — | — | — | — | Disabled |
| Other commerce providers | None | Disabled | — | — | — | — | — | — | — | Disabled |

## Approval procedure

A provider may move to `Approved` only after the operator has:

- completed the provider-side application/account registration required for the intended use;
- reviewed and accepted the current applicable provider terms/guidelines;
- re-checked endpoint/version, fields, attribution, rate/frequency, cache/retention and credential handling;
- verified the deployed RC attribution and data flow;
- confirmed the runtime enable flag is `false` by default and disables traffic when switched off.

After these checks, record the review date and operator approval here before setting the production runtime flag to `true`.

## Allowed states

- `Disabled`
- `Review Required`
- `Approved`
- `Suspended`

`Research date` only means public documentation was reviewed. It does **not** mean operator terms acceptance or registration is complete.

Use `Suspended` when an approved provider must stop because terms, technical requirements, security, abuse/rate behavior, attribution requirements, or compliance assumptions changed. When suspended, its runtime flag must remain false.

## Re-review triggers

Repeat manual review when provider terms, endpoint/version, requested fields, cache/storage/retention, request frequency, automated monitoring, attribution, affiliate state, pricing calculations, or product category materially change.

New categories such as flights, hotels, tickets, cars, or real estate require their own provider review and do not inherit shopping approval.
