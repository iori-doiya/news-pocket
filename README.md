# ニュースポケット

紺色の背景と青いグラデーションのニュース閲覧サイトです。**財務省・金融庁の公式RSSの見出し一覧を公開済み。Googleログインとクラウド保存に対応しています。AIは無効です。**

公開URL：[https://news-pocket.iori-sato-4637.workers.dev](https://news-pocket.iori-sato-4637.workers.dev)

コード保存先：[iori-doiya/news-pocket](https://github.com/iori-doiya/news-pocket)（公開リポジトリ）。reference原本・秘密情報・実データは含めません。

公開版はPCの起動に依存せず、スマホからも開けます。以下の起動手順は、自分のPCで修正・検証するときに使います。ローカルではサンプル6件を表示し、公開版は実ニュースを表示します。

## 起動

Windowsでは、このフォルダの **`start.cmd` をダブルクリック**してください。必要なライブラリの取得とローカルD1の初期化を行い、起動します。ブラウザで [http://localhost:8787](http://localhost:8787) を開きます。終了は起動した画面で **Ctrl+C**。

**URLを開けない場合：**localhostは、このPCのサーバーが起動している間だけ開けます。まずstart.cmdを起動し、`Ready on`が表示されてからブラウザを再読み込みしてください。PC再起動やサーバー終了後は、もう一度start.cmdで起動します。

このPCでは既存Node.js 20が古いため、起動スクリプトはCodex同梱のNode.js 24を検出して使用します。他のPCにはNode.js 24 LTSを用意してください。Codexの同梱環境が移動・削除された場合も、通常のNode.jsを用意します。

Node.js 24がインストール済みの場合、PowerShellで次の方法も使えます。

```powershell
cd "C:\Users\ユーザー\OneDrive\ドキュメント\news-pocket"
npm ci
npm run db:local
npm run dev
```

ローカル起動はサンプルモードです。ホームでテーマを切り替え、見出しを押すと説明画面を開けます。保存ボタンから「端末内のデモを試す」を選ぶと、保存・解除と「あとで読む」を確認できます。**デモはGoogleログインやクラウド同期ではありません。説明文もAI生成ではありません。**

## 実装と接続状態

| 項目 | 状態 |
|---|---|
| ホーム・7テーマ・横スクロール・記事詳細・設定 | 実装・ブラウザ確認済み |
| 端末内のデモ保存・解除・再読み込み後の維持 | 確認済み |
| Workers API・D1・Google認証・利用者別保存 | 本番Googleログイン、D1への保存、再読み込み、ログアウト、再ログイン後の保存復元を確認。普段使う環境から保存が見えたことも利用者が確認。端末種類は未記録 |
| 収集・分類・重複処理・失敗時の成功時刻据え置き | 財務省100件・金融庁15件を実取得し、上限100件を本番へ登録。GitHub環境の手動収集成功。時刻実行の保存は追加本人確認待ち |
| Workers AI・共通要約・同時生成・回数制限 | 実装・模擬AIで検証済み。実モデルの品質・速度・無料枠は未測定 |
| 保存期間・容量整理・本人確認後のアカウント削除 | 実装・テスト確認済み。本番の整理APIも成功。アカウント削除の本番操作は未確認 |
| Cloudflare・GitHub・Googleのアカウント接続 | Cloudflare・Google・GitHubを接続。収集専用キーを両サービスに登録済み。Googleはテスト段階 |
| 情報源 | 財務省・金融庁のみ有効。元の商用候補7件は無効。見出し・日時・リンクのみ、AI要約なし |

公式の[財務省利用条件](https://www.mof.go.jp/about_mof/notice/index.html)・[金融庁利用ルール](https://www.fsa.go.jp/rules/index.html)と公共データ利用規約に基づき出典を表示しています。経済・金融の公的発表が中心です。6テーマを網羅せず、芸能などの専用供給源は未接続です。本文・写真・PDFを転載しません。

## 詳しい説明

- [ニュースポケット 制作記録・運用手順書](docs/制作記録・運用手順書.md)：実際の工程、構成図、接続、修正、更新、エラー調査、元に戻す方法。
- [実装・検証報告](docs/実装・検証報告.md)：完了部分、受け入れ基準との照合、未確認事項。
- [情報源の確認記録](docs/情報源の確認記録.md)：利用条件の確認結果と、有効化するための記録欄。
- [定期収集の接続・停止手順](docs/定期収集の接続・停止手順.md)：GitHubの実行・停止・キー再接続・障害調査。
- [Googleログイン接続手順](docs/Googleログイン接続手順.md)：今回の専用プロジェクト、入力するURL、秘密を表示しない接続コマンド。

Google接続の進捗：専用プロジェクト`news-pocket-511705`、Google Auth Platformの初期登録、ウェブ用OAuthクライアントを作成済み。用途別の連絡先登録・ポリシーへの同意・認証情報発行・アカウント関連付けは本人の確認を受けて実施。本番ログインと保存の復元まで確認しました。その後、利用者から普段使う環境でも「あとで読む」に保存記事が表示されたと報告がありました。Googleの一般公開移行・ブランド確認、端末種類を特定した実機検証は未実施です。

追加実装では、記事モードとは別の`AUTH_ENABLED`を導入し、現在はtrueです。サンプル表示のままGoogleログイン・利用者別D1保存が使えます。`npm run connect:google`は`.secrets/google-oauth.json`から秘密をCloudflareへ直接登録し、公開コードにはクライアントIDだけを保存します。GOOGLE_CLIENT_SECRETとSESSION_SECRETはCloudflare Secretsに登録済みです。

この変更は14件のテストと公開前ビルドに成功。Cloudflareへの更新は一度通信エラーで止まりましたが、再試行で公開に成功しました。現在は実データモード・DB応答あり・Google接続設定あり・AI無効・有効情報源2件です。[プライバシーポリシー](https://news-pocket.iori-sato-4637.workers.dev/privacy.html)と[利用案内](https://news-pocket.iori-sato-4637.workers.dev/terms.html)もHTTP 200を確認しました。

## Cloudflareで公開する順序

GitHub接続の進捗：コードと手順書の一般公開を本人が承認した後、公開リポジトリを作り40ファイルを登録しました。指定のnews-pocketフォルダにもGit履歴・origin・mainを接続済みです。[PR #1の自動検査](https://github.com/iori-doiya/news-pocket/actions/runs/38691068969)で構文確認・14テスト・公開前ビルドが成功しました。SITE_URLと収集専用INGEST_TOKENを登録済み。時刻実行はCOLLECTION_ENABLEDで制御します。実行結果と現在の状態は詳しい収集手順書と検証報告を参照してください。GitHubへコードを保存するだけでは、Cloudflareのサイトは更新されません。

Cloudflare認証・D1作成・初期化・サンプル公開は今回実施済みです。既存DBを再作成せず、更新時は保存した設定を使ってください。

1. Cloudflareの**Workers Free**プランを確認して `npx wrangler login`。
2. `npx wrangler d1 create news-pocket-db` でD1を作成し、返されたIDを `wrangler.jsonc` の `database_id` に設定。
3. `APP_ORIGIN` を無料の `https://news-pocket.<自分のサブドメイン>.workers.dev` に、`FREE_PLAN_CONFIRMED` を `"true"` に設定。サンプル公開では `DATA_MODE` は `"sample"`、AIは無効を維持。
4. `npm run db:remote` → `npm run check` → `npm test` → `npm run build` → `npm run deploy`。
5. Google・収集用Secretsは登録済み。DATA_MODE=liveで公式2情報源を公開。公開の不具合窓口はcontact.htmlからGitHub Issuesへ案内。非公開の問い合わせ窓口は準備中。定期収集の開始・停止は専用手順書を参照。
6. 許諾済み原文で実測してからAIを有効化。詳細な画面・入力項目・成功結果は手順書に記載。

秘密情報はCloudflare Secretsへ登録し、公開コードへ書きません。Google接続用の私有ファイルはGit除外済みの`.secrets/`へ保管しています。ローカル認証には`.dev.vars`、定期収集にはGitHub Actions Secretsを使います。

## 0円の前提と検証結果

Workers/D1/AIはFreeプラン、GitHubは公開リポジトリ・標準Ubuntu実行環境を使います。有料プランへの移行・AI Gateway課金・独自ドメイン購入は行いません。無料上限ではサービスが停止します。サイトの5件/人・20件/日、失敗を含む30試行/日、UTC日のAI予約枠7,500をさらに設けています。AI予約枠は消費量の実測値ではありません。[Workers AIの公式料金](https://developers.cloudflare.com/workers-ai/platform/pricing/)、[GitHub Actionsの公式料金](https://docs.github.com/en/billing/concepts/product-billing/github-actions)。

2026年10月15日：構文確認、14件の自動テスト（ローカルD1を含む）、本番D1初期化、Cloudflare公開、公開APIと案内ページのHTTP 200、本番Googleログイン・クラウド保存・再ログイン後の復元を確認。ローカルでは320px・390px・1222px幅を確認済み。今回の追加では16件のテストとビルド、実RSS取得・本番登録が成功。実AI・端末種類を特定した別端末検証・実機のタッチ操作は未確認です。

Free枠は、管理画面の日次100,000回の表示と[公式Freeの上限](https://developers.cloudflare.com/workers/platform/limits/)を照合して判断しました。請求APIは権限不足で読めていません。有料プランへの変更・支払い・カード情報の登録は行っていません。「Upgrade」は有料プランの申込先なので、無料確認のために進む必要はありません。

変更時は、関係するコードとこのREADME・docsの説明を同時に更新してください。
