import { normalizeDomainCondition, normalizeTrigger } from './watchSchema.js';

const validSetModes = new Set(['specific','any_of','region','anywhere']);
const validTripPatterns = new Set(['one_way','round_trip','multi_city']);
const validDateModes = new Set(['exact','flexible','month','range','anytime','any_of']);

function airportPolicy(value={}) {
  return {
    includeNearby: value.includeNearby !== false,
    includedAirports: Array.isArray(value.includedAirports) ? [...value.includedAirports] : [],
    excludedAirports: Array.isArray(value.excludedAirports) ? [...value.excludedAirports] : [],
  };
}

function placeSet(value={}, fallbackMode='specific') {
  const mode = validSetModes.has(value.mode) ? value.mode : fallbackMode;
  return {
    mode,
    places: Array.isArray(value.places) ? value.places.map((place)=>({ ...place })) : [],
    airportPolicy: airportPolicy(value.airportPolicy),
  };
}

function normalizeStayLength(value) {
  if (!value || typeof value !== 'object') return undefined;
  const minNights = Number.isFinite(value.minNights) ? value.minNights : undefined;
  const maxNights = Number.isFinite(value.maxNights) ? value.maxNights : undefined;
  if (minNights === undefined && maxNights === undefined) return undefined;
  return { minNights, maxNights };
}

function normalizeDateOption(value={}) {
  const option = { ...value };
  const stayLength = normalizeStayLength(value.stayLength);
  if (stayLength) option.stayLength = stayLength;
  return option;
}

function dateSet(value={}) {
  const options = Array.isArray(value.options) ? value.options.map(normalizeDateOption) : [];
  const inferredMode = options.length > 1 ? 'any_of' : options[0]?.kind || 'anytime';
  return {
    mode: validDateModes.has(value.mode) ? value.mode : inferredMode,
    options,
  };
}

export function createFlightTravelIntent() {
  return {
    tripPattern:'round_trip',
    originSet:placeSet(),
    destinationSet:placeSet(),
    dateSet:{ mode:'anytime', options:[] },
    travellers:{ adults:1, children:[], infantsInSeat:0, infantsOnLap:0 },
    cabin:{ allowed:['economy'], mixedCabinAllowed:false },
    paymentIntent:{ mode:'cash' },
    scenarios:[],
    legs:[],
  };
}

export function normalizeFlightTravelIntent(value={}) {
  const base = createFlightTravelIntent();
  return {
    tripPattern: validTripPatterns.has(value.tripPattern) ? value.tripPattern : base.tripPattern,
    originSet: placeSet(value.originSet),
    destinationSet: placeSet(value.destinationSet),
    dateSet: dateSet(value.dateSet),
    travellers: {
      adults: Number.isFinite(value.travellers?.adults) ? value.travellers.adults : 1,
      children: Array.isArray(value.travellers?.children) ? [...value.travellers.children] : [],
      infantsInSeat: Number.isFinite(value.travellers?.infantsInSeat) ? value.travellers.infantsInSeat : 0,
      infantsOnLap: Number.isFinite(value.travellers?.infantsOnLap) ? value.travellers.infantsOnLap : 0,
    },
    cabin: {
      allowed: Array.isArray(value.cabin?.allowed) && value.cabin.allowed.length ? [...value.cabin.allowed] : ['economy'],
      mixedCabinAllowed: value.cabin?.mixedCabinAllowed === true,
    },
    paymentIntent: value.paymentIntent && typeof value.paymentIntent === 'object' ? { mode:'cash', ...value.paymentIntent } : { mode:'cash' },
    scenarios: Array.isArray(value.scenarios) ? value.scenarios.map((scenario)=>({
      ...scenario,
      originSet: scenario.originSet ? placeSet(scenario.originSet) : undefined,
      destinationSet: scenario.destinationSet ? placeSet(scenario.destinationSet) : undefined,
      dateSet: scenario.dateSet ? dateSet(scenario.dateSet) : undefined,
    })) : [],
    legs: Array.isArray(value.legs) ? value.legs.map((leg)=>({
      originSet: placeSet(leg.originSet),
      destinationSet: placeSet(leg.destinationSet),
      dateSet: dateSet(leg.dateSet),
    })) : [],
  };
}

function conditionMap(watch) {
  return new Map((watch.domainConditions || []).map((condition)=>[condition.fieldId, condition]));
}

function placeFromLegacy(value) {
  return { kind:'city', id:String(value), label:String(value) };
}

export function migrateV3FlightWatch(watch={}) {
  if (watch.domain !== 'flight' || watch.schemaVersion === 4) return watch;
  const conditions = conditionMap(watch);
  const intent = createFlightTravelIntent();
  const origin = conditions.get('origin')?.value;
  const destination = conditions.get('destination')?.value;
  if (origin !== undefined) intent.originSet = placeSet({ mode:'specific', places:[placeFromLegacy(origin)] });
  if (destination !== undefined) intent.destinationSet = placeSet({ mode:'specific', places:[placeFromLegacy(destination)] });
  const tripType = conditions.get('tripType')?.value;
  if (validTripPatterns.has(tripType)) intent.tripPattern = tripType;
  const outboundDate = conditions.get('outboundDate')?.value;
  const returnDate = conditions.get('returnDate')?.value;
  if (outboundDate || returnDate) {
    const option = { kind:'exact' };
    if (outboundDate) option.outboundDate = outboundDate;
    if (returnDate) option.returnDate = returnDate;
    intent.dateSet = { mode:'exact', options:[option] };
  }
  const adults = conditions.get('adults')?.value;
  const children = conditions.get('children')?.value;
  const infants = conditions.get('infants')?.value;
  if (Number.isFinite(adults)) intent.travellers.adults = adults;
  if (Number.isFinite(children) && children > 0) intent.travellers.children = Array.from({length:children},()=>({age:undefined}));
  if (Number.isFinite(infants)) intent.travellers.infantsOnLap = infants;
  const cabin = conditions.get('cabinClass')?.value;
  if (cabin) intent.cabin.allowed = Array.isArray(cabin) ? [...cabin] : [cabin];
  const paymentType = conditions.get('paymentType')?.value;
  if (paymentType) intent.paymentIntent.mode = paymentType;
  const maxMiles = conditions.get('maxMiles')?.value;
  if (Number.isFinite(maxMiles)) intent.paymentIntent.maxMiles = maxMiles;
  const maxTaxesAndFees = conditions.get('maxTaxesAndFees')?.value;
  if (Number.isFinite(maxTaxesAndFees)) intent.paymentIntent.maxTaxesAndFees = maxTaxesAndFees;
  const maxFuelSurcharge = conditions.get('maxFuelSurcharge')?.value;
  if (Number.isFinite(maxFuelSurcharge)) intent.paymentIntent.maxFuelSurcharge = maxFuelSurcharge;
  const price = conditions.get('price')?.value;
  if (Number.isFinite(price)) intent.paymentIntent.maxCashTotal = price;

  const intentFields = new Set(['origin','destination','tripType','outboundDate','returnDate','adults','children','infants','cabinClass','paymentType','maxMiles','maxTaxesAndFees','maxFuelSurcharge','price']);
  const flightFilters = (watch.domainConditions || []).filter((condition)=>!intentFields.has(condition.fieldId)).map(normalizeDomainCondition);

  return {
    ...watch,
    schemaVersion:4,
    domain:'flight',
    travelIntent:normalizeFlightTravelIntent(intent),
    flightFilters,
    triggers:Array.isArray(watch.triggers) ? watch.triggers.map(normalizeTrigger) : [],
    metadata:watch.metadata && typeof watch.metadata === 'object' ? { ...watch.metadata, migratedFromSchemaVersion:3 } : { migratedFromSchemaVersion:3 },
  };
}
