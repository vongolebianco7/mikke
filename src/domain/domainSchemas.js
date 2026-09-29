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
  field('infants','乳児','integer',['eq','gte'],'basic','passengers','high'),
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
  field('totalCapacity','総容量','measurement',['gte','lte'],'basic','refrigerator','high',{unit:'L'}), field('freezerCapacity','冷凍室容量','measurement',['gte','lte'],'common','refrigerator','high',{unit:'L'}), field('doorCount','ドア数','integer',['eq','gte'],'common','refrigerator','medium'), field('doorStyle','ドアタイプ','enum',['eq','in'],'common','refrigerator','medium'), field('vegetableRoom','野菜室','boolean',['is_true','is_false'],'detailed','refrigerator','low'), field('iceMaker','自動製氷','boolean',['is_true','is_false'],'detailed','refrigerator','low'),
];
const washerFields=[field('washCapacity','洗濯容量','measurement',['gte','lte'],'basic','washer','high',{unit:'kg'}),field('dryCapacity','乾燥容量','measurement',['gte','lte'],'common','washer','high',{unit:'kg'}),field('dryerType','乾燥方式','enum',['eq','in'],'detailed','washer','medium'),field('drumType','ドラム式','boolean',['is_true','is_false'],'common','washer','high'),field('noiseLevel','運転音','number',['lte'],'detailed','washer','medium',{unit:'dB'})];
const tvFields=[field('screenSize','画面サイズ','number',['gte','lte'],'basic','tv','high',{unit:'inch'}),field('resolution','解像度','enum',['eq','in'],'common','tv','high'),field('panelType','パネル','enum',['eq','in'],'common','tv','medium'),field('refreshRate','リフレッシュレート','number',['gte'],'detailed','tv','low',{unit:'Hz'}),field('hdmiCount','HDMI端子数','integer',['gte'],'detailed','tv','low'),field('tunerType','チューナー','enum',['eq','in'],'detailed','tv','low')];
const airconFields=[field('roomTatamiRating','対応畳数','number',['gte','lte'],'basic','air_conditioner','high',{unit:'tatami'}),field('coolingCapacity','冷房能力','number',['gte'],'detailed','air_conditioner','medium',{unit:'kW'}),field('heatingCapacity','暖房能力','number',['gte'],'detailed','air_conditioner','medium',{unit:'kW'}),field('outdoorUnitSize','室外機サイズ','structured object',['eq'],'advanced','air_conditioner','low')];

const furnitureFields=[...commonProductFields,
  field('productType','家具種別','enum',['eq','in'],'basic','identity','high'), field('material','素材','text',['eq','in','contains_text'],'common','design','medium'), field('width','幅','measurement',['lte','gte','between'],'basic','dimensions','high',{unit:'mm'}), field('height','高さ','measurement',['lte','gte','between'],'common','dimensions','medium',{unit:'mm'}), field('depth','奥行','measurement',['lte','gte','between'],'common','dimensions','medium',{unit:'mm'}), field('weight','重量','measurement',['lte','gte'],'detailed','dimensions','low',{unit:'kg'}), field('seatCount','人数','integer',['eq','gte','lte'],'common','dimensions','medium'), field('loadCapacity','耐荷重','measurement',['gte'],'detailed','dimensions','medium',{unit:'kg'}),
  field('assemblyRequired','組立必要','boolean',['is_true','is_false'],'common','delivery','medium'), field('assembledDelivery','完成品配送','boolean',['is_true','is_false'],'detailed','delivery','low'), field('packageWidth','梱包幅','measurement',['lte'],'advanced','delivery','low',{unit:'mm'}), field('packageHeight','梱包高','measurement',['lte'],'advanced','delivery','low',{unit:'mm'}), field('packageDepth','梱包奥行','measurement',['lte'],'advanced','delivery','low',{unit:'mm'}), field('minimumDoorWidth','必要搬入口幅','measurement',['lte'],'advanced','delivery','medium',{unit:'mm'}), field('elevatorRequired','エレベーター前提','boolean',['is_true','is_false'],'advanced','delivery','low'), field('installationService','設置サービス','boolean',['is_true','is_false'],'detailed','delivery','medium'),
  field('storageIncluded','収納付き','boolean',['is_true','is_false'],'detailed','function','low'), field('foldable','折りたたみ','boolean',['is_true','is_false'],'detailed','function','low'), field('extendable','伸長式','boolean',['is_true','is_false'],'detailed','function','low'), field('reclining','リクライニング','boolean',['is_true','is_false'],'detailed','function','low'), field('adjustableHeight','高さ調整','boolean',['is_true','is_false'],'advanced','function','low'), field('casters','キャスター','boolean',['is_true','is_false'],'advanced','function','low'), field('style','スタイル','enum',['eq','in'],'common','design','low'), field('colorFamily','色系統','enum',['eq','in'],'common','design','low'), field('finish','仕上げ','text',['eq','contains_text'],'advanced','design','low'), field('legMaterial','脚素材','text',['eq','contains_text'],'advanced','design','low'), field('shippingFee','送料','money',['lte','eq'],'common','purchase','high',{unit:'JPY'}), field('deliveryDays','配送日数','duration',['lte'],'common','purchase','medium',{unit:'day'}), field('returnable','返品可','boolean',['is_true','is_false'],'detailed','purchase','low'), field('warrantyYears','保証年数','number',['gte'],'advanced','purchase','low',{unit:'year'}),
];

const foodFields=[...commonProductFields,
  field('productName','商品名','text',['eq','contains_text'],'basic','identity','high'), field('category','食品カテゴリ','enum',['eq','in'],'basic','identity','medium'), field('quantity','数量','number',['gte','lte','between'],'basic','quantity','high'), field('weight','重量','measurement',['gte','lte','between'],'basic','quantity','high',{unit:'g'}), field('volume','容量','measurement',['gte','lte','between'],'common','quantity','medium',{unit:'ml'}), field('unitPricePer100g','100g単価','money',['lte'],'common','unit_price','high',{unit:'JPY'}), field('unitPricePerKg','kg単価','money',['lte'],'detailed','unit_price','medium',{unit:'JPY'}), field('unitPricePerItem','1個単価','money',['lte'],'common','unit_price','medium',{unit:'JPY'}), field('unitPricePer100ml','100ml単価','money',['lte'],'detailed','unit_price','medium',{unit:'JPY'}),
  field('originCountry','原産国','text',['eq','in'],'common','quality','medium'), field('originRegion','産地','text',['eq','in'],'common','quality','medium'), field('organic','オーガニック','boolean',['is_true','is_false'],'detailed','quality','low'), field('additiveFree','無添加','boolean',['is_true','is_false'],'detailed','quality','low'), field('certification','認証','list',['contains','contains_all'],'advanced','quality','low'), field('expirationDate','賞味期限','date',['gte','lte'],'detailed','storage','medium'), field('minimumRemainingShelfLife','残存賞味期限','duration',['gte'],'common','storage','high',{unit:'day'}), field('storageMethod','保存方法','enum',['eq','in'],'common','storage','medium',{allowedValues:['room_temp','refrigerated','frozen']}),
  field('calories','カロリー','number',['lte'],'advanced','nutrition','low'), field('protein','たんぱく質','number',['gte','lte'],'advanced','nutrition','low',{unit:'g'}), field('fat','脂質','number',['lte'],'advanced','nutrition','low',{unit:'g'}), field('carbohydrates','炭水化物','number',['lte'],'advanced','nutrition','low',{unit:'g'}), field('sugar','糖質','number',['lte'],'advanced','nutrition','low',{unit:'g'}), field('salt','塩分','number',['lte'],'advanced','nutrition','low',{unit:'g'}), field('allergens','アレルゲン','list',['contains','contains_all','not_in'],'detailed','diet','high'), field('glutenFree','グルテンフリー','boolean',['is_true','is_false'],'detailed','diet','low'), field('vegan','ヴィーガン','boolean',['is_true','is_false'],'detailed','diet','low'), field('vegetarian','ベジタリアン','boolean',['is_true','is_false'],'advanced','diet','low'), field('halal','ハラール','boolean',['is_true','is_false'],'advanced','diet','low'), field('kosher','コーシャ','boolean',['is_true','is_false'],'advanced','diet','low'), field('subscription','定期便','boolean',['is_true','is_false'],'advanced','purchase','low'), field('bulkPack','まとめ買い','boolean',['is_true','is_false'],'detailed','purchase','low'), field('minimumOrderQuantity','最低注文数','integer',['lte','gte'],'advanced','purchase','low'), field('shippingFee','送料','money',['lte','eq'],'common','purchase','high',{unit:'JPY'}),
];

const usedCarFields=[
  field('manufacturer','メーカー','text',['eq','in'],'basic','identity','high'), field('model','車種','text',['eq','in','contains_text'],'basic','identity','high'), field('trim','グレード','text',['eq','in','contains_text'],'basic','identity','high'), field('generation','世代','text',['eq'],'detailed','identity','low'), field('bodyType','ボディタイプ','enum',['eq','in'],'common','identity','medium'),
  field('modelYear','年式','integer',['gte','lte','between'],'basic','history','high'), field('registrationYear','初度登録年','integer',['gte','lte'],'common','history','medium'), field('mileage','走行距離','measurement',['lte','gte','between'],'basic','history','high',{unit:'km'}), field('inspectionExpiry','車検期限','date',['gte','lte'],'detailed','history','medium'),
  field('vehiclePrice','車両価格','money',['lte','gte'],'common','price','medium',{unit:'JPY'}), field('totalPrice','支払総額','money',['lte','gte'],'basic','price','high',{unit:'JPY'}), field('monthlyPayment','月額','money',['lte'],'advanced','price','low',{unit:'JPY'}),
  field('repairHistory','修復歴','boolean',['is_true','is_false'],'basic','condition','high'), field('accidentHistory','事故歴','boolean',['is_true','is_false'],'common','condition','high'), field('oneOwner','ワンオーナー','boolean',['is_true','is_false'],'common','condition','medium'), field('nonSmoking','禁煙車','boolean',['is_true','is_false'],'common','condition','medium'), field('serviceHistory','整備記録','boolean',['is_true','is_false'],'detailed','condition','medium'), field('dealerCertified','認定中古車','boolean',['is_true','is_false'],'detailed','condition','medium'),
  field('fuelType','燃料','enum',['eq','in'],'common','powertrain','high'), field('hybrid','ハイブリッド','boolean',['is_true','is_false'],'common','powertrain','high'), field('ev','EV','boolean',['is_true','is_false'],'common','powertrain','medium'), field('drivetrain','駆動方式','enum',['eq','in'],'common','powertrain','medium'), field('transmission','トランスミッション','enum',['eq','in'],'detailed','powertrain','low'), field('engineDisplacement','排気量','number',['gte','lte'],'advanced','powertrain','low',{unit:'cc'}),
  field('bodyColor','ボディ色','enum',['eq','in'],'common','design','medium'), field('interiorColor','内装色','enum',['eq','in'],'detailed','design','low'), field('seatMaterial','シート素材','text',['eq','contains_text'],'advanced','design','low'),
  ...['navigation','adaptiveCruise','parkingCamera','parkingSensors','sunroof','heatedSeats','powerSeats','safetyPackage','appleCarPlay','androidAuto'].map((id)=>field(id,id,'boolean',['is_true','is_false'],'detailed','equipment','low')),
  field('warranty','保証','boolean',['is_true','is_false'],'common','seller','medium'), field('warrantyMonths','保証月数','integer',['gte'],'detailed','seller','low'), field('dealer','販売店','text',['eq','in','contains_text'],'detailed','seller','low'), field('dealerDistance','販売店距離','measurement',['lte'],'advanced','seller','low',{unit:'km'}), field('deliveryAvailable','陸送可','boolean',['is_true','is_false'],'advanced','seller','low'),
];

const SCHEMAS={
  flight:{domainId:'flight',displayName:'航空券',fields:flightFields,triggerIds:['price','price_drop','watch_low','availability','award_availability','condition_match']},
  hotel:{domainId:'hotel',displayName:'ホテル',fields:hotelFields,triggerIds:['price','price_drop','availability','condition_match']},
  fashion:{domainId:'fashion',displayName:'ファッション',fields:fashionFields,triggerIds:['price','availability','coupon','condition_match']},
  appliance:{domainId:'appliance',displayName:'家電',fields:applianceFields,subcategories:{refrigerator:refrigeratorFields,washer:washerFields,tv:tvFields,air_conditioner:airconFields},triggerIds:['price','availability','shipping','coupon','release','condition_match']},
  furniture:{domainId:'furniture',displayName:'家具',fields:furnitureFields,triggerIds:['price','availability','shipping','delivery','condition_match']},
  food:{domainId:'food',displayName:'食品',fields:foodFields,triggerIds:['price','shipping','coupon','availability','condition_match']},
  used_car:{domainId:'used_car',displayName:'中古車',fields:usedCarFields,triggerIds:['price','price_drop','new_listing','condition_match']},
};

export function getDomainSchema(domainId){
  const normalized=domainId==='appliances'?'appliance':domainId;
  const schema=SCHEMAS[normalized];
  return schema?structuredClone(schema):null;
}

export function getDomainField(domainId,fieldId,subcategoryId){
  const schema=getDomainSchema(domainId);
  if(!schema)return null;
  return [...schema.fields,...(subcategoryId?schema.subcategories?.[subcategoryId]||[]:[])].find((item)=>item.id===fieldId)||null;
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
  if(/ソファ|テーブル|椅子|チェア|ベッド|棚|家具/.test(raw)) return {domain:'furniture'};
  if(/コーヒー豆|食品|米|肉|魚|お菓子|飲料/.test(raw)) return {domain:'food'};
  if(/中古車|ヴェゼル|VEZEL|プリウス|自動車|車両/.test(raw)) return {domain:'used_car'};
  return {domain:'fashion'};
}

export function getDomainTriggerSuggestions(domainId){
  const schema=getDomainSchema(domainId);
  return (schema?.triggerIds||[]).map((id)=>structuredClone(TRIGGERS[id])).filter(Boolean);
}
