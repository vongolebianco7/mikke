import { createComposerController } from './domain/composerController.js';
import { parseWatchQuery } from './domain/parseWatch.js';
import { applyComposerCondition, applyFlightTravelIntentEdit, applyFlightFilterEdit } from './domain/composerModel.js';
import { getDomainField } from './domain/domainSchemas.js';

const shoppingPrimaryFields={appliance:['totalCapacity','width','color','condition'],fashion:['size','color','condition'],furniture:['width','depth','color','material','condition'],food:['weight','quantity','originCountry'],used_car:['modelYear','mileage','repairHistory']};
const shoppingOperators={totalCapacity:'gte',width:'lte',depth:'lte',weight:'gte',quantity:'gte',modelYear:'gte',mileage:'lte',color:'in',condition:'in'};
const labels={shopping:'商品',flight:'航空券',hotel:'ホテル'};

function esc(value){return String(value??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function uiDomain(domain){return domain==='flight'?'flight':domain==='hotel'?'hotel':'shopping'}
function fieldCondition(watch,id){return (watch.domainConditions||[]).find((c)=>c.fieldId===id)}
function triggerKey(t){return `${t.metric||''}:${t.scope||''}:${t.reference||''}`}
function hasTrigger(watch,metric,scope='',reference=''){return (watch.triggers||[]).some((t)=>triggerKey(t)===`${metric}:${scope}:${reference}`)}
function replaceTrigger(watch,trigger){const key=triggerKey(trigger);return {...watch,triggers:[...(watch.triggers||[]).filter((t)=>triggerKey(t)!==key),trigger]}}
function removeTrigger(watch,metric,scope='',reference=''){const key=`${metric}:${scope}:${reference}`;return {...watch,triggers:(watch.triggers||[]).filter((t)=>triggerKey(t)!==key)}}
function valueFor(watch,id,fallback=''){const value=fieldCondition(watch,id)?.value;return Array.isArray(value)?value.join('、'):(value??fallback)}
function numberLike(field){return ['integer','number','duration','money','measurement'].includes(field?.type)}
function parseFieldValue(field,id,raw){if(numberLike(field))return Number(raw);if((shoppingOperators[id]==='in'||field?.type==='list')&&typeof raw==='string')return raw.split(/[、,]/).map((v)=>v.trim()).filter(Boolean);return raw}
function setDomainCondition(watch,id,value,operator,role='required'){
  const field=getDomainField(watch.domain,id);if(!field)return watch;
  const resolved=operator||(field.type==='boolean'?(value===false?'is_false':'is_true'):(field.operators?.[0]||'eq'));
  return applyComposerCondition(watch,{id:`canonical-${id}`,fieldId:id,operator:resolved,value,unit:field.unit,role});
}
function removeDomainCondition(watch,id){return {...watch,domainConditions:(watch.domainConditions||[]).filter((c)=>c.fieldId!==id)}}
function placeSummary(set){if(set?.mode==='anywhere')return'どこでも';return(set?.places||[]).map((p)=>p.label).filter(Boolean).join(' / ')}
function subjectSummary(watch){
  if(watch.domain==='flight')return [placeSummary(watch.travelIntent?.originSet),placeSummary(watch.travelIntent?.destinationSet)].filter(Boolean).join(' → ');
  if(watch.domain==='hotel')return valueFor(watch,'destination',valueFor(watch,'area',watch.target?.title||''));
  return watch.target?.title||'';
}
function recognizedLines(model){
  const watch=model.watch,lines=[];const subject=subjectSummary(watch);if(subject)lines.push(subject);
  if(watch.domain==='flight'){
    const trip={round_trip:'往復',one_way:'片道',multi_city:'複数都市'}[watch.travelIntent?.tripPattern];if(trip)lines.push(trip);
    if((watch.flightFilters||[]).some((f)=>f.fieldId==='nonstopOnly'))lines.push('直行便');
    const airlines=(watch.flightFilters||[]).find((f)=>f.fieldId==='allowedAirlines');if(airlines?.value?.length)lines.push(airlines.value.join(' / '));
  } else {
    for(const c of (watch.domainConditions||[]).slice(0,4)){
      const field=getDomainField(watch.domain,c.fieldId);const value=Array.isArray(c.value)?c.value.join('・'):c.value;
      if(field&&value!==undefined&&value!=='')lines.push(`${field.label} ${value}`);
    }
  }
  for(const t of (watch.triggers||[]).slice(0,2)){
    if(t.metric==='price'&&t.operator==='lte'&&Number.isFinite(Number(t.value)))lines.push(`${Number(t.value).toLocaleString('ja-JP')}円以下で通知`);
    else if(t.metric==='availability')lines.push(`${watch.domain==='hotel'?'空室':watch.domain==='flight'?'空席':'在庫'}が出たら通知`);
  }
  return lines;
}
function triggerSummary(watch,trigger){
  if(trigger.metric==='price'&&trigger.operator==='lte'&&Number.isFinite(Number(trigger.value)))return `${Number(trigger.value).toLocaleString('ja-JP')}円以下になったら通知`;
  if(trigger.metric==='availability'&&trigger.scope==='award')return '特典空席が出たら通知';
  if(trigger.metric==='availability')return `${watch.domain==='hotel'?'空室':watch.domain==='flight'?'空席':'在庫'}が出たら通知`;
  if(trigger.metric==='price_drop_percent')return '値下がりしたら通知';
  return '条件に合う変化があったら通知';
}
function notificationSummary(watch){const triggers=watch.triggers||[];return triggers.length?triggers.slice(0,2).map((t)=>triggerSummary(watch,t)).join('・'):'条件に合う候補が見つかったら'}

function shoppingEditor(watch){const fields=shoppingPrimaryFields[watch.domain]||[];if(!fields.length)return `<div class="canonical-empty">商品名を文章で入力すると、カテゴリに合う条件を表示します。</div>`;return `<div class="canonical-fields">${fields.map((id)=>{const field=getDomainField(watch.domain,id);if(!field)return'';if(field.type==='boolean')return`<button type="button" class="canonical-toggle ${fieldCondition(watch,id)?'active':''}" data-canonical-field="${id}" data-canonical-boolean>${esc(field.label)}</button>`;return`<label><small>${esc(field.label)}</small><input ${numberLike(field)?'type="number"':'type="text"'} value="${esc(valueFor(watch,id))}" data-canonical-field="${id}"></label>`}).join('')}</div>`}
function flightEditor(watch){const intent=watch.travelIntent||{};const nonstop=(watch.flightFilters||[]).some((f)=>f.fieldId==='nonstopOnly'),airlines=(watch.flightFilters||[]).some((f)=>f.fieldId==='allowedAirlines');return `<div class="canonical-flight"><div class="canonical-choice-row"><button type="button" data-canonical-trip="round_trip" class="${intent.tripPattern==='round_trip'?'active':''}">往復</button><button type="button" data-canonical-trip="one_way" class="${intent.tripPattern==='one_way'?'active':''}">片道</button></div><div class="canonical-fields"><label><small>出発地</small><input value="${esc(placeSummary(intent.originSet))}" data-canonical-place="origin"></label><label><small>行き先</small><input value="${esc(placeSummary(intent.destinationSet))}" data-canonical-place="destination"></label></div><div class="canonical-choice-row"><button type="button" data-canonical-flight-filter="nonstopOnly" class="${nonstop?'active':''}">直行便</button><button type="button" data-canonical-flight-filter="allowedAirlines" class="${airlines?'active':''}">ANA / JAL</button></div></div>`}
function hotelEditor(watch){const ids=['destination','checkIn','checkOut','adults','rooms','maxWalkingMinutes'];return `<div class="canonical-fields">${ids.map((id)=>{const field=getDomainField('hotel',id);if(!field)return'';const type=['checkIn','checkOut'].includes(id)?'date':numberLike(field)?'number':'text';return`<label><small>${esc(field.label)}</small><input type="${type}" value="${esc(valueFor(watch,id,id==='adults'?2:id==='rooms'?1:''))}" data-canonical-field="${id}"></label>`}).join('')}</div><div class="canonical-choice-row"><button type="button" data-canonical-hotel-toggle="breakfastIncluded" class="${fieldCondition(watch,'breakfastIncluded')?'active':''}">朝食付き</button><button type="button" data-canonical-hotel-toggle="freeCancellation" class="${fieldCondition(watch,'freeCancellation')?'active':''}">キャンセル無料</button></div>`}
function editorHtml(watch){if(watch.domain==='flight')return flightEditor(watch);if(watch.domain==='hotel')return hotelEditor(watch);return shoppingEditor(watch)}
function notificationHtml(watch){const price=(watch.triggers||[]).find((t)=>t.metric==='price'&&t.operator==='lte'&&!t.reference);const availability=hasTrigger(watch,'availability');const award=hasTrigger(watch,'availability','award');const label=watch.domain==='flight'?'空席が出たら':watch.domain==='hotel'?'空室が出たら':'在庫が出たら';return `<section class="canonical-notification" data-canonical-notification><div><b>いつ知らせる？</b><small>検索条件とは別に設定します</small></div><label class="canonical-price"><span>価格が</span><input type="number" min="0" value="${esc(price?.value??'')}" data-canonical-notify-price><span>円以下</span></label><div class="canonical-choice-row"><button type="button" data-canonical-notify="availability" class="${availability?'active':''}">${label}</button>${watch.domain==='flight'?`<button type="button" data-canonical-notify="award" class="${award?'active':''}">特典空席が出たら</button>`:''}</div><strong data-canonical-notification-summary>${esc(notificationSummary(watch))}</strong></section>`}

export function mountCanonicalComposer(form,{Event:EventCtor=globalThis.Event}={}){
  if(!form||form.dataset.canonicalComposer==='true')return form?._canonicalController||null;
  const hidden=form.querySelector('#query');
  const initial=form._mikkeDraft||parseWatchQuery(hidden?.value||'')||undefined;
  const controller=createComposerController(initial);
  const root=form.ownerDocument.createElement('section');root.className='canonical-composer';root.dataset.canonicalComposerRoot='';
  root.innerHTML=`<div class="canonical-entry"><label><b>何を探していますか？</b><textarea rows="4" data-composer-text placeholder="例：東京からハワイ、1〜3月、直行便で12万円以下"></textarea></label><div class="canonical-interpretation" data-composer-interpretation aria-live="polite"></div></div><div class="canonical-domain-row"><button type="button" data-canonical-domain="shopping">商品</button><button type="button" data-canonical-domain="flight">航空券</button><button type="button" data-canonical-domain="hotel">ホテル</button></div><div data-canonical-editor></div><div data-canonical-notification-slot></div>`;
  form.insertBefore(root,form.firstChild);
  form.dataset.canonicalComposer='true';form._canonicalController=controller;
  const input=root.querySelector('[data-composer-text]');input.value=controller.getRawText();

  function publish(){const model=controller.getRenderModel();form._mikkeDraft=model.watch;form.dataset.submitStructured='true';if(hidden)hidden.value=model.rawText||model.watch.metadata?.rawQuery||model.watch.rawQuery||'';return model}
  function render(){const model=publish();const interpretation=root.querySelector('[data-composer-interpretation]');const lines=recognizedLines(model);interpretation.innerHTML=`<b>${esc(model.interpretation.summary)}</b>${lines.length?`<div>${lines.map((x)=>`<span>${esc(x)}</span>`).join('')}</div>`:''}${model.unresolvedText?`<small>未解釈: ${esc(model.unresolvedText)}</small>`:''}`;root.querySelectorAll('[data-canonical-domain]').forEach((b)=>b.classList.toggle('active',b.dataset.canonicalDomain===uiDomain(model.watch.domain)));root.querySelector('[data-canonical-editor]').innerHTML=editorHtml(model.watch);root.querySelector('[data-canonical-notification-slot]').innerHTML=notificationHtml(model.watch);const submit=form.querySelector('button[type="submit"]');if(submit)submit.disabled=!model.saveable;}
  function edit(updater){controller.applyWatchEdit(updater);render()}

  input.addEventListener('input',()=>{controller.applyText(input.value);render()});
  root.addEventListener('click',(event)=>{
    const domain=event.target.closest('[data-canonical-domain]');if(domain){controller.switchDomain(domain.dataset.canonicalDomain);input.value='';render();return}
    const trip=event.target.closest('[data-canonical-trip]');if(trip){edit((w)=>applyFlightTravelIntentEdit(w,{type:'set_trip_pattern',value:trip.dataset.canonicalTrip}));return}
    const filter=event.target.closest('[data-canonical-flight-filter]');if(filter){const id=filter.dataset.canonicalFlightFilter,current=(controller.getWatch().flightFilters||[]).some((f)=>f.fieldId===id);edit((w)=>applyFlightFilterEdit(w,current?{fieldId:id,remove:true}:id==='nonstopOnly'?{fieldId:id,operator:'is_true',value:true,role:'required'}:{fieldId:id,operator:'in',value:['ANA','JAL'],role:'preferred'}));return}
    const hotelToggle=event.target.closest('[data-canonical-hotel-toggle]');if(hotelToggle){const id=hotelToggle.dataset.canonicalHotelToggle;edit((w)=>fieldCondition(w,id)?removeDomainCondition(w,id):setDomainCondition(w,id,true));return}
    const bool=event.target.closest('[data-canonical-boolean]');if(bool){const id=bool.dataset.canonicalField;edit((w)=>fieldCondition(w,id)?removeDomainCondition(w,id):setDomainCondition(w,id,id==='repairHistory'?false:true,undefined,'required'));return}
    const notify=event.target.closest('[data-canonical-notify]');if(notify){const kind=notify.dataset.canonicalNotify;if(kind==='award')edit((w)=>hasTrigger(w,'availability','award')?removeTrigger(w,'availability','award'):replaceTrigger(w,{id:'canonical-award',metric:'availability',scope:'award',operator:'eq',value:true,role:'notification'}));else edit((w)=>hasTrigger(w,'availability')?removeTrigger(w,'availability'):replaceTrigger(w,{id:'canonical-availability',metric:'availability',operator:'eq',value:true,role:'notification'}));return}
  });
  root.addEventListener('change',(event)=>{
    const target=event.target;
    if(target.matches('[data-canonical-field]')&&!target.dataset.canonicalBoolean){const id=target.dataset.canonicalField,watch=controller.getWatch(),field=getDomainField(watch.domain,id);edit((w)=>target.value===''?removeDomainCondition(w,id):setDomainCondition(w,id,parseFieldValue(field,id,target.value),shoppingOperators[id]));return}
    if(target.matches('[data-canonical-place]')){const set=target.dataset.canonicalPlace,label=target.value.trim();edit((w)=>{const next=structuredClone(w);next.travelIntent={...next.travelIntent,[`${set}Set`]:{mode:'include',places:label?[{kind:'city',id:label,label}]:[]}};return next});return}
    if(target.matches('[data-canonical-notify-price]')){const value=Number(target.value);edit((w)=>!target.value?removeTrigger(w,'price'):replaceTrigger(w,{id:'canonical-price',metric:'price',operator:'lte',value,unit:'JPY',role:'notification'}));return}
  });
  form.addEventListener('submit',()=>{publish();if(hidden&&!hidden.value){hidden.value=controller.getRawText()||controller.getWatch().target?.title||labels[uiDomain(controller.getWatch().domain)]}} ,true);
  render();
  return controller;
}

function scan(){const form=document.querySelector?.('#watch-form');if(form)mountCanonicalComposer(form)}
if(typeof document!=='undefined'){
  const app=document.querySelector('#app');if(app&&typeof MutationObserver!=='undefined')new MutationObserver(scan).observe(app,{childList:true,subtree:true});scan();
}
