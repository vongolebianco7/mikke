# Mikke Non-Functional Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Mikke's public-beta non-functional design and critical runtime behavior to a documented, tested minimum bar.

**Architecture:** Keep the MVP dependency-free. Add sanitized structured telemetry at the API/provider boundary, bound pathological input, run independent providers concurrently, and document incident/recovery/release requirements without pretending serverless in-memory controls are globally reliable.

**Tech Stack:** Node.js ESM, built-in node:test, serverless API route, browser localStorage.

**Spec:** `docs/NONFUNCTIONAL_REQUIREMENTS.md`

## Global Constraints

- Free-first; no mandatory paid monitoring/APM/API dependency.
- No scraping/crawling.
- Provider secrets remain server-side.
- Never log Watch text/full query/credentials.
- iPhone Safari is release-blocking.
- `merge != publish`.

## Review Focus

- Unexpected API exception must return controlled 500 without secret/query leakage.
- Deep/oversized structured conditions must be rejected before expensive normalization/dedup work.
- One provider timing out must not add another provider's full timeout serially.
- A provider failure must preserve results from another successful provider.
- Telemetry must never contain raw Watch text or credential-bearing URLs.

---

### Task 1: Non-functional baseline and incident runbook

**Files:**
- Create: `docs/NONFUNCTIONAL_REQUIREMENTS.md`
- Create: `docs/INCIDENT_RUNBOOK.md`

**Produces:** Numeric public-beta targets, accepted limitations, alert thresholds, shutdown order, diagnosis order, rollback and staged recovery rules.

- [x] Define availability/performance/reliability/security/privacy/cost/client/recovery requirements.
- [x] Define 5xx/provider/429 incident runbook.

### Task 2: Sanitized operational telemetry

**Files:**
- Create: `src/server/operationalTelemetry.js`
- Create or modify: `tests/operationalTelemetry.test.js`

**Interfaces:**
- Produces: `createOperationalLogger({ sink, now })` with methods for API and provider outcomes that emit metadata only.

- [ ] Write failing tests proving emitted events contain route/provider/outcome/status/duration and exclude raw query, credentials and URLs.
- [ ] Run targeted tests and observe RED.
- [ ] Implement minimal logger.
- [ ] Run targeted tests and full suite GREEN.

### Task 3: API input and exception hardening

**Files:**
- Modify: `api/shopping-search.js`
- Modify: API tests.

**Interfaces:**
- Consumes: operational logger from Task 2.

- [ ] Write failing tests for oversized/deep conditions and unexpected server exception.
- [ ] Observe RED.
- [ ] Add bounded-condition validation, controlled 500 response and sanitized outcome logging.
- [ ] Run targeted and full suite GREEN.

### Task 4: Provider concurrency and outcome telemetry

**Files:**
- Modify: `src/server/shoppingProviders.js`
- Modify: provider tests.

**Interfaces:**
- Consumes: optional logger callback; preserves current result/provider response shape.

- [ ] Write failing test proving independent provider calls start concurrently and one failure preserves the other's results.
- [ ] Observe RED.
- [ ] Refactor providers to concurrent execution without automatic retry; record provider outcome/duration without query/credential data.
- [ ] Run targeted and full suite GREEN.

### Task 5: Release gate synchronization

**Files:**
- Modify: `docs/COMPLIANCE.md`
- Modify: `docs/PUBLIC_RELEASE_GATE.md`
- Modify: `README.md`

- [ ] Add NFR/runbook verification items, accepted serverless limiter limitation, rollback/monitoring checks and operator contact/RC requirements.
- [ ] Run compliance/static checks and full release-gates.
- [ ] Record exact verified HEAD/run evidence before integration.
