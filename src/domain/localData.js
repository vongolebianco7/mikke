export const MIKKE_LOCAL_KEYS = Object.freeze([
  'mikke.watches.v1',
  'mikke.history.v1',
  'mikke.decisions.v1',
]);

export function clearMikkeLocalData(storage) {
  const cleared = [];
  for (const key of MIKKE_LOCAL_KEYS) {
    if (storage.getItem(key) !== null) cleared.push(key);
    storage.removeItem(key);
  }
  return { cleared, count: cleared.length };
}
