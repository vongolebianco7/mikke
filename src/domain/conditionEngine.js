const UNIT_GROUPS = {
  length: { mm:1, cm:10, m:1000 },
  mass: { g:1, kg:1000 },
  volume: { ml:1, l:1000 },
  distance: { km:1 },
  currency: { jpy:1 },
  percent: { '%':1 },
};

function unitInfo(unit){
  if(!unit)return null;
  const normalized=String(unit).trim().toLowerCase();
  for(const [group,map] of Object.entries(UNIT_GROUPS)) if(map[normalized]!==undefined) return {group,factor:map[normalized],unit:normalized};
  return null;
}

function parseMeasured(value, explicitUnit){
  if(typeof value==='number'&&Number.isFinite(value)) return {number:value,unit:explicitUnit};
  if(typeof value!=='string') return null;
  const normalized=value.replace(/,/g,'').trim();
  const match=normalized.match(/^(-?\d+(?:\.\d+)?)\s*([a-zA-Z%]+)?$/);
  if(!match)return null;
  return {number:Number(match[1]),unit:match[2]||explicitUnit};
}

function comparableNumber(value, sourceUnit, targetUnit){
  const parsed=parseMeasured(value,sourceUnit);
  if(!parsed)return null;
  const from=unitInfo(parsed.unit||targetUnit);
  const to=unitInfo(targetUnit||parsed.unit);
  if(!from&&!to)return parsed.number;
  if(!from||!to||from.group!==to.group)return null;
  return parsed.number*from.factor/to.factor;
}

function primitiveEqual(a,b){
  if(typeof a==='string'&&typeof b==='string') return a.trim().toLowerCase()===b.trim().toLowerCase();
  return Object.is(a,b);
}

function asArray(value){return Array.isArray(value)?value:[value]}
function containsText(haystack,needle){return String(haystack??'').toLowerCase().includes(String(needle??'').toLowerCase())}

export function evaluateCondition(condition={},facts={}){
  const fact=facts[condition.attributeId];
  if(!fact||fact.state==='unknown'||fact.state==='unsupported'){
    return {state:'unknown',evidence:fact||{state:'unknown'}};
  }
  if(fact.state!=='known')return {state:'unknown',evidence:fact};
  const actual=fact.value;
  let pass=false;
  switch(condition.operator){
    case 'eq': pass=primitiveEqual(actual,condition.value); break;
    case 'neq': pass=!primitiveEqual(actual,condition.value); break;
    case 'in': {
      const actualValues=asArray(actual), expected=asArray(condition.value);
      pass=actualValues.some(a=>expected.some(e=>primitiveEqual(a,e)));
      break;
    }
    case 'not_in': {
      const actualValues=asArray(actual), expected=asArray(condition.value);
      pass=!actualValues.some(a=>expected.some(e=>primitiveEqual(a,e)));
      break;
    }
    case 'contains': pass=asArray(actual).some(a=>primitiveEqual(a,condition.value)); break;
    case 'contains_all': pass=asArray(condition.value).every(e=>asArray(actual).some(a=>primitiveEqual(a,e))); break;
    case 'is_true': pass=actual===true; break;
    case 'is_false': pass=actual===false; break;
    case 'contains_text': pass=containsText(actual,condition.value); break;
    case 'not_contains_text': pass=!containsText(actual,condition.value); break;
    case 'gte':
    case 'lte': {
      const actualNumber=comparableNumber(actual,fact.meta?.unit,condition.unit);
      const expectedNumber=comparableNumber(condition.value,condition.unit,condition.unit);
      if(actualNumber===null||expectedNumber===null)return {state:'unknown',evidence:{...fact,reason:'incomparable_unit'}};
      pass=condition.operator==='gte'?actualNumber>=expectedNumber:actualNumber<=expectedNumber;
      break;
    }
    case 'between': {
      const bounds=Array.isArray(condition.value)?condition.value:[];
      if(bounds.length!==2)return {state:'unknown',evidence:{...fact,reason:'invalid_range'}};
      const actualNumber=comparableNumber(actual,fact.meta?.unit,condition.unit);
      const low=comparableNumber(bounds[0],condition.unit,condition.unit);
      const high=comparableNumber(bounds[1],condition.unit,condition.unit);
      if([actualNumber,low,high].some(v=>v===null))return {state:'unknown',evidence:{...fact,reason:'incomparable_unit'}};
      pass=actualNumber>=low&&actualNumber<=high;
      break;
    }
    default: return {state:'unknown',evidence:{...fact,reason:'unsupported_operator'}};
  }
  return {state:pass?'pass':'fail',evidence:fact};
}

export function evaluateGenericConditions(conditions=[],facts={}){
  const outcomes=conditions.map((condition)=>({condition,...evaluateCondition(condition,facts)}));
  const required=outcomes.filter(o=>o.condition.role==='required');
  const preferred=outcomes.filter(o=>o.condition.role!=='required');
  const failedRequired=required.filter(o=>o.state==='fail').map(o=>o.condition.id||o.condition.attributeId);
  const unknownRequired=required.filter(o=>o.state==='unknown').map(o=>o.condition.id||o.condition.attributeId);
  const requiredPassed=required.filter(o=>o.state==='pass').length;
  const preferredPassed=preferred.filter(o=>o.state==='pass').length;
  const totalWeight=required.length*2+preferred.length;
  const passedWeight=requiredPassed*2+preferredPassed;
  const score=totalWeight===0?50:Math.round((passedWeight/totalWeight)*100);
  return {
    requiredMatch:failedRequired.length===0&&unknownRequired.length===0,
    requiredPassed,
    preferredPassed,
    failedRequired,
    unknownRequired,
    score,
    outcomes,
  };
}
