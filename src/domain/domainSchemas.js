const field=(id,label,type,operators,level='common',group='general',priority='medium',extra={})=>({
  id,label,type,operators,level,group,priority,supportsRequired:true,supportsPreferred:true,...extra,
});

const TRIGGERS={
  price:{id:'price',label:'価格'}, availability:{id:'availability',label:'在庫・空席'}, price_drop:{id:'price_drop',label:'値下がり'},
  watch_low:{id:'watch_low',label:'登録後最安'}, new_listing:{id:'new_listing',label:'新着'}, release:{id:'release',label:'発売'},
  preorder:{id:'preorder',label:'予約開始'}, shipping:{id:'shipping',label:'送料'}, coupon:{id:'coupon',label:'クーポン'},
  delivery:{id:'delivery',label:'配送'}, condition_match:{id:'condition_match',label:'条件一致'}, award_availability:{id:'award_availability',label:'特典空席'},
};

const flightFields=[
  field('origin','出発地','location',['eq','in'],'basic','route','high'),
  field('destination','目的地','location',['eq','in'],'basic','route','high'),
  field('departureAirports','出発空港','list',['in','not_in','contains'],'common','route','high'),
  field('arrivalAirports','到着空港','list',['in','not_in','contains'],'common','route','high'),
  field('tripType','片道・往復','enum',['eq'],'basic','journey','high',{allowedValues:['one_way','round_trip','multi_city']}),
  field('outboundDate','出発日','date',['eq','gte','lte','between'],'basic','journey','high'),
  field('returnDate','帰国日','date',['eq','gte','lte','between'],'basic','journey','high'),
  field('dateFlexibility','日付の幅','duration',['lte'],'common','journey','medium',{unit:'day'}),
  field('adults','大人','integer',['eq','gte'],'basic','passengers','high'),
  field('children','子ども','integer',['eq','gte'],'basic','passengers','high'),
  field('infants','乳児','integer',['eq','gte'],'basic','passengers','medium'),
  field('nonstopOnly','直行便のみ','boolean',['is_true','is_false'],'common','schedule','high'),
  field('maxStops','乗り換え回数','integer',['eq','lte'],'common','schedule','high'),
  field('maxTotalDuration','総所要時間','duration',['lte'],'detailed','schedule','medium',{unit:'min'}),
  field('minConnectionDuration','最短乗継時間','duration',['gte'],'detailed','schedule','low',{unit:'min'}),
  field('maxConnectionDuration','最長乗継時間','duration',['lte'],'detailed','schedule','medium',{unit:'min'}),
  field('departureTimeRange','出発時間帯','time_range',['between'],'common','schedule','high'),
  field('arrivalTimeRange','到着時間帯','time_range',['between'],'common','schedule','medium'),
  field('overnightConnectionAllowed','夜間乗継','boolean',['is_true','is_false'],'detailed','schedule','low'),
  field('airportChangeAllowed','空港移動','boolean',['is_true','is_false'],'detailed','schedule','medium'),
  field('sameTicketConnectionRequired','同一航空券の乗継','boolean',['is_true','is_false'],'detailed','schedule','medium'),
  field('preferredAirlines','希望航空会社','list',['in','contains'],'common','airline','medium'),
  field('allowedAirlines','航空会社','list',['in','contains_all'],'common','airline','high'),
  field('excludedAirlines','除外航空会社','list',['not_in'],'common','airline','medium'),
  field('alliance','アライアンス','enum',['eq','in'],'advanced','airline','low'),
  field('lccAllowed','LCC','boolean',['is_true','is_false'],'common','airline','medium'),
  field('cabinClass','座席クラス','enum',['eq','in'],'common','fare','high'),
  field('fareClass','運賃種別','text',['eq','contains_text'],'detailed','fare','low'),
  field('checkedBaggageIncluded','受託手荷物込み','boolean',['is_true','is_false'],'detailed','fare','medium'),
  field('carryOnIncluded','機内持込手荷物込み','boolean',['is_true','is_false'],'detailed','fare','low'),
  field('seatSelectionIncluded','座席指定込み','boolean',['is_true','is_false'],'detailed','fare','low'),
  field('refundable','払い戻し可','boolean',['is_true','is_false'],'detailed','fare','medium'),
  field('changeable','変更可','boolean',['is_true','is_false'],'detailed','fare','medium'),
  field('paymentType','支払方法','enum',['eq','in'],'advanced','award','medium',{allowedValues:['cash','miles','either']}),
  field('maxMiles','必要マイル上限','number',['lte'],'advanced','award','high',{unit:'mile'}),
  field('maxTaxesAndFees','税・諸費用上限','money',['lte'],'advanced','award','high',{unit:'JPY'}),
  field('maxFuelSurcharge','燃油サーチャージ上限','money',['lte'],'advanced','award','medium',{unit:'JPY'}),
  field('price','総額','money',['lte','gte','between'],'basic','price','high',{unit:'JPY'}),
];

const hotelFields=[
  field('destination','宿泊地','location',['eq','in'],'basic','stay','high'), field('area','エリア','location',['eq','in'],'basic','stay','high'),
  field('checkIn','チェックイン','date',['eq','gte','lte'],'basic','stay','high'), field('checkOut','チェックアウト','date',['eq','gte','lte'],'basic','stay','high'),
  field('rooms','部屋数','integer',['eq','gte'],'basic','stay','high'), field('adults','大人','integer',['eq','gte'],'basic','stay','high'),
  field('children','子ども','integer',['eq','gte'],'basic','stay','high'), field('infants','乳児','integer',['eq','gte'],'basic','stay','medium'),
  field('station','最寄駅','text',['eq','contains_text'],'common','location','medium'), field('maxWalkingMinutes','駅から徒歩','duration',['lte'],'common','location','high',{unit:'min'}),
  field('maxDistanceFromPoint','目的地からの距離','measurement',['lte'],'detailed','location','medium',{unit:'m'}), field('neighborhood','地区','text',['eq','in'],'common','location','medium'),
  field('airportAccess','空港アクセス','text',['eq','contains_text'],'detailed','location','low'), field('shuttleAvailable','送迎','boolean',['is_true','is_false'],'detailed','location','low'),
  field('roomType','部屋タイプ','enum',['eq','in'],'common','room','high'), field('bedType','ベッド','enum',['eq','in'],'common','room','medium'),
  field('minRoomArea','部屋面積','measurement',['gte'],'detailed','room','medium',{unit:'m2'}), field('nonsmoking','禁煙','boolean',['is_true','is_false'],'common','room','high'),
  field('viewType','眺望','enum',['eq','in'],'detailed','room','low'), field('bathroomType','バス・トイレ','enum',['eq','in'],'detailed','room','low'),
  field('connectingRoomAvailable','コネクティングルーム','boolean',['is_true','is_false'],'advanced','room','low'),
  field('breakfastIncluded','朝食付き','boolean',['is_true','is_false'],'common','meal','high'), field('dinnerIncluded','夕食付き','boolean',['is_true','is_false'],'common','meal','medium'),
  field('mealPlan','食事プラン','enum',['eq','in'],'detailed','meal','medium'), field('childrenMealAvailable','子ども食','boolean',['is_true','is_false'],'advanced','meal','low'),
  field('publicBath','大浴場','boolean',['is_true','is_false'],'detailed','facility','medium'), field('onsen','温泉','boolean',['is_true','is_false'],'detailed','facility','medium'),
  field('pool','プール','boolean',['is_true','is_false'],'detailed','facility','low'), field('parking','駐車場','boolean',['is_true','is_false'],'detailed','facility','medium'),
  field('laundry','ランドリー','boolean',['is_true','is_false'],'detailed','facility','low'), field('kitchen','キッチン','boolean',['is_true','is_false'],'advanced','facility','low'),
  field('babyBed','ベビーベッド','boolean',['is_true','is_false'],'advanced','facility','low'), field('barrierFree','バリアフリー','boolean',['is_true','is_false'],'advanced','facility','low'),
  field('freeCancellation','キャンセル無料','boolean',['is_true','is_false'],'common','policy','high'), field('cancellationDeadline','キャンセル期限','date',['gte','lte'],'detailed','policy','medium'),
  field('payAtProperty','現地払い','boolean',['is_true','is_false'],'detailed','policy','medium'), field('prepaymentRequired','事前決済','boolean',['is_true','is_false'],'detailed','policy','low'),
  field('rating','評価','number',['gte','lte'],'common','quality','high'), field('reviewCount','レビュー件数','integer',['gte','lte'],'detailed','quality','medium'),
  field('brand','ホテルブランド','text',['eq','in'],'advanced','identity','low'), field('price','料金','money',['lte','gte','between'],'basic','price','high',{unit:'JPY'}),
];

const commonProductFields=[
  field('brand','ブランド','text',['eq','in','contains_text'],'basic','identity','high'), field('model','モデル','text',['eq','contains_text'],'basic','identity','high'),
  field('color','色','enum',['eq','in','not_in'],'common','design','medium'), field('condition','状態','enum',['eq','in','not_in'],'common','purchase','high'),
  field('price','価格','money',['lte','gte','between'],'basic','price','high',{unit:'JPY'}), field('seller','販売店','text',['eq','in','contains_text'],'advanced','purchase','low'),
];

const fashionFields=[...commonProductFields,
  field('productType','商品種別','enum',['eq','in'],'basic','identity','high'), field('modelNumber','型番','text',['eq','contains_text'],'common','identity','high'), field('collection','コレクション','text',['eq'],'advanced','identity','low'), field('gender','性別','enum',['eq','in'],'common','identity','medium'),
  field('size','サイズ','text',['eq','in'],'basic','size','high'), field('sizeSystem','サイズ表記','enum',['eq'],'common','size','medium'), field('fit','フィット','enum',['eq','in'],'common','size','medium'), field('width','身幅','measurement',['lte','gte','between'],'detailed','size','low',{unit:'cm'}),
  field('chestWidth','胸幅','measurement',['lte','gte','between'],'detailed','size','low',{unit:'cm'}), field('length','着丈','measurement',['lte','gte','between'],'detailed','size','low',{unit:'cm'}), field('sleeveLength','袖丈','measurement',['lte','gte','between'],'detailed','size','low',{unit:'cm'}), field('waist','ウエスト','measurement',['lte','gte','between'],'detailed','size','low',{unit:'cm'}), field('inseam','股下','measurement',['lte','gte','between'],'detailed','size','low',{unit:'cm'}), field('shoeWidth','靴幅','enum',['eq','in'],'detailed','size','low'), field('heelHeight','ヒール高','measurement',['lte','gte'],'advanced','size','low',{unit:'cm'}),
  field('colorFamily','色系統','enum',['eq','in'],'common','design','medium'), field('pattern','柄','enum',['eq','in'],'detailed','design','low'), field('material','素材','text',['eq','in','contains_text'],'common','design','medium'), field('silhouette','シルエット','enum',['eq','in'],'detailed','design','low'), field('season','シーズン','enum',['eq','in'],'detailed','design','low'),
  field('usedGrade','中古ランク','enum',['eq','in'],'detailed','purchase','low'), field('authenticityVerified','真贋確認','boolean',['is_true','is_false'],'detailed','purchase','medium'), field('domesticOfficial','国内正規品','boolean',['is_true','is_false'],'detailed','purchase','medium'), field('parallelImportAllowed','並行輸入可','boolean',['is_true','is_false'],'advanced','purchase','low'), field('returnable','返品可','boolean',['is_true','is_false'],'common','purchase','medium'), field('sizeExchangeAllowed','サイズ交換可','boolean',['is_true','is_false'],'common','purchase','medium'), field('shippingDays','発送日数','duration',['lte'],'detailed','purchase','low',{unit:'day'}),
];

const applianceFields=[...commonProductFields,
  field('manufacturer','メーカー','text',['eq','in','contains_text'],'basic','identity','high'), field('modelNumber','型番','text',['eq','contains_text'],'basic','identity','high'), field('releaseYear','発売年','integer',['gte','lte','between'],'common','identity','medium'), field('warrantyYears','保証年数','number',['gte'],'detailed','purchase','medium',{unit:'year'}),
  field('width','幅','measurement',['lte','gte','between'],'common','installation','high',{unit:'mm'}), field('height','高さ','measurement',['lte','gte','between'],'common','installation','medium',{unit:'mm'}), field('depth','奥行','measurement',['lte','gte','between'],'common','installation','medium',{unit:'mm'}), field('weight','重量','measurement',['lte','gte'],'detailed','installation','low',{unit:'kg'}), field('installationWidth','設置幅','measurement',['lte'],'common','installation','high',{unit:'mm'}), field('installationDepth','設置奥行','measurement',['lte'],'detailed','installation','medium',{unit:'mm'}), field('requiredClearance','必要放熱スペース','measurement',['lte'],'advanced','installation','low',{unit:'mm'}),
  field('voltage','電圧','number',['eq'],'advanced','power','low',{unit:'V'}), field('powerConsumption','消費電力','number',['lte'],'detailed','power','medium',{unit:'W'}), field('annualEnergyConsumption','年間消費電力量','number',['lte'],'detailed','power','medium',{unit:'kWh'}), field('energyEfficiency','省エネ性能','number',['gte'],'detailed','power','medium'),
];
const refrigeratorFields=[
  field('totalCapacity','総容量','measurement',['gte','lte'],'basic','refrigerator','high',{unit:'L'}), field('freezerCapacity','冷凍室容量','measurement',['gte','lte'],'common','refrigerator','high',{unit:'L'}), field('doorCount','ドア数','integer',['eq','gte'],'common','refrigerator','medium'), field('doorStyle','ドアタイプ','enum',['eq','in'],'common','refrigerator','medium'), field('vegetableRoom','野菜室','boolean',['is_true','is_false'],'detailed','refrigerator','medium'),
];
const washerFields=[field('washerType','洗濯機タイプ','enum',['eq','in'],'basic','washer','high'),field('washCapacity','洗濯容量','measurement',['gte','lte'],'basic','washer','high',{unit:'kg'}),field('dryCapacity','乾燥容量','measurement',['gte','lte'],'common','washer','medium',{unit:'kg'}),field('dryFunction','乾燥方式','enum',['eq','in'],'common','washer','medium'),field('noiseLevel','運転音','number',['lte'],'detailed','washer','low',{unit:'dB'})];
const tvFields=[field('screenSize','画面サイズ','measurement',['gte','lte'],'basic','tv','high',{unit:'inch'}),field('panelType','パネル','enum',['eq','in'],'common','tv','medium'),field('resolution','解像度','enum',['eq','in'],'common','tv','medium'),field('refreshRate','リフレッシュレート','number',['gte'],'detailed','tv','low',{unit:'Hz'}),field('wallMountable','壁掛け','boolean',['is_true','is_false'],'detailed','tv','low')];
const airconFields=[field('roomSize','対応畳数','number',['gte','lte'],'basic','aircon','high',{unit:'tatami'}),field('coolingCapacity','冷房能力','number',['gte'],'common','aircon','medium',{unit:'kW'}),field('heatingCapacity','暖房能力','number',['gte'],'common','aircon','medium',{unit:'kW'}),field('outdoorUnitWidth','室外機幅','measurement',['lte'],'detailed','aircon','medium',{unit:'mm'})];

const furnitureFields=[...commonProductFields,
  field('productType','家具種別','enum',['eq','in'],'basic','identity','high'), field('series','シリーズ','text',['eq','contains_text'],'detailed','identity','low'), field('setCount','セット数','integer',['gte','lte'],'detailed','identity','low'),
  field('width','幅','measurement',['lte','gte','between'],'basic','dimension','high',{unit:'mm'}), field('height','高さ','measurement',['lte','gte','between'],'common','dimension','medium',{unit:'mm'}), field('depth','奥行','measurement',['lte','gte','between'],'basic','dimension','high',{unit:'mm'}), field('weight','重量','measurement',['lte','gte'],'detailed','dimension','low',{unit:'kg'}), field('loadCapacity','耐荷重','measurement',['gte'],'common','dimension','high',{unit:'kg'}), field('seatCount','座席数','integer',['gte','lte'],'common','dimension','medium'),
  field('material','素材','text',['eq','in','contains_text'],'common','design','medium'), field('finish','仕上げ','enum',['eq','in'],'advanced','design','low'), field('assemblyRequired','組立必要','boolean',['is_true','is_false'],'common','purchase','medium'), field('wallFixingRequired','壁固定必要','boolean',['is_true','is_false'],'detailed','installation','high'), field('casters','キャスター','boolean',['is_true','is_false'],'detailed','feature','low'), field('doors','扉','boolean',['is_true','is_false'],'detailed','feature','medium'), field('drawerCount','引き出し数','integer',['gte','lte'],'detailed','feature','low'),
  field('deliveryDays','配送日数','duration',['lte'],'detailed','purchase','medium',{unit:'day'}), field('roomOfChoiceDelivery','部屋設置配送','boolean',['is_true','is_false'],'advanced','purchase','low'),
];

const foodFields=[...commonProductFields,
  field('productType','食品種別','enum',['eq','in'],'basic','identity','high'), field('flavor','味・フレーバー','enum',['eq','in','not_in'],'common','identity','medium'),
  field('quantity','数量','number',['gte','lte','between'],'common','quantity','medium'), field('weight','重量','measurement',['gte','lte','between'],'basic','quantity','high',{unit:'g'}), field('volume','容量','measurement',['gte','lte'],'common','quantity','medium',{unit:'ml'}), field('unitCount','個数','integer',['gte','lte'],'common','quantity','medium'), field('packCount','パック数','integer',['gte','lte'],'detailed','quantity','low'),
  field('originCountry','原産国','enum',['eq','in','not_in'],'common','quality','medium'), field('productionArea','産地','text',['eq','in'],'detailed','quality','low'), field('allergens','アレルゲン','list',['in','not_in','contains'],'common','quality','high'), field('ingredientsExcluded','除外原材料','list',['not_in','contains'],'common','quality','high'), field('organic','オーガニック','boolean',['is_true','is_false'],'detailed','quality','low'), field('additiveFree','無添加','boolean',['is_true','is_false'],'detailed','quality','low'), field('saltFree','無塩','boolean',['is_true','is_false'],'common','quality','medium'), field('sugarFree','無糖','boolean',['is_true','is_false'],'common','quality','medium'), field('caffeineFree','カフェインレス','boolean',['is_true','is_false'],'detailed','quality','low'),
  field('expirationDate','賞味期限','date',['gte'],'detailed','storage','medium'), field('remainingShelfLifeDays','残存賞味期限','duration',['gte'],'advanced','storage','medium',{unit:'day'}), field('storageMethod','保存方法','enum',['eq','in'],'detailed','storage','low'),
];

const usedCarFields=[
  field('manufacturer','メーカー','text',['eq','in'],'basic','identity','high'), field('model','車種','text',['eq','in','contains_text'],'basic','identity','high'), field('grade','グレード','text',['eq','in'],'common','identity','medium'), field('modelYear','年式','integer',['gte','lte','between'],'basic','identity','high'), field('registrationYear','登録年','integer',['gte','lte'],'detailed','identity','low'), field('bodyType','ボディタイプ','enum',['eq','in'],'detailed','identity','low'),
  field('mileage','走行距離','measurement',['lte','gte','between'],'basic','history','high',{unit:'km'}), field('repairHistory','修復歴','boolean',['is_true','is_false'],'basic','history','high'), field('oneOwner','ワンオーナー','boolean',['is_true','is_false'],'detailed','history','low'), field('smokingHistory','喫煙歴','boolean',['is_true','is_false'],'advanced','history','low'), field('inspectionExpiry','車検期限','date',['gte'],'detailed','history','medium'),
  field('totalPrice','支払総額','money',['lte','gte','between'],'basic','price','high',{unit:'JPY'}), field('vehiclePrice','車両本体価格','money',['lte','gte','between'],'common','price','medium',{unit:'JPY'}),
  field('fuelType','燃料','enum',['eq','in'],'common','powertrain','high'), field('hybrid','ハイブリッド','boolean',['is_true','is_false'],'common','powertrain','high'), field('ev','EV','boolean',['is_true','is_false'],'common','powertrain','medium'), field('drivetrain','駆動方式','enum',['eq','in'],'common','powertrain','medium'), field('transmission','トランスミッション','enum',['eq','in'],'detailed','powertrain','low'), field('engineDisplacement','排気量','number',['gte','lte'],'advanced','powertrain','low',{unit:'cc'}),
  field('bodyColor','ボディ色','enum',['eq','in'],'common','design','medium'), field('interiorColor','内装色','enum',['eq','in'],'detailed','design','low'), field('seatMaterial','シート素材','text',['eq','contains_text'],'advanced','design','low'),
  ...['navigation','adaptiveCruise','parkingCamera','parkingSensors','sunroof','heatedSeats','powerSeats','safetyPackage','appleCarPlay','androidAuto'].map((id)=>field(id,id,'boolean',['is_true','is_false'],'detailed','equipment','low')),
  field('warranty','保証','boolean',['is_true','is_false'],'common','seller','medium'), field('warrantyMonths','保証月数','integer',['gte'],'detailed','seller','low'), field('dealer','販売店','text',['eq','in','contains_text'],'detailed','seller','low'), field('dealerDistance','販売店距離','measurement',['lte'],'advanced','seller','low',{unit:'km'}), field('deliveryAvailable','陸送可','boolean',['is_true','is_false'],'advanced','seller','low'),
];

const genericProductFields=[...commonProductFields,
  field('productType','商品種別','enum',['eq','in'],'basic','identity','high'),
  field('size','サイズ','text',['eq','in'],'common','spec','medium'),
  field('quantity','数量','number',['gte','lte','between','eq'],'common','spec','medium'),
  field('weight','重量','measurement',['lte','gte','between'],'common','spec','medium',{unit:'kg'}),
  field('material','素材','text',['eq','in','contains_text'],'detailed','spec','low'),
  field('warranty','保証','boolean',['is_true','is_false'],'detailed','purchase','medium'),
  field('releaseYear','発売年','integer',['gte','lte','between'],'detailed','identity','low'),
];

const SCHEMAS={
  flight:{domainId:'flight',displayName:'航空券',fields:flightFields,triggerIds:['price','price_drop','watch_low','availability','award_availability','condition_match']},
  hotel:{domainId:'hotel',displayName:'ホテル',fields:hotelFields,triggerIds:['price','price_drop','availability','condition_match']},
  fashion:{domainId:'fashion',displayName:'ファッション',fields:fashionFields,triggerIds:['price','availability','coupon','condition_match']},
  appliance:{domainId:'appliance',displayName:'家電',fields:applianceFields,subcategories:{refrigerator:refrigeratorFields,washer:washerFields,tv:tvFields,air_conditioner:airconFields},triggerIds:['price','availability','shipping','coupon','release','condition_match']},
  furniture:{domainId:'furniture',displayName:'家具',fields:furnitureFields,triggerIds:['price','availability','shipping','delivery','condition_match']},
  food:{domainId:'food',displayName:'食品',fields:foodFields,triggerIds:['price','shipping','coupon','availability','condition_match']},
  used_car:{domainId:'used_car',displayName:'中古車',fields:usedCarFields,triggerIds:['price','price_drop','new_listing','condition_match']},
  baby:{domainId:'baby',displayName:'ベビー・キッズ',fields:genericProductFields,triggerIds:['price','availability','shipping','coupon','condition_match']},
  sports:{domainId:'sports',displayName:'スポーツ・アウトドア',fields:genericProductFields,triggerIds:['price','availability','shipping','coupon','condition_match']},
  electronics:{domainId:'electronics',displayName:'PC・電子機器',fields:genericProductFields,triggerIds:['price','availability','shipping','coupon','release','condition_match']},
  daily_goods:{domainId:'daily_goods',displayName:'日用品',fields:genericProductFields,triggerIds:['price','availability','shipping','coupon','condition_match']},
  beauty:{domainId:'beauty',displayName:'美容・コスメ',fields:genericProductFields,triggerIds:['price','availability','shipping','coupon','release','condition_match']},
  pet:{domainId:'pet',displayName:'ペット用品',fields:genericProductFields,triggerIds:['price','availability','shipping','coupon','condition_match']},
  hobby:{domainId:'hobby',displayName:'ホビー・季節用品',fields:genericProductFields,triggerIds:['price','availability','shipping','coupon','release','condition_match']},
};

export function getDomainSchema(domainId){
  const normalized=domainId==='appliances'?'appliance':domainId;
  const schema=SCHEMAS[normalized];
  return schema?structuredClone(schema):null;
}

export function getDomainField(domainId,fieldId,subcategoryId){
  const schema=getDomainSchema(domainId);
  if(!schema)return null;
  const direct=[...schema.fields,...(subcategoryId?schema.subcategories?.[subcategoryId]||[]:[])].find((item)=>item.id===fieldId);
  if(direct)return direct;
  if(subcategoryId)return null;
  for(const fields of Object.values(schema.subcategories||{})){
    const match=fields.find((item)=>item.id===fieldId);
    if(match)return match;
  }
  return null;
}

export function listDomainFields(domainId,level,subcategoryId){
  const schema=getDomainSchema(domainId);
  if(!schema)return [];
  const items=[...schema.fields,...(subcategoryId?schema.subcategories?.[subcategoryId]||[]:[])];
  const rank={high:0,medium:1,low:2};
  return items.filter((item)=>!level||item.level===level).sort((a,b)=>(rank[a.priority]??9)-(rank[b.priority]??9));
}

export function inferWatchDomain(text=''){
  const raw=String(text);
  if(/航空券|フライト|直行便|往復|片道|から.+(?:へ|まで|の航空券)|ホノルル.*航空/.test(raw)) return {domain:'flight'};
  if(/ホテル|宿泊|旅館|宿/.test(raw)) return {domain:'hotel'};
  if(/冷蔵庫/.test(raw)) return {domain:'appliance',subcategoryId:'refrigerator'};
  if(/洗濯機/.test(raw)) return {domain:'appliance',subcategoryId:'washer'};
  if(/テレビ/.test(raw)) return {domain:'appliance',subcategoryId:'tv'};
  if(/エアコン/.test(raw)) return {domain:'appliance',subcategoryId:'air_conditioner'};
  if(/ベビーカー|チャイルドシート|抱っこ紐|ベビー|おむつ/.test(raw)) return {domain:'baby',subcategoryId:/ベビーカー/.test(raw)?'stroller':undefined};
  if(/ランニングシューズ|ランニング|スポーツ|アウトドア|テント|ゴルフ|トレーニング/.test(raw)) return {domain:'sports',subcategoryId:/ランニングシューズ|ランニング/.test(raw)?'running_shoes':undefined};
  if(/ワイヤレスイヤホン|イヤホン|ヘッドホン|スマホ|スマートフォン|パソコン|タブレット|モニター|カメラ/.test(raw)) return {domain:'electronics',subcategoryId:/イヤホン|ヘッドホン/.test(raw)?'audio':undefined};
  if(/洗剤|柔軟剤|ティッシュ|トイレットペーパー|日用品|詰め替え/.test(raw)) return {domain:'daily_goods',subcategoryId:/洗剤|柔軟剤|詰め替え/.test(raw)?'household_consumable':undefined};
  if(/化粧水|乳液|美容液|コスメ|化粧品|スキンケア|シャンプー/.test(raw)) return {domain:'beauty',subcategoryId:/化粧水|乳液|美容液|スキンケア/.test(raw)?'skincare':undefined};
  if(/猫|犬|ペット|キャットフード|ドッグフード/.test(raw)) return {domain:'pet',subcategoryId:/(?:猫|犬|ペット).*(?:フード)|(?:フード).*(?:猫|犬|ペット)|キャットフード|ドッグフード/.test(raw)?'pet_food':undefined};
  if(/クリスマスツリー|クリスマス|雛人形|五月人形|模型|フィギュア|玩具|おもちゃ|ホビー/.test(raw)) return {domain:'hobby',subcategoryId:/クリスマスツリー|クリスマス/.test(raw)?'seasonal_decor':undefined};
  if(/ソファ|テーブル|椅子|チェア|ベッド|棚|家具/.test(raw)) return {domain:'furniture'};
  if(/コーヒー豆|食品|米|肉|魚|お菓子|飲料/.test(raw)) return {domain:'food'};
  const vehicleAccessory=/(?:フロアマット|ドラレコ|ドライブレコーダー|ルーフボックス|タイヤ|ホイール|チャイルドミラー|車載|カーマット|シートカバー|サンシェード|アクセサリ)/.test(raw)
    && /(?:ヴェゼル|VEZEL|プリウス|自動車|車両).*(?:対応|適合|用|取り付け)|(?:対応|適合|用|取り付け).*(?:ヴェゼル|VEZEL|プリウス|自動車|車両)/.test(raw);
  if(vehicleAccessory) return {domain:'hobby',subcategoryId:'vehicle_accessory'};
  if(/中古車|ヴェゼル|VEZEL|プリウス|自動車|車両/.test(raw)) return {domain:'used_car'};
  return {domain:'fashion'};
}

export function getDomainTriggerSuggestions(domainId){
  const schema=getDomainSchema(domainId);
  return (schema?.triggerIds||[]).map((id)=>structuredClone(TRIGGERS[id])).filter(Boolean);
}