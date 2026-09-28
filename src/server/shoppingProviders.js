const RAKUTEN_ENDPOINT = 'https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701';
const YAHOO_ENDPOINT = 'https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch';

function cleanQuery(watch) {
  return String(watch?.rawQuery || watch?.title || '').trim();
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
  return {
    id: `rakuten:${item.itemCode}`,
    source: '楽天市場',
    title: item.itemName,
    price: item.itemPrice,
    url: item.itemUrl,
    available: item.availability === 1,
    imageUrl: item.mediumImageUrls?.[0] || '',
    shopName: item.shopName || '',
    condition: 'new',
  };
}

export function normalizeYahooItem(item) {
  return {
    id: `yahoo:${item.code}`,
    source: 'Yahoo!ショッピング',
    title: item.name,
    price: item.price,
    url: item.url,
    available: Boolean(item.inStock),
    imageUrl: item.image?.medium || '',
    shopName: item.seller?.name || '',
    condition: item.condition || 'new',
  };
}

async function fetchJson(fetchImpl, request) {
  const response = await fetchImpl(request.url, {
    headers: request.headers,
    signal: typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(5000) : undefined,
  });
  if (!response.ok) throw new Error(`provider_http_${response.status}`);
  return response.json();
}

export async function searchShoppingProviders(watch, { env = process.env, fetchImpl = fetch } = {}) {
  const items = [];
  const providers = [];

  if (env.RAKUTEN_APPLICATION_ID && env.RAKUTEN_ACCESS_KEY) {
    try {
      const data = await fetchJson(fetchImpl, buildRakutenRequest(watch, {
        applicationId: env.RAKUTEN_APPLICATION_ID,
        accessKey: env.RAKUTEN_ACCESS_KEY,
      }));
      items.push(...(data.items || []).map(normalizeRakutenItem));
      providers.push({ name: 'rakuten', status: 'ok' });
    } catch {
      providers.push({ name: 'rakuten', status: 'error' });
    }
  } else {
    providers.push({ name: 'rakuten', status: 'not_configured' });
  }

  if (env.YAHOO_APP_ID) {
    try {
      const data = await fetchJson(fetchImpl, buildYahooRequest(watch, { appId: env.YAHOO_APP_ID }));
      items.push(...(data.hits || []).map(normalizeYahooItem));
      providers.push({ name: 'yahoo', status: 'ok' });
    } catch {
      providers.push({ name: 'yahoo', status: 'error' });
    }
  } else {
    providers.push({ name: 'yahoo', status: 'not_configured' });
  }

  const unique = [...new Map(items.filter((item) => item.id && item.title && Number.isFinite(item.price)).map((item) => [item.id, item])).values()];
  return { items: unique, providers };
}
