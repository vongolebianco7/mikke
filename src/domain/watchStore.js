import { normalizeWatch } from './normalizeWatch.js';

const KEY = 'mikke.watches.v1';

export function createWatchRecord(draft, id = crypto.randomUUID()) {
  return normalizeWatch({
    ...draft,
    id,
    status: 'watching',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export function loadWatches(storage) {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeWatch) : [];
  } catch {
    return [];
  }
}

export function saveWatches(storage, watches) {
  storage.setItem(KEY, JSON.stringify(watches));
}
