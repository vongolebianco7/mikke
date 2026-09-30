const ROLES=new Set(['required','preferred','notification','comparison']);
const STATES=new Set(['compatible','incompatible','unknown','unsupported']);
const RELATIONS=new Set(['compatible_with','fits','supports','within_limits']);

export function normalizeCompatibilityCondition(condition={}){
  return {
    id:condition.id,
    relation:RELATIONS.has(condition.relation)?condition.relation:'compatible_with',
    subjectType:condition.subjectType,
    target:condition.target&&typeof condition.target==='object'&&!Array.isArray(condition.target)?structuredClone(condition.target):{},
    role:ROLES.has(condition.role)?condition.role:'required',
    evidencePolicy:condition.evidencePolicy||'known_required',
  };
}

export function normalizeCompatibilityEvidence(evidence={}){
  return {
    state:STATES.has(evidence.state)?evidence.state:'unknown',
    source:evidence.source,
    reason:evidence.reason,
    details:evidence.details&&typeof evidence.details==='object'&&!Array.isArray(evidence.details)?structuredClone(evidence.details):undefined,
  };
}

export function evaluateCompatibilityCondition(condition={},evidence={}){
  const normalized=normalizeCompatibilityEvidence(evidence);
  return {state:normalized.state,evidence:normalized,condition:normalizeCompatibilityCondition(condition)};
}

export function evaluateCompatibilityConditions(conditions=[],evidenceById={}){
  const outcomes=conditions.map((raw)=>{
    const condition=normalizeCompatibilityCondition(raw);
    const id=condition.id;
    return evaluateCompatibilityCondition(condition,id?evidenceById[id]:undefined);
  });
  const idOf=(o)=>o.condition.id;
  const required=outcomes.filter(o=>o.condition.role==='required');
  const preferred=outcomes.filter(o=>o.condition.role==='preferred');
  const comparison=outcomes.filter(o=>o.condition.role==='comparison');
  const notification=outcomes.filter(o=>o.condition.role==='notification');
  const incompatibleRequired=required.filter(o=>o.state==='incompatible').map(idOf);
  const unknownRequired=required.filter(o=>o.state==='unknown').map(idOf);
  const unsupportedRequired=required.filter(o=>o.state==='unsupported').map(idOf);
  return {
    requiredMatch:incompatibleRequired.length===0&&unknownRequired.length===0&&unsupportedRequired.length===0,
    requiredCompatible:required.filter(o=>o.state==='compatible').length,
    preferredCompatible:preferred.filter(o=>o.state==='compatible').length,
    comparisonCompatible:comparison.filter(o=>o.state==='compatible').length,
    notificationCompatible:notification.filter(o=>o.state==='compatible').length,
    incompatibleRequired,
    unknownRequired,
    unsupportedRequired,
    outcomes,
  };
}
