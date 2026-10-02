const families = [
  { id:'fashion-shirts', target:'メンズ長袖シャツ', base:[], specific:[
    ['、バンドカラーは除外、レギュラーカラー希望',['exclusion','preferred']],
    ['、ウールなし、洗濯機で洗えるもの',['exclusion','required']],
    ['、Lサイズ、オーバーサイズすぎないもの',['exact','vague']],
    ['、秋冬向け、仕事でも普段でも使えるもの',['preferred','vague']],
  ] },
  { id:'running-shoes', target:'ランニングシューズ 26cm', base:['size'], specific:[
    ['、ロード用、1万円以下、クッション重視',['required','maximum','preferred']],
    ['、幅広め、黒かグレー、26cm在庫あり',['preferred','or','stock']],
    ['、フルマラソン練習用、軽さより安定感',['preferred','comparison']],
    ['、旧モデルでも新品ならOK、値下げ品優先',['allowed','required','comparison']],
  ] },
  { id:'refrigerator', target:'冷蔵庫 500L以上', base:['totalCapacity'], specific:[
    ['、幅70cm以下、観音開き',['maximum','required']],
    ['、野菜室が真ん中、製氷機あり',['preferred','required']],
    ['、展示品はOK、中古は不可',['allowed','exclusion']],
    ['、年間消費電力量が少ない順で比較したい',['comparison','preferred']],
  ] },
  { id:'washing-machine', target:'洗濯機', base:[], specific:[
    ['、ドラム式、洗濯10kg以上、乾燥あり',['required','minimum']],
    ['、幅64cm以下、防水パンに入るもの',['maximum','compatibility']],
    ['、ヒートポンプ乾燥を優先',['preferred','exact']],
    ['、夜使うので運転音が小さいもの',['preferred','vague']],
  ] },
  { id:'laptop', target:'ノートPC', base:[], specific:[
    ['、メモリ16GB以上、SSD 1TB以上',['minimum','required']],
    ['、14インチ前後、1.3kg以下',['preferred','maximum']],
    ['、USB-C充電対応、HDMIあり',['compatibility','required']],
    ['、開発用、バッテリー長持ち、20万円以下',['preferred','vague','maximum']],
  ] },
  { id:'smartphone-accessory', target:'iPhone 17対応ケース', base:['compatibility:compat-device'], specific:[
    ['、MagSafe対応、透明、黄ばみにくいもの',['compatibility','preferred','vague']],
    ['、ストラップホールあり、手帳型は除外',['required','exclusion']],
    ['、カメラ部分まで保護、薄型希望',['required','preferred']],
    ['、iPhone 17専用品、汎用品は除外',['compatibility','exclusion']],
  ] },
  { id:'furniture', target:'デスク', base:[], specific:[
    ['、幅110cm前後、奥行50cm以下',['preferred','maximum']],
    ['、モニターアームを付けられる天板',['compatibility','required']],
    ['、引き出しなし、脚元が広いもの',['exclusion','preferred']],
    ['、木目、ぐらつきにくいもの',['preferred','vague']],
  ] },
  { id:'storage', target:'収納ボックス', base:[], specific:[
    ['、重い物を入れられる、積み重ね可能',['required','vague']],
    ['、奥行35cm以下、ふた付き',['maximum','required']],
    ['、半透明は除外、白かグレー',['exclusion','or']],
    ['、棚に横並びで3個入るサイズ',['compatibility','required']],
  ] },
  { id:'food', target:'無塩ナッツ', base:[], specific:[
    ['、食塩不使用、素焼き、油不使用',['required','exclusion']],
    ['、1kg前後、100g単価が安い順',['preferred','comparison']],
    ['、アーモンドとくるみ入り、ピーナッツなし',['required','exclusion']],
    ['、小分け包装、賞味期限が長め',['preferred','vague']],
  ] },
  { id:'daily-goods', target:'洗剤', base:[], specific:[
    ['、無香料、詰め替え用',['required','exact']],
    ['、赤ちゃんの衣類にも使えるもの',['compatibility','required']],
    ['、ドラム式対応、すすぎ1回',['compatibility','preferred']],
    ['、大容量で1回あたりが安い順',['comparison','preferred']],
  ] },
  { id:'beauty', target:'化粧水', base:[], specific:[
    ['、敏感肌向け、アルコールなし',['preferred','exclusion']],
    ['、無香料、ポンプ式',['required','preferred']],
    ['、しっとり系だけどベタつきにくいもの',['preferred','vague']],
    ['、200ml以上、3000円以下',['minimum','maximum']],
  ] },
  { id:'baby', target:'ベビー防寒着', base:[], specific:[
    ['、80cm、防風、フードなし',['exact','required','exclusion']],
    ['、洗濯機で洗える、軽いもの',['required','preferred']],
    ['、ベビーカーでも抱っこ紐でも使いやすいもの',['compatibility','vague']],
    ['、3000円以下、スタイ類は除外',['maximum','exclusion']],
  ] },
  { id:'electric-bicycle', target:'電動自転車', base:[], specific:[
    ['、後ろ子乗せ付き、20インチ',['required','exact']],
    ['、坂道に強い、航続距離が長いもの',['preferred','vague']],
    ['、チャイルドシート込み15万円以下',['maximum','required']],
    ['、低床フレーム、両立スタンドあり',['preferred','required']],
  ] },
  { id:'sports', target:'ランニングウェア', base:[], specific:[
    ['、メンズ長袖、秋冬用',['required','exact']],
    ['、反射材あり、ポケット付き',['required','preferred']],
    ['、ウールなし、速乾素材',['exclusion','preferred']],
    ['、上下セットではなくトップスだけ',['exclusion','required']],
  ] },
  { id:'pet', target:'ドッグフード', base:[], specific:[
    ['、成犬用、小粒、3kg前後',['required','preferred']],
    ['、チキン不使用、魚メイン',['exclusion','preferred']],
    ['、穀物不使用、人工着色料なし',['exclusion','required']],
    ['、定期購入なしでも安いもの',['exclusion','comparison']],
  ] },
  { id:'hobby', target:'ボードゲーム', base:[], specific:[
    ['、2人で遊べる、30分以内',['required','maximum']],
    ['、日本語版、ルールが簡単なもの',['required','vague']],
    ['、協力型、対戦メインは除外',['preferred','exclusion']],
    ['、収納箱が小さめで旅行に持っていけるもの',['preferred','vague']],
  ] },
  { id:'used-car', target:'ヴェゼル 2024年式以降 2万km以下 修復歴なし', base:['modelYear','mileage','repairHistory'], price:'totalPrice', specific:[
    ['、Honda SENSING付き、ワンオーナー',['required','preferred']],
    ['、白か黒、禁煙車を優先',['or','preferred']],
    ['、乗り出し総額350万円以下',['maximum','required']],
    ['、ディーラー保証付き、修復歴ありは除外',['required','exclusion']],
  ] },
  { id:'vehicle-accessory', target:'ヴェゼル対応 フロアマット', base:['compatibility:compat-vehicle'], specific:[
    ['、2024年式対応、防水',['compatibility','required']],
    ['、後席までセット、ラゲッジ用も含む',['required','preferred']],
    ['、純正でなくても専用設計ならOK',['allowed','compatibility']],
    ['、黒、ずれ防止フック対応',['exact','compatibility']],
  ] },
  { id:'flight', target:'東京からホノルル往復', base:[], travel:true, specific:[
    ['、直行便だけ、受託手荷物込み',['required','exclusion']],
    ['、金曜夜出発、火曜までに帰国',['required','range']],
    ['、羽田優先、成田も許容',['preferred','allowed']],
    ['、総額が下がったら確認したい',['change','relative']],
  ] },
  { id:'hotel', target:'軽井沢ホテル', base:[], travel:true, specific:[
    ['、禁煙、ベビーベッド対応',['required','compatibility']],
    ['、駅から徒歩10分以内、朝食付き',['maximum','required']],
    ['、大浴場あり、和室でもOK',['preferred','allowed']],
    ['、キャンセル無料の部屋が出たら確認したい',['change','required']],
  ] },
];

const structures = [
  { key:'model-only', suffix:'', tags:['model-only','exact'] },
  { key:'max-price', suffix:'、10000円以下', tags:['maximum','required'], attr:'price' },
  { key:'preferred-white', suffix:'、白', tags:['exact','preferred'], attr:'color' },
  { key:'no-used', suffix:'、中古不可', tags:['exclusion','required'], attr:'condition' },
  { key:'vague-cheap-look', suffix:'、安っぽくない', tags:['vague'], unresolved:'安っぽくない' },
  { key:'approx-price', suffix:'、12000円くらい', tags:['preferred','vague'], attr:'price' },
  { key:'stock-change', suffix:'、在庫復活したら', tags:['change','stock'], attr:'availability' },
  { key:'relative-price-change', suffix:'、今より安くなったら', tags:['change','relative'], attr:'price' },
  { key:'color-or', suffix:'、白か黒', tags:['or','preferred'], attr:'color' },
  { key:'required-white', suffix:'、白は絶対', tags:['required','exact'], attr:'color' },
  { key:'preferred-white-soft', suffix:'、白だと嬉しい', tags:['preferred','exact'], attr:'color' },
  { key:'vague-reputation', suffix:'、評判が良い', tags:['vague'], unresolved:'評判が良い' },
  { key:'vague-light', suffix:'、軽め', tags:['vague'], unresolved:'軽め' },
  { key:'vague-durable', suffix:'、丈夫', tags:['vague'], unresolved:'丈夫' },
  { key:'vague-easy', suffix:'、使いやすい', tags:['vague'], unresolved:'使いやすい' },
  { key:'vague-stylish', suffix:'、おしゃれ', tags:['vague'], unresolved:'おしゃれ' },
  { key:'vague-long-life', suffix:'、長持ち', tags:['vague'], unresolved:'長持ち' },
  { key:'max-price-no-used', suffix:'、20000円以下、中古不可', tags:['maximum','exclusion','required'], attrs:['price','condition'] },
  { key:'color-or-max-price', suffix:'、白か黒、20000円以下', tags:['or','maximum','preferred'], attrs:['color','price'] },
  { key:'restock-change', suffix:'、再入荷したら', tags:['change','stock'], attr:'availability' },
  { key:'coupon-change', suffix:'、10%OFFクーポンが出たら', tags:['change','comparison'], attr:'coupon_discount_percent' },
  { key:'free-shipping-change', suffix:'、送料無料になったら', tags:['change'], attr:'shipping_fee' },
  { key:'vague-premium', suffix:'、高級感があるもの', tags:['vague'], unresolved:'高級感があるもの' },
  { key:'vague-quiet', suffix:'、静かめ', tags:['vague'], unresolved:'静かめ' },
  { key:'exclude-black-prefer-white', suffix:'、黒以外、できれば白', tags:['exclusion','preferred','or'], attr:'color' },
  { key:'dependency', suffix:'、AならBも必須', tags:['dependency','required'], unresolved:'AならBも必須' },
  { key:'used-exception', suffix:'、中古は不可、未使用開封品ならOK', tags:['exclusion','allowed','exception'], attrs:['condition'], unresolved:'未使用開封品ならOK' },
  { key:'price-range', suffix:'、価格10000円から20000円', tags:['range'], unresolved:'価格10000円から20000円' },
  { key:'partial-edit', suffix:'、前と同じで色だけ黒', tags:['partial-edit'], unresolved:'前と同じで色だけ黒' },
  { key:'prefer-cheapest', suffix:'、できれば最安のもの', tags:['comparison','preferred'], unresolved:'できれば最安のもの' },
  { key:'dense-required-change', suffix:'、絶対に新品、色は白か黒、10000円以下、在庫復活も確認', tags:['required','or','maximum','change','stock'], attrs:['condition','color','price'] },
  { key:'dense-vague-price', suffix:'、高級感、丈夫、使いやすい、20000円以下', tags:['vague','maximum'], attr:'price', unresolved:'高級感' },
  { key:'contradict-color-range', suffix:'、白必須、黒は除外、価格は10000円から20000円', tags:['required','exclusion','range','contradiction'], attr:'color', unresolved:'価格は10000円から20000円' },
  { key:'url-same-item', suffix:'、URL https://example.com/item/123 と同じもの', tags:['unknown','compatibility'], unresolved:'URL https://example.com/item/123 と同じもの' },
  { key:'exact-model-compatible', suffix:'、型番ABC-123完全一致、互換品は除外', tags:['exact','compatibility','exclusion'], unresolved:'型番ABC-123完全一致' },
  { key:'typo-vague', suffix:'、れいぞうこみたいなやつ、できれば静かめ', tags:['typo','preferred','vague'], unresolved:'できれば静かめ' },
  { key:'impossible-range', suffix:'、5000円以上かつ3000円以下', tags:['minimum','maximum','contradiction'], unresolved:'5000円以上かつ3000円以下' },
  { key:'exception-relative-change', suffix:'、新品以外は不可。ただし展示品はOK。白か黒。今より10%以上安くなったら', tags:['exclusion','allowed','exception','or','change','relative'], attr:'color', unresolved:'ただし展示品はOK' },
  { key:'unknown-dependency-edit', suffix:'、条件不明XYZ、AならB、前回と同じで最後だけ変更', tags:['unknown','dependency','partial-edit'], unresolved:'条件不明XYZ' },
  { key:'adversarial-mixed', suffix:'、白か黒、1万円くらい、安っぽくない、中古不可、在庫復活したら、AならB', tags:['or','preferred','vague','exclusion','stock','dependency','change'], attrs:['color','price','condition','availability'], unresolved:'安っぽくない' },
];

function difficulty(index) {
  if (index < 8) return 'simple';
  if (index < 20) return 'normal';
  if (index < 32) return 'advanced';
  if (index < 38) return 'complex';
  return 'adversarial';
}

function sharedScenarios(family) {
  return structures.map((structure, index) => {
    const productExpectations = family.travel ? [] : [
      ...(structure.attr ? [structure.attr === 'price' ? (family.price || 'price') : structure.attr] : []),
      ...((structure.attrs || []).map((attribute) => attribute === 'price' ? (family.price || 'price') : attribute)),
    ];
    return {
      id: `${family.id}-${String(index + 1).padStart(2, '0')}`,
      family: family.id,
      difficulty: difficulty(index),
      input: `${family.target}${structure.suffix}`,
      expectAttributes: [...new Set([...family.base, ...productExpectations])],
      expectUnresolved: structure.unresolved ? [structure.unresolved] : [],
      tags: structure.tags,
      templateKey: `shared:${structure.key}`,
      familySpecific: false,
    };
  });
}

function familySpecificScenarios(family) {
  return (family.specific || []).map(([suffix,tags], index) => ({
    id: `${family.id}-specific-${String(index + 1).padStart(2, '0')}`,
    family: family.id,
    difficulty: index < 2 ? 'normal' : 'advanced',
    input: `${family.target}${suffix}`,
    expectAttributes: [],
    expectUnresolved: [],
    tags,
    templateKey: `specific:${family.id}:${index + 1}`,
    familySpecific: true,
  }));
}

export function buildInputComposerCorpus() {
  return families.flatMap((family) => [...sharedScenarios(family), ...familySpecificScenarios(family)]);
}

export const inputComposerCorpus = buildInputComposerCorpus();
