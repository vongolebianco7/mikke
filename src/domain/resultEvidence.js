const LABELS={unsupported:'このデータ元では判定不可',unknown:'未確認'};

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
