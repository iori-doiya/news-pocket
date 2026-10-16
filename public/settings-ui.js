import { briefingSettings } from './briefings-ui.js';

export function settingsPage(status,me,demo,esc,prettyDate){
  const account=me.user?'Googleでログイン中':'ログインしていません';
  const accountText=me.user?'保存した記事は、同じGoogleアカウントで別の端末からも読めます。':demo?'端末内のデモを利用中です。保存はこのブラウザだけに残ります。':'Googleでログインすると、記事を「あとで読む」に保存できます。';
  const accountAction=me.user?'<button class="button" data-action="logout">ログアウト</button>':demo?'<button class="button" data-action="demo-end">デモを終了</button>':'<button class="button primary" data-action="login">Googleでログイン</button>';
  return `<section class="page settings-page"><div class="page-heading"><h2>設定</h2><p class="page-intro">いつものニュースを、気持ちよく。</p></div>
    <section class="panel account-panel"><div class="account-mark" aria-hidden="true">G</div><div><h3>${demo?'デモ利用中':account}</h3><p>${accountText}</p>${accountAction}</div></section>
    ${briefingSettings(status,esc,prettyDate)}
    <section class="panel"><h3>使い方とサポート</h3><div class="settings-links"><a href="/home-screen.html"><span>ホーム画面に追加</span><span aria-hidden="true">›</span></a>${status.contactUrl?`<a href="${esc(status.contactUrl)}"><span>非公開の問い合わせ</span><span aria-hidden="true">›</span></a>`:'<p>問い合わせ窓口は準備中です。</p>'}<a href="/privacy.html"><span>プライバシーポリシー</span><span aria-hidden="true">›</span></a><a href="/terms.html"><span>利用案内</span><span aria-hidden="true">›</span></a></div><p class="settings-note">保存した記事も、掲載から90日や容量整理によって削除される場合があります。</p></section>
    ${me.user?'<details class="account-options"><summary>アカウントの管理</summary><p>サイト内のアカウントと保存情報を削除します。削除前にGoogleでの本人確認が必要です。</p><button class="button danger" data-action="delete-dialog">アカウントを削除</button></details>':demo?'<details class="account-options"><summary>デモデータの管理</summary><p>この端末のデモ保存だけを削除します。</p><button class="button danger" data-action="clear-demo">端末のデモ保存を消す</button></details>':''}
    <p class="settings-footer">NEWS POCKET <span>ニュースポケット</span>${status.mode==='sample'?'<br>架空のサンプル記事を表示しています。':''}</p></section>`;
}
