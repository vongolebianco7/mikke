const LABELS={unsupported:'このデータ元では判定不可',unknown:'未確認'};
const COMPATIBILITY_LABELS={
  compatible:'対応確認済み',
  incompatible:'非対応',
  unknown:'適合未確認',
  unsupported:'このデータ元では適合判定不可',
};

export function compatibilityEvidenceLabel(state){
  return COMPATIBILITY_LABELS[state]||'適合状態不明';
}

export function summarizeEvidenceState(evaluation={}){
  return (evaluation.outcomes||[])
    .map((outcome)=>{
      const evidenceState=outcome?.evidence?.state;
      const status=outcome?.state==='unsupported'||evidenceState==='unsupported'
        ?'unsupported'
        :outcome?.state==='unknown'||evidenceState==='unknown'
          ?'unknown'
          :null;
      if(!status)return null;
      return {
        fieldId:outcome?.condition?.fieldId||outcome?.condition?.attributeId||outcome?.condition?.id||'',
        role:outcome?.condition?.role||'preferred',
        status,
        label:LABELS[status],
      };
    })
    .filter(Boolean);
}

export function resultStatusLabel(evaluation={}){
  if(evaluation.requiredMatch)return '条件に一致';
  const evidence=summarizeEvidenceState(evaluation);
  if(evidence.some((item)=>item.role==='required'&&item.status==='unsupported'))return '必須条件を判定できません';
  if(evidence.some((item)=>item.role==='required'&&item.status==='unknown'))return '必須条件を未確認';
  if(evaluation.nearMatch)return '条件まであと少し';
  return '条件に未一致';
}
