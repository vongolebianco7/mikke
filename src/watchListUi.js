import { loadWatches } from './domain/watchStore.js';
import { summarizeWatchCard } from './domain/watchCardSummary.js';

const esc=(value)=>String(value??'').replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const labelFor=(domain)=>domain==='flight'?'航空券':domain==='hotel'?'ホテル':'商品';
const iconFor=(domain)=>domain==='flight'?'✈':domain==='hotel'?'⌂':'◈';

function conditionHtml(items){
  const visible=items.slice(0,3);
  const extra=Math.max(0,items.length-visible.length);
  return `<div class="watch-card-conditions">${visible.map((item)=>`<span>${esc(item)}</span>`).join('')}${extra?`<span class="watch-card-more">＋${extra}条件</span>`:''}</div>`;
}

function notificationHtml(items){
  if(!items.length)return `<div class="watch-card-notification muted"><span>通知</span><b>条件に合う候補が見つかったら</b></div>`;
  return `<div class="watch-card-notification"><span>通知</span><b>${esc(items[0])}</b>${items.length>1?`<small>＋${items.length-1}件</small>`:''}</div>`;
}

function actionHtml(card,domain){
  if(domain==='flight'||domain==='hotel')return `<div class="watch-card-actions connector-pending"><button type="button" disabled aria-disabled="true">検索連携は準備中</button><small>条件の作成・保存・編集は利用できます</small></div>`;
  const existingAction=card.querySelector('.check')?.outerHTML||'';
  return existingAction?`<div class="watch-card-actions">${existingAction}</div>`:'';
}

export function enhanceSavedWatchCards(root=document){
  const cards=[...(root.querySelectorAll?.('.watch-list .watch-card')||[])];
  if(!cards.length)return;
  const watches=loadWatches(localStorage);
  cards.forEach((card,index)=>{
    if(card.classList.contains('watch-card-scannable'))return;
    const watch=watches[index];if(!watch)return;
    const summary=summarizeWatchCard(watch);
    const domain=watch.domain||watch.type||'shopping';
    const status=watch.status==='stopped'?'停止':'監視中';
    card.classList.add('watch-card-scannable');
    card.innerHTML=`<div class="watch-card-header"><span class="watch-card-kind"><i>${iconFor(domain)}</i>${labelFor(domain)}</span><span class="status">${status}</span></div><h3 class="watch-card-subject">${esc(summary.subject)}</h3>${conditionHtml(summary.conditions)}${notificationHtml(summary.notifications)}${actionHtml(card,domain)}`;
  });
}

function scan(){enhanceSavedWatchCards(document)}
const app=document.querySelector('#app');
if(app)new MutationObserver(scan).observe(app,{childList:true,subtree:true});
scan();
