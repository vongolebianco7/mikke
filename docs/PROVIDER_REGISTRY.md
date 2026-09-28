# Mikke Provider Registry

This file is the production source of truth for external data providers. A provider must not be enabled for production unless its state is `Approved`.

| Provider | Connector / data method | Production state | Terms reviewed date | API / version | Attribution | Rate / usage notes | Cache / retention notes | Affiliate state | Manual review required again when |
|---|---|---|---|---|---|---|---|---|---|
| Rakuten Ichiba | Official API | Review Required | — | Ichiba Item Search API | Required; verify current official snippet | Conservative one-request-per-check design; current limits must be re-reviewed | No provider-response cache in MVP | Disabled | terms, endpoint/version, fields, cache, frequency, affiliate, pricing or category changes |
| Yahoo! Shopping | Official API | Review Required | — | Shopping API v3 | Required; verify current prescribed HTML | Conservative one-request-per-check design; current limits must be re-reviewed | No provider-response cache in MVP | Disabled | terms, endpoint/version, fields, cache, frequency, affiliate, pricing or category changes |
| Amazon | None | Disabled | — | — | — | — | — | Disabled | before any connector implementation |
| Other commerce providers | None | Disabled | — | — | — | — | — | Disabled | before any connector implementation |

## Allowed states

- `Disabled`
- `Review Required`
- `Approved`
- `Suspended`

New categories such as flights, hotels, tickets, cars, or real estate require their own provider review and do not inherit shopping approval.
