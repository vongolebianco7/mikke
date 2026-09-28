import { evaluateCandidate, deriveEvents } from '../domain/evaluate.js';
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
    const current = {
      candidateId: enriched.id,
      price: enriched.price,
      available: enriched.available,
      observedAt: new Date().toISOString(),
    };
    const historyEntry = splitHistoryEntry(previousByCandidate[enriched.id]);
    events.push(...deriveEvents(historyEntry.previous, current, evaluation, {
      ...historyEntry.context,
      priceTriggers: watch.conditions?.priceTriggers || [],
      stateTriggers: watch.conditions?.stateTriggers || [],
    }));
    return { ...enriched, evaluation, observation: current };
  }).sort((a, b) => b.evaluation.score - a.evaluation.score || a.price - b.price);

  return {
    status: useOfficial ? 'ok' : 'demo',
    dataMode,
    candidates,
    events,
    providers: official.providers || [],
    attribution: official.attribution || {},
  };
}
