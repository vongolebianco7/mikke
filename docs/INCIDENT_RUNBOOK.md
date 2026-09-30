# Mikke Incident Runbook

Scope: PUBLIC_BETA operations for 5xx increase, provider consecutive failures, and 429 increase.

## Golden rule

Prefer the smallest safe shutdown. A provider-only problem should disable only that provider. Never substitute demo/sample results as live data during an incident.

## Detection thresholds

- **5xx WARN/incident:** >=5 responses in 5 minutes AND >=5% of requests.
- **429 WARN/incident:** >=5 responses in 5 minutes OR >=10% of requests.
- **Provider WARN:** 3 consecutive failures.
- **Provider CRITICAL:** 5 consecutive failures.
- Suppress repeated notifications for the same unresolved incident for 30 minutes.

## Response order

### 1. Classify impact

Determine only these three things first:

1. Is `/api/shopping-search` itself failing?
2. Is only Rakuten or only Yahoo failing?
3. Is the issue rate limiting (Mikke-side or provider-side)?

Do not start code changes until the incident is classified.

### 2. Contain with the smallest blast radius

Use this shutdown order:

1. Disable the affected provider connector.
2. If the problem affects all live shopping providers or the API route, disable live shopping search.
3. Disable the whole application only if the app itself is unsafe or unusable.

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

1. Provider HTTP outcome and latency.
2. Credential/config presence and validity.
3. Endpoint/API version or response-shape change.
4. Provider usage/rate/attribution/terms change requiring review.
5. Provider-side service incident.

#### 429 increase

1. Mikke local limiter outcome.
2. Duplicate Watch execution / repeated client calls.
3. Scheduler or accidental loop.
4. Provider-side rate response.
5. Unexpected traffic/abuse pattern.

Do not increase request limits merely to make 429 disappear.

### 4. Fix or rollback

Preferred order:

1. Configuration correction if clearly safe and verified.
2. Disable affected provider/feature.
3. Roll back to the previous known-good production commit/deployment.
4. Code fix only after the cause is understood and covered by a regression test.

If widespread 5xx or live-search failure remains unexplained, choose safe rollback/disablement before extended debugging.

### 5. Staged recovery

Do not restore full operation in one step.

1. One manual live check.
2. Several live checks covering each enabled provider.
3. Confirm no secret/query leakage in response or logs.
4. Observe 5-10 minutes of stable behavior.
5. Re-enable normal operation.

Provider incident recovery requires at least 3 consecutive successful checks; use 5 successes after a CRITICAL incident.

429 recovery also requires proof that excessive upstream calls stopped, not merely that the visible 429 count fell.

### 6. Resolve and record

Record:

- start/end time;
- affected route/provider;
- alert type;
- user-visible impact;
- containment action;
- root cause if known;
- commit/config change used for recovery;
- whether a regression test or release-gate update is required.

Do not record Watch text, provider credentials, or full credential-bearing upstream URLs.

## Alert-to-action matrix

| Signal | First action | Stop scope | Recovery proof |
|---|---|---|---|
| 5xx increase | Check latest deploy/config | Live search or rollback as needed | 5-10 min stable + smoke pass |
| Rakuten failures | Check Rakuten outcome/config | Rakuten only | 3-5 consecutive successes |
| Yahoo failures | Check Yahoo outcome/config | Yahoo only | 3-5 consecutive successes |
| Mikke 429 increase | Check duplicate/loop/local limiter | Slow/stop offending execution path | request rate normal + no excess upstream |
| Provider 429 | Stop retries / reduce provider traffic | affected provider | provider calls remain under reviewed limit |

## Escalation rule

Escalate from provider-only disablement to live-shopping shutdown only when the incident affects every usable provider or the Mikke API boundary itself. Escalate to full-app shutdown only for security/privacy exposure or a broadly unsafe application state.