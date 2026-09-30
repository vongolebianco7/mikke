import { searchShoppingProviders } from '../src/server/shoppingProviders.js';
import { createRateLimiter, callerBucket, withInFlightDedup, searchKey } from '../src/server/requestGuard.js';
import { createOperationalLogger } from '../src/server/operationalTelemetry.js';

const limiter = createRateLimiter({ limit: 3, windowMs: 1000 });
const MAX_CONDITION_BYTES = 16 * 1024;
const MAX_CONDITION_DEPTH = 8;
const MAX_CONDITION_NODES = 500;

function validStructuredValue(value) {
  if (value == null) return true;
  if (typeof value !== 'object') return false;

  const seen = new WeakSet();
  let nodes = 0;

  function visit(node, depth) {
    if (node == null || typeof node !== 'object') return true;
    if (depth > MAX_CONDITION_DEPTH || seen.has(node)) return false;
    seen.add(node);
    nodes += 1;
    if (nodes > MAX_CONDITION_NODES) return false;

    if (Array.isArray(node)) {
      return node.every((item) => visit(item, depth + 1));
    }
    return Object.values(node).every((item) => {
      if (item == null || ['string', 'number', 'boolean'].includes(typeof item)) return true;
      return visit(item, depth + 1);
    });
  }

  if (!visit(value, 0)) return false;
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8') <= MAX_CONDITION_BYTES;
  } catch {
    return false;
  }
}

function validWatch(watch) {
  return watch && watch.type === 'shopping' &&
    typeof watch.rawQuery === 'string' && watch.rawQuery.trim().length >= 2 &&
    watch.rawQuery.length <= 220 &&
    (watch.conditions == null || validStructuredValue(watch.conditions));
}

export default async function handler(req, res, deps = {}) {
  const startedAt = Date.now();
  const logger = deps.logger || createOperationalLogger();
  const log = (outcome, statusCode) => logger.api({
    route: '/api/shopping-search',
    outcome,
    statusCode,
    durationMs: Math.max(0, Date.now() - startedAt),
  });

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    log('method_not_allowed', 405);
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const watch = req.body?.watch;
  if (!validWatch(watch)) {
    log('invalid_request', 400);
    return res.status(400).json({ error: 'invalid_watch' });
  }

  const activeLimiter = deps.rateLimiter || limiter;
  const rate = activeLimiter.check(callerBucket(req));
  if (!rate.allowed) {
    res.setHeader('Retry-After', String(rate.retryAfter));
    log('rate_limited', 429);
    return res.status(429).json({ error: 'rate_limited' });
  }

  const env = deps.env || process.env;
  const fetchImpl = deps.fetchImpl || fetch;
  const searchProviders = deps.searchProviders || searchShoppingProviders;
  const normalizedWatch = {
    type: 'shopping',
    rawQuery: watch.rawQuery.trim(),
    title: typeof watch.title === 'string' ? watch.title.slice(0, 160) : '',
    conditions: watch.conditions || {},
  };

  try {
    const result = await withInFlightDedup(
      searchKey(normalizedWatch),
      () => searchProviders(normalizedWatch, { env, fetchImpl, logger }),
    );

    log('success', 200);
    return res.status(200).json({
      ...result,
      attribution: {
        rakuten: 'Supported by Rakuten Developers',
        yahoo: 'Webサービス by Yahoo! JAPAN',
      },
    });
  } catch {
    log('server_error', 500);
    return res.status(500).json({ error: 'internal_error' });
  }
}
