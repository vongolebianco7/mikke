import { evaluateCandidate, deriveEvents } from '../domain/evaluate.js';
import { searchSampleShopping } from './sampleShopping.js';
import { searchOfficialShopping } from './officialShopping.js';

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
  const events = [];
  const candidates = rawCandidates.map((candidate) => {
    const evaluation = evaluateCandidate(watch, candidate);
    const current = {
      candidateId: candidate.id,
      price: candidate.price,
      available: candidate.available,
      observedAt: new Date().toISOString(),
    };
    events.push(...deriveEvents(previousByCandidate[candidate.id], current, evaluation));
    return { ...candidate, evaluation, observation: current };
  }).sort((a, b) => b.evaluation.score - a.evaluation.score || a.price - b.price);

  return {
    status: useOfficial ? 'ok' : 'demo',
    dataMode: useOfficial ? 'official' : 'sample',
    candidates,
    events,
    providers: official.providers || [],
    attribution: official.attribution || {},
  };
}
