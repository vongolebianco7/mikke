export function promoteTextEntry(root=document){
  const buttons=root.querySelectorAll?.('[data-text-helper-toggle]')||[];
  for(const button of buttons){
    const composer=button.closest('.unified-composer');
    const selector=composer?.querySelector('.domain-selector');
    if(!composer||!selector)continue;
    button.classList.add('text-entry-cta');
    button.setAttribute('aria-label','文章で入力。条件をまとめて書く');
    button.innerHTML='<span class="text-entry-copy"><b>文章で入力</b><small>条件をまとめて書く</small></span><span class="text-entry-arrow" aria-hidden="true">→</span>';
    if(button.parentElement!==composer)composer.insertBefore(button,selector);
  }
}

function scan(){
  const app=document.querySelector('#app');
  if(app)promoteTextEntry(app);
}

const app=document.querySelector('#app');
if(app)new MutationObserver(scan).observe(app,{childList:true,subtree:true});
scan();
