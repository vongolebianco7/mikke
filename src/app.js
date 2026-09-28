import { parseWatchQuery } from './domain/parseWatch.js';
import { createWatchRecord, loadWatches, saveWatches } from './domain/watchStore.js';
import { runWatchCheck } from './connectors/runWatchCheck.js';

const root = document.querySelector('#app');
let watches = loadWatches(localStorage);
let view = 'today';
let draft = null;
let resultsByWatch = {};
let checkingId = null;

const examples = [
  'New Balance 996、24.5cm、グレー、1万円以下',
  '500L以上の冷蔵庫、15万円以下、白かグレー、中古は嫌だけど展示品ならOK',
  '東京からホノルル、直行便、往復10万円以下',
  '軽井沢のホテル、10/26、2万円以下'
];

function yen(value) { return typeof value === 'number' ? `¥${value.toLocaleString('ja-JP')}` : '—'; }
function iconFor(type) { return type === 'flight' ? '✈' : type === 'hotel' ? '⌂' : '◈'; }
function labelFor(type) { return type === 'flight' ? '航空券' : type === 'hotel' ? 'ホテル' : '買い物'; }

function conditionChips(watch) {
  const c = watch.conditions;
  const chips = [];
  if (c.maxPrice) chips.push(`${yen(c.maxPrice)}以下`);
  if (c.size) chips.push(c.size);
  if (c.colors?.length) chips.push(c.colors.join('・'));
  if (c.origin && c.destination) chips.push(`${c.origin} → ${c.destination}`);
  if (c.directOnly) chips.push('直行便');
  if (c.excludeUsed) chips.push('中古除外');
  if (c.allowDisplay) chips.push('展示品OK');
  return chips;
}

function render() {
  root.innerHTML = `<div class="shell">
    <header class="topbar"><div><div class="brand">Mikke<span>•</span></div><div class="tagline">欲しい条件になったら、見つけておいてくれる。</div></div><button class="bell" aria-label="通知">◌</button></header>
    <section class="content">${view === 'today' ? todayView() : view === 'watch' ? watchView() : createView()}</section>
    <nav class="nav">
      <button class="${view === 'today' ? 'active' : ''}" data-nav="today"><b>⌂</b><span>Today</span></button>
      <button class="${view === 'watch' ? 'active' : ''}" data-nav="watch"><b>◫</b><span>Watch</span></button>
      <button class="plus" data-nav="create" aria-label="Watchを追加">＋</button>
      <button class="muted" disabled><b>◎</b><span>履歴</span></button><button class="muted" disabled><b>⋯</b><span>設定</span></button>
    </nav></div>`;
  bindEvents();
}

function todayView() {
  const checked = Object.entries(resultsByWatch);
  const matches = checked.flatMap(([watchId, result]) => result.candidates.filter((c) => c.evaluation.requiredMatch).map((c) => ({ watchId, ...c })));
  return `<div class="hero"><p class="eyebrow">TODAY</p><h1>今日の動き</h1><p>条件に合うものだけ、変化があった順に。</p></div>
    <div class="stats"><div><b>${matches.length}</b><span>条件一致</span></div><div><b>${watches.length}</b><span>Watch中</span></div><div><b>${checked.length}</b><span>確認済み</span></div></div>
    ${watches.length === 0 ? emptyToday() : `<div class="section-head"><div><h2>いま見る候補</h2><p>価格と条件一致をまとめて確認。</p></div></div><div class="cards">${matches.length ? matches.map(productCard).join('') : noMatchesCard()}</div><div class="section-head"><div><h2>Watchを確認</h2><p>まずは登録した条件をチェック。</p></div></div><div class="mini-list">${watches.map(watchRow).join('')}</div>`}`;
}

function emptyToday() { return `<div class="empty-card"><div class="empty-icon">✦</div><h2>探し回るのを、やめる。</h2><p>欲しい条件を一度登録すれば、Mikkeが変化を見張ります。</p><button class="primary" data-action="open-create">最初のWatchを作る</button></div>`; }
function noMatchesCard() { return `<div class="empty-card compact"><h3>まだ条件一致はありません</h3><p>Watchを確認すると、候補がここにまとまります。</p></div>`; }

function watchView() {
  return `<div class="hero"><p class="eyebrow">WATCH</p><h1>見ておくもの</h1><p>商品でも、航空券でも、ホテルでも。条件で登録します。</p></div><button class="wide-add" data-action="open-create">＋ 新しいWatch</button><div class="watch-list">${watches.length ? watches.map(watchCard).join('') : '<p class="subtle">まだWatchがありません。</p>'}</div>`;
}

function createView() {
  if (draft) return confirmView();
  return `<div class="create-head"><button class="back" data-nav="today">×</button><p class="eyebrow">NEW WATCH</p><h1>何を探しておきますか？</h1><p>欲しい条件をそのまま文章で入力してください。</p></div>
    <form id="watch-form" class="composer"><textarea id="query" maxlength="220" placeholder="例：New Balance 996、24.5cm、グレー、1万円以下"></textarea><div class="examples"><span>入力例</span>${examples.map((example) => `<button type="button" data-example="${example}">${example}</button>`).join('')}</div><button class="primary" type="submit">この内容で条件を作る</button></form>`;
}

function confirmView() {
  const chips = conditionChips(draft);
  return `<div class="create-head"><button class="back" data-action="edit-draft">←</button><p class="eyebrow">CONFIRM</p><h1>この条件で見ておきます</h1><p>自動で読み取った条件です。曖昧な条件は勝手に追加しません。</p></div>
    <div class="condition-card"><div class="type-icon">${iconFor(draft.type)}</div><div><small>${labelFor(draft.type)}</small><h2>${draft.title}</h2><p>${draft.rawQuery}</p></div></div>
    <div class="condition-groups"><h3>読み取った条件</h3><div class="chips">${chips.length ? chips.map((chip) => `<span>${chip}</span>`).join('') : '<span>詳細条件なし</span>'}</div></div>
    <div class="note">${draft.type === 'shopping' ? '買い物Watchはデモ候補ですぐ動作確認できます。' : `${labelFor(draft.type)}コネクタは次の実装対象です。Watch自体は今から保存できます。`}</div><button class="primary" data-action="save-watch">この条件をWatchする</button>`;
}

function watchRow(watch) {
  const result = resultsByWatch[watch.id];
  const count = result?.candidates.filter((c) => c.evaluation.requiredMatch).length || 0;
  return `<button class="mini-watch" data-check="${watch.id}"><span class="mini-icon">${iconFor(watch.type)}</span><span><b>${watch.title}</b><small>${checkingId === watch.id ? '確認中…' : result ? `条件一致 ${count}件` : 'タップして確認'}</small></span><i>›</i></button>`;
}

function watchCard(watch) {
  const result = resultsByWatch[watch.id];
  return `<article class="watch-card"><div class="watch-top"><span class="mini-icon">${iconFor(watch.type)}</span><div><small>${labelFor(watch.type)}</small><h3>${watch.title}</h3></div><span class="status">監視中</span></div><p>${watch.rawQuery}</p><div class="chips">${conditionChips(watch).map((chip) => `<span>${chip}</span>`).join('')}</div><button class="check" data-check="${watch.id}">${checkingId === watch.id ? '確認中…' : result ? 'もう一度確認' : '今すぐ確認'}</button></article>`;
}

function productCard(item) {
  const drop = item.previousPrice && item.previousPrice > item.price ? Math.round((1 - item.price / item.previousPrice) * 100) : 0;
  return `<article class="product-card"><div class="product-image"><span>${item.title.includes('冷蔵庫') ? '▥' : '◒'}</span>${drop ? `<b>${drop}% OFF</b>` : ''}</div><div class="product-body"><div class="product-head"><div><small>${item.source}</small><h3>${item.title}</h3></div><span class="match">${item.evaluation.score}%</span></div><div class="price-line"><strong>${yen(item.price)}</strong>${item.previousPrice ? `<del>${yen(item.previousPrice)}</del>` : ''}</div><div class="result-badge">${item.evaluation.requiredMatch ? '✓ 条件に一致' : 'あと少し'}</div></div></article>`;
}

function bindEvents() {
  document.querySelectorAll('[data-nav]').forEach((button) => button.addEventListener('click', () => { view = button.dataset.nav; if (view !== 'create') draft = null; render(); }));
  document.querySelectorAll('[data-action="open-create"]').forEach((button) => button.addEventListener('click', () => { view = 'create'; draft = null; render(); }));
  document.querySelector('[data-action="edit-draft"]')?.addEventListener('click', () => { draft = null; render(); });
  document.querySelectorAll('[data-example]').forEach((button) => button.addEventListener('click', () => { document.querySelector('#query').value = button.dataset.example; }));
  document.querySelector('#watch-form')?.addEventListener('submit', (event) => { event.preventDefault(); const raw = document.querySelector('#query').value.trim(); if (!raw) return; draft = parseWatchQuery(raw); render(); });
  document.querySelector('[data-action="save-watch"]')?.addEventListener('click', () => { const watch = createWatchRecord(draft); watches = [watch, ...watches]; saveWatches(localStorage, watches); draft = null; view = 'watch'; render(); });
  document.querySelectorAll('[data-check]').forEach((button) => button.addEventListener('click', async () => { const watch = watches.find((item) => item.id === button.dataset.check); if (!watch || checkingId) return; checkingId = watch.id; render(); resultsByWatch[watch.id] = await runWatchCheck(watch); checkingId = null; view = 'today'; render(); }));
}

render();
