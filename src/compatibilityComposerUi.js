function esc(value){return String(value??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function roleLabel(role){
  if(role==='required')return'必須';
  if(role==='comparison')return'比較用';
  if(role==='notification')return'通知';
  return'希望';
}

function targetSummary(condition={}){
  const target=condition.target||{};
  if(target.type==='device')return [target.brand,target.model].filter(Boolean).join(' ')||'対応機種';
  if(target.type==='age_range'){
    const min=target.minMonths??target.min;
    const max=target.maxMonths??target.max;
    if(min!==undefined&&max!==undefined)return `${min}〜${max}ヶ月`;
    if(max!==undefined)return `${max}ヶ月まで`;
    if(min!==undefined)return `${min}ヶ月から`;
    return'対象月齢';
  }
  if(target.type==='weight_range'){
    const min=target.minKg??target.min;
    const max=target.maxKg??target.max;
    if(min!==undefined&&max!==undefined)return `${min}〜${max}kg`;
    if(max!==undefined)return `${max}kgまで`;
    if(min!==undefined)return `${min}kgから`;
    return'対象体重';
  }
  if(target.type==='vehicle')return [target.brand,target.model,target.modelYear?`${target.modelYear}年式`:null,target.vehicleCode].filter(Boolean).join(' ')||'車種適合';
  if(target.type==='installation_space')return target.label||'設置スペース';
  return target.label||target.model||condition.relation||'適合条件';
}

function conditionSummary(condition){
  const relation={compatible_with:'対応',fits:'適合',within_range:'範囲内'}[condition.relation]||'適合';
  return `${targetSummary(condition)} ${relation}`;
}

function signature(conditions){
  return JSON.stringify((conditions||[]).map((c)=>({id:c.id,role:c.role,relation:c.relation,target:c.target})));
}

function updateWatch(form,updater){
  const controller=form._canonicalController;
  if(controller?.applyWatchEdit){
    controller.applyWatchEdit(updater);
    form._mikkeDraft=controller.getWatch();
    form.dataset.submitStructured='true';
    return;
  }
  if(form._mikkeDraft)form._mikkeDraft=updater(structuredClone(form._mikkeDraft));
}

function renderForm(form){
  const root=form.querySelector?.('[data-canonical-composer-root]');
  if(!root)return;
  const watch=form._canonicalController?.getWatch?.()||form._mikkeDraft;
  const conditions=Array.isArray(watch?.compatibilityConditions)?watch.compatibilityConditions:[];
  let section=root.querySelector('[data-canonical-compatibility]');
  if(!conditions.length){if(section)section.remove();return;}
  if(!section){
    section=form.ownerDocument.createElement('section');
    section.className='canonical-compatibility';
    section.dataset.canonicalCompatibility='';
    const notification=root.querySelector('[data-canonical-notification-slot]');
    root.insertBefore(section,notification||null);
  }
  const nextSignature=signature(conditions);
  if(section.dataset.compatibilitySignature===nextSignature)return;
  section.dataset.compatibilitySignature=nextSignature;
  section.innerHTML=`<div class="canonical-compatibility-head"><div><b>適合条件</b><small>サイズや価格とは別に「使えるか」を確認します</small></div><span>${conditions.length}件</span></div><div class="canonical-compatibility-list">${conditions.map((condition,index)=>`<article class="canonical-compatibility-item"><div><strong>${esc(conditionSummary(condition))}</strong><small>${esc(roleLabel(condition.role))}</small></div><div class="canonical-compatibility-actions"><button type="button" data-compatibility-role="${index}" aria-label="適合条件の優先度を変更">${condition.role==='required'?'希望にする':'必須にする'}</button><button type="button" data-compatibility-remove="${index}" aria-label="適合条件を削除">削除</button></div></article>`).join('')}</div><p class="canonical-compatibility-note">適合情報を確認できない商品は「対応」と推測せず、適合未確認として扱います。</p>`;
}

function handleClick(event){
  const section=event.target.closest?.('[data-canonical-compatibility]');
  if(!section)return;
  const form=section.closest('form');
  if(!form)return;
  const roleButton=event.target.closest('[data-compatibility-role]');
  if(roleButton){
    const index=Number(roleButton.dataset.compatibilityRole);
    updateWatch(form,(watch)=>({...watch,compatibilityConditions:(watch.compatibilityConditions||[]).map((condition,i)=>i===index?{...condition,role:condition.role==='required'?'preferred':'required'}:condition)}));
    renderForm(form);
    return;
  }
  const removeButton=event.target.closest('[data-compatibility-remove]');
  if(removeButton){
    const index=Number(removeButton.dataset.compatibilityRemove);
    updateWatch(form,(watch)=>({...watch,compatibilityConditions:(watch.compatibilityConditions||[]).filter((_,i)=>i!==index)}));
    renderForm(form);
  }
}

function scan(){
  const form=document.querySelector?.('#watch-form');
  if(form)renderForm(form);
}

if(typeof document!=='undefined'){
  document.addEventListener('click',handleClick);
  const app=document.querySelector('#app');
  if(app&&typeof MutationObserver!=='undefined')new MutationObserver(scan).observe(app,{childList:true,subtree:true,characterData:true});
  scan();
}

export { renderForm as renderCompatibilityComposer };
