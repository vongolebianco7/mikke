const SEMANTICS={
  electronics:{
    audio:[
      {conceptId:'device',label:'対応機種',relation:'compatible_with',targetType:'device'},
      {conceptId:'os',label:'対応OS',relation:'supports',targetType:'os'},
      {conceptId:'connector',label:'対応端子',relation:'supports',targetType:'connector'},
    ],
    default:[
      {conceptId:'device',label:'対応機種',relation:'compatible_with',targetType:'device'},
      {conceptId:'os',label:'対応OS',relation:'supports',targetType:'os'},
    ],
  },
  baby:{
    stroller:[
      {conceptId:'age_range',label:'対象月齢',relation:'within_limits',targetType:'age_range'},
      {conceptId:'weight_range',label:'対象体重',relation:'within_limits',targetType:'weight_range'},
    ],
    default:[
      {conceptId:'age_range',label:'対象月齢',relation:'within_limits',targetType:'age_range'},
      {conceptId:'weight_range',label:'対象体重',relation:'within_limits',targetType:'weight_range'},
    ],
  },
  used_car:{default:[
    {conceptId:'vehicle_model',label:'車種適合',relation:'compatible_with',targetType:'vehicle'},
    {conceptId:'model_year',label:'年式適合',relation:'within_limits',targetType:'model_year'},
    {conceptId:'vehicle_code',label:'型式適合',relation:'compatible_with',targetType:'vehicle_code'},
  ]},
  appliance:{
    refrigerator:[{conceptId:'installation_space',label:'設置スペース',relation:'fits',targetType:'installation_space'}],
    default:[{conceptId:'installation_space',label:'設置スペース',relation:'fits',targetType:'installation_space'}],
  },
  furniture:{default:[{conceptId:'installation_space',label:'設置スペース',relation:'fits',targetType:'installation_space'}]},
};

export function getCompatibilitySemantics(domain,subcategoryId){
  const group=SEMANTICS[domain];
  if(!group)return [];
  return structuredClone((subcategoryId&&group[subcategoryId])||group.default||[]);
}
