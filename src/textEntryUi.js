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
    quick.innerHTML='<label><b>何を探していますか？</b><textarea rows="3" data-quick-text-input placeholder="例：東京からハワイ、1〜3月、直行便で12万円以下"></textarea></label><button type="button" data-quick-text-apply>条件を作る</button>';
    composer.insertBefore(quick,selector);
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
