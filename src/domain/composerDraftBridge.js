let active=null;

export function setComposerDraftOverride(raw,watch){
  const key=String(raw||'').trim();
  if(!key||!watch){active=null;return}
  active={raw:key,watch:structuredClone(watch)};
}

function liveFormDraft(raw){
  if(typeof document==='undefined')return null;
  const form=document.querySelector('#watch-form');
  const input=form?.querySelector('#query');
  const key=String(raw||'').trim();
  if(form?.dataset?.submitStructured!=='true'||!form?._mikkeDraft||String(input?.value||'').trim()!==key)return null;
  return structuredClone(form._mikkeDraft);
}

export function getComposerDraftOverride(raw){
  const live=liveFormDraft(raw);
  if(live)return live;
  const key=String(raw||'').trim();
  if(!active||active.raw!==key)return null;
  return structuredClone(active.watch);
}

export function clearComposerDraftOverride(){active=null}
