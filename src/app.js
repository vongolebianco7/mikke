import { parseWatchQuery } from './domain/parseWatch.js';
import { suggestWatchPhrases } from './domain/suggestWatchPhrases.js';
import { estimateStrictness, suggestRelaxations } from './domain/watchGuidance.js';
import { prioritizeToday } from './domain/prioritizeToday.js';
import { loadDecisions, recordDecision } from './domain/decisionStore.js';
import { suggestLearnedPriceTrigger } from './domain/learning.js';
import { groupProducts } from './domain/groupProducts.js';
import { createWatchRecord, loadWatches, saveWatches } from './domain/watchStore.js';
import { loadHistory, appendCheckHistory, priceContextByCandidate } from './domain/historyStore.js';
import { runWatchCheck } from './connectors/runWatchCheck.js';
import { safeOutboundUrl } from './domain/outboundUrl.js';
import { displayPriceModel } from './domain/pricing.js';
import { clearMikkeLocalData } from './domain/localData.js';
import { providerCreditsHtml } from './domain/providerCredits.js';

const root=document.querySelector('#app');
let watches=loadWatches(localStorage), history=loadHistory(localStorage), decisions=loadDecisions(localStorage), resultsByWatch={}, view='today', draft=null, checkingId=null;
let composerRaw='', roleOverrides={}, editingWatchId=null, actionNotice='';
const examples=['New Balance 996、24.5cm、グレー、今より安くなったら','500L以上の冷蔵庫、15万円以下、白かグレー、中古は嫌だけど展示品ならOK','東京からホノルル、直行便、往復10万円以下','軽井沢のホテル、10/26、2万円以下'];
const yen=(v)=>typeof v==='number'?`¥${v.toLocaleString('ja-JP')}`:'—';
const iconFor=(t)=>t==='flight'?'✈':t==='hotel'?'⌂':'◈';
const labelFor=(t)=>t==='flight'?'航空券':t==='hotel'?'ホテル':'買い物';
const esc=(v)=>String(v??'').replace(/[&<>'"]/g,(c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c]));
const toggleableKeys=new Set(['size','colors','excludeUsed','allowDisplay']);

function conditionsOf(w){return w.conditions||{}}
function conditionValue(w,key){const c=conditionsOf(w);return c[key]!==undefined?c[key]:c.attributes?.[key]}
function conditionLabel(w,key){const value=conditionValue(w,key);const labels={maxPrice:`${yen(value)}以下`,size:value,colors:Array.isArray(value)?value.join('・'):value,origin:`出発 ${value}`,destination:`到着 ${value}`,directOnly:'直行便',excludeUsed:'中古除外',allowDisplay:'展示品OK'};return labels[key]||key}
function chips(w){const c=conditionsOf(w),out=[];if(c.maxPrice)out.push(`${yen(c.maxPrice)}以下`);if(conditionValue(w,'size'))out.push(conditionValue(w,'size'));if(conditionValue(w,'colors')?.length)out.push(conditionValue(w,'colors').join('・'));if(conditionValue(w,'origin')&&conditionValue(w,'destination'))out.push(`${conditionValue(w,'origin')} → ${conditionValue(w,'destination')}`);if(conditionValue(w,'directOnly'))out.push('直行便');if(conditionValue(w,'excludeUsed'))out.push('中古除外');if(conditionValue(w,'allowDisplay'))out.push('展示品OK');return out}
function chipHtml(w){return chips(w).map(x=>`<span>${esc(x)}</span>`).join('')}

function triggerLabel(trigger){
  if(!trigger)return '';
  if(trigger.type==='below_absolute')return `${yen(trigger.value)}以下になったら`;
  if(trigger.type==='below_previous')return '前回確認より安くなったら';
  if(trigger.type==='below_initial')return '登録時の観測価格より安くなったら';
  if(trigger.type==='drop_percent')return `${trigger.percent}%以上値下がりしたら`;
  if(trigger.type==='new_watch_low')return 'Mikkeで観測した登録後最安値になったら';
  if(trigger.type==='restock')return '在庫が復活したら';
  if(trigger.type==='new_result')return '新しい候補が見つかったら';
  return trigger.type;
}

function applyRoleOverrides(parsed){
  const required=new Set(parsed.requiredKeys||[]), preferred=new Set(parsed.preferredKeys||[]);
  for(const [key,role] of Object.entries(roleOverrides)){
    if(!toggleableKeys.has(key))continue;
    required.delete(key);preferred.delete(key);
    if(role==='required')required.add(key);
    if(role==='preferred')preferred.add(key);
  }
  return {...parsed,requiredKeys:[...required],preferredKeys:[...preferred]};
}

function currentComposerParsed(){return composerRaw.trim()?applyRoleOverrides(parseWatchQuery(composerRaw)):null}

function roleChip(w,key,role,editable){
  const label=conditionLabel(w,key);
  if(!label)return '';
  const cls=role==='required'?'required':'preferred';
  if(editable&&toggleableKeys.has(key))return `<button type="button" class="role-chip ${cls}" data-role-toggle="${esc(key)}" data-current-role="${role}"><b>${role==='required'?'必須':'希望'}</b>${esc(label)}<i>↔</i></button>`;
  return `<span class="role-chip ${cls}"><b>${role==='required'?'必須':'希望'}</b>${esc(label)}</span>`;
}

function conditionGroupsHtml(w,editable=false){
  const required=(w.requiredKeys||[]).map(key=>roleChip(w,key,'required',editable)).filter(Boolean).join('');
  const preferred=(w.preferredKeys||[]).map(key=>roleChip(w,key,'preferred',editable)).filter(Boolean).join('');
  const c=conditionsOf(w);
  const notifications=[...(c.priceTriggers||[]),...(c.stateTriggers||[])].map(t=>`<span class="role-chip notification"><b>通知条件</b>${esc(triggerLabel(t))}</span>`).join('');
  return `<div class="role-groups"><section><h3>必須</h3><div class="role-list">${required||'<span class="group-empty">なし</span>'}</div></section><section><h3>希望</h3><div class="role-list">${preferred||'<span class="group-empty">なし</span>'}</div></section><section><h3>通知条件</h3><div class="role-list">${notifications||'<span class="group-empty">指定なし</span>'}</div></section></div>`;
}

function strictnessHtml(w){
  const s=estimateStrictness(w);
  return `<div class="strictness"><span>条件の厳しさ（推定）</span><b class="strictness-${esc(s.level)}">${esc(s.label)}</b><small>市場在庫ではなく、設定した条件数からの目安です。</small></div>`;
}

function suggestionHtml(parsed){
  if(!parsed)return '<span class="suggestion-hint">商品名や条件を入力すると、次の文節を提案します。</span>';
  const items=suggestWatchPhrases(composerRaw,parsed);
  const hasAbsolute=parsed.conditions?.priceTriggers?.some(t=>t.type==='below_absolute');
  const learned=hasAbsolute?null:suggestLearnedPriceTrigger(watches,decisions,{type:parsed.type,title:parsed.title});
  const learnedHtml=learned?`<button type="button" class="learned-suggestion" data-suggestion="learned-price" data-append="、${learned.value}円以下になったら"><span>✦</span>あなたの記録から ${esc(learned.label)}</button>`:'';
  const regular=items.map(item=>`<button type="button" data-suggestion="${esc(item.id)}" data-append="${esc(item.appendText)}"><span>＋</span>${esc(item.label)}</button>`).join('');
  return learnedHtml||regular?learnedHtml+regular:'<span class="suggestion-hint">条件がまとまりました。</span>';
}

function providerFooter(){const hasDemo=Object.values(resultsByWatch).some(r=>r?.dataMode==='sample');return `<footer class="provider-footer">${hasDemo?'<p><b>デモデータを表示中</b> — サンプル候補であり、実在する現在価格・在庫ではありません。</p>':''}<div class="provider-credit">${providerCreditsHtml()}</div><p class="release-links"><a href="/PRIVACY.md" target="_blank" rel="noopener noreferrer">Privacy</a> · <a href="/TERMS.md" target="_blank" rel="noopener noreferrer">Terms / Disclaimer</a></p></footer>`}

function render(){root.innerHTML=`<div class="shell"><header class="topbar"><div><div class="brand">Mikke<span>•</span></div><div class="tagline">欲しい条件になったら、見つけておいてくれる。</div></div><button class="bell" aria-label="通知">◌</button></header><section class="content">${actionNotice?`<div class="action-notice">${esc(actionNotice)}</div>`:''}${view==='today'?todayView():view==='watch'?watchView():view==='history'?historyView():view==='settings'?settingsView():createView()}</section>${providerFooter()}<nav class="nav"><button class="${view==='today'?'active':''}" data-nav="today"><b>⌂</b><span>Today</span></button><button class="${view==='watch'?'active':''}" data-nav="watch"><b>◫</b><span>Watch</span></button><button class="plus" data-nav="create">＋</button><button class="${view==='history'?'active':''}" data-nav="history"><b>◎</b><span>履歴</span></button><button class="${view==='settings'?'active':''}" data-nav="settings"><b>⋯</b><span>設定</span></button></nav></div>`;bindEvents()}

function todayModel(){
  const model=prioritizeToday(watches,resultsByWatch,history);
  model.relaxations=watches.flatMap(w=>suggestRelaxations(w,history,resultsByWatch[w.id]).map((suggestion,index)=>({watch:w,suggestion,index})));
  return model;
}

function candidateForEvent(item){return resultsByWatch[item.watch.id]?.candidates?.find(c=>c.id===item.event.candidateId)}
function importantCard(item){const candidate=candidateForEvent(item);return `<article class="change-card"><small>今見るべき変化</small><h3>${esc(item.watch.title)}</h3><p>${esc(eventDescription(item.event))}</p>${candidate?decisionBar(item.watch.id,candidate):''}</article>`}
function relaxationCard(item){return `<article class="guidance-card"><small>条件を緩める提案</small><h3>${esc(item.watch.title)}</h3><p>${esc(item.suggestion.label)}</p><button type="button" data-relaxation="${esc(item.watch.id)}:${item.index}">内容を確認して変更</button></article>`}
function groupedMatchesHtml(entries){
  const byWatch=new Map();
  for(const entry of entries){const list=byWatch.get(entry.watch.id)||{watch:entry.watch,candidates:[]};list.candidates.push(entry.candidate);byWatch.set(entry.watch.id,list)}
  return [...byWatch.values()].flatMap(({watch,candidates})=>groupProducts(candidates).map(group=>groupedProductCard(group,watch))).join('');
}
function groupedProductCard(group,watch){
  const main=productCard(group.representative,watch.id);
  if(group.offers.length<2)return main;
  const offers=group.offers.map(offer=>{const url=safeOutboundUrl(offer.url);const row=`<span><b>${esc(offer.source||offer.shopName||'ショップ')}</b><strong>${yen(offer.price)}</strong></span>`;return url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${row}</a>`:row}).join('');
  return `<div class="grouped-result">${main}<details class="offer-list"><summary>ショップ別 ${group.offers.length}件</summary>${offers}</details></div>`;
}
function todayView(){
  const model=todayModel(),checked=Object.values(resultsByWatch);
  if(!watches.length)return `<div class="hero"><p class="eyebrow">TODAY</p><h1>今日の動き</h1><p>欲しい条件になったら、ここに意味のある変化だけ集めます。</p></div><div class="empty-card"><div class="empty-icon">✦</div><h2>探し回るのを、やめる。</h2><p>欲しい条件を一度登録すれば、Mikkeが変化を見張ります。</p><button class="primary" data-action="open-create">最初のWatchを作る</button></div>`;
  return `<div class="hero"><p class="eyebrow">TODAY</p><h1>今日見るべきこと</h1><p>値下がり・最安値・在庫復活など、次の行動につながる変化から。</p></div>
  ${model.importantChanges.length?`<div class="section-head"><h2>重要な変化</h2></div><div class="change-list">${model.importantChanges.slice(0,6).map(importantCard).join('')}</div>`:''}
  ${model.nearTargets.length?`<div class="section-head"><h2>目標までもう少し</h2></div><div class="cards">${model.nearTargets.slice(0,4).map(x=>`<div class="near-target"><b>${esc(x.watch.title)}</b><span>あと ${yen(x.distance)}</span></div>${productCard(x.candidate,x.watch.id)}`).join('')}</div>`:''}
  ${model.matches.length?`<div class="section-head"><h2>条件に一致</h2></div><div class="cards">${groupedMatchesHtml(model.matches)}</div>`:''}
  ${model.relaxations.length?`<div class="section-head"><h2>条件を緩める提案</h2></div><div class="guidance-list">${model.relaxations.map(relaxationCard).join('')}</div>`:''}
  <div class="stats secondary"><div><b>${model.matches.length}</b><span>条件一致</span></div><div><b>${watches.filter(w=>w.status!=='stopped').length}</b><span>Watch中</span></div><div><b>${checked.length}</b><span>確認済み</span></div></div>
  <div class="section-head"><h2>Watchを確認</h2></div><div class="mini-list">${watches.filter(w=>w.status!=='stopped').map(watchRow).join('')}</div>`;
}
function watchView(){return `<div class="hero"><p class="eyebrow">WATCH</p><h1>見ておくもの</h1><p>商品でも、航空券でも、ホテルでも。条件で登録します。</p></div><button class="wide-add" data-action="open-create">＋ 新しいWatch</button><div class="watch-list">${watches.length?watches.map(watchCard).join(''):'<p class="subtle">まだWatchがありません。</p>'}</div>`}
function historyView(){const labels={condition_match:'条件一致',new_result:'新着',price_drop:'値下げ',restock:'在庫復活',watch_low:'登録後最安値',target_price_reached:'目標価格到達',percent_drop:'大きな値下げ',initial_price_drop:'登録時より値下げ',cheaper_provider:'より安いショップ'},items=Object.entries(history).flatMap(([watchId,d])=>(d.events||[]).map(e=>({watchId,...e}))).reverse();return `<div class="hero"><p class="eyebrow">HISTORY</p><h1>変化の履歴</h1><p>意味のあるイベントだけを残します。</p></div><div class="history-list">${items.length?items.map(e=>{const w=watches.find(x=>x.id===e.watchId);return `<article class="history-item"><span class="event-dot"></span><div><small>${esc(labels[e.kind]||e.kind)}</small><h3>${esc(w?.title||'Watch')}</h3><p>${eventDescription(e)}</p></div></article>`}).join(''):'<div class="empty-card compact"><h3>まだ履歴はありません</h3><p>Watchを確認するとここに残ります。</p></div>'}</div>`}
function eventDescription(e){if(e.kind==='price_drop')return `前回より${yen(e.delta)}値下げ`;if(e.kind==='watch_low')return `Mikkeで観測した登録後最安値 ${yen(e.currentPrice)}`;if(e.kind==='target_price_reached')return `設定した${yen(e.targetPrice)}以下になりました`;if(e.kind==='percent_drop')return `前回確認より${e.percent}%値下がり`;if(e.kind==='initial_price_drop')return `登録時の観測価格${yen(e.referencePrice)}より安くなりました`;if(e.kind==='cheaper_provider')return `同一商品で、より安いショップを見つけました（${yen(e.currentPrice)}）`;if(e.kind==='condition_match')return '設定した必須条件を満たしました';if(e.kind==='restock')return '在庫が復活しました';return '新しい候補を見つけました'}
function settingsView(){return `<div class="hero"><p class="eyebrow">SETTINGS</p><h1>データと公開情報</h1><p>現在のMikkeはWatch・履歴・購入判断をこのブラウザ内に保存します。</p></div><div class="settings-card"><h2>ローカルデータ</h2><p>この端末に保存されたMikkeのWatch・履歴・判断履歴だけを削除します。他のサイト・機能の保存データは削除しません。</p><button class="danger" data-action="clear-data">Mikkeのローカルデータをすべて削除</button></div><div class="settings-card"><h2>公開情報</h2><p><a href="/PRIVACY.md" target="_blank" rel="noopener noreferrer">Privacy Notice</a></p><p><a href="/TERMS.md" target="_blank" rel="noopener noreferrer">Terms / Disclaimer</a></p></div>`}

function createView(){
  if(draft)return confirmView();
  const parsed=currentComposerParsed();
  return `<div class="create-head"><button class="back" data-nav="today">×</button><p class="eyebrow">${editingWatchId?'EDIT WATCH':'NEW WATCH'}</p><h1>${editingWatchId?'条件を調整':'何を見ておきますか？'}</h1><p>文章で入力しても、下の候補をタップして組み立ててもOKです。</p></div><form id="watch-form" class="composer"><textarea id="query" maxlength="220" placeholder="例：New Balance 996、24.5cm、グレー">${esc(composerRaw)}</textarea><div class="assist-label"><b>次に追加するなら</b><span>文節サジェスト</span></div><div class="suggestion-strip" id="suggestions">${suggestionHtml(parsed)}</div><div class="live-conditions" id="live-conditions">${parsed?conditionGroupsHtml(parsed,true)+strictnessHtml(parsed):''}</div><details class="examples"><summary>入力例を見る</summary>${examples.map(x=>`<button type="button" data-example="${esc(x)}">${esc(x)}</button>`).join('')}</details><button class="primary" type="submit" ${parsed?'':'disabled'}>この内容で条件を確認</button></form>`
}
function confirmView(){return `<div class="create-head"><button class="back" data-action="edit-draft">←</button><p class="eyebrow">CONFIRM</p><h1>この条件で見ておきます</h1><p>必須・希望・通知条件を分けて確認できます。</p></div><div class="condition-card"><div class="type-icon">${iconFor(draft.type)}</div><div><small>${labelFor(draft.type)}</small><h2>${esc(draft.title)}</h2><p>${esc(draft.rawQuery)}</p></div></div>${conditionGroupsHtml(draft,false)}${strictnessHtml(draft)}<div class="note">${draft.type==='shopping'?'公式APIが設定されていれば楽天市場・Yahoo!ショッピングを検索します。未設定時はデモデータであることを明示します。':`${labelFor(draft.type)}コネクタは次の実装対象です。Watch自体は保存できます。`}</div><button class="primary" data-action="save-watch">${editingWatchId?'この条件に更新':'この条件をWatchする'}</button>`}
function watchRow(w){const r=resultsByWatch[w.id],count=r?.candidates?.filter(c=>c.evaluation.requiredMatch).length||0;return `<button class="mini-watch" data-check="${esc(w.id)}"><span class="mini-icon">${iconFor(w.type)}</span><span><b>${esc(w.title)}</b><small>${checkingId===w.id?'確認中…':r?`${r.dataMode==='sample'?'デモ・':''}条件一致 ${count}件`:'タップして確認'}</small></span><i>›</i></button>`}
function watchCard(w){const r=resultsByWatch[w.id];return `<article class="watch-card"><div class="watch-top"><span class="mini-icon">${iconFor(w.type)}</span><div><small>${labelFor(w.type)}</small><h3>${esc(w.title)}</h3></div><span class="status">${w.status==='stopped'?'停止':'監視中'}</span></div><p>${esc(w.rawQuery)}</p><div class="chips">${chipHtml(w)}</div>${w.status!=='stopped'?`<button class="check" data-check="${esc(w.id)}">${checkingId===w.id?'確認中…':r?'もう一度確認':'今すぐ確認'}</button>`:''}</article>`}
function decisionBar(watchId,candidate){const price=Number.isFinite(candidate?.price)?candidate.price:'';const candidateId=candidate?.id||'';return `<div class="decision-bar"><button type="button" data-decision="buy" data-watch-id="${esc(watchId)}" data-candidate-id="${esc(candidateId)}" data-price="${price}">買う</button><button type="button" data-decision="wait" data-watch-id="${esc(watchId)}" data-candidate-id="${esc(candidateId)}" data-price="${price}">もう少し待つ</button><button type="button" data-decision="edit" data-watch-id="${esc(watchId)}" data-candidate-id="${esc(candidateId)}" data-price="${price}">条件変更</button><button type="button" data-decision="stop" data-watch-id="${esc(watchId)}" data-candidate-id="${esc(candidateId)}" data-price="${price}">監視終了</button></div>`}
function productCard(i,watchId=''){const model=displayPriceModel(i);const url=safeOutboundUrl(i.url);const image=safeOutboundUrl(i.imageUrl);const body=`<article class="product-card"><div class="product-image">${image?`<img src="${esc(image)}" alt="" loading="lazy">`:`<span>${String(i.title||'').includes('冷蔵庫')?'▥':'◒'}</span>`}${model.percentOff?`<b>${model.percentOff}% OFF</b>`:''}</div><div><div class="product-head"><div><small>${esc(i.source)}${i.shopName?` · ${esc(i.shopName)}`:''}</small><h3>${esc(i.title)}</h3></div><span class="match">${Number(i.evaluation?.score)||0}%</span></div><div class="price-line"><strong>${yen(model.currentPrice)}</strong>${model.referencePrice?`<del>${yen(model.referencePrice)}</del>`:''}</div><div class="result-badge">✓ 条件に一致</div><p class="price-note">${esc(model.note)}</p></div></article>`;const linked=url?`<a class="product-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${body}</a>`:body;return `<div class="result-unit">${linked}${watchId?decisionBar(watchId,i):''}</div>`}

function updateComposerAssist(){
  const input=document.querySelector('#query');
  if(!input)return;
  composerRaw=input.value;
  const parsed=currentComposerParsed();
  const suggestions=document.querySelector('#suggestions');if(suggestions)suggestions.innerHTML=suggestionHtml(parsed);
  const live=document.querySelector('#live-conditions');if(live)live.innerHTML=parsed?conditionGroupsHtml(parsed,true)+strictnessHtml(parsed):'';
  const submit=document.querySelector('#watch-form button[type="submit"]');if(submit)submit.disabled=!parsed;
}

function applyRelaxation(watch,suggestion){
  const next=structuredClone(watch);
  if(suggestion.kind==='raise_max_price'){
    next.conditions.maxPrice=suggestion.suggestedValue;
    next.conditions.priceTriggers=(next.conditions.priceTriggers||[]).map(t=>t.type==='below_absolute'?{...t,value:suggestion.suggestedValue}:t);
  }
  if(suggestion.kind==='required_to_preferred'){
    next.requiredKeys=(next.requiredKeys||[]).filter(k=>k!==suggestion.key);
    next.preferredKeys=[...new Set([...(next.preferredKeys||[]),suggestion.key])];
  }
  next.updatedAt=new Date().toISOString();
  return next;
}

function prepareEditWatch(w){
  editingWatchId=w.id;composerRaw=w.rawQuery||'';roleOverrides={};
  for(const key of w.requiredKeys||[])if(toggleableKeys.has(key))roleOverrides[key]='required';
  for(const key of w.preferredKeys||[])if(toggleableKeys.has(key))roleOverrides[key]='preferred';
  draft=null;view='create';actionNotice='';render();
}
function stopWatch(watchId){watches=watches.map(w=>w.id===watchId?{...w,status:'stopped',updatedAt:new Date().toISOString()}:w);saveWatches(localStorage,watches)}

function bindEvents(){
  document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>{const target=b.dataset.nav;if(target==='create'&&view!=='create'){composerRaw='';roleOverrides={};draft=null;editingWatchId=null}view=target;if(view!=='create')draft=null;actionNotice='';render()}));
  document.querySelectorAll('[data-action="open-create"]').forEach(b=>b.addEventListener('click',()=>{view='create';draft=null;composerRaw='';roleOverrides={};editingWatchId=null;actionNotice='';render()}));
  document.querySelector('[data-action="edit-draft"]')?.addEventListener('click',()=>{composerRaw=draft?.rawQuery||composerRaw;roleOverrides={};for(const key of draft?.requiredKeys||[])if(toggleableKeys.has(key))roleOverrides[key]='required';for(const key of draft?.preferredKeys||[])if(toggleableKeys.has(key))roleOverrides[key]='preferred';draft=null;render()});
  document.querySelectorAll('[data-example]').forEach(b=>b.addEventListener('click',()=>{composerRaw=b.dataset.example||'';roleOverrides={};render()}));
  const form=document.querySelector('#watch-form');
  form?.querySelector('#query')?.addEventListener('input',updateComposerAssist);
  form?.addEventListener('click',(e)=>{
    const suggestion=e.target.closest('[data-suggestion]');
    if(suggestion){const input=form.querySelector('#query');const append=suggestion.dataset.append||'';composerRaw=`${input.value.trim()}${append}`;input.value=composerRaw;updateComposerAssist();input.focus();return}
    const role=e.target.closest('[data-role-toggle]');
    if(role){const key=role.dataset.roleToggle;roleOverrides[key]=role.dataset.currentRole==='required'?'preferred':'required';updateComposerAssist()}
  });
  form?.addEventListener('submit',e=>{e.preventDefault();const raw=form.querySelector('#query').value.trim();if(!raw)return;composerRaw=raw;draft=applyRoleOverrides(parseWatchQuery(raw));render()});
  document.querySelector('[data-action="save-watch"]')?.addEventListener('click',()=>{if(editingWatchId){const existing=watches.find(w=>w.id===editingWatchId);if(existing){const updated={...existing,...draft,id:existing.id,status:existing.status,createdAt:existing.createdAt,baseline:existing.baseline,behavior:existing.behavior,updatedAt:new Date().toISOString()};watches=watches.map(w=>w.id===editingWatchId?updated:w);saveWatches(localStorage,watches);actionNotice='Watchの条件を更新しました。'}}else{const w=createWatchRecord(draft);watches=[w,...watches];saveWatches(localStorage,watches);actionNotice='新しいWatchを保存しました。'}draft=null;composerRaw='';roleOverrides={};editingWatchId=null;view='watch';render()});
  document.querySelectorAll('[data-check]').forEach(b=>b.addEventListener('click',async()=>{const w=watches.find(x=>x.id===b.dataset.check);if(!w||checkingId||w.status==='stopped')return;checkingId=w.id;actionNotice='';render();const context=priceContextByCandidate(history,w.id);resultsByWatch[w.id]=await runWatchCheck(w,context);history=appendCheckHistory(localStorage,w.id,resultsByWatch[w.id]);checkingId=null;view='today';render()}));
  document.querySelectorAll('[data-relaxation]').forEach(b=>b.addEventListener('click',()=>{const [watchId,indexText]=b.dataset.relaxation.split(':');const w=watches.find(x=>x.id===watchId);if(!w)return;const suggestions=suggestRelaxations(w,history,resultsByWatch[w.id]);const suggestion=suggestions[Number(indexText)];if(!suggestion)return;if(!window.confirm(`条件を変更します。\n${suggestion.label}\nよろしいですか？`))return;watches=watches.map(x=>x.id===w.id?applyRelaxation(x,suggestion):x);saveWatches(localStorage,watches);actionNotice='提案した条件変更を反映しました。';render()}));
  document.querySelectorAll('[data-decision]').forEach(b=>b.addEventListener('click',()=>{const type=b.dataset.decision,watchId=b.dataset.watchId,candidateId=b.dataset.candidateId;const price=Number(b.dataset.price);const w=watches.find(x=>x.id===watchId);if(!w)return;if(type==='stop'){if(!window.confirm('このWatchの監視を終了しますか？ 履歴は残ります。'))return;decisions=recordDecision(localStorage,watchId,{type:'stop',candidateId,price:Number.isFinite(price)?price:undefined,at:new Date().toISOString()});stopWatch(watchId);actionNotice='監視を終了しました。履歴は残っています。';render();return}if(type==='edit'){decisions=recordDecision(localStorage,watchId,{type:'edit',candidateId,price:Number.isFinite(price)?price:undefined,at:new Date().toISOString()});prepareEditWatch(w);return}if(type==='buy'||type==='wait'){decisions=recordDecision(localStorage,watchId,{type,candidateId,price:Number.isFinite(price)?price:undefined,at:new Date().toISOString()});if(type==='buy'){actionNotice='「買う」として記録しました。';if(window.confirm('購入判断を記録しました。このWatchの監視も終了しますか？')){stopWatch(watchId);actionNotice='購入判断を記録し、監視を終了しました。'}}else actionNotice='「もう少し待つ」として記録しました。';render()}}));
  document.querySelector('[data-action="clear-data"]')?.addEventListener('click',()=>{if(!window.confirm('MikkeのWatch・履歴・判断履歴をこの端末から削除します。よろしいですか？'))return;clearMikkeLocalData(localStorage);watches=[];history={};decisions={};resultsByWatch={};draft=null;composerRaw='';roleOverrides={};editingWatchId=null;checkingId=null;actionNotice='';view='today';render()})
}
render();
