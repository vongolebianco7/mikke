const RAKUTEN_CREDIT = '<!-- Rakuten Web Services Attribution Snippet FROM HERE --><a href="https://developers.rakuten.com/" target="_blank" rel="noopener noreferrer">Supported by Rakuten Developers</a><!-- Rakuten Web Services Attribution Snippet TO HERE -->';
const YAHOO_CREDIT = '<a href="https://developer.yahoo.co.jp/sitemap/" target="_blank" rel="noopener noreferrer">Webサービス by Yahoo! JAPAN</a>';

export function providerCreditsHtml({ rakuten = false, yahoo = false } = {}) {
  return [rakuten ? RAKUTEN_CREDIT : '', yahoo ? YAHOO_CREDIT : ''].filter(Boolean).join('');
}
