import { evaluateCandidate, deriveEvents } from '../domain/evaluate.js';
import { searchSampleShopping } from './sampleShopping.js';

export async function runWatchCheck(watch, previousByCandidate = {}) {
  if (watch.type !== 'shopping') {
    return { status: 'connector_pending', candidates: [], events: [] };
  }

  const rawCandidates = await searchSampleShopping(watch);
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

  return { status: 'ok', candidates, events };
}
