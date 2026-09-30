import { createFlightTravelIntent, normalizeFlightTravelIntent } from './flightTravelIntent.js';

function copy(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function emptyWatch(domain) {
  if (domain === 'flight') {
    return {
      schemaVersion:4,
      domain:'flight',
      target:{ title:'' },
      travelIntent:createFlightTravelIntent(),
      flightFilters:[],
      triggers:[],
      metadata:{},
    };
  }
  return {
    schemaVersion:3,
    domain,
    target:{ title:'' },
    domainConditions:[],
    triggers:[],
    metadata:{},
  };
}

function canonicalWatch(input={}) {
  const domain = input.domain || (input.type === 'flight' ? 'flight' : input.type === 'hotel' ? 'hotel' : 'fashion');
  if (domain === 'flight') {
    return {
      ...copy(input),
      schemaVersion:4,
      domain:'flight',
      target:{ ...(copy(input.target) || {}) },
      travelIntent:normalizeFlightTravelIntent(input.travelIntent),
      flightFilters:Array.isArray(input.flightFilters) ? copy(input.flightFilters) : [],
      triggers:Array.isArray(input.triggers) ? copy(input.triggers) : [],
      metadata:{ ...(copy(input.metadata) || {}) },
    };
  }
  return {
    ...copy(input),
    schemaVersion:3,
    domain,
    target:{ ...(copy(input.target) || {}) },
    domainConditions:Array.isArray(input.domainConditions) ? copy(input.domainConditions) : [],
    triggers:Array.isArray(input.triggers) ? copy(input.triggers) : [],
    metadata:{ ...(copy(input.metadata) || {}) },
  };
}

export function createComposerDraft(input={}) {
  const watch = canonicalWatch(input.watch || input);
  return {
    domain:watch.domain,
    watch,
    ui:{
      textHelperOpen:false,
      textBuffer:'',
      conditionGroup:'basic',
      selectedFieldId:null,
      flightDateMode:'exact',
      ...(copy(input.ui) || {}),
    },
  };
}

export function cloneComposerDraft(draft) {
  return copy(draft);
}

export function switchComposerDomain(draft, domain) {
  if (draft?.domain === domain) return cloneComposerDraft(draft);
  const next = createComposerDraft(emptyWatch(domain));
  next.ui.textHelperOpen = draft?.ui?.textHelperOpen === true;
  return next;
}

export function applyParsedWatch(draft, parsedWatch) {
  if (!parsedWatch || typeof parsedWatch !== 'object') return cloneComposerDraft(draft);
  const next = createComposerDraft(parsedWatch);
  next.ui.textHelperOpen = draft?.ui?.textHelperOpen === true;
  next.ui.textBuffer = draft?.ui?.textBuffer || '';
  return next;
}
