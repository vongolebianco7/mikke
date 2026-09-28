# Mikke Provider Registry

This file is the production source of truth for external data providers. A provider must not be enabled for production unless its state is `Approved`.

| Provider | Connector / data method | Production state | Research date | Operator approval | API / version | Attribution | Rate / usage notes | Cache / retention notes | Affiliate state | Manual review required again when |
|---|---|---|---|---|---|---|---|---|---|---|
| Rakuten Ichiba | Official API | Review Required | 2026-09-29 | Pending | Ichiba Item Search API `2026-07-01` | Required. Use Rakuten supplied HTML snippet as-is; do not alter HTML/image. | Official docs warn that many accesses to an identical URL in a short time may be temporarily blocked. MVP keeps one request per provider/check, 20 results, timeout, no automatic retry. | MVP does not cache provider responses. Do not add persistent/shared provider-data storage without a fresh terms review. | Disabled | terms, endpoint/version, fields, cache, frequency, affiliate, pricing or category changes |
| Yahoo! Shopping | Official API | Review Required | 2026-09-29 | Pending | Shopping Web API v3 | Required. Use prescribed HTML and placement; do not change HTML, credit color with CSS, or make it extremely small. Place at the bottom of the app/site. | Official Shopping docs state short-time mass access to the same URL may be blocked and give a 1 query/second note. MVP server guard must prevent upstream access when rate-limited. | MVP does not cache provider responses. Re-review before adding cache/retention or cloud persistence. | Disabled | terms, endpoint/version, fields, cache, frequency, affiliate, pricing or category changes |
| Amazon | None | Disabled | — | — | — | — | — | — | Disabled | before any connector implementation |
| Other commerce providers | None | Disabled | — | — | — | — | — | — | Disabled | before any connector implementation |

## 2026-09-29 official-source evidence

### Rakuten Ichiba
- Item Search documentation currently publishes endpoint/version `2026-07-01`.
- Access key plus application ID are required for the current API.
- The API documentation warns against many requests to an identical URL in a short period.
- Rakuten's credit guide requires credit for apps using the API and requires the supplied HTML source to be used as-is.
- Rakuten Web Service usage requires app registration. The usage guide states application name, URL, type, allowed websites, data-use purpose and expected QPS are part of registration.
- Rakuten terms also require the developer to safeguard authentication symbols/information and allow Rakuten to impose access/frequency restrictions.

Official references:
- https://webservice.rakuten.co.jp/documentation/ichiba-item-search
- https://webservice.rakuten.co.jp/guide/credit
- https://webservice.rakuten.co.jp/guide
- https://webservice.rakuten.co.jp/guide/rule

### Yahoo! Shopping
- Shopping Web API use requires agreement to Yahoo! Developer Network guidelines and use of a registered Client ID.
- The Shopping API page states a 1 query/second note and warns against large numbers of accesses to the same URL in a short time.
- Yahoo credit is required for sites/apps using its APIs.
- Prescribed HTML and prescribed placement are required. Yahoo explicitly prohibits modifying the HTML, changing the credit display color with CSS, or making the display extremely small.
- The credit should be placed at the bottom of the app/site.

Official references:
- https://developer.yahoo.co.jp/webapi/shopping/
- https://developer.yahoo.co.jp/attribution/

## Allowed states

- `Disabled`
- `Review Required`
- `Approved`
- `Suspended`

`Research date` means the current public documentation was checked. It does **not** mean the operator has accepted provider terms or completed provider registration. `Approved` requires the operator to complete the provider-side registration/acceptance and verify the deployed app against the current rules.

New categories such as flights, hotels, tickets, cars, or real estate require their own provider review and do not inherit shopping approval.
