export function headlineRow(article,esc,icon,isSaved){
  return `<article class="article-card"><div class="article-content"><a class="article-title" href="#article=${encodeURIComponent(article.id)}">${esc(article.title)}</a></div><button class="save-button" data-action="save" data-id="${esc(article.id)}" aria-label="${isSaved?'保存を解除':'あとで読むに保存'}：${esc(article.title)}" aria-pressed="${isSaved}">${icon('bookmark')}</button></article>`;
}
