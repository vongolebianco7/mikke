# Mikke Domain-Specific Watch Conditions Design

Date: 2026-09-29
Status: Design specification
Branch: `feat/mikke-mvp`
Supersedes: `docs/superpowers/specs/2026-09-29-universal-product-conditions-and-triggers-design.md`

## Goal

Mikke should let users describe the conditions that actually matter in each domain instead of forcing every Watch into a shallow generic product-attribute model.

Examples:

- Flight: origin, destination, one-way/round-trip, dates, airline, stops, departure time, baggage, fare rules, award-seat rules.
- Hotel: area, dates, room occupancy, station distance, room type, meals, facilities, cancellation policy.
- Fashion: size system, measurements, color, material, fit, condition, returns.
- Appliance: category-specific capacity, dimensions, installation constraints, power, warranty and model details.
- Used car: year, mileage, grade, repair history, drivetrain, equipment and warranty.

The architecture must remain extensible so new domains can be added without rewriting the Watch core.

## Core design decision

Mikke uses three layers:

```text
Watch Core
  + Domain Schema
  + Common Trigger Engine
```

### 1. Watch Core

The shared Watch core owns only cross-domain behavior:

- Watch identity and persistence
- required / preferred semantics
- observation history
- candidate evaluation result shape
- notification event history
- source/evidence confidence
- backward compatibility

### 2. Domain Schema

Each domain owns the fields that make sense for that domain.

Initial domains:

- `flight`
- `hotel`
- `fashion`
- `appliance`
- `furniture`
- `food`
- `used_car`

The system must allow later domains such as baby goods, PC/smartphone, camera, games, outdoor goods, sports goods, bicycles, new cars, motorcycles, rentals, rail, buses, package tours, housing, tickets, restaurants and jobs.

### 3. Common Trigger Engine

Triggers represent meaningful changes or thresholds and remain domain-agnostic where possible:

- price threshold
- price drop
- availability / seat / stock appearance
- new listing
- release / preorder
- shipping fee
- coupon
- delivery timing
- condition match

Domain-specific aliases may map to the same trigger family. For example `award_seat_available` is an availability event in the flight domain.

## Watch shape

```js
{
  schemaVersion: 3,
  domain: 'flight',
  target: {},
  domainConditions: [DomainCondition],
  triggers: [Trigger],
  metadata: {
    rawQuery,
    inputMode,
    createdAt
  }
}
```

Legacy fields remain readable through compatibility adapters. No destructive localStorage migration is required.

## Domain field definition

Every domain field is declared in a schema registry.

```js
{
  id: 'maxStops',
  label: '乗り換え',
  type: 'integer',
  operators: ['eq', 'lte'],
  unit: null,
  allowedValues: null,
  aliases: ['直行', '乗継なし', '1回まで'],
  group: 'flight',
  priority: 'high',
  supportsRequired: true,
  supportsPreferred: true,
  supportsTrigger: false
}
```

Field types may include:

- text
- enum
- boolean
- integer
- number
- money
- date
- date_range
- time_range
- duration
- location
- airport
- list
- measurement
- structured object

Supported operators depend on the field definition, not on one global list.

Examples:

- `maxStops <= 1`
- `mileage <= 30000 km`
- `minRoomArea >= 25 m2`
- `departureTimeRange between 08:00 and 12:00`
- `allowedAirlines in [ANA, JAL]`

## Domain condition model

```js
{
  id,
  fieldId,
  operator,
  value,
  unit,
  role: 'required' | 'preferred',
  evidencePolicy: 'known_required' | 'allow_unknown'
}
```

Default behavior:

- required + unknown evidence => not a confirmed match
- preferred + unknown evidence => neutral, not passed
- unsupported provider field => explicitly unsupported, never false/zero

## UI disclosure levels

Each domain schema groups fields into four disclosure levels:

1. basic
2. common
3. detailed
4. advanced

The schema may be broad internally while the iPhone UI remains simple.

Example for flights:

- Basic: origin, destination, trip type, dates, passengers, price
- Common: direct/stops, airline, cabin, departure/arrival time
- Detailed: baggage, duration, connection duration, airport transfer, fare flexibility
- Advanced: award seats, mileage ceiling, taxes/fees, fuel surcharge, alliance

## Input modes

The existing three input modes remain:

- Easy: guided questions from the domain schema
- Builder: field chips generated from the domain schema
- Text: deterministic parsing into the same schema

All modes compile to the same Watch representation.

Switching modes must preserve the structured Watch state rather than reconstructing meaning only from display text.

# Domain Schemas

## Flight

### Route and journey

- `origin`
- `destination`
- `departureAirports[]`
- `arrivalAirports[]`
- `tripType`: one_way / round_trip / multi_city
- `outboundDate`
- `returnDate`
- `dateFlexibility`

Origin and destination may represent a city/region or explicit airport set.

Examples:

- 東京発 = HND/NRT as a location group where source data supports it
- 羽田のみ = HND required
- 成田除外 = NRT excluded

### Passengers

- `adults`
- `children`
- `infants`

Passenger composition is part of the search target and must not be inferred away because fare/availability can differ materially.

### Stops and schedule

- `nonstopOnly`
- `maxStops`
- `maxTotalDuration`
- `minConnectionDuration`
- `maxConnectionDuration`
- `departureTimeRange`
- `arrivalTimeRange`
- `overnightConnectionAllowed`
- `airportChangeAllowed`
- `sameTicketConnectionRequired`

### Airline

- `preferredAirlines[]`
- `allowedAirlines[]`
- `excludedAirlines[]`
- `alliance`
- `lccAllowed`

### Fare

- `cabinClass`
- `fareClass`
- `checkedBaggageIncluded`
- `carryOnIncluded`
- `seatSelectionIncluded`
- `refundable`
- `changeable`

### Award travel

- `paymentType`: cash / miles / either
- `maxMiles`
- `maxTaxesAndFees`
- `maxFuelSurcharge`

Award recommendations must show both mileage and cash outlay when known. Missing taxes/fees must not be treated as zero.

### Flight trigger suggestions

- total price <= threshold
- price drop >= percent
- Watch low
- seat availability appears
- award seat appears
- mileage requirement drops
- a nonstop itinerary enters the target price

## Hotel

### Stay target

- `destination`
- `area`
- `checkIn`
- `checkOut`
- `rooms`
- `adults`
- `children`
- `infants`

### Location

- `station`
- `maxWalkingMinutes`
- `maxDistanceFromPoint`
- `neighborhood`
- `airportAccess`
- `shuttleAvailable`

### Room

- `roomType`
- `bedType`
- `minRoomArea`
- `nonsmoking`
- `viewType`
- `bathroomType`
- `connectingRoomAvailable`

### Meals and facilities

- `breakfastIncluded`
- `dinnerIncluded`
- `mealPlan`
- `childrenMealAvailable`
- `publicBath`
- `onsen`
- `pool`
- `parking`
- `laundry`
- `kitchen`
- `babyBed`
- `barrierFree`

### Booking policy

- `freeCancellation`
- `cancellationDeadline`
- `payAtProperty`
- `prepaymentRequired`
- `rating`
- `reviewCount`
- `brand`

### Hotel trigger suggestions

- nightly price <= threshold
- total stay price <= threshold
- room availability appears
- free-cancellation plan appears
- breakfast-included plan appears
- target room type appears
- a new candidate satisfying rating constraints appears

## Fashion

### Product identity

- `brand`
- `productType`
- `model`
- `modelNumber`
- `collection`
- `gender`

### Size and measurements

- `size`
- `sizeSystem`: JP / US / EU / UK
- `fit`
- `width`
- `chestWidth`
- `length`
- `sleeveLength`
- `waist`
- `inseam`
- `shoeWidth`
- `heelHeight`

Only fields relevant to the chosen subcategory should be promoted in the UI.

### Design

- `color`
- `colorFamily`
- `pattern`
- `material`
- `silhouette`
- `season`

### Condition and purchase policy

- `condition`: new / unused / used / display / outlet
- `usedGrade`
- `authenticityVerified`
- `domesticOfficial`
- `parallelImportAllowed`
- `returnable`
- `sizeExchangeAllowed`
- `seller`
- `shippingDays`

### Fashion trigger suggestions

- target size restock
- target color appears
- price threshold
- discount threshold
- coupon appears
- sale starts
- new-condition inventory appears
- outlet inventory appears

## Appliance

The appliance domain requires subcategory schemas. Generic appliance fields are inherited by refrigerator, washer, TV, air conditioner and later appliance types.

### Common appliance fields

- `manufacturer`
- `model`
- `modelNumber`
- `releaseYear`
- `color`
- `price`
- `condition`
- `warrantyYears`
- `width`
- `height`
- `depth`
- `weight`
- `installationWidth`
- `installationDepth`
- `requiredClearance`
- `voltage`
- `powerConsumption`
- `annualEnergyConsumption`
- `energyEfficiency`

### Refrigerator

- `totalCapacity`
- `freezerCapacity`
- `doorCount`
- `doorStyle`
- `vegetableRoom`
- `iceMaker`

### Washer

- `washCapacity`
- `dryCapacity`
- `dryerType`
- `drumType`
- `noiseLevel`

### TV

- `screenSize`
- `resolution`
- `panelType`
- `refreshRate`
- `hdmiCount`
- `tunerType`

### Air conditioner

- `roomTatamiRating`
- `coolingCapacity`
- `heatingCapacity`
- `outdoorUnitSize`

### Appliance trigger suggestions

- price threshold
- price drop
- restock
- new model release
- older model price drop
- free shipping
- warranty campaign
- display item appears for target model

## Furniture

### Product and dimensions

- `brand`
- `productType`
- `model`
- `price`
- `color`
- `material`
- `condition`
- `width`
- `height`
- `depth`
- `weight`
- `seatCount`
- `loadCapacity`

### Installation and delivery

- `assemblyRequired`
- `assembledDelivery`
- `packageWidth`
- `packageHeight`
- `packageDepth`
- `minimumDoorWidth`
- `elevatorRequired`
- `installationService`

### Functional/design fields

- `storageIncluded`
- `foldable`
- `extendable`
- `reclining`
- `adjustableHeight`
- `casters`
- `style`
- `colorFamily`
- `finish`
- `legMaterial`

### Purchase policy

- `shippingFee`
- `deliveryDays`
- `returnable`
- `warrantyYears`

### Furniture trigger suggestions

- landed price threshold
- free shipping
- target dimensions appear
- restock
- installation service appears
- delivery time enters threshold

## Food

### Product and quantity

- `brand`
- `productName`
- `category`
- `price`
- `quantity`
- `weight`
- `volume`

### Normalized unit prices

- `unitPricePer100g`
- `unitPricePerKg`
- `unitPricePerItem`
- `unitPricePer100ml`

Derived unit prices may only be calculated from known quantity and known landed price.

### Origin and quality

- `originCountry`
- `originRegion`
- `organic`
- `additiveFree`
- `certification`

### Shelf life and storage

- `expirationDate`
- `minimumRemainingShelfLife`
- `storageMethod`: room_temp / refrigerated / frozen

### Nutrition and dietary constraints

- `calories`
- `protein`
- `fat`
- `carbohydrates`
- `sugar`
- `salt`
- `allergens[]`
- `glutenFree`
- `vegan`
- `vegetarian`
- `halal`
- `kosher`

### Purchase policy

- `subscription`
- `bulkPack`
- `minimumOrderQuantity`
- `shippingFee`

### Food trigger suggestions

- unit-price threshold
- landed-price threshold
- free shipping
- coupon appears
- restock
- minimum shelf life candidate appears
- bulk discount starts

## Used car

### Vehicle identity

- `manufacturer`
- `model`
- `trim`
- `generation`
- `bodyType`

### Year and mileage

- `modelYear`
- `registrationYear`
- `mileage`
- `inspectionExpiry`

### Price

- `vehiclePrice`
- `totalPrice`
- `monthlyPayment`

### Condition/history

- `repairHistory`
- `accidentHistory`
- `oneOwner`
- `nonSmoking`
- `serviceHistory`
- `dealerCertified`

### Powertrain

- `fuelType`
- `hybrid`
- `ev`
- `drivetrain`
- `transmission`
- `engineDisplacement`

### Exterior/interior and equipment

- `bodyColor`
- `interiorColor`
- `seatMaterial`
- `navigation`
- `adaptiveCruise`
- `parkingCamera`
- `parkingSensors`
- `sunroof`
- `heatedSeats`
- `powerSeats`
- `safetyPackage`
- `appleCarPlay`
- `androidAuto`

### Warranty/seller

- `warranty`
- `warrantyMonths`
- `dealer`
- `dealerDistance`
- `deliveryAvailable`

### Used-car trigger suggestions

- total price threshold
- price drop
- new listing
- target trim appears
- target equipment combination appears
- dealer warranty appears

# Common Trigger Registry

Triggers use a shared representation when the semantics are genuinely common.

```js
{
  id,
  metric,
  operator,
  value,
  unit,
  reference,
  role: 'notification'
}
```

Initial common metrics:

- `price`
- `landed_price`
- `price_drop_percent`
- `watch_low`
- `availability`
- `new_listing`
- `release_status`
- `preorder_status`
- `shipping_fee`
- `delivery_days`
- `delivery_date`
- `coupon_available`
- `coupon_discount_amount`
- `coupon_discount_percent`
- `condition_match`

Examples:

```js
{ metric: 'price', operator: 'lte', value: 120000, unit: 'JPY' }
{ metric: 'price_drop_percent', operator: 'gte', value: 10, unit: '%' }
{ metric: 'availability', operator: 'changed_to', value: 'available' }
{ metric: 'shipping_fee', operator: 'eq', value: 0, unit: 'JPY' }
```

A domain may expose aliases such as `seat_available`, `room_available`, or `stock_available` while the engine records the common availability event plus domain metadata.

## Derived metrics and provenance

Derived values require complete source evidence.

Examples:

```text
landed_price = item_price + shipping_fee
coupon_adjusted_price = landed_price - verified_eligible_coupon
unit_price = landed_price / normalized_quantity
```

Rules:

- unknown input => derived value unknown
- unsupported input => derived value unsupported
- coupon eligibility must be verified before subtracting coupon value
- points remain separately labeled and are not silently treated as cash
- flight taxes/fees and fuel surcharge are never assumed to be zero

## Evidence states

Every candidate field supports:

- `known`
- `unknown`
- `unsupported`
- `inferred`

`inferred` is permitted only for conservative, explicit derivations and must carry provenance.

Unknown is not false and not zero.

## Parsing strategy

Text parsing is domain-aware.

1. infer/select domain
2. load domain schema
3. extract domain target and fields using aliases and deterministic rules
4. assign required/preferred semantics from wording and input mode
5. extract common triggers
6. preserve raw text for display/audit

The parser must not invent unsupported conditions from vague wording.

Examples:

```text
羽田か成田からホノルル、往復、直行、ANAかJAL、午前発、乳児1人、総額12万円以下
```

compiles into flight-domain fields instead of generic product attributes.

```text
VEZEL、2027年式以降、3万km以下、修復歴なし、白、総額300万円以下
```

compiles into used-car fields.

## Evaluation strategy

Evaluation has two stages:

1. domain condition evaluation
2. common trigger evaluation

Domain evaluators interpret the meaning of each field but use shared evidence/result interfaces.

A candidate result must expose:

```js
{
  matched,
  requiredResults: [],
  preferredResults: [],
  unknownRequired: [],
  score,
  nearMatch
}
```

A required unknown value prevents a confirmed full match.

## Backward compatibility

Existing schemaVersion 1/2 Watches remain readable.

Compatibility rules:

- legacy shopping `genericConditions` map to equivalent domain fields where safe
- existing price/state triggers map to the common trigger registry
- existing flight fields (`origin`, `destination`, `directOnly`, `tripType`) map into the new flight schema
- existing hotel destination maps into the new hotel schema
- unknown legacy custom attributes remain preserved for display and must not be silently discarded

No destructive migration is required.

## Implementation order

The architecture should be introduced incrementally rather than through a large rewrite.

Recommended first proof domains:

1. flight
2. hotel
3. fashion
4. appliance
5. used_car

Furniture and food follow on the same registry structure.

The implementation plan should preserve current working Watch behavior during each step.

## Future domain expansion

The registry must support adding domains without changing Watch Core interfaces.

Planned candidates include:

- baby goods
- PC / smartphone
- camera
- games
- outdoor goods
- sports goods
- bicycles / e-bikes
- new cars
- motorcycles
- rental cars
- rail
- highway bus
- package tours
- rental housing
- used condominium
- new detached housing
- land
- live/sports/theme-park tickets
- restaurant reservations
- jobs

Domain additions should be schema-first and tested before UI exposure.

## Compliance and provider limitations

- Prefer official APIs, feeds and permitted sources.
- Do not add unauthorized scraping to fill missing fields.
- Do not fabricate provider evidence for fields a source does not expose.
- Do not require paid or metered AI/API services for the condition engine.
- Provider-specific limitations must be visible as unknown/unsupported rather than hidden.

## Success criteria

1. Flight Watch can represent route, journey, passenger, stop, airline, schedule, fare and award conditions.
2. Hotel Watch can represent stay, location, room, facilities and booking-policy conditions.
3. Fashion, appliance, furniture, food and used-car schemas expose domain-appropriate detailed conditions.
4. Easy, Builder and Text modes compile to the same domain-aware Watch model.
5. Required/preferred semantics work consistently across domains.
6. Common notifications do not require category-specific trigger-engine branches unless the event is genuinely domain-specific.
7. Missing provider evidence never becomes a false match or false notification.
8. Existing Watches remain readable.
9. iPhone UI exposes basic/common/detailed/advanced conditions progressively instead of dumping the entire schema.
10. A new domain can be added primarily by defining a Domain Schema and focused evaluator/parser rules, without redesigning Watch Core.
