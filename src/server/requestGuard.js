const inFlight = new Map();

export function createRateLimiter({ limit = 3, windowMs = 1000, now = Date.now } = {}) {
  const buckets = new Map();
  return {
    check(key) {
      const current = now();
      const existing = buckets.get(key);
      const bucket = !existing || current - existing.startedAt >= windowMs
        ? { startedAt: current, count: 0 }
        : existing;
      bucket.count += 1;
      buckets.set(key, bucket);
      if (bucket.count <= limit) return { allowed: true, retryAfter: 0 };
      const remaining = Math.max(1, Math.ceil((windowMs - (current - bucket.startedAt)) / 1000));
      return { allowed: false, retryAfter: remaining };
    },
  };
}

export function callerBucket(req = {}) {
  const headers = req.headers || {};
  const forwarded = headers['x-forwarded-for'] || headers['X-Forwarded-For'];
  const real = headers['x-real-ip'] || headers['X-Real-IP'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : (forwarded || real || '');
  const ip = String(raw).split(',')[0].trim();
  return ip ? `ip:${ip}` : 'anonymous';
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((out, key) => {
      out[key] = stable(value[key]);
      return out;
    }, {});
  }
  return value;
}

export function searchKey(watch = {}) {
  return JSON.stringify({
    rawQuery: String(watch.rawQuery || '').trim(),
    conditions: stable(watch.conditions || {}),
  });
}

export function withInFlightDedup(key, fn) {
  if (inFlight.has(key)) return inFlight.get(key);
  let promise;
  try {
    promise = Promise.resolve(fn());
  } catch (error) {
    promise = Promise.reject(error);
  }
  const tracked = promise.finally(() => inFlight.delete(key));
  inFlight.set(key, tracked);
  return tracked;
}
