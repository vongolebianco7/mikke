import { parseWatchQuery } from './parseWatch.js';
import { createComposerDraft, switchComposerDomain, applyParsedWatch } from './composerDraft.js';

function copy(value){return value===undefined?undefined:structuredClone(value)}
function emptyWatch(){return {schemaVersion:3,domain:'shopping',target:{title:''},domainConditions:[],triggers:[],metadata:{rawQuery:''}}}
function rawOf(watch){return String(watch?.metadata?.rawQuery??watch?.rawQuery??'').trim()}
function domainLabel(domain){return domain==='flight'?'航空券':domain==='hotel'?'ホテル':'商品'}
function subjectOf(watch){
  if(watch?.domain==='flight'){
    const origin=watch.travelIntent?.originSet?.places?.map((p)=>p.label).filter(Boolean).join(' / ');
    const destination=watch.travelIntent?.destinationSet?.mode==='anywhere'?'どこでも':watch.travelIntent?.destinationSet?.places?.map((p)=>p.label).filter(Boolean).join(' / ');
    return [origin,destination].filter(Boolean).join(' → ')||watch.target?.title||'';
  }
  if(watch?.domain==='hotel'){
    const destination=(watch.domainConditions||[]).find((c)=>['destination','area'].includes(c.fieldId))?.value;
    return destination||watch.target?.title||'';
  }
  return watch?.target?.title||'';
}
function recognizedCount(watch){return (watch?.domainConditions?.length||0)+(watch?.flightFilters?.length||0)+(watch?.travelIntent?.dateSet?.options?.length||0)}
function interpretationFor(watch,raw){
  if(!String(raw||'').trim())return {summary:'入力すると条件を読み取ります',domain:null,subject:'',conditionCount:0,triggerCount:0};
  const domain=watch?.domain||watch?.type||'shopping';
  const subject=subjectOf(watch);
  const conditionCount=recognizedCount(watch);
  const triggerCount=watch?.triggers?.length||0;
  return {summary:`${domainLabel(domain)}として読み取りました`,domain,subject,conditionCount,triggerCount};
}
function unresolvedFor(parsed){
  const value=parsed?.metadata?.unresolvedText??parsed?.metadata?.unparsedText??parsed?.metadata?.ambiguousText??'';
  return typeof value==='string'?value:'';
}

export function createComposerController(initialWatch){
  let draft=createComposerDraft(initialWatch||emptyWatch());
  let raw=rawOf(draft.watch);
  let unresolvedText='';

  function getWatch(){return copy(draft.watch)}
  function getRawText(){return raw}
  function publishWatch(watch){
    draft=createComposerDraft(watch);
    raw=rawOf(draft.watch)||raw;
    return getWatch();
  }

  return {
    getWatch,
    getRawText,
    applyText(nextRaw){
      raw=String(nextRaw||'').trim();
      if(!raw){
        draft=createComposerDraft(emptyWatch());
        unresolvedText='';
        return {watch:getWatch(),interpretation:interpretationFor(draft.watch,''),unresolvedText};
      }
      const parsed=parseWatchQuery(raw);
      if(parsed){
        const withRaw={...parsed,metadata:{...(parsed.metadata||{}),rawQuery:raw},rawQuery:parsed.rawQuery||raw};
        draft=applyParsedWatch(draft,withRaw);
        unresolvedText=unresolvedFor(parsed);
      }else{
        unresolvedText=raw;
      }
      return {watch:getWatch(),interpretation:interpretationFor(draft.watch,raw),unresolvedText};
    },
    switchDomain(domain){
      draft=switchComposerDomain(draft,domain);
      raw='';
      unresolvedText='';
      draft.watch.metadata={...(draft.watch.metadata||{}),rawQuery:''};
      return getWatch();
    },
    replaceWatch(watch){
      draft=createComposerDraft(watch||emptyWatch());
      raw=rawOf(draft.watch);
      unresolvedText='';
      return getWatch();
    },
    applyWatchEdit(updater){
      if(typeof updater!=='function')return getWatch();
      const next=updater(getWatch());
      if(next&&typeof next==='object'){
        const rawQuery=raw||rawOf(next);
        const withRaw={...next,metadata:{...(next.metadata||{}),rawQuery},rawQuery:next.rawQuery||rawQuery};
        draft=createComposerDraft(withRaw);
      }
      return getWatch();
    },
    getRenderModel(){
      const watch=getWatch();
      const subject=subjectOf(watch);
      return {domain:watch.domain,rawText:raw,watch,interpretation:interpretationFor(watch,raw),unresolvedText,saveable:Boolean(raw&&subject)};
    },
  };
}
