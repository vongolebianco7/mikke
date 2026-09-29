let active=null;

export function setComposerDraftOverride(raw,watch){
  const key=String(raw||'').trim();
  if(!key||!watch){active=null;return}
  active={raw:key,watch:structuredClone(watch)};
}

export function getComposerDraftOverride(raw){
  const key=String(raw||'').trim();
  if(!active||active.raw!==key)return null;
  return structuredClone(active.watch);
}

export function clearComposerDraftOverride(){active=null}
