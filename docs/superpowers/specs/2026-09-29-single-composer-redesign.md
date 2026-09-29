# Mikke Single Composer Redesign

## Goal
Replace the current three-mode composer with one domain-aware composer that feels simple on iPhone while preserving deep domain-specific conditions and Mikke's flexible Watch model.

## Product decision
Remove the `かんたん` mode entirely. Also stop presenting `組み立て` and `文章で入力` as equal top-level modes. The composer has one primary flow. `文章から条件を作る` remains as an optional helper entry that compiles into the same structured Watch and then returns the user to the same editable form.

## Core principle
**Structured Watch is the single source of truth.** Buttons, form controls, and free text are only editing surfaces for that structure. UI state must not rely on parallel phrase arrays such as `easyPhrases` or `builderPhrases`.

## Top-level flow
1. User chooses what to Watch: 商品 / 航空券 / ホテル.
2. The screen becomes a domain-specific form.
3. Primary conditions appear first.
4. Common refinements appear next.
5. Advanced conditions stay collapsed until requested.
6. `いつ知らせる？` is a distinct final section.
7. Optional `文章から条件を作る` can populate the same structured Watch at any time.

The user should never need to understand the concepts `mode`, `schema`, `required`, `preferred`, or `trigger` to create a useful Watch.

## Information hierarchy
Use three visible levels only:

### 1. Primary intent
The few inputs that define what the user is actually looking for.

### 2. Refine
Commonly used conditions for the current domain/category. These may use compact chips where genuinely appropriate, but should not become a wall of pills.

### 3. Notify
A visually distinct `いつ知らせる？` section. Notification conditions are not mixed into search/filter conditions.

Advanced constraints belong under `その他の条件` and are progressively disclosed.

## Flight composer
The flight composer follows travel-search mental models rather than a generic condition editor.

Order on iPhone:
1. Trip pattern and cabin
2. Origins
3. Destinations
4. Dates
5. Travellers
6. Common flight filters
7. Other flight filters
8. Notification

### Origins and destinations
- Multiple origins supported.
- Multiple destinations supported.
- Destination can be `anywhere`.
- Region/city/airport are valid place concepts.
- Alternative destinations are not the same as multi-city itinerary legs.

### Dates
Date choice must support multiple alternatives in one Watch.
Each option can be one of:
- exact dates
- flexible exact date ± N days
- month
- date range
- anytime

Month/range/anytime options can carry stay-length constraints. Multiple date options may coexist. Exact alternatives must not overwrite each other.

### Scenarios
When a user explicitly couples a destination and a date alternative, represent that as a scenario instead of creating a Cartesian combination.

### Flight filters
Common filters shown first should include, when applicable:
- nonstop / maximum stops
- airline
- departure time
- baggage

Additional conditions such as connection time, airport change, total duration, fare flexibility, cash/miles constraints, taxes/fees, and surcharge remain under advanced disclosure.

### Flight notifications
Examples:
- total price below threshold
- award seat becomes available
- matching nonstop itinerary appears
- mileage requirement drops

## Hotel composer
Hotel should use a stay-oriented flow:
1. Destination/area
2. Check-in/check-out or flexible stay period
3. Guests/rooms
4. Common room/location filters
5. Facilities and booking policies
6. Notification

Common filters can include walking distance, breakfast, free cancellation, room type, non-smoking, rating, and facilities. Advanced details remain collapsed.

## Shopping composer
Shopping is domain/category-aware rather than a generic attribute phrase builder.

The first field is the product/category intent. Once inferred or selected, the composer shows the most relevant controls for that category.

Examples:
- Refrigerator: capacity, width, color, condition, price
- Fashion: model, size, color, condition, price
- Furniture: dimensions, material/color, shipping, price
- Food: quantity/weight, unit price, origin/dietary needs, shipping
- Used car: model/year, mileage, repair history, total price

Do not expose category-independent generic fields simply because the schema contains them. The UI should be generated from Domain Schema priority/group metadata.

## Text input helper
`文章から条件を作る` is a secondary action, not a mode tab.

Behavior:
1. Open a small text-entry sheet/panel.
2. Parse the text deterministically using existing parser logic.
3. Convert the result into the same structured Watch draft used by the form.
4. Close the helper and show the parsed conditions in the normal domain form.
5. The user can then edit any parsed field directly.

Switching between text-assisted entry and manual editing must never reconstruct the Watch from display text or lose structured conditions.

## Visual design
- iPhone-first vertical rhythm.
- Prefer full-width or two-column primary fields over long horizontal chip rows.
- Minimum practical tap targets around 44px for main interactive controls.
- Use horizontal scrolling only where it naturally fits, such as airline, brand, color, or compact categorical choices.
- Reduce helper copy and tiny labels.
- Avoid stacking many bordered cards of equal visual weight.
- Keep one dominant action per section.
- Notification block should visually read as the final step rather than another filter family.

## State model
The composer maintains one structured draft:
- flight -> schemaVersion 4 Travel Intent + flightFilters + triggers
- hotel -> schemaVersion 3 domainConditions + triggers until a future hotel-intent schema is justified
- shopping domains -> schemaVersion 3 domainConditions + triggers

Legacy Watches remain loadable through normalization. New UI must not break existing saved Watches.

## Evidence/capability safety
- Unsupported provider fields remain `unsupported`.
- Supported but absent evidence remains `unknown`.
- Required unknown/unsupported conditions cannot become confirmed matches.
- UI may explain provider capability, but must never fabricate availability or match evidence.

## Out of scope
- Live flight provider integration
- Live hotel provider integration
- Paid/metered AI or APIs
- Unauthorized scraping
- Production publish
- Merge to main

## Success criteria
- No `かんたん` mode in the UI.
- No three-card mode picker.
- Users can create Watches through one coherent domain-aware flow.
- Free text is an optional helper, not a separate workflow.
- Flight supports multiple destinations and multiple date alternatives without data loss.
- Hotel and shopping show domain-relevant inputs rather than generic phrase-building UI.
- Search/filter conditions and notification conditions are visibly separated.
- Saved legacy Watches still load.
- Existing compliance, security, build, and test gates remain green.
