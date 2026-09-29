import { evaluateCandidate, deriveEvents } from '../domain/evaluate.js';
import { factsFromCandidate, factKnown, factUnknown } from '../domain/candidateFacts.js';
import { derivePurchaseMetrics } from '../domain/purchaseMetrics.js';
import { evaluateTriggers } from '../domain/triggerEngine.js';
import { groupProducts } from '../domain/groupProducts.js';
import { searchSampleShopping } from './sampleShopping.js';
import { searchOfficialShopping } from './officialShopping.js';

function splitHistoryEntry(entry) {
  if (!entry) return { previous: undefined, context: {} };
  if (entry.previous || entry.initialPrice !== undefined || entry.observedLow !== undefined) {
    return {
      previous: entry.previous,
      context: {
        initialPrice: entry.initialPrice,
        observedLow: entry.observedLow,
        observationCount: entry.observationCount,
      },
    };
  }
  return { previous: entry, context: {} };
}

function factsFromObservation(observation) {
  if (!observation) return {};
  if (observation.facts && typeof observation.facts === 'object') return observation.facts;
  return {
    price: Number.isFinite(observation.price) ? factKnown(observation.price, { source: 'mikke_history' }) : factUnknown({ source: 'mikke_history' }),
    availability: observation.available === true ? factKnown('in_stock', { source: 'mikke_history' })
      : observation.available === false ? factKnown('out_of_stock', { source: 'mikke_history' })
        : factUnknown({ source: 'mikke_history' }),
  };
}

function pushUnique(events, additions) {
  for (const addition of additions) {
    const duplicate = events.some((event) => event.kind === addition.kind
      && event.candidateId === addition.candidateId
      && (event.currentPrice ?? event.currentValue) === (addition.currentPrice ?? addition.currentValue));
    if (!duplicate) events.push(addition);
  }
}

function appendCheaperProviderEvents(candidates, previousByCandidate, events) {
  for (const group of groupProducts(candidates)) {
    if (!group.identity || group.offers.length < 2) continue;
    const currentCheapest = group.offers[0];
    const previousOffers = group.offers
      .map((offer) => ({ offer, previous: splitHistoryEntry(previousByCandidate[offer.id]).previous }))
      .filter((entry) => Number.isFinite(entry.previous?.price))
      .sort((a, b) => a.previous.price - b.previous.price);
    if (!previousOffers.length) continue;
    const previousCheapest = previousOffers[0];
    if (
      currentCheapest.id !== previousCheapest.offer.id
      && Number.isFinite(currentCheapest.price)
      && currentCheapest.price < previousCheapest.previous.price
    ) {
      events.push({
        kind: 'cheaper_provider',
        candidateId: currentCheapest.id,
        previousCandidateId: previousCheapest.offer.id,
        currentPrice: currentCheapest.price,
        previousPrice: previousCheapest.previous.price,
        identity: group.identity,
      });
    }
  }
}

export async function runWatchCheck(watch, previousByCandidate = {}, options = {}) {
  if (watch.type !== 'shopping') {
    return { status: 'connector_pending', candidates: [], events: [] };
  }

  const official = await searchOfficialShopping(
    watch,
    options.fetchImpl || globalThis.fetch,
    options.officialEndpoint || '/api/shopping-search',
  );
  const useOfficial = official.mode === 'official';
  const rawCandidates = useOfficial ? official.items : await searchSampleShopping(watch);
  const dataMode = useOfficial ? 'official' : 'sample';
  const events = [];
  const candidates = rawCandidates.map((candidate) => {
    const enriched = { ...candidate, dataMode, referencePriceDefined: dataMode === 'sample' && Number.isFinite(candidate.previousPrice) };
    const evaluation = evaluateCandidate(watch, enriched);
    const baseFacts = factsFromCandidate(enriched);
    const currentFacts = { ...baseFacts, ...derivePurchaseMetrics(baseFacts) };
    const current = {
      candidateId: enriched.id,
      price: enriched.price,
      available: enriched.available,
      nearMatch: evaluation.nearMatch,
      requiredMatch: evaluation.requiredMatch,
      facts: currentFacts,
      observedAt: new Date().toISOString(),
    };
    const historyEntry = splitHistoryEntry(previousByCandidate[enriched.id]);
    const legacyEvents = deriveEvents(historyEntry.previous, current, evaluation, {
      ...historyEntry.context,
      priceTriggers: watch.conditions?.priceTriggers || [],
      stateTriggers: watch.conditions?.stateTriggers || [],
    });
    legacyEvents.forEach((event) => { if (!event.candidateId) event.candidateId = enriched.id; });
    pushUnique(events, legacyEvents);

    const genericEvents = evaluateTriggers(
      watch.triggers || [],
      currentFacts,
      factsFromObservation(historyEntry.previous),
      historyEntry.context,
    ).map((event) => ({ ...event, candidateId: enriched.id }));
    pushUnique(events, genericEvents);

    return { ...enriched, evaluation, facts: currentFacts, observation: current };
  }).sort((a, b) => b.evaluation.score - a.evaluation.score || a.price - b.price);

  appendCheaperProviderEvents(candidates, previousByCandidate, events);

  return {
    status: useOfficial ? 'ok' : 'demo',
    dataMode,
    candidates,
    events,
    providers: official.providers || [],
    attribution: official.attribution || {},
  };
}
