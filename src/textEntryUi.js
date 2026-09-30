import { parseWatchQuery } from './domain/parseWatch.js';

function feedbackText(raw){
  const text=String(raw||'').trim();
  if(!text)return '入力すると条件を読み取ります';
  const parsed=parseWatchQuery(text);
  if(!parsed)return 'まだ条件を読み取れません';
  const domain=parsed.domain||parsed.type;
  const label=domain==='flight'?'航空券':domain==='hotel'?'ホテル':'商品';
  const conditionCount=(parsed.domainConditions||parsed.flightFilters||[]).length;
  const triggerCount=(parsed.triggers||[]).length;
  return `${label}として読み取りました・条件 ${conditionCount}件${triggerCount?`・通知 ${triggerCount}件`:''}`;
}

function syncQuickText(composer){
  const form=composer.closest('form');
  const quickInput=composer.querySelector('[data-quick-text-input]');
  const feedback=composer.querySelector('[data-quick-text-feedback]');
  const apply=composer.querySelector('[data-quick-text-apply]');
  const query=form?.querySelector('#query');
  const raw=quickInput?.value??'';
  if(query){
    query.value=raw;
    query.dispatchEvent(new Event('input',{bubbles:true}));
  }
  if(feedback)feedback.textContent=feedbackText(raw);
  if(apply)apply.disabled=!raw.trim();
}

function applyQuickText(button,composer){
  const form=button.closest('form');
  const quickInput=composer.querySelector('[data-quick-text-input]');
  const query=form?.querySelector('#query');
  const raw=quickInput?.value.trim();
  if(!form||!query||!raw)return;
  query.value=raw;
  query.dispatchEvent(new Event('input',{bubbles:true}));
  const toggle=form.querySelector('[data-text-helper-toggle]');
  if(!form.classList.contains('text-helper-open'))toggle?.click();
  queueMicrotask(()=>form.querySelector('[data-text-helper-apply]')?.click());
}

export function promoteTextEntry(root=document){
  const buttons=root.querySelectorAll?.('[data-text-helper-toggle]')||[];
  for(const button of buttons){
    if(button.classList.contains('text-entry-cta'))continue;
    const composer=button.closest('.unified-composer');
    const selector=composer?.querySelector('.domain-selector');
    if(!composer||!selector)continue;
    button.classList.add('text-entry-cta');
    button.hidden=true;
    const quick=document.createElement('section');
    quick.className='quick-text-entry';
    quick.innerHTML='<label><b>何を探していますか？</b><textarea rows="3" data-quick-text-input placeholder="例：東京からハワイ、1〜3月、直行便で12万円以下"></textarea></label><div class="quick-text-feedback" data-quick-text-feedback aria-live="polite">入力すると条件を読み取ります</div><button type="button" data-quick-text-apply disabled>条件を作る</button>';
    composer.insertBefore(quick,selector);
    const quickInput=quick.querySelector('[data-quick-text-input]');
    quickInput?.addEventListener('input',()=>syncQuickText(composer));
    quick.querySelector('[data-quick-text-apply]')?.addEventListener('click',()=>applyQuickText(button,composer));
  }
}

function scan(){
  const app=document.querySelector('#app');
  if(app)promoteTextEntry(app);
}

const app=document.querySelector('#app');
if(app)new MutationObserver(scan).observe(app,{childList:true,subtree:true});
scan();
