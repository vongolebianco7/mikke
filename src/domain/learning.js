function normalizedTitle(value=''){return String(value).toLowerCase().replace(/[^a-z0-9ぁ-んァ-ヶ一-龠]/g,'')}
function roundTarget(price){return Math.max(500,Math.round(price/500)*500)}

export function suggestLearnedPriceTrigger(watches,decisions,candidateContext){
  const targetTitle=normalizedTitle(candidateContext?.title);
  if(!targetTitle)return null;
  const matching=(watches||[]).filter(w=>w.type===candidateContext?.type&&normalizedTitle(w.title)===targetTitle);
  const records=matching.flatMap(w=>Array.isArray(decisions?.[w.id])?decisions[w.id]:[]).filter(d=>Number.isFinite(d.price));
  const buys=records.filter(d=>d.type==='buy');
  const waits=records.filter(d=>d.type==='wait');
  if(buys.length<1||waits.length<2||records.length<3)return null;
  const buyPrice=buys.at(-1).price;
  if(!waits.every(d=>d.price>buyPrice))return null;
  const value=roundTarget(buyPrice);
  return{type:'below_absolute',value,reference:'learned_local',role:'notification',label:`${value.toLocaleString('ja-JP')}円以下を候補にする`,evidenceCount:records.length};
}
