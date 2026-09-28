const SAMPLE_PRODUCTS = [
  { id:'nb-996-gray-245', source:'楽天市場 (sample)', title:'New Balance 996 グレー 24.5cm', price:9480, previousPrice:12800, available:true, url:'#', attributes:{ size:'24.5cm', color:'グレー', condition:'new' } },
  { id:'nb-996-beige-245', source:'Yahoo!ショッピング (sample)', title:'New Balance 996 ベージュ 24.5cm', price:8980, previousPrice:10980, available:true, url:'#', attributes:{ size:'24.5cm', color:'ベージュ', condition:'new' } },
  { id:'nb-996-gray-240', source:'公式ストア (sample)', title:'New Balance 996 グレー 24.0cm', price:9200, previousPrice:11000, available:true, url:'#', attributes:{ size:'24.0cm', color:'グレー', condition:'new' } },
  { id:'fridge-501-white', source:'楽天市場 (sample)', title:'Panasonic 冷蔵庫 501L ホワイト', price:138000, previousPrice:159800, available:true, url:'#', attributes:{ color:'ホワイト', capacity:'501L', condition:'new' } }
];

export async function searchSampleShopping(watch) {
  const query = watch.rawQuery.toLowerCase();
  if (/冷蔵庫|501|500l/.test(query)) return SAMPLE_PRODUCTS.filter((p) => p.id.startsWith('fridge'));
  return SAMPLE_PRODUCTS.filter((p) => p.id.startsWith('nb-'));
}
