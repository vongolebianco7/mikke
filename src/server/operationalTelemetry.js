const API_FIELDS = ['route', 'outcome', 'statusCode', 'durationMs'];
const PROVIDER_FIELDS = ['provider', 'outcome', 'statusCode', 'durationMs'];

function pick(source, fields) {
  const out = {};
  for (const field of fields) {
    if (source[field] !== undefined) out[field] = source[field];
  }
  return out;
}

export function createOperationalLogger({ sink = console.info, now = Date.now } = {}) {
  function emit(kind, payload, fields) {
    const event = {
      timestamp: new Date(now()).toISOString(),
      kind,
      ...pick(payload || {}, fields),
    };
    sink(event);
    return event;
  }

  return {
    api(payload) {
      return emit('api', payload, API_FIELDS);
    },
    provider(payload) {
      return emit('provider', payload, PROVIDER_FIELDS);
    },
  };
}
