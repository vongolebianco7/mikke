# Mikke Flight Travel Intent Watch Design

Date: 2026-09-29
Status: Draft for user review
Scope: Flight Watch only

## 1. Problem

The current flight Watch model is built primarily as a list of flight filter fields (`origin`, `destination`, `outboundDate`, `returnDate`, etc.). That is insufficient for Mikke because the user often has a travel intention rather than one fully specified itinerary.

The redesign must preserve the familiar mental model of Google Flights / Skyscanner / KAYAK while differentiating Mikke by allowing unresolved travel intent to be watched over time.

The key design principle is:

> A Flight Watch represents a set of acceptable trips, not one search form submission.

This means location and date are first-class candidate sets, and a single Watch may describe multiple destinations, multiple date windows, open-ended destinations, flexible dates, and different stay-length constraints.

## 2. Product goals

A user must be able to express examples such as:

- Tokyo -> Honolulu, exact dates, round trip, nonstop, under ¥120,000.
- Tokyo -> Honolulu or Sydney, either destination is acceptable.
- Tokyo -> Okinawa / Miyako / Ishigaki, whichever becomes cheapest.
- Tokyo -> anywhere in Europe, any trip in February, 5-7 nights.
- Tokyo -> Honolulu, either Jan 10-14 or Feb 7-11.
- Tokyo -> Honolulu, anytime from Jan-Mar, 5-7 nights.
- Tokyo -> anywhere, any time, under ¥50,000, nonstop preferred.
- January weekend trip = 3 nights, March trip = 5-7 nights.

The product must not force users to choose one destination or one date range before a Watch can exist.

## 3. Reference interaction model

Mikke should borrow the interaction grammar of major flight metasearch products rather than inventing an unfamiliar flight form.

The top-level flight composer should follow:

1. Trip type / cabin
2. Origin
3. Destination
4. When
5. Travellers
6. Price / primary Watch trigger
7. Common filters
8. Advanced filters

The difference is that each of origin, destination, and date may describe a set rather than one value.

## 4. Core model: Travel Intent

Flight Watch v4 introduces a `travelIntent` object above ordinary domain conditions.

```js
{
  schemaVersion: 4,
  domain: 'flight',
  travelIntent: {
    tripPattern: 'round_trip',
    originSet: {},
    destinationSet: {},
    dateSet: {},
    travellers: {},
    cabin: {},
  },
  flightFilters: [],
  triggers: [],
  metadata: {}
}
```

The existing generic trigger engine remains reusable. Flight-specific intent should not be flattened into dozens of unrelated top-level conditions.

## 5. Origin model

`originSet` describes acceptable departure origins.

```js
originSet: {
  mode: 'specific' | 'any_of' | 'region',
  places: [PlaceRef],
  airportPolicy: {
    includeNearby: true,
    includedAirports: [],
    excludedAirports: []
  }
}
```

Examples:

- Tokyo area -> `mode:'region'`, place Tokyo, HND/NRT resolved as members.
- Haneda only -> Tokyo region + included HND only.
- Haneda or Narita -> `any_of` airport refs.
- Osaka or Nagoya -> multiple origin candidates.

`PlaceRef` must distinguish city, airport, metro area, region, country, and open semantic regions.

```js
{
  kind: 'airport' | 'city' | 'metro' | 'region' | 'country',
  id: 'HND',
  label: '羽田'
}
```

## 6. Destination model

Destination choice is not the same thing as multi-city itinerary.

```js
destinationSet: {
  mode: 'specific' | 'any_of' | 'region' | 'anywhere',
  places: [PlaceRef],
  airportPolicy: {
    includeNearby: true,
    includedAirports: [],
    excludedAirports: []
  }
}
```

Examples:

- Honolulu only -> `specific`
- Honolulu OR Sydney -> `any_of`
- Anywhere in Europe -> `region`
- Anywhere -> `anywhere`

`any_of` means alternative acceptable destinations. It must never be represented as `multi_city`.

## 7. Trip pattern

```js
tripPattern:
  'one_way' |
  'round_trip' |
  'multi_city'
```

`multi_city` is a sequence of required legs and is structurally separate from destination alternatives.

For multi-city:

```js
legs: [
  { originSet, destinationSet, dateSet },
  ...
]
```

## 8. Date model

The date model is the main Mikke differentiation. A Watch may contain multiple independent acceptable date options.

```js
dateSet: {
  mode: 'exact' | 'flexible' | 'month' | 'range' | 'anytime' | 'any_of',
  options: [DateOption]
}
```

A `DateOption` may be one of:

### Exact dates

```js
{
  kind: 'exact',
  outboundDate: '2027-01-10',
  returnDate: '2027-01-14'
}
```

### Exact dates with flexibility

```js
{
  kind: 'flexible',
  outboundDate: '2027-01-10',
  returnDate: '2027-01-14',
  outboundFlexDays: 2,
  returnFlexDays: 2
}
```

### Whole month

```js
{
  kind: 'month',
  year: 2027,
  month: 2,
  stayLength: { minNights: 5, maxNights: 7 }
}
```

### Date window

```js
{
  kind: 'range',
  startDate: '2027-03-20',
  endDate: '2027-03-31',
  stayLength: { minNights: 5, maxNights: 7 }
}
```

### Anytime

```js
{
  kind: 'anytime',
  stayLength: { minNights: 3, maxNights: 7 }
}
```

### Multiple alternatives

```js
{
  mode: 'any_of',
  options: [
    { kind:'exact', outboundDate:'2027-01-10', returnDate:'2027-01-14' },
    { kind:'month', year:2027, month:2, stayLength:{minNights:5,maxNights:7} }
  ]
}
```

A date option may carry its own stay-length rule. This is intentional so that "January = 3 nights, March = 5-7 nights" is expressible without splitting into separate Watches.

## 9. Relationship between destination and date alternatives

By default, destination alternatives and date alternatives are a Cartesian product:

- destinations: Honolulu, Sydney
- date options: Jan long weekend, Feb long weekend

means all four combinations are acceptable.

However, some users need coupled alternatives, e.g.:

- Honolulu in January
- Sydney in March

For this case the model supports optional `scenarios`:

```js
scenarios: [
  {
    destinationSet: {...Honolulu...},
    dateSet: {...January...}
  },
  {
    destinationSet: {...Sydney...},
    dateSet: {...March...}
  }
]
```

`scenarios` should be an advanced capability. The default UI should not expose it until the user creates a destination/date relationship that requires coupling.

## 10. Travellers

```js
travellers: {
  adults: 2,
  children: [],
  infantsInSeat: 0,
  infantsOnLap: 1
}
```

Children should eventually preserve ages because fare eligibility may depend on age. For MVP, adults / children / infants may be sufficient, but the schema must not make age impossible later.

## 11. Cabin and fare intent

Cabin should be part of the main search intent, not buried among filters.

```js
cabin: {
  allowed: ['economy'],
  mixedCabinAllowed: false
}
```

Payment mode:

```js
paymentIntent: {
  mode: 'cash' | 'award' | 'either',
  maxCashTotal: 120000,
  maxMiles: 60000,
  maxTaxesAndFees: 30000,
  maxFuelSurcharge: 20000
}
```

Cash and award fares must remain distinct evidence types. A low mileage requirement must never hide high cash surcharges.

## 12. Flight filters

Filters are separate from travel intent. These are search-result refinements similar to Google Flights / Skyscanner / KAYAK.

Primary filters shown immediately:

- nonstop / max stops
- airlines
- price
- outbound time
- return time

Secondary filters under "その他の条件":

- departure airports
- arrival airports
- maximum total duration
- connection airport
- min/max connection duration
- overnight connection allowed
- airport change allowed
- same-ticket connection requirement
- baggage
- seat selection
- fare changeability
- refundability
- alliance
- LCC allowed

Filters still use required/preferred semantics where meaningful.

## 13. iPhone layout

The iPhone composer should not render a condition registry as chips. It should look and behave like a flight-search product.

Main screen:

```text
[ 往復 ▾ ]                     [ エコノミー ▾ ]

出発地
[ 東京                                   ]

行き先
[ ホノルル ] [ シドニー ] [ ＋追加 ]
[ どこでも ]

いつ行く？
[ 日付指定 ] [ 月指定 ] [ 期間 ] [ いつでも ]

日付候補
┌ 1/10 - 1/14                      × ┐
└──────────────────┘
┌ 2月のどこか・5〜7泊             × ┐
└──────────────────┘
[ ＋候補を追加 ]

人数
[ 大人2・乳児1 ▾ ]

よく使う条件
[ 直行 ] [ ANA/JAL ] [ ¥12万以下 ] [ 午前発 ] →

[ その他の条件 ]

通知
条件に合う便が見つかったら

[ この条件をWatch ]
```

Important layout rules:

- Origin/destination/date are not displayed as generic condition chips.
- Multiple places and dates are visible as removable tokens/cards.
- Adding a destination or date should not replace an existing one unless the user explicitly selects "置き換え".
- Date mode selection happens before showing the relevant date picker controls.
- Common filters are horizontally scrollable; detailed filters are progressively disclosed.
- Notification configuration is visually separated from trip specification.

## 14. Parsing natural language

Text input must compile to the same structured `travelIntent`.

Examples:

"東京からホノルルかシドニー、1月連休か2月連休、5〜7泊、直行便"

must create:

- one origin set
- two alternative destinations
- two date options
- stay length
- nonstop filter

The parser must not collapse alternatives into one text field.

Ambiguous natural-language dates must remain unresolved metadata rather than being fabricated into exact dates.

## 15. Composer mode behavior

All three composer modes share one structured draft:

- かんたん: guided travel questions
- 組み立て: structured search-form controls
- 文章で入力: natural language compiled into the same Travel Intent

Switching modes must not serialize and reconstruct from plain text. The structured draft remains the source of truth.

## 16. Evaluation semantics

A candidate itinerary matches when:

1. it satisfies at least one valid travel scenario / destination-date combination,
2. all required filters for that combination are known and pass,
3. no required fact is unknown or unsupported.

Preferred filters affect ranking only.

Unknown and unsupported remain separate evidence states.

## 17. Trigger semantics

Triggers remain common and evidence-driven:

- matching itinerary appears
- price <= threshold
- price decreases by X%
- new Watch low
- award seat appears
- cash taxes/fees <= threshold

A trigger fires only when the underlying evidence exists. No inferred availability or fabricated fare evidence.

## 18. Compatibility

Existing flight v3 Watches are migrated in memory into the v4 Travel Intent shape:

- `origin` -> `originSet.places`
- `destination` -> `destinationSet.places`
- `tripType` -> `tripPattern`
- `outboundDate` / `returnDate` -> one exact DateOption
- passenger fields -> travellers
- cabin/payment-related fields -> corresponding intent sections
- other flight fields -> `flightFilters`

Stored v3 data remains readable during the compatibility window; no destructive migration is required.

## 19. Non-goals for this change

- No live Google Flights / Skyscanner / KAYAK scraping.
- No provider integration that violates terms or requires paid/metered APIs.
- No production publish.
- No main merge.
- Hotel Travel Intent redesign is a later follow-up after the Flight model is validated.

## 20. Acceptance criteria

The redesign is acceptable when one Flight Watch can represent all of the following without text-only fallbacks:

1. multiple origins
2. multiple destinations
3. anywhere / regional destinations
4. exact dates
5. flexible dates
6. whole-month travel
7. arbitrary date windows
8. anytime travel
9. multiple independent date alternatives
10. stay-length constraints per date option
11. coupled destination/date scenarios when needed
12. round-trip / one-way / multi-city distinction
13. travellers and cabin
14. common and advanced flight filters
15. cash / award / either payment intent
16. common evidence-driven notification triggers
17. preservation across all three composer modes
18. iPhone layout that resembles a flight-search flow rather than a condition registry
