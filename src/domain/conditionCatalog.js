const COMMON = [
  { attributeId:'price', label:'価格', valueType:'money', operators:['eq','gte','lte','range','relative_change','rank'], unit:'JPY', keywords:['値段','予算','安い','最安'] },
  { attributeId:'condition', label:'商品の状態', valueType:'enum', operators:['eq','neq','one_of'], values:['new','display','open_box','used'], keywords:['新品','展示品','開封品','中古'] },
  { attributeId:'color', label:'色', valueType:'enum_or_text', operators:['eq','neq','one_of','contains','not_contains'], keywords:['カラー','色','グレー','白','黒'] },
  { attributeId:'availability', label:'在庫・空き', valueType:'state', operators:['eq','changed_to'], keywords:['在庫','再入荷','空き'] },
  { attributeId:'title', label:'商品名・名称', valueType:'text', operators:['eq','neq','contains','not_contains'], keywords:['商品名','型番','シリーズ','除外'] },
  { attributeId:'compatibility', label:'互換性・適合', valueType:'compatibility', operators:['compatible_with'], keywords:['対応','互換','適合','取り付け'] },
  { attributeId:'priority', label:'比較優先', valueType:'rank', operators:['rank'], keywords:['優先','重視','なるべく'] },
  { attributeId:'booleanFlag', label:'有無', valueType:'boolean', operators:['boolean'], keywords:['あり','なし'] },
];

const DOMAIN = {
  appliance: [
    ['totalCapacity','容量','measurement',['gte','lte','range'],'L',['冷蔵庫','容量']],
    ['installationWidth','設置幅','measurement',['gte','lte','range'],'mm',['設置幅','幅']],
    ['bodyWidth','本体幅','measurement',['gte','lte','range'],'mm',['本体幅']],
    ['depth','奥行','measurement',['gte','lte','range'],'mm',['奥行']],
    ['height','高さ','measurement',['gte','lte','range'],'mm',['高さ']],
    ['doorOrientation','ドア方向','enum',['eq','neq','one_of'],null,['右開き','左開き','観音開き']],
    ['freezerCapacity','冷凍室容量','measurement',['gte','lte','range'],'L',['冷凍室']],
    ['energyUse','消費電力量','number',['gte','lte','rank'],'kWh',['省エネ','消費電力']],
    ['releaseYear','発売年','integer',['gte','lte','range'],null,['発売年','年式']],
  ],
  sports: [
    ['size','サイズ','text',['eq','neq','one_of'],null,['サイズ','cm']],
    ['width','足幅・ワイズ','enum_or_text',['eq','one_of'],null,['ワイズ','足幅','2E','4E']],
    ['terrain','用途・路面','enum',['eq','one_of'],null,['ロード','トレイル','芝']],
    ['cushioning','クッション性','enum',['eq','rank'],null,['クッション','柔らか']],
    ['stability','安定性','enum',['eq','rank'],null,['安定','サポート']],
    ['model','モデル・シリーズ','text',['eq','one_of','contains'],null,['モデル','シリーズ']],
    ['weight','重量','measurement',['gte','lte','range','rank'],'g',['軽量','重量']],
  ],
  used_car: [
    ['model','車種','text',['eq','one_of','contains'],null,['車種','モデル']],
    ['grade','グレード','text',['eq','one_of'],null,['グレード']],
    ['modelYear','年式','integer',['gte','lte','range'],null,['年式']],
    ['mileage','走行距離','measurement',['gte','lte','range','rank'],'km',['走行距離','万km']],
    ['repairHistory','修復歴','boolean',['boolean'],null,['修復歴','事故歴']],
    ['drivetrain','駆動方式','enum',['eq','one_of'],null,['4WD','AWD','FF']],
    ['totalPrice','支払総額','money',['gte','lte','range','rank'],'JPY',['総額','乗り出し']],
    ['region','地域','location',['eq','one_of'],null,['地域','県','近く']],
    ['warranty','保証','boolean',['boolean'],null,['保証']],
  ],
  baby: [
    ['size','サイズ','text',['eq','one_of'],null,['70cm','80cm','サイズ']],
    ['ageRange','対象年齢','range',['range','gte','lte'],null,['新生児','ヶ月','歳']],
    ['weightRange','対象体重','range',['range','gte','lte'],'kg',['体重','kg']],
    ['standard','安全基準','enum_or_text',['eq','one_of'],null,['R129','ECE']],
    ['isofix','ISOFIX','boolean',['boolean'],null,['ISOFIX']],
    ['rotation','回転式','boolean',['boolean'],null,['回転式']],
  ],
  furniture: [
    ['width','幅','measurement',['gte','lte','range'],'mm',['幅']],
    ['depth','奥行','measurement',['gte','lte','range'],'mm',['奥行']],
    ['height','高さ','measurement',['gte','lte','range'],'mm',['高さ']],
    ['material','素材','enum_or_text',['eq','neq','one_of'],null,['木','金属','樹脂','素材']],
    ['loadCapacity','耐荷重','measurement',['gte','lte','range'],'kg',['耐荷重']],
    ['assemblyRequired','組立','boolean',['boolean'],null,['組立']],
    ['wallFixing','壁固定','boolean',['boolean'],null,['壁固定','ビス']],
  ],
  electronics: [
    ['storageCapacity','ストレージ容量','measurement',['gte','lte','range'],'GB',['256GB','512GB','容量']],
    ['memory','メモリ','measurement',['gte','lte','range'],'GB',['RAM','メモリ']],
    ['screenSize','画面サイズ','measurement',['gte','lte','range'],'inch',['インチ','画面']],
    ['weight','重量','measurement',['gte','lte','range','rank'],'g',['軽い','重量']],
    ['simFree','SIMフリー','boolean',['boolean'],null,['SIMフリー']],
    ['charging','充電方式','enum_or_text',['eq','one_of'],null,['USB-C','充電']],
  ],
  beauty: [
    ['fragranceFree','無香料','boolean',['boolean'],null,['無香料','香りなし']],
    ['alcoholFree','アルコールフリー','boolean',['boolean'],null,['アルコールフリー']],
    ['skinType','肌タイプ','enum_or_text',['eq','one_of'],null,['敏感肌','乾燥肌','脂性肌']],
    ['ingredient','成分','text',['contains','not_contains','one_of'],null,['成分','不使用']],
  ],
  pet: [
    ['animalType','対象動物','enum_or_text',['eq','one_of'],null,['犬','猫','小型犬']],
    ['proteinSource','たんぱく源','enum_or_text',['eq','neq','one_of','not_contains'],null,['チキン','魚','ラム']],
    ['fatLevel','脂質','enum_or_number',['gte','lte','rank'],null,['低脂肪','脂質']],
    ['packageWeight','内容量','measurement',['gte','lte','range'],'g',['kg','内容量']],
  ],
  flight: [
    ['origin','出発地','location',['eq','one_of'],null,['出発','発']],
    ['destination','目的地','location',['eq','one_of'],null,['行き先','目的地']],
    ['departureDate','出発日','date',['eq','range'],null,['出発日']],
    ['returnDate','帰国・復路日','date',['eq','range'],null,['帰り','復路']],
    ['tripPattern','旅程','enum',['eq'],null,['往復','片道','複数都市']],
    ['travelers','人数','integer',['eq','gte','lte'],null,['大人','子ども','人数']],
    ['cabin','座席クラス','enum',['eq','one_of'],null,['エコノミー','ビジネス']],
    ['stops','乗継回数','integer',['eq','lte'],null,['直行','乗り換え']],
    ['airline','航空会社','enum_or_text',['eq','one_of','neq'],null,['ANA','JAL','ZIPAIR']],
  ],
  hotel: [
    ['destination','宿泊地','location',['eq','one_of'],null,['場所','エリア']],
    ['checkIn','チェックイン','date',['eq','range'],null,['チェックイン']],
    ['checkOut','チェックアウト','date',['eq','range'],null,['チェックアウト']],
    ['adults','大人人数','integer',['eq','gte','lte'],null,['大人']],
    ['rooms','部屋数','integer',['eq','gte','lte'],null,['部屋']],
    ['breakfastIncluded','朝食付き','boolean',['boolean'],null,['朝食']],
    ['freeCancellation','キャンセル無料','boolean',['boolean'],null,['キャンセル無料']],
    ['maxWalkingMinutes','徒歩時間','duration',['lte','range','rank'],'min',['徒歩','駅から']],
    ['facility','設備','enum_or_text',['eq','one_of','contains'],null,['大浴場','プール','ベビーベッド']],
  ],
};

const CATEGORY_RECOMMENDATIONS = {
  refrigerator:['totalCapacity','installationWidth','bodyWidth','height','depth','doorOrientation','freezerCapacity','color','energyUse','releaseYear','condition','price'],
  running_shoes:['size','width','terrain','cushioning','stability','color','model','condition','price'],
  used_car:['model','grade','modelYear','mileage','repairHistory','color','drivetrain','totalPrice','region','warranty'],
};

function normalize(domain, row) {
  if (!Array.isArray(row)) return { ...row, domain };
  const [attributeId,label,valueType,operators,unit,keywords] = row;
  return { attributeId,label,valueType,operators, ...(unit ? { unit } : {}), keywords:keywords || [], domain };
}

function allForDomain(domain) {
  const specific = (DOMAIN[domain] || []).map((row) => normalize(domain,row));
  return [...COMMON.map((item) => ({ ...item, domain:'common' })), ...specific];
}

export function getConditionDefinition(domain, attributeId) {
  return allForDomain(domain).find((item) => item.attributeId === attributeId);
}

export function searchConditionDefinitions(domain, query = '') {
  const needle = String(query).trim().toLowerCase();
  const domains = domain === 'shopping'
    ? Object.keys(DOMAIN).filter((key) => !['flight','hotel'].includes(key))
    : [domain];
  const map = new Map();
  for (const key of domains) for (const item of allForDomain(key)) map.set(`${item.domain}:${item.attributeId}`, item);
  const items = [...map.values()];
  if (!needle) return items;
  return items.filter((item) => [item.label,item.attributeId,...(item.keywords || [])].some((value) => String(value).toLowerCase().includes(needle)));
}

export function recommendedConditions({ domain, categoryId, targetText = '' } = {}) {
  const recommendationKey = CATEGORY_RECOMMENDATIONS[categoryId]
    ? categoryId
    : /冷蔵庫/.test(targetText) ? 'refrigerator'
      : /ランニング|シューズ/.test(targetText) ? 'running_shoes'
        : domain === 'used_car' ? 'used_car' : null;
  const ids = recommendationKey ? CATEGORY_RECOMMENDATIONS[recommendationKey] : allForDomain(domain).slice(0, 10).map((item) => item.attributeId);
  return ids.map((id) => getConditionDefinition(domain, id) || getConditionDefinition('appliance', id) || getConditionDefinition('sports', id) || getConditionDefinition('used_car', id)).filter(Boolean);
}
