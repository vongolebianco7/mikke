import { createComposerDraftStore } from './domain/composerDraftStore.js';
import { interpretInput } from './domain/interpretInput.js';
import { mergeInterpretation } from './domain/mergeInterpretation.js';
import { draftFromWatch, watchFromDraft } from './domain/composerLegacyAdapter.js';
import { getConditionDefinition, searchConditionDefinitions, recommendedConditions } from './domain/conditionCatalog.js';

const ROLE_LABELS={required:'必須',preferred:'できれば',excluded:'除外',allowed:'許容',comparison:'比較',change:'変化条件'};
const OPERATOR_LABELS={eq:'一致',neq:'除外',gte:'以上',lte:'以下',range:'範囲',one_of:'いずれか',contains:'含む',not_contains:'含まない',boolean:'有無',compatible_with:'適合',changed_to:'変化したら',relative_change:'前回から変化',rank:'比較優先'};
const COLOR_LABELS={white:'白',black:'黒',gray:'グレー',navy:'ネイビー',beige:'ベージュ',red:'赤',blue:'青',new:'新品',display:'展示品',open_box:'未使用開封品',used:'中古'};

function esc(value){return String(value??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function option(value,label,current){return `<option value="${esc(value)}"${value===current?' selected':''}>${esc(label)}</option>`}
function definitionFor(draft,condition){return getConditionDefinition(draft.domain,condition.attributeId,draft.subcategoryId)}
function labelFor(draft,condition){if(condition.attributeId?.startsWith('compatibility:'))return'互換性・適合';return definitionFor(draft,condition)?.label||({price:'価格',totalPrice:'支払総額',size:'サイズ',color:'色',condition:'商品の状態',availability:'在庫・空き'}[condition.attributeId]||condition.attributeId||'条件')}
function displayScalar(value,unit){if(value===true)return'あり';if(value===false)return'なし';if(value==null||value==='')return'未設定';const translated=COLOR_LABELS[value]||value;if(unit==='JPY'&&Number.isFinite(Number(value)))return `${Number(value).toLocaleString('ja-JP')}円`;return `${translated}${unit&&unit!=='JPY'?unit:''}`}
function valueText(condition){
  if(Array.isArray(condition.value))return condition.value.map((v)=>displayScalar(v,condition.unit)).join(' / ');
  if(condition.value&&typeof condition.value==='object'){
    if('min' in condition.value||'max' in condition.value)return `${displayScalar(condition.value.min,condition.unit)}〜${displayScalar(condition.value.max,condition.unit)}`;
    return Object.values(condition.value).filter((v)=>v!=null&&typeof v!=='object').join(' / ')||'詳細条件';
  }
  const value=displayScalar(condition.value,condition.unit);
  const suffix={gte:'以上',lte:'以下',neq:'を除外',not_contains:'を含まない',changed_to:'になったら',relative_change:'の変化',rank:'を優先'}[condition.operator]||'';
  return `${value}${suffix}`;
}
function parseEditorValue(raw,condition){
  if(condition.operator==='one_of')return raw.split(/[、,]/).map((v)=>v.trim()).filter(Boolean);
  if(['gte','lte'].includes(condition.operator)&&raw!==''&&!Number.isNaN(Number(raw)))return Number(raw);
  if(condition.operator==='boolean')return raw==='true';
  return raw;
}
function isNumeric(definition){return ['integer','number','duration','money','measurement'].includes(definition?.valueType)}

export function mountCanonicalComposer(form,{Event:EventCtor=globalThis.Event}={}){
  if(!form)return null;
  if(form.dataset.canonicalComposer==='true')return form._canonicalController||null;
  const hidden=form.querySelector('#query');
  const originalWatch=form._mikkeDraft?structuredClone(form._mikkeDraft):null;
  let store=createComposerDraftStore(originalWatch?draftFromWatch(originalWatch):{});
  let activeConditionId=null;
  let addSheetOpen=false;
  let addSearch='';
  let rawText=originalWatch?.rawQuery||originalWatch?.metadata?.rawQuery||hidden?.value||'';

  const root=form.ownerDocument.createElement('section');
  root.className='canonical-composer';
  root.dataset.canonicalComposerRoot='';
  root.innerHTML=`<div class="canonical-entry"><label><b>何を探していますか？</b><textarea rows="3" data-composer-text placeholder="例：NB 996、24.5cm、グレー、1万円以下"></textarea></label><div class="canonical-live" data-composer-status aria-live="polite"></div></div><div data-composer-body></div><div data-composer-sheet></div>`;
  form.insertBefore(root,form.firstChild);
  form.dataset.canonicalComposer='true';
  const input=root.querySelector('[data-composer-text]');
  input.value=rawText;

  function publish(){
    const draft=store.getDraft();
    const watch=watchFromDraft({...draft,metadata:{...(draft.metadata||{}),rawQuery:rawText,inputMode:'hybrid'}},originalWatch||{});
    watch.rawQuery=rawText||watch.rawQuery||watch.target?.title||'';
    form._mikkeDraft=watch;
    form.dataset.submitStructured='true';
    if(hidden)hidden.value=rawText||watch.target?.title||'';
    const validation=store.validate();
    const submit=form.querySelector('button[type="submit"]');
    if(submit)submit.disabled=!validation.saveable;
    return {draft,watch,validation};
  }

  function conditionCard(draft,condition){
    const role=ROLE_LABELS[condition.role]||'必須';
    const review=condition.supportState&&condition.supportState!=='confirmed'?`<span class="condition-review">要確認</span>`:'';
    return `<button type="button" class="condition-card role-${esc(condition.role)}" data-condition-card data-condition-id="${esc(condition.id)}" aria-label="${esc(`${role} ${labelFor(draft,condition)} ${valueText(condition)}`)}"><span class="condition-role">${esc(role)}</span><span class="condition-main"><b>${esc(labelFor(draft,condition))}</b><span>${esc(valueText(condition))}</span></span>${review}<span class="condition-chevron" aria-hidden="true">›</span></button>`;
  }

  function editorSheet(draft,condition){
    if(!condition)return'';
    const definition=definitionFor(draft,condition);
    const operators=(definition?.operators?.length?definition.operators:['eq','neq','gte','lte','range','one_of','contains','not_contains','boolean','compatible_with','changed_to','relative_change','rank']);
    const rawValue=Array.isArray(condition.value)?condition.value.join('、'):(condition.value&&typeof condition.value==='object'?JSON.stringify(condition.value):(condition.value??''));
    const inputType=isNumeric(definition)?'number':'text';
    return `<div class="canonical-sheet-backdrop" data-sheet-backdrop><section class="canonical-sheet" data-condition-sheet role="dialog" aria-modal="true" aria-label="条件を編集"><div class="sheet-handle" aria-hidden="true"></div><header><div><small>${esc(ROLE_LABELS[condition.role]||'条件')}</small><h3>${esc(labelFor(draft,condition))}</h3></div><button type="button" class="sheet-close" data-close-sheet aria-label="閉じる">×</button></header><label><span>扱い</span><select data-condition-role>${Object.entries(ROLE_LABELS).map(([value,label])=>option(value,label,condition.role)).join('')}</select></label><label><span>条件</span><select data-condition-operator>${operators.map((value)=>option(value,OPERATOR_LABELS[value]||value,condition.operator)).join('')}</select></label><label><span>値</span><input data-condition-value type="${inputType}" value="${esc(rawValue)}" inputmode="${inputType==='number'?'decimal':'text'}"></label><button type="button" class="sheet-remove" data-remove-condition>この条件を削除</button></section></div>`;
  }

  function catalogOptions(draft){
    const context={domain:draft.domain||'fashion',subcategoryId:draft.subcategoryId,categoryId:draft.categoryId,targetText:draft.target?.title||rawText};
    const recommended=recommendedConditions(context).slice(0,10);
    const searched=addSearch?searchConditionDefinitions(context.domain,addSearch,context.subcategoryId):[];
    const options=addSearch?searched:recommended;
    return {recommended,options};
  }

  function addConditionSheet(draft){
    if(!addSheetOpen)return'';
    const {options}=catalogOptions(draft);
    return `<div class="canonical-sheet-backdrop" data-sheet-backdrop><section class="canonical-sheet add-condition-sheet" data-add-condition-sheet role="dialog" aria-modal="true" aria-label="条件を追加"><div class="sheet-handle" aria-hidden="true"></div><header><div><small>条件を選ぶ</small><h3>${addSearch?'検索結果':'おすすめ'}</h3></div><button type="button" class="sheet-close" data-close-sheet aria-label="閉じる">×</button></header><label class="condition-search"><span class="sr-only">条件を検索</span><input data-condition-search type="search" value="${esc(addSearch)}" placeholder="条件名を検索"></label><div class="condition-options">${options.map((item)=>`<button type="button" data-condition-option data-attribute-id="${esc(item.attributeId)}"><span>${esc(item.label)}</span><small>${esc(item.group||'')}</small></button>`).join('')||'<p class="canonical-empty">該当する条件がありません</p>'}</div></section></div>`;
  }

  function render(){
    const {draft,validation}=publish();
    const body=root.querySelector('[data-composer-body]');
    const unresolved=draft.unresolvedFragments||[];
    const cards=draft.conditions||[];
    const target=draft.target?.title||rawText.split(/[、,]/)[0]||'';
    const longList=cards.length>8;
    body.innerHTML=`${target?`<section class="target-summary" data-target-summary><small>探すもの</small><b>${esc(target)}</b>${draft.domain&&draft.domain!=='shopping'?`<span>${esc(draft.domain)}</span>`:''}</section>`:''}<section class="condition-section"><div class="condition-section-head"><div><small>条件</small><b data-condition-summary>${cards.length?`${cards.length}件`:'まだありません'}</b></div><button type="button" class="add-condition" data-add-condition aria-label="条件から追加">＋ 条件から追加</button></div>${longList?'<label class="condition-filter"><span class="sr-only">条件を絞り込む</span><input data-condition-filter type="search" placeholder="条件を絞り込む"></label>':''}<div class="condition-list" data-condition-list>${cards.map((condition)=>conditionCard(draft,condition)).join('')}</div></section>${unresolved.length?`<section class="unresolved-list" data-unresolved-list><b>まだ条件にできていません</b><p>意味を決めつけず、そのまま残しています。</p><div>${unresolved.map((item)=>`<span>${esc(item.text)}</span>`).join('')}</div></section>`:''}${validation.conflicts.length?`<section class="composer-warning" role="alert">条件が矛盾しています。内容を確認してください。</section>`:''}`;
    root.querySelector('[data-composer-status]').textContent=cards.length||unresolved.length?`条件 ${cards.length}件${unresolved.length?`・要確認 ${unresolved.length}件`:''}`:'入力すると条件を整理します';
    const active=draft.conditions.find((item)=>item.id===activeConditionId);
    root.querySelector('[data-composer-sheet]').innerHTML=active?editorSheet(draft,active):addConditionSheet(draft);
  }

  function replaceStore(nextDraft){store=createComposerDraftStore(nextDraft);}

  input.addEventListener('input',()=>{
    rawText=input.value;
    const current=store.getDraft();
    const interpreted=interpretInput(rawText,{domain:current.domain,categoryId:current.categoryId,subcategoryId:current.subcategoryId});
    const merged=mergeInterpretation(current,interpreted,{replaceUnresolved:true});
    replaceStore({...merged.draft,metadata:{...(merged.draft.metadata||{}),rawQuery:rawText,inputMode:'hybrid'}});
    activeConditionId=null;addSheetOpen=false;render();
  });

  root.addEventListener('click',(event)=>{
    const card=event.target.closest('[data-condition-card]');
    if(card){activeConditionId=card.dataset.conditionId;addSheetOpen=false;render();return}
    if(event.target.closest('[data-add-condition]')){activeConditionId=null;addSheetOpen=true;addSearch='';render();return}
    const optionButton=event.target.closest('[data-condition-option]');
    if(optionButton){
      const draft=store.getDraft();
      const def=getConditionDefinition(draft.domain,optionButton.dataset.attributeId,draft.subcategoryId);
      const created=store.upsertCondition({attributeId:optionButton.dataset.attributeId,operator:def?.operators?.[0]||'eq',value:def?.valueType==='boolean'?true:'',unit:def?.unit,role:'required',supportState:'needs_review',source:'manual',manuallyEdited:true});
      activeConditionId=created.id;addSheetOpen=false;render();return;
    }
    if(event.target.closest('[data-close-sheet]')||event.target.matches('[data-sheet-backdrop]')){activeConditionId=null;addSheetOpen=false;render();return}
    if(event.target.closest('[data-remove-condition]')){if(activeConditionId)store.removeCondition(activeConditionId);activeConditionId=null;render();return}
  });

  root.addEventListener('change',(event)=>{
    const target=event.target;
    if(!activeConditionId)return;
    const draft=store.getDraft();
    const condition=draft.conditions.find((item)=>item.id===activeConditionId);
    if(!condition)return;
    if(target.matches('[data-condition-role]')){store.setConditionRole(activeConditionId,target.value);render();return}
    if(target.matches('[data-condition-operator]')){store.upsertCondition({...condition,operator:target.value,manuallyEdited:true});render();return}
    if(target.matches('[data-condition-value]')){store.upsertCondition({...condition,value:parseEditorValue(target.value,condition),manuallyEdited:true});render();return}
  });

  root.addEventListener('input',(event)=>{
    if(event.target.matches('[data-condition-search]')){addSearch=event.target.value;render();}
    if(event.target.matches('[data-condition-filter]')){
      const needle=event.target.value.trim().toLocaleLowerCase('ja-JP');
      root.querySelectorAll('[data-condition-card]').forEach((card)=>{card.hidden=needle&&!card.textContent.toLocaleLowerCase('ja-JP').includes(needle)});
    }
  });

  form.addEventListener('submit',()=>publish(),true);
  const controller={get store(){return store},render,publish,getDraft:()=>store.getDraft()};
  form._canonicalController=controller;
  render();
  return controller;
}

function scan(){const form=document.querySelector?.('#watch-form');if(form)mountCanonicalComposer(form)}
if(typeof document!=='undefined'){
  const app=document.querySelector('#app');
  if(app&&typeof MutationObserver!=='undefined')new MutationObserver(scan).observe(app,{childList:true,subtree:true});
  scan();
}
