const MODE_KEY = 'mikke.composer.mode.v1';
let composerMode = localStorage.getItem(MODE_KEY) || '';
let easyType = 'shopping';
let easySubject = '';
let easyPhrases = [];
let builderType = 'shopping';
let builderSubject = '';
let builderPhrases = [];
let builderCategory = 'price';

const labels = {
  shopping: { name: '商品', placeholder: '例：New Balance 996' },
  flight: { name: '航空券', placeholder: '例：東京からホノルル' },
  hotel: { name: 'ホテル', placeholder: '例：軽井沢' },
};

const easyOptions = {
  shopping: ['1万円以下になったら', '今より安くなったら', '10%以上値下がりしたら', '24.5cm', 'グレー', '新品のみ', '在庫復活したら'],
  flight: ['直行便', '往復10万円以下', '今より安くなったら', '10%以上値下がりしたら'],
  hotel: ['2万円以下', '今より安くなったら', '10%以上値下がりしたら'],
};

const builderOptions = {
  price: ['1万円以下になったら', '今より安くなったら', '10%以上値下がりしたら', '登録後最安値になったら'],
  size: ['23.5cm', '24.0cm', '24.5cm', '25.0cm', '26.0cm'],
  color: ['グレー', 'ブラック', 'ホワイト', 'ネイビー'],
  state: ['新品のみ', '中古除外', '展示品OK'],
  notify: ['在庫復活したら', '新しい候補が見つかったら'],
};

function textarea(form) {
  return form.querySelector('#query');
}

function commitRaw(form, raw) {
  const input = textarea(form);
  if (!input) return;
  input.value = raw;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function buildRaw(type, subject, phrases) {
  const parts = [];
  const clean = subject.trim();
  if (clean) parts.push(clean);
  if (type === 'flight') parts.push('航空券');
  if (type === 'hotel') parts.push('ホテル');
  parts.push(...phrases);
  return parts.filter(Boolean).join('、');
}

function typeButtons(selected, attr) {
  return Object.entries(labels).map(([key, item]) => `
    <button type="button" class="type-choice ${selected === key ? 'active' : ''}" ${attr}="${key}">
      <b>${item.name}</b><span>${key === 'shopping' ? 'モノ' : key === 'flight' ? '移動' : '宿泊'}</span>
    </button>`).join('');
}

function easyPanel(form) {
  const panel = form.querySelector('.composer-mode-panel');
  if (!panel) return;
  panel.innerHTML = `
    <div class="guided-flow">
      <div class="guided-step"><span>1</span><div><b>何を見つけておく？</b><small>まず種類を選びます</small></div></div>
      <div class="type-choice-grid">${typeButtons(easyType, 'data-easy-type')}</div>
      <div class="guided-step"><span>2</span><div><b>${labels[easyType].name}を入力</b><small>名前や行き先だけでOK</small></div></div>
      <input class="mode-input" id="easy-subject" value="${escapeHtml(easySubject)}" placeholder="${labels[easyType].placeholder}" />
      <div class="guided-step"><span>3</span><div><b>条件を選ぶ</b><small>必要なものだけタップ</small></div></div>
      <div class="quick-option-grid">${easyOptions[easyType].map((item) => `<button type="button" class="${easyPhrases.includes(item) ? 'selected' : ''}" data-easy-option="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join('')}</div>
    </div>`;
}

function builderPanel(form) {
  const panel = form.querySelector('.composer-mode-panel');
  if (!panel) return;
  const categories = [
    ['price', '価格'], ['size', 'サイズ'], ['color', '色'], ['state', '状態'], ['notify', '通知'],
  ];
  panel.innerHTML = `
    <div class="builder-flow">
      <div class="type-choice-grid compact">${typeButtons(builderType, 'data-builder-type')}</div>
      <label class="mode-field"><b>探すもの</b><input class="mode-input" id="builder-subject" value="${escapeHtml(builderSubject)}" placeholder="${labels[builderType].placeholder}" /></label>
      <div class="builder-summary">${builderPhrases.length ? builderPhrases.map((item) => `<span>${escapeHtml(item)}</span>`).join('') : '<small>下から条件を足していきます</small>'}</div>
      <div class="builder-categories">${categories.map(([key, label]) => `<button type="button" class="${builderCategory === key ? 'active' : ''}" data-builder-category="${key}">${label}</button>`).join('')}</div>
      <div class="builder-options">${builderOptions[builderCategory].map((item) => `<button type="button" class="${builderPhrases.includes(item) ? 'selected' : ''}" data-builder-option="${escapeHtml(item)}">＋ ${escapeHtml(item)}</button>`).join('')}</div>
    </div>`;
}

function textPanel(form) {
  const panel = form.querySelector('.composer-mode-panel');
  if (!panel) return;
  panel.innerHTML = `<div class="text-mode-intro"><b>条件を文章でまとめて入力</b><small>例：New Balance 996、24.5cm、グレー、今より安くなったら</small></div>`;
  const assist = form.querySelector('.assist-label b');
  if (assist) assist.textContent = '入力内容から追加できる条件';
}

function applyMode(form) {
  form.classList.remove('composer-awaiting-mode', 'composer-mode-easy', 'composer-mode-builder', 'composer-mode-text');
  if (!composerMode) {
    form.classList.add('composer-awaiting-mode');
    const panel = form.querySelector('.composer-mode-panel');
    if (panel) panel.innerHTML = '<p class="mode-prompt">使いやすい入力方法を選んでください。あとから切り替えられます。</p>';
    return;
  }
  form.classList.add(`composer-mode-${composerMode}`);
  if (composerMode === 'easy') easyPanel(form);
  if (composerMode === 'builder') builderPanel(form);
  if (composerMode === 'text') textPanel(form);
}

function enhance(form) {
  if (form.dataset.modesEnhanced) return;
  form.dataset.modesEnhanced = 'true';
  const input = textarea(form);
  if (!input) return;

  const picker = document.createElement('section');
  picker.className = 'composer-mode-picker';
  picker.innerHTML = `
    <div class="mode-picker-head"><b>Watchの作り方</b><span>3つから選べます</span></div>
    <div class="mode-cards">
      <button type="button" data-composer-mode="easy"><span class="mode-icon">①</span><b>かんたん</b><small>質問に答えるだけ</small></button>
      <button type="button" data-composer-mode="builder"><span class="mode-icon">＋</span><b>組み立て</b><small>条件を選んで追加</small></button>
      <button type="button" data-composer-mode="text"><span class="mode-icon">✎</span><b>文章で入力</b><small>まとめて一気に</small></button>
    </div>`;
  form.insertBefore(picker, input);

  const panel = document.createElement('div');
  panel.className = 'composer-mode-panel';
  form.insertBefore(panel, input);

  form.addEventListener('click', (event) => {
    const modeButton = event.target.closest('[data-composer-mode]');
    if (modeButton) {
      composerMode = modeButton.dataset.composerMode;
      localStorage.setItem(MODE_KEY, composerMode);
      form.querySelectorAll('[data-composer-mode]').forEach((button) => button.classList.toggle('active', button.dataset.composerMode === composerMode));
      applyMode(form);
      return;
    }

    const easyTypeButton = event.target.closest('[data-easy-type]');
    if (easyTypeButton) {
      easyType = easyTypeButton.dataset.easyType;
      easyPhrases = [];
      commitRaw(form, buildRaw(easyType, easySubject, easyPhrases));
      easyPanel(form);
      return;
    }
    const easyOption = event.target.closest('[data-easy-option]');
    if (easyOption) {
      const item = easyOption.dataset.easyOption;
      easyPhrases = easyPhrases.includes(item) ? easyPhrases.filter((value) => value !== item) : [...easyPhrases, item];
      commitRaw(form, buildRaw(easyType, easySubject, easyPhrases));
      easyPanel(form);
      return;
    }

    const builderTypeButton = event.target.closest('[data-builder-type]');
    if (builderTypeButton) {
      builderType = builderTypeButton.dataset.builderType;
      builderPhrases = [];
      commitRaw(form, buildRaw(builderType, builderSubject, builderPhrases));
      builderPanel(form);
      return;
    }
    const category = event.target.closest('[data-builder-category]');
    if (category) {
      builderCategory = category.dataset.builderCategory;
      builderPanel(form);
      return;
    }
    const builderOption = event.target.closest('[data-builder-option]');
    if (builderOption) {
      const item = builderOption.dataset.builderOption;
      builderPhrases = builderPhrases.includes(item) ? builderPhrases.filter((value) => value !== item) : [...builderPhrases, item];
      commitRaw(form, buildRaw(builderType, builderSubject, builderPhrases));
      builderPanel(form);
    }
  });

  form.addEventListener('input', (event) => {
    if (event.target.id === 'easy-subject') {
      easySubject = event.target.value;
      commitRaw(form, buildRaw(easyType, easySubject, easyPhrases));
    }
    if (event.target.id === 'builder-subject') {
      builderSubject = event.target.value;
      commitRaw(form, buildRaw(builderType, builderSubject, builderPhrases));
    }
  });

  form.querySelectorAll('[data-composer-mode]').forEach((button) => button.classList.toggle('active', button.dataset.composerMode === composerMode));
  applyMode(form);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function scan() {
  const form = document.querySelector('#watch-form');
  if (form) enhance(form);
}

new MutationObserver(scan).observe(document.querySelector('#app'), { childList: true, subtree: true });
scan();
