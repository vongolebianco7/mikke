const UNIT_GROUPS={
  length:{mm:1,cm:10,m:1000},mass:{g:1,kg:1000},volume:{ml:1,l:1000},distance:{km:1},currency:{jpy:1},percent:{'%':1},duration:{min:1,minute:1,minutes:1,hour:60,hours:60,day:1440,days:1440},area:{m2:1},
};
function unitInfo(unit){if(!unit)return null;const normalized=String(unit).trim().toLowerCase();for(const[group,map]of Object.entries(UNIT_GROUPS))if(map[normalized]!==undefined)return{group,factor:map[normalized],unit:normalized};return null}
function parseMeasured(value,explicitUnit){if(typeof value==='number'&&Number.isFinite(value))return{number:value,unit:explicitUnit};if(typeof value!=='string')return null;const normalized=value.replace(/,/g,'').trim();const match=normalized.match(/^(-?\d+(?:\.\d+)?)\s*([a-zA-Z%0-9]+)?$/);if(!match)return null;return{number:Number(match[1]),unit:match[2]||explicitUnit}}
function comparableNumber(value,sourceUnit,targetUnit){const parsed=parseMeasured(value,sourceUnit);if(!parsed)return null;const from=unitInfo(parsed.unit||targetUnit),to=unitInfo(targetUnit||parsed.unit);if(!from&&!to)return parsed.number;if(!from||!to||from.group!==to.group)return null;return parsed.number*from.factor/to.factor}
function primitiveEqual(a,b){if(typeof a==='string'&&typeof b==='string')return a.trim().toLowerCase()===b.trim().toLowerCase();return Object.is(a,b)}
function asArray(value){return Array.isArray(value)?value:[value]}
function containsText(haystack,needle){return String(haystack??'').toLowerCase().includes(String(needle??'').toLowerCase())}
function isoDateNumber(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;const time=Date.parse(`${value}T00:00:00Z`);return Number.isFinite(time)?time:null}
function timeNumber(value){if(typeof value!=='string')return null;const match=value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);return match?Number(match[1])*60+Number(match[2]):null}
function conditionKey(condition){return condition.fieldId??condition.attributeId}
function compareOrdered(actual,expected,operator,factUnit,conditionUnit){
  const actualDate=isoDateNumber(actual),expectedDate=isoDateNumber(expected);
  if(actualDate!==null||expectedDate!==null){if(actualDate===null||expectedDate===null)return null;return operator==='gte'?actualDate>=expectedDate:actualDate<=expectedDate}
  const actualTime=timeNumber(actual),expectedTime=timeNumber(expected);
  if(actualTime!==null||expectedTime!==null){if(actualTime===null||expectedTime===null)return null;return operator==='gte'?actualTime>=expectedTime:actualTime<=expectedTime}
  const a=comparableNumber(actual,factUnit,conditionUnit),e=comparableNumber(expected,conditionUnit,conditionUnit);if(a===null||e===null)return null;return operator==='gte'?a>=e:a<=e;
}

export function evaluateCondition(condition={},facts={}){
  const key=conditionKey(condition),fact=facts[key];
  if(!fact||fact.state==='unknown')return{state:'unknown',evidence:fact||{state:'unknown'}};
  if(fact.state==='unsupported')return{state:'unsupported',evidence:fact};
  if(fact.state!=='known')return{state:'unknown',evidence:fact};
  const actual=fact.value;let pass=false;
  switch(condition.operator){
    case'eq':pass=primitiveEqual(actual,condition.value);break;
    case'neq':pass=!primitiveEqual(actual,condition.value);break;
    case'in':{const actualValues=asArray(actual),expected=asArray(condition.value);pass=actualValues.some(a=>expected.some(e=>primitiveEqual(a,e)));break;}
    case'not_in':{const actualValues=asArray(actual),expected=asArray(condition.value);pass=!actualValues.some(a=>expected.some(e=>primitiveEqual(a,e)));break;}
    case'contains':pass=asArray(actual).some(a=>primitiveEqual(a,condition.value));break;
    case'contains_all':pass=asArray(condition.value).every(e=>asArray(actual).some(a=>primitiveEqual(a,e)));break;
    case'is_true':pass=actual===true;break;
    case'is_false':pass=actual===false;break;
    case'contains_text':pass=containsText(actual,condition.value);break;
    case'not_contains_text':pass=!containsText(actual,condition.value);break;
    case'gte':case'lte':{const result=compareOrdered(actual,condition.value,condition.operator,fact.meta?.unit,condition.unit);if(result===null)return{state:'unknown',evidence:{...fact,reason:'incomparable_value'}};pass=result;break;}
    case'between':{
      const bounds=Array.isArray(condition.value)?condition.value:[];if(bounds.length!==2)return{state:'unknown',evidence:{...fact,reason:'invalid_range'}};
      const actualTime=timeNumber(actual),lowTime=timeNumber(bounds[0]),highTime=timeNumber(bounds[1]);
      if(actualTime!==null||lowTime!==null||highTime!==null){if([actualTime,lowTime,highTime].some(v=>v===null))return{state:'unknown',evidence:{...fact,reason:'invalid_time_range'}};pass=actualTime>=lowTime&&actualTime<=highTime;break;}
      const actualDate=isoDateNumber(actual),lowDate=isoDateNumber(bounds[0]),highDate=isoDateNumber(bounds[1]);
      if(actualDate!==null||lowDate!==null||highDate!==null){if([actualDate,lowDate,highDate].some(v=>v===null))return{state:'unknown',evidence:{...fact,reason:'invalid_date_range'}};pass=actualDate>=lowDate&&actualDate<=highDate;break;}
      const a=comparableNumber(actual,fact.meta?.unit,condition.unit),low=comparableNumber(bounds[0],condition.unit,condition.unit),high=comparableNumber(bounds[1],condition.unit,condition.unit);if([a,low,high].some(v=>v===null))return{state:'unknown',evidence:{...fact,reason:'incomparable_unit'}};pass=a>=low&&a<=high;break;
    }
    default:return{state:'unknown',evidence:{...fact,reason:'unsupported_operator'}};
  }
  return{state:pass?'pass':'fail',evidence:fact};
}

function evaluateCollection(conditions=[],facts={}){
  const outcomes=conditions.map((condition)=>({condition,...evaluateCondition(condition,facts)})),required=outcomes.filter(o=>o.condition.role==='required'),preferred=outcomes.filter(o=>o.condition.role!=='required');
  const idOf=(o)=>o.condition.id||conditionKey(o.condition);
  const failedRequired=required.filter(o=>o.state==='fail').map(idOf),unknownRequired=required.filter(o=>o.state==='unknown').map(idOf),unsupportedRequired=required.filter(o=>o.state==='unsupported').map(idOf),requiredPassed=required.filter(o=>o.state==='pass').length,preferredPassed=preferred.filter(o=>o.state==='pass').length,totalWeight=required.length*2+preferred.length,passedWeight=requiredPassed*2+preferredPassed,score=totalWeight===0?50:Math.round((passedWeight/totalWeight)*100);
  return{requiredMatch:failedRequired.length===0&&unknownRequired.length===0&&unsupportedRequired.length===0,requiredPassed,preferredPassed,failedRequired,unknownRequired,unsupportedRequired,score,outcomes};
}
export function evaluateGenericConditions(conditions=[],facts={}){return evaluateCollection(conditions,facts)}
export function evaluateDomainConditions(conditions=[],facts={}){return evaluateCollection(conditions,facts)}
