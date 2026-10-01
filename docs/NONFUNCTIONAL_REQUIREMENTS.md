# Mikke Non-Functional Requirements

Status: PUBLIC_BETA candidate baseline

These requirements are the minimum operating bar for Mikke's initial public beta. They are intentionally conservative and free-first. They are not contractual SLAs.

## 1. Availability and safe degradation

- Target monthly service availability for the public beta: **99.0%** for Mikke-owned endpoints, excluding upstream provider outages.
- A single provider outage must not take down the whole app.
- Provider failures must return an explicit unavailable/error state; demo/sample data must never be presented as live.
- If both live shopping providers are unavailable, live shopping search must degrade safely rather than loop or retry aggressively.
- Production connector state must follow `docs/PROVIDER_REGISTRY.md`; only `Approved` providers may be enabled for public beta.
- **Provider credentials alone must never enable a connector.** Production use requires operator `Approved` state, the provider-specific `MIKKE_*_ENABLED=true` runtime flag, and required credentials.

## 2. Performance and latency budget

- Primary client: current iPhone Safari.
- UI interactions that do not require network access should feel immediate and must not block on provider calls.
- Provider HTTP timeout: **5 seconds per provider**.
- Multiple independent providers should be called concurrently so one slow provider does not add its full timeout to another provider's latency.
- Public-beta target for `/api/shopping-search`: **p95 <= 6 seconds** under normal provider conditions.
- Provider result count remains capped at **20 per provider per check** unless the provider review is repeated.

## 3. Reliability and resilience

- No automatic retry of failed provider calls in the request path.
- Duplicate in-flight equivalent searches should be coalesced when possible.
- Local API rate limiting is defense-in-depth only. In-memory limits on serverless runtimes are **best-effort, not a global quota**.
- Provider-specific failure must not erase valid results from another successful provider.
- Unexpected server exceptions must be converted to a controlled 5xx response and logged without secrets or Watch text.
- Mikke-side 429 and **provider-side 429** are distinct operational outcomes. Provider-side 429 must be recorded as `rate_limited` with the status code and must not trigger automatic upstream retry.

## 4. Monitoring and incident detection

Minimum signals:

- Mikke API 5xx count and ratio.
- Mikke API 429 count and ratio.
- Provider-specific success/error/rate_limited/not-configured/disabled outcomes.
- Provider latency bucket or duration.

Initial alert thresholds:

- 5xx: **>=5 in 5 minutes AND >=5% of requests**.
- 429: **>=5 in 5 minutes OR >=10% of requests**.
- Provider failures: **3 consecutive failures = WARN; 5 consecutive failures = CRITICAL**.
- Duplicate notifications for the same unresolved incident should be suppressed for **30 minutes**.

`src/server/alertEvaluator.js` defines the minimum threshold semantics as a pure/in-memory evaluator. This does **not** by itself provide durable or cross-instance production alerting. Before PUBLIC_BETA, the RC environment must aggregate the relevant hosting/runtime events and deliver them to one tested operator alert path.

Operational sequence is defined in `docs/INCIDENT_RUNBOOK.md`.

## 5. Logging and privacy

Allowed operational log fields are limited to non-content metadata such as timestamp, route, provider, outcome, HTTP status code/class, duration, and a server-generated correlation identifier when used.

Do **not** intentionally log raw Watch text/full search queries, provider API credentials, authorization headers, full provider request URLs containing credentials or user search text, localStorage contents, or personal profile data.

Provider secrets remain server-side and must never appear in browser bundles or network responses.

Hosting-specific **log retention, deletion behavior, and operator access** must be reviewed and recorded before PUBLIC_BETA. Access should be limited to the operator(s) who need it for service/security operations; Mikke must not claim a retention period until the actual host configuration has been verified.

## 6. Input and abuse controls

- `/api/shopping-search` accepts POST only.
- Watch text remains length-bounded.
- Structured conditions must be bounded in serialized size and nesting complexity.
- Outbound product URLs must use safe web schemes.
- Rate limiting and in-flight de-duplication are mandatory guardrails, but the public beta must not claim they provide distributed abuse prevention.

## 7. Data durability and deletion

- Current MVP stores Watches/history/events in browser `localStorage`; there is no cloud backup or cross-device recovery.
- Clearing browser/site storage or losing the device may lose Mikke local data. Product copy/privacy text must not imply server backup.
- Delete-all-data must delete only Mikke-owned local keys and must not delete unrelated same-origin storage.
- No server-side persistence of Watch content may be added without a fresh privacy/compliance review.

## 8. Security baseline

- No real credentials in Git history, source files, client bundles, logs, or responses.
- Secrets are provided only through server-side environment configuration.
- `Cache-Control: no-store` remains mandatory for search responses.
- Error responses must not expose stack traces, provider credentials, or full upstream URLs.
- Repository-owned deployment configuration must provide a restrictive `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and HSTS where supported by the HTTPS host. The real RC response must still be verified because repository configuration is not proof of deployed behavior.
- CSP must not allow `unsafe-eval`; framing is blocked for the public beta.
- Dependency additions require justification.

## 9. Compliance and provider governance

- Official APIs/permitted data sources first; no scraping/crawling by default.
- Provider terms, API version, attribution, rate limits, caching, retention, and credentials must be reviewed before enabling a provider.
- Approval is two-layered: `docs/PROVIDER_REGISTRY.md` records operator approval, while runtime flags provide the operational kill switch. Neither credentials nor flags alone constitute provider approval.
- Any material change in provider behavior, logging, cache/storage, monitoring frequency, analytics, accounts, affiliate monetization, or pricing calculations triggers re-review.
- Attribution must be shown only for providers actually contacted and must follow the provider's current required form.

## 10. Cost and capacity

- Default public-beta architecture must remain usable without mandatory paid/metered AI or data APIs.
- No automatic retry storms.
- Result counts and request frequency stay conservative.
- Capacity increases requiring paid shared infrastructure are explicit product decisions.

## 11. Client compatibility and accessibility

- Release-blocking client: current iPhone Safari.
- Desktop Safari/Chrome/Edge are best-effort unless added to the release gate.
- Core flows must support touch targets, readable text, keyboard focus where applicable, and visible loading/error states.
- Long Japanese Watch text and small-screen layouts must not make Create/Confirm/Results unusable.

## 12. Reproducible build and release integrity

- `package-lock.json` is committed and CI installs test dependencies with `npm ci`.
- Third-party GitHub Actions used by release gates are pinned to immutable full commit SHAs.
- `merge != publish` remains mandatory.
- PUBLIC_BETA requires Gate A, B, and C to pass.
- Every release candidate must be tied to an exact commit SHA, and the **deployed SHA exactly matches the Gate A tested SHA** before approval.
- Rollback target: previous known-good production deployment/commit.
- If a release causes widespread 5xx or unusable live search and a safe fix is not immediately clear, rollback or disable the affected connector before deeper debugging.
- Recovery is staged: one manual check -> several live checks -> 5-10 minutes stable -> normal operation.

## 13. Recovery objectives

For the beta these are operational targets, not guarantees:

- **RTO:** restore a usable safe state within 30 minutes for Mikke-owned release/configuration incidents.
- **RPO:** server-side Watch data is not applicable because the MVP does not persist Watch content server-side. Browser-local data survives server rollback but is not backed up by Mikke.

## 14. Known accepted limitations for PUBLIC_BETA

- In-memory rate limits, in-flight de-duplication, and the in-process alert evaluator are not globally consistent across serverless instances.
- Upstream provider availability is outside Mikke's control.
- No cloud account/sync/backup.
- Monitoring may initially rely on hosting logs plus one operator notification path rather than paid APM.

These limitations are acceptable only if documented, safely degraded, and verified by the release gate.
