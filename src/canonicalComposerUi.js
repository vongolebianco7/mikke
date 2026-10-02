import { parseWatchQuery } from './domain/parseWatch.js';
import { interpretInput } from './domain/interpretInput.js';
import { mergeInterpretation } from './domain/mergeInterpretation.js';
import { createComposerDraftStore } from './domain/composerDraftStore.js';
import { draftFromWatch, watchFromDraft } from './domain/composerLegacyAdapter.js';
import { getConditionDefinition, recommendedConditions, searchConditionDefinitions } from './domain/conditionCatalog.js';
import { ROLE_LABELS, OPERATOR_LABELS, conditionLabel, conditionValueLabel, editableValue } from './composer/conditionPresentation.js';

function esc(value){return String(value??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]))}
function defaultWatch(){return{type:'shopping',domain:'fashion',target:{title:''},rawQuery:'',domainConditions:[],compatibilityConditions:[],triggers:[],metadata:{}}}
function uiDomainLabel(domain){return domain==='flight'?'航空券':domain==='hotel'?'ホテル':domain==='used_car'?'中古車':'商品'}
function semanticLane(condition){return condition?.role==='change'?'change':'eligibility'}
function safeParse(raw){try{return raw.trim()?parseWatchQuery(raw):null}catch{return null}}

function cleanParserConditions(draft){
  return {
    ...draft,
    conditions:(draft.conditions||[]).filter((item)=>item.manuallyEdited||item.source!=='text'),
    unresolvedFragments:[],
  };
}

function normalizedRoleOptions(selected){
  return Object.entries(ROLE_LABELS).map(([value,label])=>`<option value="${value}" ${value===selected?'selected':''}>${label}</option>`).join('')
}

function operatorOptions(draft,condition){
  const definition=getConditionDefinition(draft.domain,condition.attributeId,draft.subcategoryId)
  const operators=[...(definition?.operators||[]),condition.operator].filter(Boolean)
  const unique=[...new Set(operators.length?operators:['eq','one_of','gte','lte','range'])]
  return unique.map((value)=>`<option value="${esc(value)}" ${value===condition.operator?'selected':''}>${esc(OPERATOR_LABELS[value]||value)}</option>`).join('')
}

const CHOICE_LABELS={
  one_way:'片道',round_trip:'往復',multi_city:'複数都市',
  economy:'エコノミー',premium_economy:'プレミアムエコノミー',business:'ビジネス',first:'ファースト',
  cash:'現金・カード',miles:'マイル',either:'どちらでも',
  white:'白',black:'黒',gray:'グレー',grey:'グレー',navy:'ネイビー',blue:'青',red:'赤',beige:'ベージュ',
  new:'新品',open_box:'未使用開封品',used:'中古',in_stock:'在庫あり',
}
function choiceLabel(value){return CHOICE_LABELS[value]||String(value)}

function parseEditedValue(raw,condition,definition){
  const text=String(raw??'').trim()
  if(text==='')return''
  if(condition.operator==='one_of')return text.split(/[、,]/).map((item)=>item.trim()).filter(Boolean)
  if(definition?.valueType==='boolean'||condition.operator==='boolean'){
    if(['true','1','はい','yes'].includes(text.toLowerCase()))return true
    if(['false','0','いいえ','no'].includes(text.toLowerCase()))return false
    return''
  }
  if(['integer','number','duration','money','measurement'].includes(definition?.valueType)||typeof condition.value==='number'){
    const value=Number(text.replace(/,/g,''));return Number.isFinite(value)?value:text
  }
  return text
}

function valueEditorHtml(condition,definition){
  const inputMode=['integer','number','duration','money','measurement'].includes(definition?.valueType)||typeof condition.value==='number'?'decimal':'text'
  if(condition.operator==='range'){
    const range=Array.isArray(condition.value)?condition.value:['','']
    return `<div class="range-value-grid"><label><span>下限</span><input data-condition-range-min inputmode="${inputMode}" value="${esc(range[0]??'')}"></label><label><span>上限</span><input data-condition-range-max inputmode="${inputMode}" value="${esc(range[1]??'')}"></label></div>`
  }
  if(definition?.valueType==='boolean'){
    const selected=condition.value===true?'true':condition.value===false?'false':''
    return `<label><span>値</span><select data-condition-value><option value="" ${selected===''?'selected':''}>選択してください</option><option value="true" ${selected==='true'?'selected':''}>はい</option><option value="false" ${selected==='false'?'selected':''}>いいえ</option></select></label>`
  }
  if(definition?.allowedValues?.length){
    const current=condition.value==null?'':String(condition.value)
    return `<label><span>値</span><select data-condition-value><option value="" ${current===''?'selected':''}>選択してください</option>${definition.allowedValues.map((value)=>`<option value="${esc(value)}" ${String(value)===current?'selected':''}>${esc(choiceLabel(value))}</option>`).join('')}</select></label>`
  }
  return `<label><span>値</span><input data-condition-value inputmode="${inputMode}" value="${esc(editableValue(condition))}"></label>`
}

function conditionCardHtml(draft,condition){
  const review=condition.supportState==='needs_review'?'<span class="condition-review">要確認</span>':''
  return `<button type="button" class="condition-card role-${esc(condition.role)}" data-condition-card data-condition-id="${esc(condition.id)}" aria-label="${esc(`${ROLE_LABELS[condition.role]||'条件'} ${conditionLabel(draft,condition)} ${conditionValueLabel(condition)}を編集`)}"><span class="condition-role">${esc(ROLE_LABELS[condition.role]||'条件')}</span><span class="condition-main"><b>${esc(conditionLabel(draft,condition))}</b><span>${esc(conditionValueLabel(condition))}</span></span>${review}<span class="condition-chevron" aria-hidden="true">›</span></button>`
}

function unresolvedHtml(fragments){
  if(!fragments?.length)return''
  return `<section class="unresolved-list" data-unresolved-list><div class="unresolved-head"><b>まだ条件にできていません</b><small>意味を決めつけず、そのまま残しています。</small></div>${fragments.map((item)=>`<div class="unresolved-item"><span>${esc(item.text)}</span><button type="button" data-remove-unresolved="${esc(item.id)}" aria-label="${esc(`${item.text}を削除`)}">削除</button></div>`).join('')}</section>`
}

function conditionSheetHtml(draft,condition){
  const definition=getConditionDefinition(draft.domain,condition.attributeId,draft.subcategoryId)
  return `<div class="composer-sheet-backdrop" data-sheet-backdrop><section class="composer-sheet" data-condition-sheet role="dialog" aria-modal="true" aria-label="条件を編集"><div class="sheet-handle" aria-hidden="true"></div><header><div><small>${esc(ROLE_LABELS[condition.role]||'条件')}</small><h3>${esc(conditionLabel(draft,condition))}</h3></div><button type="button" class="sheet-close" data-close-sheet aria-label="閉じる">×</button></header><div class="sheet-fields"><label><span>扱い</span><select data-condition-role>${normalizedRoleOptions(condition.role)}</select></label><label><span>条件</span><select data-condition-operator>${operatorOptions(draft,condition)}</select></label>${valueEditorHtml(condition,definition)}${condition.unit?`<div class="condition-unit">単位: ${esc(condition.unit==='JPY'?'円':condition.unit)}</div>`:''}</div><button type="button" class="danger-quiet" data-remove-condition>この条件を削除</button></section></div>`
}

function conditionOptionsHtml(options){
  return options.slice(0,18).map((definition)=>`<button type="button" class="condition-option" data-condition-option data-attribute-id="${esc(definition.attributeId)}"><span>${esc(definition.label)}</span><small>${esc(definition.group||'条件')}</small></button>`).join('')
}

function addConditionSheetHtml(options){
  return `<div class="composer-sheet-backdrop" data-sheet-backdrop><section class="composer-sheet add-condition-sheet" data-add-condition-sheet role="dialog" aria-modal="true" aria-label="条件を追加"><div class="sheet-handle" aria-hidden="true"></div><header><div><small>条件を追加</small><h3>探したい条件を選ぶ</h3></div><button type="button" class="sheet-close" data-close-sheet aria-label="閉じる">×</button></header><label class="condition-search"><span class="sr-only">条件を検索</span><input type="search" data-condition-search placeholder="例：容量、サイズ、色、価格"></label><div class="condition-options-head"><b>おすすめ</b><small>今の対象に合う条件</small></div><div class="condition-options" data-condition-options>${conditionOptionsHtml(options)}</div></section></div>`
}

function defaultCondition(definition){
  const operator=definition.operators?.[0]||'eq'
  return {id:`manual-${definition.attributeId}-${Date.now()}`,attributeId:definition.attributeId,operator,value:'',unit:definition.unit,role:'required',supportState:'confirmed',source:'manual',manuallyEdited:true}
}

export function mountCanonicalComposer(form,{Event:EventCtor=globalThis.Event}={}){
  if(!form||form.dataset.canonicalComposer==='true')return form?._canonicalController||null
  const hidden=form.querySelector('#query')
  const seedRaw=hidden?.value?.trim()||''
  let originalWatch=form._mikkeDraft?structuredClone(form._mikkeDraft):(safeParse(seedRaw)||defaultWatch())
  let store=createComposerDraftStore(draftFromWatch(originalWatch))
  let activeSheet=null
  let sheetOriginId=null

  const root=form.ownerDocument.createElement('section')
  root.className='canonical-composer'
  root.dataset.canonicalComposerRoot=''
  root.innerHTML=`<div class="canonical-entry"><label><b>何を探していますか？</b><textarea rows="3" data-composer-text placeholder="例：996のグレー、24.5cm、1万円以下。中古はなし"></textarea></label><div class="canonical-interpretation" data-composer-interpretation aria-live="polite"></div></div><section class="condition-workspace" data-condition-workspace></section><button type="button" class="add-condition" data-add-condition>＋ 条件から追加</button><div data-composer-sheet-host></div>`
  form.insertBefore(root,form.firstChild)
  form.dataset.canonicalComposer='true'
  const input=root.querySelector('[data-composer-text]')
  input.value=seedRaw||originalWatch.metadata?.rawQuery||originalWatch.rawQuery||''

  function publish(){
    const draft=store.getDraft()
    const watch=watchFromDraft(draft,originalWatch)
    const raw=input.value.trim()
    watch.rawQuery=raw||watch.rawQuery||watch.target?.title||''
    watch.metadata={...(watch.metadata||{}),rawQuery:watch.rawQuery,inputMode:'hybrid_cards'}
    form._mikkeDraft=watch
    form.dataset.submitStructured='true'
    if(hidden)hidden.value=watch.rawQuery
    const validation=store.validate()
    const submit=form.querySelector('button[type="submit"]')
    if(submit)submit.disabled=!validation.saveable||(!watch.rawQuery&&!watch.target?.title)
    return {draft,watch,validation}
  }

  function summaryText(draft){
    const count=draft.conditions?.length||0
    const unresolved=draft.unresolvedFragments?.length||0
    return unresolved?`条件 ${count}件・未整理 ${unresolved}件`:`条件 ${count}件`
  }

  function render({restoreFocus=false}={}){
    const {draft,watch}=publish()
    const workspace=root.querySelector('[data-condition-workspace]')
    const target=watch.target?.title||draft.target?.title||''
    const cards=(draft.conditions||[]).map((condition)=>conditionCardHtml(draft,condition)).join('')
    workspace.innerHTML=`${target?`<div class="target-summary"><small>${esc(uiDomainLabel(watch.domain))}</small><b>${esc(target)}</b></div>`:''}<div class="condition-list-head"><div><small>条件</small><b data-condition-summary>${esc(summaryText(draft))}</b></div>${draft.conditions?.length>8?'<small>必要な条件だけタップして編集できます</small>':''}</div>${draft.conditions?.length>8?'<label class="condition-filter"><span class="sr-only">条件を絞り込む</span><input data-condition-filter type="search" placeholder="条件を絞り込む"></label>':''}<div class="condition-list" data-condition-list>${cards}</div>${unresolvedHtml(draft.unresolvedFragments)}`
    const interpretation=root.querySelector('[data-composer-interpretation]')
    interpretation.textContent=input.value.trim()?`${uiDomainLabel(watch.domain)}として整理しました。条件は下で直接直せます。`:'文章で入力するか、「条件から追加」から始められます。'
    const host=root.querySelector('[data-composer-sheet-host]')
    if(activeSheet?.type==='condition'){
      const condition=draft.conditions.find((item)=>item.id===activeSheet.id)
      host.innerHTML=condition?conditionSheetHtml(draft,condition):''
      if(!condition)activeSheet=null
    }else if(activeSheet?.type==='add'){
      const options=activeSheet.options||recommendedConditions({domain:draft.domain,categoryId:draft.categoryId,subcategoryId:draft.subcategoryId,targetText:target||input.value})
      host.innerHTML=addConditionSheetHtml(options)
    }else host.innerHTML=''
    if(restoreFocus&&sheetOriginId){queueMicrotask(()=>root.querySelector(`[data-condition-id="${sheetOriginId.replace(/"/g,'\\"')}"]`)?.focus())}
  }

  function applyText(raw){
    let current=cleanParserConditions(store.getDraft())
    const parsed=safeParse(raw)
    if(parsed){
      const previousDomain=originalWatch?.domain||originalWatch?.type
      const nextDomain=parsed.domain||parsed.type
      const domainChanged=Boolean(previousDomain&&nextDomain&&previousDomain!==nextDomain)
      originalWatch=domainChanged?structuredClone(parsed):{...originalWatch,...structuredClone(parsed),metadata:{...(originalWatch.metadata||{}),...(parsed.metadata||{})}}
      if(domainChanged){
        current={...current,domain:nextDomain,categoryId:parsed.target?.categoryId,subcategoryId:parsed.target?.subcategoryId,target:structuredClone(parsed.target||{}),conditions:(current.conditions||[]).filter((item)=>item.manuallyEdited),unresolvedFragments:[]}
      }
    }
    const interpretation=interpretInput(raw,{domain:current.domain,categoryId:current.categoryId,subcategoryId:current.subcategoryId})
    const merged=mergeInterpretation(current,interpretation)
    store=createComposerDraftStore(merged)
    activeSheet=null
    render()
  }

  function closeSheet(){activeSheet=null;render({restoreFocus:true});sheetOriginId=null}

  input.addEventListener('input',()=>applyText(input.value))
  root.addEventListener('click',(event)=>{
    const card=event.target.closest('[data-condition-card]')
    if(card){sheetOriginId=card.dataset.conditionId;activeSheet={type:'condition',id:card.dataset.conditionId};render();return}
    if(event.target.closest('[data-add-condition]')){
      const draft=store.getDraft();activeSheet={type:'add',options:recommendedConditions({domain:draft.domain,categoryId:draft.categoryId,subcategoryId:draft.subcategoryId,targetText:draft.target?.title||input.value})};render();return
    }
    if(event.target.closest('[data-close-sheet]')||event.target.matches('[data-sheet-backdrop]')){closeSheet();return}
    const remove=event.target.closest('[data-remove-unresolved]')
    if(remove){store.removeUnresolved(remove.dataset.removeUnresolved);render();return}
    if(event.target.closest('[data-remove-condition]')&&activeSheet?.type==='condition'){
      store.removeCondition(activeSheet.id);closeSheet();return
    }
    const option=event.target.closest('[data-condition-option]')
    if(option){
      const draft=store.getDraft();const definition=getConditionDefinition(draft.domain,option.dataset.attributeId,draft.subcategoryId)
      if(definition){const condition=defaultCondition(definition);store.upsertCondition(condition);const saved=store.getDraft().conditions.find((item)=>item.attributeId===condition.attributeId&&semanticLane(item)===semanticLane(condition));activeSheet={type:'condition',id:saved?.id||condition.id};render()}
    }
  })

  root.addEventListener('input',(event)=>{
    if(event.target.matches('[data-condition-search]')&&activeSheet?.type==='add'){
      const draft=store.getDraft();const options=searchConditionDefinitions(draft.domain,event.target.value,draft.subcategoryId);activeSheet={type:'add',options};root.querySelector('[data-condition-options]').innerHTML=conditionOptionsHtml(options);return
    }
    if(event.target.matches('[data-condition-filter]')){
      const needle=event.target.value.trim().toLocaleLowerCase('ja-JP');root.querySelectorAll('[data-condition-card]').forEach((card)=>{card.hidden=Boolean(needle&&!card.textContent.toLocaleLowerCase('ja-JP').includes(needle))})
    }
  })

  root.addEventListener('change',(event)=>{
    if(activeSheet?.type!=='condition')return
    const draft=store.getDraft();const condition=draft.conditions.find((item)=>item.id===activeSheet.id);if(!condition)return
    if(event.target.matches('[data-condition-role]')){store.setConditionRole(condition.id,event.target.value);render();return}
    if(event.target.matches('[data-condition-operator]')){
      const operator=event.target.value
      let value=condition.value
      if(operator==='range'&&!Array.isArray(value))value=[value??'','']
      if(operator!=='range'&&Array.isArray(value))value=value[0]??''
      store.upsertCondition({...condition,operator,value,manuallyEdited:true});render();return
    }
    if(event.target.matches('[data-condition-range-min],[data-condition-range-max]')){
      const definition=getConditionDefinition(draft.domain,condition.attributeId,draft.subcategoryId)
      const current=Array.isArray(condition.value)?[...condition.value]:['','']
      const index=event.target.matches('[data-condition-range-min]')?0:1
      current[index]=parseEditedValue(event.target.value,{...condition,operator:'eq'},definition)
      store.upsertCondition({...condition,value:current,manuallyEdited:true});publish();return
    }
    if(event.target.matches('[data-condition-value]')){
      const definition=getConditionDefinition(draft.domain,condition.attributeId,draft.subcategoryId)
      store.upsertCondition({...condition,value:parseEditedValue(event.target.value,condition,definition),manuallyEdited:true});publish();return
    }
  })

  root.addEventListener('keydown',(event)=>{if(event.key==='Escape'&&activeSheet){event.preventDefault();closeSheet()}})
  form.addEventListener('submit',()=>publish(),true)

  const controller={
    getWatch:()=>publish().watch,
    getRawText:()=>input.value,
    getDraft:()=>store.getDraft(),
    getRenderModel:()=>{const {watch,validation}=publish();return{watch,rawText:input.value,interpretation:{summary:root.querySelector('[data-composer-interpretation]')?.textContent||''},saveable:validation.saveable}},
    applyText:(raw)=>{input.value=raw;applyText(raw);return publish().watch},
  }
  form._canonicalController=controller
  render()
  return controller
}

function scan(){const form=document.querySelector?.('#watch-form');if(form)mountCanonicalComposer(form)}
if(typeof document!=='undefined'){
  const app=document.querySelector('#app');if(app&&typeof MutationObserver!=='undefined')new MutationObserver(scan).observe(app,{childList:true,subtree:true});scan()
}