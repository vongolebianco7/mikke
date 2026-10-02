import { createComposerDraftStore } from './domain/composerDraftStore.js';
import { interpretInput } from './domain/interpretInput.js';
import { mergeInterpretation } from './domain/mergeInterpretation.js';
import { draftFromWatch, watchFromDraft } from './domain/composerLegacyAdapter.js';
import { getConditionDefinition } from './domain/conditionCatalog.js';
import { renderConditionCards, renderUnresolvedList, escapeComposerHtml } from './inputComposerConditionList.js';
import { renderConditionEditorSheet, renderAddConditionSheet, renderConditionOptions } from './inputComposerSheets.js';

function parseEditorValue(definition, raw, currentValue) {
  if (Array.isArray(currentValue)) return String(raw).split(/[、,]/).map((item) => item.trim()).filter(Boolean);
  if (['integer', 'number', 'money', 'measurement', 'duration'].includes(definition?.valueType)) {
    const value = Number(raw);
    return Number.isFinite(value) ? value : raw;
  }
  if (typeof currentValue === 'boolean') return raw === 'true';
  return raw;
}

function defaultValueFor(definition) {
  if (definition?.valueType === 'boolean') return true;
  if (Array.isArray(definition?.allowedValues) && definition.allowedValues.length) return definition.allowedValues[0];
  return '';
}

function initialCanonicalDraft(form) {
  if (form._mikkeDraft) return draftFromWatch(form._mikkeDraft);
  return { domain: 'fashion', target: {}, conditions: [], unresolvedFragments: [], metadata: {} };
}

function summaryText(draft) {
  const count = draft.conditions?.length || 0;
  const unresolved = draft.unresolvedFragments?.length || 0;
  return unresolved ? `${count}件の条件・未解釈 ${unresolved}件` : `${count}件の条件`;
}

function interpretationText(draft) {
  const labels = { flight: '航空券', hotel: 'ホテル', fashion: '商品', appliance: '商品', furniture: '商品', food: '商品', used_car: '中古車', baby: '商品', sports: '商品', electronics: '商品', daily_goods: '商品', beauty: '商品', pet: '商品', hobby: '商品', shopping: '商品' };
  const subject = draft.target?.title ? `・${draft.target.title}` : '';
  return `${labels[draft.domain] || '商品'}として読み取りました${subject}`;
}

export function mountInputComposer(form, { Event: EventCtor = globalThis.Event } = {}) {
  if (!form || form.dataset.inputComposer === 'true') return form?._inputComposerController || null;

  const hidden = form.querySelector('#query');
  const originalWatch = form._mikkeDraft ? structuredClone(form._mikkeDraft) : null;
  let store = createComposerDraftStore(initialCanonicalDraft(form));
  let activeConditionId = null;
  let addSheetOpen = false;
  let addSearch = '';

  const root = form.ownerDocument.createElement('section');
  root.className = 'input-composer';
  root.dataset.inputComposerRoot = '';
  root.innerHTML = `<div class="input-composer-entry"><label><b>何を探していますか？</b><textarea rows="3" data-composer-text placeholder="例：New Balance 996、24.5cm、グレー、1万円以下"></textarea></label><div class="input-interpretation" data-composer-interpretation aria-live="polite"></div></div><div class="condition-toolbar"><span data-condition-summary>0件の条件</span><button type="button" data-add-condition>＋ 条件から追加</button></div><div data-condition-list></div><div data-unresolved-slot></div><div data-sheet-slot></div>`;
  form.insertBefore(root, form.firstChild);
  form.dataset.inputComposer = 'true';
  form.dataset.canonicalComposer = 'true';

  const input = root.querySelector('[data-composer-text]');
  input.value = originalWatch?.rawQuery || originalWatch?.metadata?.rawQuery || hidden?.value || '';

  function currentDraft() { return store.getDraft(); }

  function publish() {
    const draft = currentDraft();
    const watch = watchFromDraft(draft, originalWatch || {});
    const rawQuery = draft.metadata?.rawQuery || input.value.trim() || watch.target?.title || '';
    watch.rawQuery = rawQuery;
    watch.metadata = { ...(watch.metadata || {}), rawQuery, inputMode: 'composer_cards' };
    form._mikkeDraft = watch;
    form._inputComposerDraft = draft;
    form.dataset.submitStructured = 'true';
    if (hidden) hidden.value = rawQuery;
    const submit = form.querySelector('button[type="submit"]');
    const validation = store.validate();
    if (submit) submit.disabled = !rawQuery && !(draft.target?.title) || !validation.saveable;
    return watch;
  }

  function renderDynamic() {
    const draft = currentDraft();
    root.querySelector('[data-composer-interpretation]').textContent = input.value.trim() ? interpretationText(draft) : '入力すると条件を整理します';
    root.querySelector('[data-condition-summary]').textContent = summaryText(draft);
    root.querySelector('[data-condition-list]').innerHTML = renderConditionCards(draft);
    root.querySelector('[data-unresolved-slot]').innerHTML = renderUnresolvedList(draft);
    const sheetSlot = root.querySelector('[data-sheet-slot]');
    if (activeConditionId) {
      const condition = draft.conditions?.find((item) => item.id === activeConditionId);
      sheetSlot.innerHTML = condition ? renderConditionEditorSheet(draft, condition) : '';
    } else if (addSheetOpen) {
      sheetSlot.innerHTML = renderAddConditionSheet(draft, addSearch);
    } else {
      sheetSlot.innerHTML = '';
    }
    publish();
  }

  function replaceStore(nextDraft) {
    store = createComposerDraftStore(nextDraft);
    renderDynamic();
  }

  function applyText(rawText) {
    const interpretation = interpretInput(rawText, currentDraft());
    const merged = mergeInterpretation(currentDraft(), interpretation);
    replaceStore(merged);
  }

  function closeSheet() {
    const returnId = activeConditionId;
    activeConditionId = null;
    addSheetOpen = false;
    addSearch = '';
    renderDynamic();
    if (returnId) root.querySelector(`[data-condition-id="${CSS?.escape ? CSS.escape(returnId) : returnId}"]`)?.focus?.();
  }

  input.addEventListener('input', () => applyText(input.value));

  root.addEventListener('click', (event) => {
    const card = event.target.closest('[data-condition-card]');
    if (card) {
      activeConditionId = card.dataset.conditionId;
      addSheetOpen = false;
      renderDynamic();
      return;
    }
    if (event.target.closest('[data-add-condition]')) {
      activeConditionId = null;
      addSheetOpen = true;
      addSearch = '';
      renderDynamic();
      return;
    }
    if (event.target.closest('[data-close-sheet]') || event.target.matches('[data-sheet-backdrop]')) {
      closeSheet();
      return;
    }
    const removeCondition = event.target.closest('[data-remove-condition]');
    if (removeCondition && activeConditionId) {
      store.removeCondition(activeConditionId);
      activeConditionId = null;
      renderDynamic();
      return;
    }
    const removeUnresolved = event.target.closest('[data-remove-unresolved]');
    if (removeUnresolved) {
      store.removeUnresolved(removeUnresolved.dataset.removeUnresolved);
      renderDynamic();
      return;
    }
    const option = event.target.closest('[data-condition-option]');
    if (option) {
      const draft = currentDraft();
      const definition = getConditionDefinition(draft.domain, option.dataset.conditionOption, draft.subcategoryId);
      if (!definition) return;
      const condition = {
        attributeId: definition.attributeId,
        operator: definition.operators?.[0] || 'eq',
        value: defaultValueFor(definition),
        ...(definition.unit ? { unit: definition.unit } : {}),
        role: definition.defaultRole || 'required',
        supportState: 'needs_review',
        source: 'manual',
        manuallyEdited: true,
      };
      const next = store.upsertCondition(condition);
      activeConditionId = next.conditions.find((item) => item.attributeId === definition.attributeId)?.id || null;
      addSheetOpen = false;
      renderDynamic();
    }
  });

  root.addEventListener('input', (event) => {
    if (event.target.matches('[data-condition-search]')) {
      addSearch = event.target.value;
      const options = root.querySelector('[data-condition-options]');
      if (options) options.innerHTML = renderConditionOptions(currentDraft(), addSearch);
    }
  });

  root.addEventListener('change', (event) => {
    if (!activeConditionId) return;
    const draft = currentDraft();
    const condition = draft.conditions.find((item) => item.id === activeConditionId);
    if (!condition) return;
    if (event.target.matches('[data-condition-role]')) {
      store.setConditionRole(activeConditionId, event.target.value);
      renderDynamic();
      return;
    }
    if (event.target.matches('[data-condition-operator]')) {
      store.upsertCondition({ ...condition, operator: event.target.value, manuallyEdited: true });
      renderDynamic();
      return;
    }
    if (event.target.matches('[data-condition-value]')) {
      const definition = getConditionDefinition(draft.domain, condition.attributeId, draft.subcategoryId);
      store.upsertCondition({ ...condition, value: parseEditorValue(definition, event.target.value, condition.value), manuallyEdited: true });
      renderDynamic();
    }
  });

  form.addEventListener('submit', () => publish(), true);

  const controller = {
    getDraft: currentDraft,
    getWatch: () => publish(),
    applyText,
    render: renderDynamic,
  };
  form._inputComposerController = controller;

  if (input.value.trim() && !originalWatch) applyText(input.value);
  else renderDynamic();
  return controller;
}
