const families = [
  { id:'fashion-shirts', target:'メンズ長袖シャツ', base:[] },
  { id:'running-shoes', target:'ランニングシューズ 26cm', base:['size'] },
  { id:'refrigerator', target:'冷蔵庫 500L以上', base:['totalCapacity'] },
  { id:'washing-machine', target:'洗濯機', base:[] },
  { id:'laptop', target:'ノートPC', base:[] },
  { id:'smartphone-accessory', target:'iPhone 17対応ケース', base:['compatibility:compat-device'] },
  { id:'furniture', target:'デスク', base:[] },
  { id:'storage', target:'収納ボックス', base:[] },
  { id:'food', target:'無塩ナッツ', base:[] },
  { id:'daily-goods', target:'洗剤', base:[] },
  { id:'beauty', target:'化粧水', base:[] },
  { id:'baby', target:'ベビー防寒着', base:[] },
  { id:'electric-bicycle', target:'電動自転車', base:[] },
  { id:'sports', target:'ランニングウェア', base:[] },
  { id:'pet', target:'ドッグフード', base:[] },
  { id:'hobby', target:'ボードゲーム', base:[] },
  { id:'used-car', target:'ヴェゼル 2024年式以降 2万km以下 修復歴なし', base:['modelYear','mileage','repairHistory'], price:'totalPrice' },
  { id:'vehicle-accessory', target:'ヴェゼル対応 フロアマット', base:['compatibility:compat-vehicle'] },
  { id:'flight', target:'東京からホノルル往復', base:[], travel:true },
  { id:'hotel', target:'軽井沢ホテル', base:[], travel:true },
];

const structures = [
  { suffix:'', tags:['model-only','exact'] },
  { suffix:'、10000円以下', tags:['maximum','required'], attr:'price' },
  { suffix:'、白', tags:['exact','preferred'], attr:'color' },
  { suffix:'、中古不可', tags:['exclusion','required'], attr:'condition' },
  { suffix:'、安っぽくない', tags:['vague'], unresolved:'安っぽくない' },
  { suffix:'、12000円くらい', tags:['preferred','vague'], attr:'price' },
  { suffix:'、在庫復活したら', tags:['change','stock'], attr:'availability' },
  { suffix:'、今より安くなったら', tags:['change','relative'], attr:'price' },
  { suffix:'、白か黒', tags:['or','preferred'], attr:'color' },
  { suffix:'、白は絶対', tags:['required','exact'], attr:'color' },
  { suffix:'、白だと嬉しい', tags:['preferred','exact'], attr:'color' },
  { suffix:'、評判が良い', tags:['vague'], unresolved:'評判が良い' },
  { suffix:'、軽め', tags:['vague'], unresolved:'軽め' },
  { suffix:'、丈夫', tags:['vague'], unresolved:'丈夫' },
  { suffix:'、使いやすい', tags:['vague'], unresolved:'使いやすい' },
  { suffix:'、おしゃれ', tags:['vague'], unresolved:'おしゃれ' },
  { suffix:'、長持ち', tags:['vague'], unresolved:'長持ち' },
  { suffix:'、20000円以下、中古不可', tags:['maximum','exclusion','required'], attrs:['price','condition'] },
  { suffix:'、白か黒、20000円以下', tags:['or','maximum','preferred'], attrs:['color','price'] },
  { suffix:'、再入荷したら', tags:['change','stock'], attr:'availability' },
  { suffix:'、10%OFFクーポンが出たら', tags:['change','comparison'], attr:'coupon_discount_percent' },
  { suffix:'、送料無料になったら', tags:['change'], attr:'shipping_fee' },
  { suffix:'、高級感があるもの', tags:['vague'], unresolved:'高級感があるもの' },
  { suffix:'、静かめ', tags:['vague'], unresolved:'静かめ' },
  { suffix:'、黒以外、できれば白', tags:['exclusion','preferred','or'], attr:'color' },
  { suffix:'、AならBも必須', tags:['dependency','required'], unresolved:'AならBも必須' },
  { suffix:'、中古は不可、未使用開封品ならOK', tags:['exclusion','allowed','exception'], attrs:['condition'], unresolved:'未使用開封品ならOK' },
  { suffix:'、価格10000円から20000円', tags:['range'], unresolved:'価格10000円から20000円' },
  { suffix:'、前と同じで色だけ黒', tags:['partial-edit'], unresolved:'前と同じで色だけ黒' },
  { suffix:'、できれば最安のもの', tags:['comparison','preferred'], unresolved:'できれば最安のもの' },
  { suffix:'、絶対に新品、色は白か黒、10000円以下、在庫復活も確認', tags:['required','or','maximum','change','stock'], attrs:['condition','color','price'] },
  { suffix:'、高級感、丈夫、使いやすい、20000円以下', tags:['vague','maximum'], attr:'price', unresolved:'高級感' },
  { suffix:'、白必須、黒は除外、価格は10000円から20000円', tags:['required','exclusion','range','contradiction'], attr:'color', unresolved:'価格は10000円から20000円' },
  { suffix:'、URL https://example.com/item/123 と同じもの', tags:['unknown','compatibility'], unresolved:'URL https://example.com/item/123 と同じもの' },
  { suffix:'、型番ABC-123完全一致、互換品は除外', tags:['exact','compatibility','exclusion'], unresolved:'型番ABC-123完全一致' },
  { suffix:'、れいぞうこみたいなやつ、できれば静かめ', tags:['typo','preferred','vague'], unresolved:'できれば静かめ' },
  { suffix:'、5000円以上かつ3000円以下', tags:['minimum','maximum','contradiction'], unresolved:'5000円以上かつ3000円以下' },
  { suffix:'、新品以外は不可。ただし展示品はOK。白か黒。今より10%以上安くなったら', tags:['exclusion','allowed','exception','or','change','relative'], attr:'color', unresolved:'ただし展示品はOK' },
  { suffix:'、条件不明XYZ、AならB、前回と同じで最後だけ変更', tags:['unknown','dependency','partial-edit'], unresolved:'条件不明XYZ' },
  { suffix:'、白か黒、1万円くらい、安っぽくない、中古不可、在庫復活したら、AならB', tags:['or','preferred','vague','exclusion','stock','dependency','change'], attrs:['color','price','condition','availability'], unresolved:'安っぽくない' },
];

function difficulty(index) {
  if (index < 8) return 'simple';
  if (index < 20) return 'normal';
  if (index < 32) return 'advanced';
  if (index < 38) return 'complex';
  return 'adversarial';
}

export function buildInputComposerCorpus() {
  return families.flatMap((family) => structures.map((structure, index) => {
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
    };
  }));
}

export const inputComposerCorpus = buildInputComposerCorpus();
