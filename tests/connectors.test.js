import test from 'node:test';
import assert from 'node:assert/strict';
import { runWatchCheck } from '../src/connectors/runWatchCheck.js';
import { searchOfficialShopping } from '../src/connectors/officialShopping.js';

test('shopping check returns evaluated candidates sorted by score then price', async () => {
  const watch = { id:'w1', type:'shopping', title:'996', rawQuery:'New Balance 996、24.5cm、グレー、1万円以下', conditions:{ maxPrice:10000, size:'24.5cm', colors:['グレー'] }, requiredKeys:['maxPrice','size'], preferredKeys:['colors'], createdAt:new Date().toISOString() };
  const result = await runWatchCheck(watch);
  assert.equal(result.candidates.length > 0, true);
  assert.equal(result.candidates[0].evaluation.score >= result.candidates.at(-1).evaluation.score, true);
  assert.equal(result.events.some((event) => event.kind === 'condition_match'), true);
});

test('v3 product domains use the approved shopping connector path', async () => {
  for (const domain of ['fashion','appliance','furniture','food','used_car','baby','sports','electronics','daily_goods','beauty','pet','hobby']) {
    let calls=0;
    const watch={id:`w-${domain}`,schemaVersion:3,domain,title:domain,rawQuery:domain,domainConditions:[],triggers:[]};
    const fetchImpl=async()=>{calls+=1;return{ok:true,json:async()=>({items:[{id:`${domain}:1`,title:domain,price:1000,available:true,attributes:{}}],providers:[{name:'test',status:'ok'}]})}};
    const result=await runWatchCheck(watch,{}, {fetchImpl});
    assert.equal(calls,1,`${domain} should call shopping provider path once`);
    assert.equal(result.status,'ok');
    assert.equal(result.candidates.length,1);
  }
});

test('official product candidates mark unevaluable v3 domain fields unsupported instead of pretending unknown data is a match', async () => {
  const watch={
    id:'w-material',schemaVersion:3,domain:'fashion',type:'shopping',title:'jacket',rawQuery:'ジャケット',
    domainConditions:[{fieldId:'material',operator:'contains_text',value:'綿',role:'required',evidencePolicy:'known_required'}],triggers:[],
  };
  const fetchImpl=async()=>({ok:true,json:async()=>({items:[{id:'p1',source:'test',title:'ジャケット',price:5000,available:true,attributes:{}}],providers:[{name:'test',status:'ok'}]})});
  const result=await runWatchCheck(watch,{}, {fetchImpl});
  const candidate=result.candidates[0];
  assert.equal(candidate.evaluation.requiredMatch,false);
  assert.deepEqual(candidate.evaluation.unsupportedRequired,['material']);
  assert.equal(candidate.facts.material.state,'unsupported');
});

test('official candidates mark missing required compatibility evidence unsupported', async () => {
  const watch={
    id:'w-fit',schemaVersion:3,domain:'electronics',type:'shopping',title:'イヤホン',rawQuery:'iPhone 17 Pro対応イヤホン',
    domainConditions:[],triggers:[],
    compatibilityConditions:[{id:'phone-fit',relation:'compatible_with',subjectType:'audio',target:{type:'device',model:'iPhone 17 Pro'},role:'required'}],
  };
  const fetchImpl=async()=>({ok:true,json:async()=>({items:[{id:'p1',source:'test',title:'イヤホン',price:9000,available:true,attributes:{}}],providers:[{name:'test',status:'ok'}]})});
  const result=await runWatchCheck(watch,{}, {fetchImpl});
  const candidate=result.candidates[0];
  assert.equal(candidate.evaluation.requiredMatch,false);
  assert.deepEqual(candidate.evaluation.unsupportedCompatibilityRequired,['phone-fit']);
  assert.equal(candidate.evaluation.compatibilityOutcomes[0].state,'unsupported');
});

test('official candidates preserve provider-supplied compatibility evidence', async () => {
  const watch={
    id:'w-fit-known',schemaVersion:3,domain:'electronics',type:'shopping',title:'イヤホン',rawQuery:'iPhone 17 Pro対応イヤホン',
    domainConditions:[],triggers:[],
    compatibilityConditions:[{id:'phone-fit',relation:'compatible_with',subjectType:'audio',target:{type:'device',model:'iPhone 17 Pro'},role:'required'}],
  };
  const fetchImpl=async()=>({ok:true,json:async()=>({items:[{
    id:'p2',source:'test',title:'イヤホン',price:9000,available:true,attributes:{},
    compatibilityEvidence:{'phone-fit':{state:'compatible',source:'manufacturer',reason:'explicit_compatibility_list'}},
  }],providers:[{name:'test',status:'ok'}]})});
  const result=await runWatchCheck(watch,{}, {fetchImpl});
  const candidate=result.candidates[0];
  assert.equal(candidate.evaluation.requiredMatch,true);
  assert.equal(candidate.evaluation.compatibilityOutcomes[0].state,'compatible');
  assert.equal(candidate.evaluation.compatibilityOutcomes[0].evidence.source,'manufacturer');
});

test('flight and hotel v3 Watches stay connector_pending and make zero provider calls', async () => {
  for (const domain of ['flight','hotel']) {
    let calls=0;
    const watch={id:`w-${domain}`,schemaVersion:3,domain,title:domain,rawQuery:domain,domainConditions:[],triggers:[]};
    const result=await runWatchCheck(watch,{}, {fetchImpl:async()=>{calls+=1;throw new Error('must not call')}});
    assert.equal(calls,0);
    assert.equal(result.status,'connector_pending');
    assert.deepEqual(result.candidates,[]);
    assert.deepEqual(result.events,[]);
  }
});

test('shopping check passes Mikke-observed price context into event derivation', async () => {
  const watch = {
    id:'w-price', type:'shopping', title:'996', rawQuery:'NB 996、登録後最安値、10%以上値下がり',
    conditions:{ attributes:{}, priceTriggers:[{type:'new_watch_low'},{type:'drop_percent',percent:10,reference:'previous'}], stateTriggers:[] },
    requiredKeys:[], preferredKeys:[], createdAt:new Date().toISOString(),
  };
  const fetchImpl = async () => ({ ok:true, json:async()=>({ items:[{id:'c1',title:'NB 996',price:9000,available:true,attributes:{}}], providers:[{name:'yahoo',status:'ok'}] }) });
  const historyContext = { c1:{ previous:{candidateId:'c1',price:12000,available:true,observedAt:'t1'}, initialPrice:13000, observedLow:10000, observationCount:2 } };
  const result = await runWatchCheck(watch, historyContext, { fetchImpl });
  assert.ok(result.events.some((event)=>event.kind==='watch_low'));
  assert.ok(result.events.some((event)=>event.kind==='percent_drop' && event.percent===25));
});

test('strongly identified grouped product emits cheaper-provider event when cheapest shop changes', async () => {
  const watch={id:'wg',type:'shopping',title:'996',rawQuery:'NB 996',conditions:{attributes:{},priceTriggers:[],stateTriggers:[]},requiredKeys:[],preferredKeys:[]};
  const fetchImpl=async()=>({ok:true,json:async()=>({items:[
    {id:'rakuten:1',source:'楽天市場',title:'NB 996',price:10000,available:true,attributes:{jan:'4901234567890'}},
    {id:'yahoo:2',source:'Yahoo!ショッピング',title:'NB 996',price:9500,available:true,attributes:{jan:'4901234567890'}},
  ],providers:[{name:'rakuten',status:'ok'},{name:'yahoo',status:'ok'}]})});
  const previous={
    'rakuten:1':{previous:{candidateId:'rakuten:1',price:9800,available:true,observedAt:'t1'},initialPrice:9800,observedLow:9800},
    'yahoo:2':{previous:{candidateId:'yahoo:2',price:10200,available:true,observedAt:'t1'},initialPrice:10200,observedLow:10200},
  };
  const result=await runWatchCheck(watch,previous,{fetchImpl});
  assert.ok(result.events.some(event=>event.kind==='cheaper_provider'&&event.candidateId==='yahoo:2'&&event.previousCandidateId==='rakuten:1'));
});

test('unsupported connector type returns a clear empty state instead of throwing', async () => {
  const watch = { id:'f1', type:'flight', title:'Tokyo Honolulu', rawQuery:'', conditions:{}, requiredKeys:[], preferredKeys:[], createdAt:new Date().toISOString() };
  const result = await runWatchCheck(watch);
  assert.deepEqual(result.candidates, []);
  assert.equal(result.status, 'connector_pending');
});

test('official shopping connector posts the watch to the same-origin API', async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ items: [{ id:'yahoo:x', title:'NB 996', price:9000, available:true, attributes:{} }], providers:[{ name:'yahoo', status:'ok' }] }) };
  };
  const result = await searchOfficialShopping({ type:'shopping', rawQuery:'NB 996', conditions:{} }, fetchImpl);
  assert.equal(request.url, '/api/shopping-search');
  assert.equal(request.options.method, 'POST');
  assert.equal(JSON.parse(request.options.body).watch.rawQuery, 'NB 996');
  assert.equal(result.mode, 'official');
  assert.equal(result.items.length, 1);
});

test('official connector returns unavailable without throwing when the API route is absent', async () => {
  const result = await searchOfficialShopping({ type:'shopping', rawQuery:'NB 996', conditions:{} }, async () => ({ ok:false, status:404 }));
  assert.equal(result.mode, 'unavailable');
  assert.deepEqual(result.items, []);
});