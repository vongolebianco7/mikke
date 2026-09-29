import { parseWatchQuery } from './domain/parseWatch.js';
import { getAttributeDefinition } from './domain/attributeRegistry.js';

const LEGACY_ATTRIBUTES=new Set(['price','size','color','condition','origin','destination','direct']);
const LEGACY_TRIGGER_METRICS=new Set(['price','discount_percent','availability','listing_status']);

function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,(char)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));}
function valueText(value){return Array.isArray(value)?value.join('・'):String(value??'');}
function operatorText(operator){return {eq:'=',neq:'≠',gte:'以上',lte:'以下',between:'範囲',in:'いずれか',not_in:'除外',contains:'含む',contains_all:'すべて含む',is_true:'あり',is_false:'なし'}[operator]||operator;}
function conditionText(condition){
  const def=getAttributeDefinition(condition.attributeId);
  const label=def?.label||condition.attributeId;
  if(condition.operator==='is_true'||condition.operator==='is_false')return `${label} ${operatorText(condition.operator)}`;
  return `${label} ${valueText(condition.value)}${condition.unit||''} ${operatorText(condition.operator)}`;
}
function triggerText(trigger){
  if(trigger.metric==='shipping_fee'&&trigger.operator==='eq'&&Number(trigger.value)===0)return '送料無料になったら';
  if(trigger.metric==='landed_price'&&trigger.operator==='lte')return `送料込み ¥${Number(trigger.value).toLocaleString('ja-JP')}以下`;
  if(trigger.metric==='coupon_available')return 'クーポンが出たら';
  if(trigger.metric==='coupon_discount_percent')return `${trigger.value}%以上のクーポン`; 
  if(trigger.metric==='coupon_discount_amount')return `¥${Number(trigger.value).toLocaleString('ja-JP')}以上のクーポン`;
  if(trigger.metric==='release_status'&&trigger.value==='released')return '発売されたら';
  if(trigger.metric==='preorder_status'&&trigger.value==='open')return '予約開始したら';
  if(trigger.metric==='delivery_date')return `${trigger.value}までに届く`; 
  return `${trigger.metric} ${operatorText(trigger.operator)} ${valueText(trigger.value)}`;
}
function summaryHtml(parsed){
  const conditions=(parsed.genericConditions||[]).filter((condition)=>!LEGACY_ATTRIBUTES.has(condition.attributeId));
  const triggers=(parsed.triggers||[]).filter((trigger)=>!LEGACY_TRIGGER_METRICS.has(trigger.metric));
  if(!conditions.length&&!triggers.length)return '';
  const conditionHtml=conditions.length?`<section><h3>追加の商品条件</h3><div class="generic-summary-chips">${conditions.map((condition)=>`<span class="generic-condition-chip"><b>${condition.role==='required'?'必須':'希望'}</b>${escapeHtml(conditionText(condition))}</span>`).join('')}</div></section>`:'';
  const triggerHtml=triggers.length?`<section><h3>追加の通知条件</h3><div class="generic-summary-chips">${triggers.map((trigger)=>`<span class="generic-trigger-chip"><b>通知</b>${escapeHtml(triggerText(trigger))}</span>`).join('')}</div></section>`:'';
  return `<div class="generic-condition-summary">${conditionHtml}${triggerHtml}</div>`;
}
function scan(){
  const card=document.querySelector('.condition-card');
  if(!card||document.querySelector('.generic-condition-summary'))return;
  const raw=card.querySelector('p')?.textContent?.trim();
  if(!raw)return;
  const parsed=parseWatchQuery(raw);
  const html=summaryHtml(parsed);
  if(!html)return;
  card.insertAdjacentHTML('afterend',html);
}

new MutationObserver(scan).observe(document.querySelector('#app'),{childList:true,subtree:true});
scan();
