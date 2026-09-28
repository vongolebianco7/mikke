import { searchShoppingProviders } from '../src/server/shoppingProviders.js';

function validWatch(watch) {
  return watch && watch.type === 'shopping' &&
    typeof watch.rawQuery === 'string' && watch.rawQuery.trim().length >= 2 &&
    watch.rawQuery.length <= 220 &&
    (watch.conditions == null || typeof watch.conditions === 'object');
}

export default async function handler(req, res, deps = {}) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const watch = req.body?.watch;
  if (!validWatch(watch)) {
    return res.status(400).json({ error: 'invalid_watch' });
  }

  const env = deps.env || process.env;
  const fetchImpl = deps.fetchImpl || fetch;
  const result = await searchShoppingProviders({
    type: 'shopping',
    rawQuery: watch.rawQuery.trim(),
    title: typeof watch.title === 'string' ? watch.title.slice(0, 160) : '',
    conditions: watch.conditions || {},
  }, { env, fetchImpl });

  return res.status(200).json({
    ...result,
    attribution: {
      rakuten: 'Supported by Rakuten Developers',
      yahoo: 'Webサービス by Yahoo! JAPAN',
    },
  });
}
