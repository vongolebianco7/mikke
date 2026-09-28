function hasTrigger(parsedWatch, type) {
  return parsedWatch?.conditions?.priceTriggers?.some((trigger) => trigger?.type === type)
    || parsedWatch?.conditions?.stateTriggers?.some((trigger) => trigger?.type === type);
}

function addSuggestion(list, suggestion, seen) {
  if (seen.has(suggestion.id)) return;
  seen.add(suggestion.id);
  list.push(suggestion);
}

export function suggestWatchPhrases(rawQuery, parsedWatch) {
  const text = String(rawQuery || '').trim();
  if (!text) return [];

  const suggestions = [];
  const seen = new Set();
  const conditions = parsedWatch?.conditions || {};
  const type = parsedWatch?.type || 'shopping';

  if (type === 'shopping') {
    if (!conditions.excludeUsed && !/新品のみ/.test(text)) {
      addSuggestion(suggestions, { id: 'new-only', label: '新品のみ', appendText: '、新品のみ', kind: 'attribute' }, seen);
    }

    if (conditions.size && !/(?:cm)[^、,]*(?:できれば|希望|優先)/.test(text)) {
      addSuggestion(suggestions, { id: 'size-preferred', label: `${conditions.size}はできれば`, appendText: `、${conditions.size}はできれば`, kind: 'role' }, seen);
    }

    if (conditions.colors?.length && !/(?:グレー|灰色|黒|ブラック|白|ホワイト|ベージュ|ネイビー|青|ブルー|赤|レッド)[^、,]*(?:必須|絶対|のみ)/.test(text)) {
      addSuggestion(suggestions, { id: 'color-required', label: `${conditions.colors[0]}は必須`, appendText: `、${conditions.colors[0]}は必須`, kind: 'role' }, seen);
    }
  }

  if (!hasTrigger(parsedWatch, 'below_previous')) {
    addSuggestion(suggestions, { id: 'cheaper-than-previous', label: '今より安くなったら', appendText: '、今より安くなったら', kind: 'price-trigger' }, seen);
  }
  if (!hasTrigger(parsedWatch, 'new_watch_low')) {
    addSuggestion(suggestions, { id: 'watch-low', label: '登録後最安値になったら', appendText: '、登録後最安値になったら', kind: 'price-trigger' }, seen);
  }
  if (!hasTrigger(parsedWatch, 'restock')) {
    addSuggestion(suggestions, { id: 'restock', label: '在庫復活したら', appendText: '、在庫復活したら', kind: 'state-trigger' }, seen);
  }

  if (conditions.priceTriggers?.length || conditions.stateTriggers?.length || Object.keys(conditions.attributes || {}).length) {
    addSuggestion(suggestions, { id: 'complete', label: 'この条件で教えて', appendText: '、教えて', kind: 'completion' }, seen);
  }

  return suggestions.slice(0, 8);
}
