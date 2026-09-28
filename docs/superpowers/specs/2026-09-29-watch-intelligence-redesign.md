# Mikke Watch Intelligence Redesign

## Purpose

Mikke should evolve from a condition-search utility into a watch-oriented decision assistant.

The product promise remains:

> 欲しい条件になったら、見つけておいてくれる。

The redesign must make condition creation easier, make relative price movement meaningful, distinguish hard requirements from preferences, and surface the most actionable changes instead of merely listing matches.

## Scope

This redesign covers:

- Watch condition model
- Natural-language parsing
- Phrase-by-phrase suggestion UX
- Relative and absolute price triggers
- Required vs preferred conditions
- Condition strictness feedback
- Relaxation suggestions
- Meaningful event generation
- Today prioritization
- Post-notification actions
- Local preference learning
- Conservative duplicate grouping

It does not introduce paid AI services, metered AI APIs, unauthorized scraping, or provider behavior that exceeds the existing compliance model.

## Product Principles

1. **Watch-first, not search-first**
   - The home experience should answer “what changed?” rather than “what can I search for?”

2. **Natural language remains the primary input**
   - Users can always type a full sentence.
   - Structured suggestions enhance, not replace, free text.

3. **Conditions are explicit and inspectable**
   - Mikke never silently adds a condition the user did not express or accept.

4. **Relative price logic uses Mikke-observed history**
   - Do not depend on ambiguous provider “regular price” or unverifiable discount claims.

5. **Required and preferred conditions are different**
   - Required conditions gate a match.
   - Preferred conditions improve ranking but do not reject otherwise valid candidates.

6. **Suggestions are reversible**
   - Relaxation or learning-based suggestions never auto-change a Watch.

7. **iPhone-first**
   - All creation, review, Today, and action flows must be usable one-handed in iPhone Safari.

## Watch Data Model

Each Watch keeps its existing top-level identity fields and expands its structured condition model.

Recommended logical shape:

```js
{
  id,
  type,
  title,
  rawQuery,
  conditions: {
    attributes: {},
    priceTriggers: [],
    stateTriggers: []
  },
  requiredKeys: [],
  preferredKeys: [],
  createdAt,
  baseline: {
    initialObservedAt,
    initialPriceByCandidate: {}
  },
  behavior: {
    decisionHistory: []
  }
}
```

Existing stored Watches must continue to load safely. Missing fields are treated as empty/default values.

## Condition Categories

### Required conditions

Examples:

- size = 24.5cm
- new-only / exclude used
- direct flight only
- origin/destination
- hard maximum price, when user explicitly makes it mandatory

A candidate that fails any required condition does not count as a full match.

### Preferred conditions

Examples:

- gray preferred
- navy also acceptable
- preferred shop/provider
- optional feature or amenity

Preferred conditions contribute to score/ranking.

### Price triggers

Support these trigger types:

- `below_absolute`
  - Example: ¥10,000以下
- `below_previous`
  - Current price is below the previous observation for the same candidate
- `below_initial`
  - Current price is below the first observed price after Watch creation
- `drop_percent`
  - Example: 10%以上値下がり
- `new_watch_low`
  - Current price is the lowest Mikke has observed for that Watch/candidate scope
- `distance_to_target`
  - Informational state such as “目標価格まであと¥800”

Price trigger evaluation must only use prices actually observed by Mikke or an explicit numeric target entered by the user.

### State triggers

Support:

- restock
- new result
- first required-condition match
- newly near-match candidate
- newly cheaper provider for conservatively grouped identical product

## Phrase-by-Phrase Suggestion UX

The Watch creation screen becomes an assisted composer.

### Core behavior

As the user types or taps a suggestion, Mikke proposes the next useful phrase based on the parsed state.

Example flow:

```text
New Balance 996
→ 24.5cmで
→ グレー系で
→ 新品のみ
→ 今より安くなったら
→ 1万円以下になったら
→ 教えて
```

### Suggestion families

Suggestions should come from deterministic local logic, not paid AI.

Families include:

- attribute suggestions
- required/preferred qualifier suggestions
- price trigger suggestions
- state trigger suggestions
- completion phrases

### UX rules

- Suggestions appear as horizontally scrollable chips under the composer.
- Tapping a suggestion appends or edits the natural-language sentence.
- Parsed condition chips update immediately below the input.
- Users can remove/edit chips before confirmation.
- Suggestions must never duplicate an already-applied condition.
- Suggestions should become more specific as more context is known.

## Required vs Preferred UX

Each parsed condition chip must visibly indicate whether it is:

- 必須
- 希望
- 通知条件

The user can toggle supported attribute conditions between 必須 and 希望 before saving.

Some conditions remain semantically fixed:

- route endpoints are required
- notification-only price/state triggers are not required/preferred attributes

The confirmation screen must clearly separate these groups.

## Relative Price Semantics

### Previous price

“前回より安くなったら” compares the current observation with the immediately previous observation of the same candidate.

### Initial price

“登録時より安くなったら” compares with the first valid price Mikke observed after Watch creation, not a provider-provided list price.

### Percentage drop

For `drop_percent`, the reference is explicitly defined by the trigger mode:

- previous observation, or
- initial observation

The UI should avoid ambiguous wording.

### Watch low

“登録後最安値” means the lowest price Mikke has observed since the Watch was created.

The UI must not call this “market all-time low” or otherwise imply data Mikke has not observed.

## Strictness Feedback

During Watch creation, Mikke shows a qualitative strictness indicator:

- 広め
- ちょうどよい
- 厳しめ
- かなり厳しい

For MVP this is a deterministic heuristic based on:

- number of required conditions
- presence of exact size/model constraints
- narrow price limits
- restrictive state filters

It must be labeled as an estimate when live result-volume evidence is not available.

The indicator must not pretend to know market availability.

## Relaxation Suggestions

A Watch with no meaningful match for a defined observation period may receive suggestions such as:

- expand preferred colors
- move a condition from required to preferred
- slightly increase a hard maximum price
- remove a secondary optional restriction

Rules:

- Suggestions are generated from the Watch’s current conditions and observed results.
- Mikke explains exactly what would change.
- User confirmation is mandatory.
- Never silently broaden a Watch.

Initial MVP threshold recommendation: after multiple checks with no required match, not purely elapsed clock time, because checks may be irregular in the local-only MVP.

## Meaningful Events

Extend event generation beyond the existing `price_drop`, `restock`, `new_result`, and `condition_match` events.

New event kinds:

- `watch_low`
- `target_price_reached`
- `percent_drop`
- `near_match`
- `cheaper_provider`
- `relaxation_available`

Each event should carry only evidence Mikke actually has.

Example:

```js
{
  kind: 'watch_low',
  watchId,
  candidateId,
  currentPrice,
  previousLow,
  observedAt
}
```

## Today Redesign

Today should prioritize actionability, in this order:

1. Important changes
   - target reached
   - watch low
   - meaningful percentage drop
   - restock
2. Near-target items
   - target distance small enough to be useful
3. Required-condition matches
4. Watches with no recent useful movement
5. Relaxation suggestions

The page should not lead with raw aggregate match counts as the main value proposition.

Stats may remain secondary.

## Post-Notification Actions

Result/event cards support lightweight decisions:

- 買う
- もう少し待つ
- 条件変更
- 監視終了

For MVP these actions are stored locally.

### Effects

- `買う`
  - records a positive decision signal
  - may offer to pause/end the Watch
- `もう少し待つ`
  - records current price context
- `条件変更`
  - opens Watch editing with current conditions
- `監視終了`
  - archives or disables the Watch without deleting history

No irreversible destructive action should occur without confirmation where appropriate.

## Local Preference Learning

MVP learning is local and heuristic, not model-based.

Example:

```text
¥12,000 → 待つ
¥10,800 → 待つ
¥9,900 → 買う
```

For future similar Watches, Mikke may suggest “¥10,000以下” as a candidate price trigger.

Rules:

- learning uses only Mikke-owned local data
- suggestions are optional
- no hidden profile upload
- no external AI dependency
- user can ignore suggestions without side effects

## Duplicate Grouping

When the same physical product appears from multiple providers, Mikke may group it into one product with provider offers underneath.

MVP grouping must be conservative.

Allowed strong identifiers:

- exact JAN/EAN/UPC where available
- exact manufacturer model number
- provider fields that clearly identify the same SKU

Do not group solely by fuzzy title similarity in the first implementation.

If identity is uncertain, keep results separate.

## Scoring

Current scoring of required conditions as higher-weight than preferred conditions remains conceptually valid.

Refine it so:

- failure of any required condition => not a full match
- preferred conditions affect match score
- notification trigger state is evaluated independently from attribute match score
- near-match classification is possible when exactly one non-critical required attribute misses or when a preferred-heavy candidate is unusually strong

Near-match logic must be conservative and explain which condition missed.

## Persistence and Migration

Existing localStorage keys should remain readable.

Migration requirements:

- old Watch records continue to display
- existing `conditions.maxPrice` maps to an equivalent structured absolute price rule
- existing `requiredKeys` and `preferredKeys` preserve their meaning
- missing new fields default safely
- history is never silently discarded

If a migration cannot confidently transform a field, preserve the old field and degrade gracefully.

## Compliance and Safety Constraints

- No unauthorized scraping
- Prefer official APIs and permitted sources
- No paid or metered AI/API dependency
- Do not fabricate reference prices, discount percentages, or “market low” claims
- Provider attribution requirements remain unchanged
- Provider secrets remain server-side
- Existing release Gate A/B/C model still applies
- Preview/testing does not imply public release

## Implementation Order

Recommended order:

1. Extend Watch schema and backward-compatible normalization
2. Extend parser and deterministic suggestion engine
3. Add relative price trigger evaluation and history-derived baselines
4. Add required/preferred editing UI
5. Redesign Today prioritization
6. Add strictness heuristic and relaxation suggestions
7. Add post-event actions and local decision history
8. Add local learning suggestions
9. Add conservative duplicate grouping
10. Refresh tests, security/compliance checks, and iPhone preview verification

## Acceptance Criteria

The redesign is acceptable when all of the following are true:

- A user can build a Watch by typing free text, tapping phrase suggestions, or mixing both.
- A Watch can express “24.5cm is required, gray is preferred, notify me when it becomes cheaper.”
- Relative-price triggers use only Mikke-observed history.
- “登録後最安値” is labeled as Mikke-observed, not market-wide.
- Required/preferred/notification conditions are visually separated before save.
- Today prioritizes meaningful changes over raw result counts.
- Relaxation suggestions never auto-apply.
- Post-notification actions are available and persisted locally.
- Existing Watches and history continue to work after migration.
- Duplicate grouping does not merge uncertain products.
- No paid AI service or unauthorized scraping is introduced.
- Automated Gate A tests remain green after implementation.
- iPhone Safari verification is completed before any public release decision.
