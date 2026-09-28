const COLOR_WORDS = ['グレー', '灰色', '黒', 'ブラック', '白', 'ホワイト', 'ベージュ', 'ネイビー', '青', 'ブルー', '赤', 'レッド'];

function parsePrice(raw) {
  const normalized = raw.replace(/,/g, '');
  const man = normalized.match(/(\d+(?:\.\d+)?)\s*万円(?:以下|未満|切ったら|まで|になったら)?/);
  if (man) return Math.round(Number(man[1]) * 10000);
  const yen = normalized.match(/(\d{4,7})\s*円?(?:以下|未満|切ったら|まで|になったら)/);
  return yen ? Number(yen[1]) : undefined;
}

function parseSize(raw) {
  const match = raw.match(/(\d{2}(?:\.\d)?)\s*cm/i);
  return match ? `${match[1]}cm` : undefined;
}

function inferType(raw) {
  if (/(航空券|フライト|直行便|往復|片道|から.+(?:へ|まで)|→)/.test(raw)) return 'flight';
  if (/(ホテル|宿|旅館|泊|宿泊)/.test(raw)) return 'hotel';
  return 'shopping';
}

function extractTitle(raw, type) {
  if (type === 'flight') return raw.split(/[、,]/)[0].trim();
  if (type === 'hotel') return raw.split(/[、,]/)[0].trim();
  return raw.split(/[、,]/)[0].trim() || '新しいWatch';
}

function includesRequiredLanguage(text, token) {
  return new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^、,]*(?:必須|絶対|のみ)`).test(text);
}

function includesPreferredLanguage(text, token) {
  return new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^、,]*(?:できれば|希望|だと嬉しい|優先)`).test(text);
}

function parsePriceTriggers(text, maxPrice, maxPriceRequired) {
  const triggers = [];
  if (maxPrice !== undefined) {
    triggers.push({ type: 'below_absolute', value: maxPrice, reference: 'explicit', role: maxPriceRequired ? 'required' : 'notification' });
  }
  const percent = text.match(/(\d{1,2})\s*%\s*以上(?:に)?(?:値下がり|安く)/);
  const initialPercent = Boolean(percent && /(登録時|登録した時|最初)[^、,]*\d{1,2}\s*%/.test(text));
  const previousPercent = Boolean(percent && /(今より|前回(?:確認)?より)[^、,]*\d{1,2}\s*%/.test(text));
  if (/(今より|前回より).*(安く|値下がり)/.test(text) && !previousPercent) {
    triggers.push({ type: 'below_previous', reference: 'previous', role: 'notification' });
  }
  if (/(登録時|登録した時|最初).*(安く|値下がり)/.test(text) && !initialPercent) {
    triggers.push({ type: 'below_initial', reference: 'initial', role: 'notification' });
  }
  if (percent) {
    triggers.push({ type: 'drop_percent', percent: Number(percent[1]), reference: initialPercent ? 'initial' : 'previous', role: 'notification' });
  }
  if (/(登録後最安値|登録してから最安値|Mikke.*最安値)/i.test(text)) {
    triggers.push({ type: 'new_watch_low', reference: 'observed_watch', role: 'notification' });
  }
  return triggers;
}

function parseStateTriggers(text) {
  const triggers = [];
  if (/(在庫復活|再入荷)/.test(text)) triggers.push({ type: 'restock', role: 'notification' });
  if (/(新着|新しい候補|新しい商品)/.test(text)) triggers.push({ type: 'new_result', role: 'notification' });
  return triggers;
}

export function parseWatchQuery(raw) {
  const text = raw.trim();
  const type = inferType(text);
  const conditions = {};
  const maxPrice = parsePrice(text);
  if (maxPrice !== undefined) conditions.maxPrice = maxPrice;

  if (type === 'shopping') {
    const size = parseSize(text);
    if (size) conditions.size = size;
    const colors = COLOR_WORDS.filter((color) => text.includes(color));
    if (colors.length) conditions.colors = [...new Set(colors.map((color) => color === '灰色' ? 'グレー' : color))];
    if (/(中古不可|中古は嫌|中古除外|新品のみ)/.test(text)) conditions.excludeUsed = true;
    if (/(展示品.*OK|展示品.*可)/.test(text)) conditions.allowDisplay = true;
  }

  if (type === 'flight') {
    const route = text.match(/(.+?)から(.+?)(?:、|,|\s|$)/);
    if (route) {
      conditions.origin = route[1].trim();
      conditions.destination = route[2].trim();
    }
    if (text.includes('直行便')) conditions.directOnly = true;
    if (text.includes('往復')) conditions.tripType = 'roundtrip';
    if (text.includes('片道')) conditions.tripType = 'oneway';
  }

  if (type === 'hotel') {
    const place = text.split(/[、,]/)[0].replace(/ホテル|宿|旅館/g, '').trim();
    if (place) conditions.destination = place;
  }

  const requiredKeys = [];
  const preferredKeys = [];
  const maxPriceRequired = maxPrice !== undefined && !/(なったら|教えて|通知)/.test(text);
  if (maxPrice !== undefined && maxPriceRequired) requiredKeys.push('maxPrice');
  if (conditions.size) {
    if (includesPreferredLanguage(text, conditions.size)) preferredKeys.push('size');
    else requiredKeys.push('size');
  }
  if (conditions.origin) requiredKeys.push('origin');
  if (conditions.destination) requiredKeys.push('destination');
  if (conditions.directOnly) requiredKeys.push('directOnly');
  if (conditions.colors) {
    const colorToken = conditions.colors[0];
    if (includesRequiredLanguage(text, colorToken)) requiredKeys.push('colors');
    else preferredKeys.push('colors');
  }

  conditions.attributes = Object.fromEntries(
    ['size', 'colors', 'excludeUsed', 'allowDisplay', 'origin', 'destination', 'directOnly', 'tripType']
      .filter((key) => conditions[key] !== undefined)
      .map((key) => [key, conditions[key]])
  );
  conditions.priceTriggers = parsePriceTriggers(text, maxPrice, maxPriceRequired);
  conditions.stateTriggers = parseStateTriggers(text);

  return { type, title: extractTitle(text, type), rawQuery: text, conditions, requiredKeys, preferredKeys };
}
