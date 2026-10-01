import { attachProviderEvidence } from '../domain/providerEvidence.js';

const RAKUTEN_ENDPOINT = 'https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701';
const YAHOO_ENDPOINT = 'https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch';

const COLOR_PATTERNS = [
  ['グレー', /グレー|灰色|gray|grey/i],
  ['ブラック', /ブラック|黒|black/i],
  ['ホワイト', /ホワイト|白|white/i],
  ['ベージュ', /ベージュ|beige/i],
  ['ネイビー', /ネイビー|navy/i],
  ['ブルー', /ブルー|青|blue/i],
  ['レッド', /レッド|赤|red/i],
  ['グリーン', /グリーン|緑|green/i],
];

function cleanQuery(watch) {
  return String(watch?.rawQuery || watch?.title || '').trim();
}

function enabled(value) {
  return value === 'true';
}

class ProviderHttpError extends Error {
  constructor(statusCode) {
    super(`provider_http_${statusCode}`);
    this.name = 'ProviderHttpError';
    this.statusCode = statusCode;
  }
}

export function inferShoppingAttributes(text = '', condition = 'new') {
  const normalized = String(text);
  const sizes = [...new Set([...normalized.matchAll(/\b(\d{2}(?:\.\d)?)\s*cm\b/gi)].map((match) => `${match[1]}cm`))];
  const colors = COLOR_PATTERNS.filter(([, pattern]) => pattern.test(normalized)).map(([name]) => name);
  return { sizes, colors, condition };
}

export function buildRakutenRequest(watch, credentials) {
  const params = new URLSearchParams({
    applicationId: credentials.applicationId,
    keyword: cleanQuery(watch),
    format: 'json',
    formatVersion: '2',
    hits: '20',
    availability: '1',
    sort: '+itemPrice',
  });
  if (watch?.conditions?.maxPrice) params.set('maxPrice', String(watch.conditions.maxPrice));
  return {
    url: `${RAKUTEN_ENDPOINT}?${params.toString()}`,
    headers: { accessKey: credentials.accessKey },
  };
}

export function buildYahooRequest(watch, credentials) {
  const params = new URLSearchParams({
    appid: credentials.appId,
    query: cleanQuery(watch),
    results: '20',
    in_stock: 'true',
    sort: '+price',
  });
  if (watch?.conditions?.excludeUsed) params.set('condition', 'new');
  if (watch?.conditions?.maxPrice) params.set('price_to', String(watch.conditions.maxPrice));
  return { url: `${YAHOO_ENDPOINT}?${params.toString()}`, headers: {} };
}

export function normalizeRakutenItem(item) {
  const available = item.availability === 1 ? true : item.availability === 0 ? false : undefined;
  const candidate = {
    id: `rakuten:${item.itemCode}`,
    source: '楽天市場',
    title: item.itemName,
    price: item.itemPrice,
    url: item.itemUrl,
    available,
    imageUrl: item.mediumImageUrls?.[0] || '',
    shopName: item.shopName || '',
    condition: 'new',
    attributes: inferShoppingAttributes(`${item.itemName || ''} ${item.itemCaption || ''}`, 'new'),
  };
  return attachProviderEvidence(candidate, {
    provider: 'rakuten',
    supportedFields: ['price', 'availability', 'title'],
    inferredAttributes: ['size', 'color', 'condition'],
    unknownAttributes: ['condition'],
  });
}

export function normalizeYahooItem(item) {
  const explicitCondition = item.condition !== undefined && item.condition !== null && item.condition !== '';
  const condition = explicitCondition ? item.condition : 'new';
  const available = item.inStock === true ? true : item.inStock === false ? false : undefined;
  const candidate = {
    id: `yahoo:${item.code}`,
    source: 'Yahoo!ショッピング',
    title: item.name,
    price: item.price,
    url: item.url,
    available,
    imageUrl: item.image?.medium || '',
    shopName: item.seller?.name || '',
    condition,
    attributes: inferShoppingAttributes(`${item.name || ''} ${item.description || ''} ${item.headLine || ''}`, condition),
  };
  return attachProviderEvidence(candidate, {
    provider: 'yahoo',
    supportedFields: ['price', 'availability', 'title'],
    inferredAttributes: ['size', 'color', ...(explicitCondition ? [] : ['condition'])],
    unknownAttributes: explicitCondition ? [] : ['condition'],
  });
}

async function fetchJson(fetchImpl, request) {
  const response = await fetchImpl(request.url, {
    headers: request.headers,
    signal: typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(5000) : undefined,
  });
  if (!response.ok) throw new ProviderHttpError(response.status);
  return response.json();
}

function providerEvent(logger, provider, outcome, startedAt, statusCode) {
  logger?.provider?.({
    provider,
    outcome,
    ...(statusCode === undefined ? {} : { statusCode }),
    durationMs: Math.max(0, Date.now() - startedAt),
  });
}

function failureResult(logger, provider, startedAt, error) {
  const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : undefined;
  const rateLimited = statusCode === 429;
  const outcome = rateLimited ? 'rate_limited' : 'error';
  providerEvent(logger, provider, outcome, startedAt, statusCode);
  return { items: [], provider: { name: provider, status: rateLimited ? 'rate_limited' : 'error' } };
}

async function runRakuten(watch, env, fetchImpl, logger) {
  const startedAt = Date.now();
  if (!enabled(env.MIKKE_RAKUTEN_ENABLED)) {
    providerEvent(logger, 'rakuten', 'disabled', startedAt);
    return { items: [], provider: { name: 'rakuten', status: 'disabled' } };
  }
  if (!env.RAKUTEN_APPLICATION_ID || !env.RAKUTEN_ACCESS_KEY) {
    providerEvent(logger, 'rakuten', 'not_configured', startedAt);
    return { items: [], provider: { name: 'rakuten', status: 'not_configured' } };
  }

  try {
    const data = await fetchJson(fetchImpl, buildRakutenRequest(watch, {
      applicationId: env.RAKUTEN_APPLICATION_ID,
      accessKey: env.RAKUTEN_ACCESS_KEY,
    }));
    providerEvent(logger, 'rakuten', 'success', startedAt, 200);
    return {
      items: (data.items || []).map(normalizeRakutenItem),
      provider: { name: 'rakuten', status: 'ok' },
    };
  } catch (error) {
    return failureResult(logger, 'rakuten', startedAt, error);
  }
}

async function runYahoo(watch, env, fetchImpl, logger) {
  const startedAt = Date.now();
  if (!enabled(env.MIKKE_YAHOO_ENABLED)) {
    providerEvent(logger, 'yahoo', 'disabled', startedAt);
    return { items: [], provider: { name: 'yahoo', status: 'disabled' } };
  }
  if (!env.YAHOO_APP_ID) {
    providerEvent(logger, 'yahoo', 'not_configured', startedAt);
    return { items: [], provider: { name: 'yahoo', status: 'not_configured' } };
  }

  try {
    const data = await fetchJson(fetchImpl, buildYahooRequest(watch, { appId: env.YAHOO_APP_ID }));
    providerEvent(logger, 'yahoo', 'success', startedAt, 200);
    return {
      items: (data.hits || []).map(normalizeYahooItem),
      provider: { name: 'yahoo', status: 'ok' },
    };
  } catch (error) {
    return failureResult(logger, 'yahoo', startedAt, error);
  }
}

export async function searchShoppingProviders(watch, { env = process.env, fetchImpl = fetch, logger } = {}) {
  const results = await Promise.all([
    runRakuten(watch, env, fetchImpl, logger),
    runYahoo(watch, env, fetchImpl, logger),
  ]);

  const items = results.flatMap((result) => result.items);
  const providers = results.map((result) => result.provider);
  const unique = [...new Map(items.filter((item) => item.id && item.title && Number.isFinite(item.price)).map((item) => [item.id, item])).values()];
  return { items: unique, providers };
}
