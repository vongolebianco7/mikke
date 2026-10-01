# Mikke Incident Runbook

Scope: PUBLIC_BETA operations for 5xx increase, provider consecutive failures, and 429 increase.

## Golden rule

Prefer the smallest safe shutdown. A provider-only problem should disable only that provider. Never substitute demo/sample results as live data during an incident.

## Detection thresholds

- **5xx incident:** >=5 responses in 5 minutes AND >=5% of requests.
- **Mikke API 429 incident:** >=5 responses in 5 minutes OR >=10% of requests.
- **Provider WARN:** 3 consecutive `error` / `rate_limited` outcomes.
- **Provider CRITICAL:** 5 consecutive failures.
- Suppress repeated notifications for the same unresolved incident for 30 minutes.

`src/server/alertEvaluator.js` pins these threshold semantics for tests and single-process evaluation. Production detection still requires the hosting/runtime events to reach the configured operator alert path; the in-process evaluator is not a durable cross-instance monitor.

## Response order

### 1. Classify impact

Determine only these three things first:

1. Is `/api/shopping-search` itself failing?
2. Is only Rakuten or only Yahoo failing?
3. Is the issue Mikke-side 429 or provider-side 429?

Provider-side 429 is emitted as provider outcome `rate_limited` with status code 429. Do not merge it into Mikke's own API rate-limit signal.

### 2. Contain with the smallest blast radius

Provider runtime kill switches:

- Rakuten: set `MIKKE_RAKUTEN_ENABLED=false`
- Yahoo: set `MIKKE_YAHOO_ENABLED=false`

Use this shutdown order:

1. Disable the affected provider connector with its runtime flag.
2. If the problem affects all live shopping providers or the API route, disable live shopping search.
3. Disable the whole application only if the app itself is unsafe or unusable.

Credentials are not a kill switch and credentials alone do not authorize/enable a provider. Do not delete/rotate valid credentials merely to contain an ordinary provider outage unless credential compromise is suspected.

During containment:

- show live-unavailable/error state;
- do not retry provider failures automatically;
- do not label sample/demo data as live;
- preserve working providers when safe.

### 3. Diagnose in fixed order

#### 5xx

1. Latest deploy/commit difference.
2. Environment/configuration.
3. Mikke API route/server exception.
4. Provider call boundary.
5. Hosting/platform incident.

#### Provider consecutive failure

1. Provider outcome (`error` vs `rate_limited`), status code and latency.
2. Runtime enable flag.
3. Credential/config presence and validity.
4. Endpoint/API version or response-shape change.
5. Provider usage/rate/attribution/terms change requiring review.
6. Provider-side service incident.

#### 429 increase

For Mikke API 429:
1. local limiter outcome;
2. duplicate Watch execution / repeated client calls;
3. scheduler or accidental loop;
4. unexpected traffic/abuse pattern.

For provider-side 429:
1. confirm provider `rate_limited` outcome/status 429;
2. confirm no automatic retry occurred;
3. inspect request frequency/duplicate execution;
4. disable only the affected provider if rate remains unsafe;
5. re-check provider rate/usage terms before increasing traffic.

Do not increase request limits merely to make 429 disappear.

### 4. Fix or rollback

Preferred order:

1. Configuration correction if clearly safe and verified.
2. Disable affected provider/feature.
3. Roll back to the previous known-good production commit/deployment.
4. Code fix only after the cause is understood and covered by a regression test.

If widespread 5xx or live-search failure remains unexplained, choose safe rollback/disablement before extended debugging.

### 5. Staged recovery

1. Confirm provider remains `Approved` before re-enabling its runtime flag.
2. One manual live check.
3. Several live checks covering each enabled provider.
4. Confirm no secret/query leakage in response or logs.
5. Observe 5-10 minutes of stable behavior.
6. Re-enable normal operation.

Provider incident recovery requires at least 3 consecutive successful checks; use 5 successes after a CRITICAL incident.

429 recovery also requires proof that excessive upstream calls stopped, not merely that the visible 429 count fell.

### 6. Resolve and record

Record start/end time, affected route/provider, alert type, user-visible impact, containment action, root cause if known, commit/config change used for recovery, and whether a regression test or release-gate update is required.

Do not record Watch text, provider credentials, or full credential-bearing upstream URLs.

## Alert-to-action matrix

| Signal | First action | Stop scope | Recovery proof |
|---|---|---|---|
| 5xx increase | Check latest deploy/config | Live search or rollback as needed | 5-10 min stable + smoke pass |
| Rakuten failures | Check outcome/config | `MIKKE_RAKUTEN_ENABLED=false` | 3-5 consecutive successes |
| Yahoo failures | Check outcome/config | `MIKKE_YAHOO_ENABLED=false` | 3-5 consecutive successes |
| Mikke 429 increase | Check duplicate/loop/local limiter | Slow/stop offending execution path | request rate normal + no excess upstream |
| Provider 429 | Stop traffic escalation; no retry | affected provider only | provider calls remain under reviewed limit |

## Escalation rule

Escalate from provider-only disablement to live-shopping shutdown only when the incident affects every usable provider or the Mikke API boundary itself. Escalate to full-app shutdown only for security/privacy exposure or a broadly unsafe application state.
