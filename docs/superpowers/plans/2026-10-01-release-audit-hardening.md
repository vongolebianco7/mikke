# Mikke Release Audit Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the newly identified PUBLIC_BETA audit gaps around provider enablement, provider 429 observability, alert evaluation, reproducible CI, supply-chain pinning, and deploy-time security headers.

**Architecture:** Keep the existing free-first/static-plus-serverless shape. Add explicit runtime provider enablement, preserve upstream status metadata without leaking query content, evaluate alerts from sanitized telemetry, make CI deterministic with a lockfile and pinned actions, and enforce security-header requirements through repo-owned config plus release smoke checks.

**Tech Stack:** Node.js 22, ES modules, GitHub Actions, static HTML/CSS/JS, serverless `/api/shopping-search`.

**Spec:** `docs/NONFUNCTIONAL_REQUIREMENTS.md`, `docs/COMPLIANCE.md`, `docs/PUBLIC_RELEASE_GATE.md`, `docs/PROVIDER_REGISTRY.md`

## Global Constraints

- Free-first; no mandatory paid/metered monitoring or data service.
- No scraping/crawling.
- Provider credentials remain server-side only.
- `merge != publish`; do not merge PR #1 to `main` or publish.
- Only manually approved providers may be production-enabled.
- Operational telemetry must never contain raw Watch text, credentials, authorization headers, or full credential-bearing provider URLs.
- Current iPhone Safari remains the release-blocking client.

## Review Focus

- Credentials present while enable flag is off: provider must not be called.
- Upstream 429: preserve status metadata and classify separately without retry.
- Repeated alert events: enforce thresholds and 30-minute suppression without logging content.
- Same commit rebuilt later: dependency graph and CI actions must remain reproducible.
- Security headers/CSP: must not break current module/CSS/app flows and must be verified in the actual RC environment.

---

### Task 1: Provider Runtime Approval Gate

**Files:**
- Modify: `src/server/shoppingProviders.js`
- Modify: `.env.example`
- Modify: `docs/PROVIDER_REGISTRY.md`
- Test: `tests/shopping-providers.test.js`

**Interfaces:**
- Consumes: provider credentials from `env`.
- Produces: explicit provider enablement semantics, e.g. `MIKKE_RAKUTEN_ENABLED === 'true'` and `MIKKE_YAHOO_ENABLED === 'true'`.

- [ ] **Step 1: Write failing tests** proving credentials alone do not trigger provider calls and enabled+configured providers do.
- [ ] **Step 2: Run provider tests and verify RED**.
- [ ] **Step 3: Implement explicit runtime enable flags** in `searchShoppingProviders`; disabled providers return a distinct `disabled` status and perform no upstream call.
- [ ] **Step 4: Document enablement variables and approval rule** in `.env.example` and provider registry.
- [ ] **Step 5: Run provider/unit/system tests and verify GREEN**.
- [ ] **Step 6: Commit** `feat: require explicit provider enablement`.

### Task 2: Preserve Upstream HTTP Failure Class

**Files:**
- Modify: `src/server/shoppingProviders.js`
- Modify: `src/server/operationalTelemetry.js`
- Test: `tests/shopping-providers.test.js`
- Test: `tests/operational-telemetry.test.js`

**Interfaces:**
- Produces provider telemetry containing sanitized `statusCode` for upstream HTTP failures, including 429.

- [ ] **Step 1: Write failing tests** for upstream 429 and 5xx classification with no retry.
- [ ] **Step 2: Run tests and verify RED**.
- [ ] **Step 3: Implement a typed/status-bearing provider error path** without exposing request URL/query/credentials.
- [ ] **Step 4: Emit provider telemetry with `statusCode` and outcome classification** such as `rate_limited` vs `error`.
- [ ] **Step 5: Run tests and verify GREEN**.
- [ ] **Step 6: Commit** `feat: classify upstream provider failures`.

### Task 3: Minimal Alert Evaluator

**Files:**
- Create: `src/server/alertEvaluator.js`
- Test: `tests/alert-evaluator.test.js`
- Modify: `docs/INCIDENT_RUNBOOK.md`
- Modify: `docs/NONFUNCTIONAL_REQUIREMENTS.md`

**Interfaces:**
- Consumes sanitized API/provider events.
- Produces alert decisions with severity and incident key; no external notification provider is required yet.

- [ ] **Step 1: Write failing tests** for 5xx `>=5 AND >=5% in 5m`, 429 `>=5 OR >=10% in 5m`, provider 3 consecutive WARN / 5 CRITICAL, and 30-minute duplicate suppression.
- [ ] **Step 2: Run tests and verify RED**.
- [ ] **Step 3: Implement pure in-memory evaluator functions** with injected clock/state so behavior is deterministic and provider/content data is excluded.
- [ ] **Step 4: Document that persistence/distributed aggregation is still hosting-dependent** and this evaluator is the minimum single-runtime baseline.
- [ ] **Step 5: Run tests and verify GREEN**.
- [ ] **Step 6: Commit** `feat: add minimal incident alert evaluator`.

### Task 4: Deterministic Dependency Installation

**Files:**
- Create/Update: `package-lock.json`
- Modify: `.github/workflows/test.yml`
- Modify: `package.json` only if audit script naming is needed.

**Interfaces:**
- Produces deterministic dependency resolution for a given commit.

- [ ] **Step 1: Generate/verify lockfile** consistent with `package.json`.
- [ ] **Step 2: Change CI install from `npm install` to `npm ci`**.
- [ ] **Step 3: Add a non-mutating dependency audit/check appropriate to the free workflow**; audit failure policy must distinguish actionable production risk from dev-only noise.
- [ ] **Step 4: Run full CI-equivalent commands and verify GREEN**.
- [ ] **Step 5: Commit** `ci: make dependency installation reproducible`.

### Task 5: Pin GitHub Actions

**Files:**
- Modify: `.github/workflows/test.yml`
- Modify: `docs/PUBLIC_RELEASE_GATE.md`

**Interfaces:**
- Produces immutable GitHub Actions references for release-gate jobs.

- [ ] **Step 1: Resolve trusted commit SHAs** for the currently used checkout/setup-node major versions.
- [ ] **Step 2: Replace mutable major tags with commit SHAs and retain comments naming upstream versions**.
- [ ] **Step 3: Run the workflow and verify all jobs succeed**.
- [ ] **Step 4: Add pinned-actions verification to the release checklist/static check**.
- [ ] **Step 5: Commit** `ci: pin release gate actions`.

### Task 6: Repo-Owned Security Header/CSP Baseline

**Files:**
- Create or modify hosting config appropriate to the chosen RC host.
- Modify: `index.html` only if CSP meta fallback is required.
- Modify: `scripts/nonfunctional-check.mjs`
- Modify: `docs/PUBLIC_RELEASE_GATE.md`
- Test: relevant static/security tests.

**Interfaces:**
- Produces a restrictive-but-compatible CSP/header baseline owned in source control.

- [ ] **Step 1: Write a failing static test** requiring CSP/security-header policy ownership in repo config.
- [ ] **Step 2: Verify RED**.
- [ ] **Step 3: Add the minimal compatible policy** for current same-origin scripts/styles/API and prohibit unsafe external execution; avoid introducing `unsafe-eval`.
- [ ] **Step 4: Add RC smoke requirements** for actual response headers, HTTPS/TLS, cache behavior, and exact-SHA deployment identity.
- [ ] **Step 5: Run static/system tests and verify GREEN**.
- [ ] **Step 6: Commit** `security: add deploy-time header baseline`.

### Task 7: Release Gate Synchronization

**Files:**
- Modify: `docs/PUBLIC_RELEASE_GATE.md`
- Modify: `docs/COMPLIANCE.md`
- Modify: `docs/NONFUNCTIONAL_REQUIREMENTS.md`
- Modify: `PRIVACY.md` if runtime logging/retention wording changes.
- Modify: `scripts/nonfunctional-check.mjs`

**Interfaces:**
- Produces one synchronized PUBLIC_BETA decision model covering the six audit findings.

- [ ] **Step 1: Add Gate B/C requirements** for provider enable flags, provider-429 visibility, alert path/evaluator, deterministic dependencies, pinned actions, and actual RC security headers.
- [ ] **Step 2: Add static checks** so these requirements cannot silently disappear.
- [ ] **Step 3: Run `npm run test:system` and release-gates**.
- [ ] **Step 4: Record exact integrated HEAD and workflow run only after all jobs are SUCCESS**.
- [ ] **Step 5: Open an internal PR targeting `feat/mikke-mvp`; do not target `main`**.

## Self-review

- Spec coverage: all six newly identified gaps map to Tasks 1-6; Task 7 synchronizes governance.
- Interfaces: provider enablement and telemetry changes are independent of alert evaluation; alert evaluator consumes only sanitized fields.
- Failure modes covered: disabled credentials, provider 429, threshold/cooldown behavior, non-deterministic dependency resolution, mutable CI actions, missing deploy headers.
- Scope intentionally excludes production credentials, provider operator approvals, physical iPhone verification, live notification endpoint selection, and actual PUBLIC_BETA publication; those remain manual/external gates.
