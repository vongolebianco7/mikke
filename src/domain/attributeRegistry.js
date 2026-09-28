const REGISTRY = {
  brand:{label:'ブランド',type:'text',operators:['eq','in','contains_text'],aliases:['メーカー','ブランド名']},
  manufacturer:{label:'メーカー',type:'text',operators:['eq','in','contains_text'],aliases:['製造元']},
  model:{label:'型番・モデル',type:'text',operators:['eq','contains_text'],aliases:['型番','モデル名','シリーズ']},
  color:{label:'色',type:'enum',operators:['eq','in','not_in'],aliases:['カラー','色味']},
  size:{label:'サイズ',type:'text',operators:['eq','in'],aliases:['寸法サイズ']},
  width:{label:'幅',type:'number',unit:'mm',operators:['lte','gte','between'],aliases:['横幅','本体幅']},
  height:{label:'高さ',type:'number',unit:'mm',operators:['lte','gte','between'],aliases:['本体高']},
  depth:{label:'奥行',type:'number',unit:'mm',operators:['lte','gte','between'],aliases:['奥行き']},
  weight:{label:'重量',type:'number',unit:'kg',operators:['lte','gte','between'],aliases:['重さ']},
  capacity:{label:'容量',type:'number',unit:'L',operators:['lte','gte','between'],aliases:['総容量']},
  quantity:{label:'数量',type:'number',operators:['lte','gte','between','eq'],aliases:['個数','入り数']},
  condition:{label:'商品状態',type:'enum',operators:['eq','in','not_in'],aliases:['状態']},
  material:{label:'素材',type:'text',operators:['eq','in','contains_text'],aliases:['材質']},
  release_year:{label:'発売年',type:'number',operators:['lte','gte','between','eq'],aliases:['発売年度']},
  origin_country:{label:'原産国',type:'text',operators:['eq','in'],aliases:['原産地']},
  warranty:{label:'保証',type:'text',operators:['eq','contains_text'],aliases:['保証期間']},
  seller:{label:'販売店',type:'text',operators:['eq','in','contains_text'],aliases:['ショップ','店舗']},
  mileage:{label:'走行距離',type:'number',unit:'km',operators:['lte','gte','between'],aliases:['走行km','走行キロ']},
  repair_history:{label:'修復歴',type:'boolean',operators:['is_true','is_false'],aliases:['事故歴']},
  freezer_capacity:{label:'冷凍室容量',type:'number',unit:'L',operators:['lte','gte','between'],aliases:['冷凍庫容量']},
  allergens:{label:'アレルゲン',type:'list',operators:['contains','contains_all','not_in'],aliases:['アレルギー']},
  total_capacity:{label:'総容量',type:'number',unit:'L',operators:['lte','gte','between'],aliases:['定格内容積']},
  installation_width:{label:'設置幅',type:'number',unit:'mm',operators:['lte','gte','between'],aliases:['必要設置幅']},
  energy_consumption:{label:'年間消費電力量',type:'number',unit:'kWh',operators:['lte','gte'],aliases:['消費電力']},
  seat_count:{label:'人数',type:'number',operators:['lte','gte','eq'],aliases:['座席数','何人用']},
  load_capacity:{label:'耐荷重',type:'number',unit:'kg',operators:['lte','gte'],aliases:['耐荷重']},
  assembly_required:{label:'組立',type:'boolean',operators:['is_true','is_false'],aliases:['組立必要']},
  expiration_date:{label:'賞味期限',type:'date',operators:['gte','lte'],aliases:['消費期限']},
  storage_method:{label:'保存方法',type:'enum',operators:['eq','in'],aliases:['保存']},
  model_year:{label:'年式',type:'number',operators:['lte','gte','between','eq'],aliases:['登録年','初度登録年']},
  trim:{label:'グレード',type:'text',operators:['eq','in','contains_text'],aliases:['グレード']},
  fuel_type:{label:'燃料',type:'enum',operators:['eq','in'],aliases:['燃料種別']},
  drivetrain:{label:'駆動方式',type:'enum',operators:['eq','in'],aliases:['駆動']},
};

export function getAttributeDefinition(attributeId){
  const def=REGISTRY[attributeId];
  return def?{attributeId,...def}:null;
}

export function listAttributeDefinitions(){
  return Object.entries(REGISTRY).map(([attributeId,def])=>({attributeId,...def}));
}
