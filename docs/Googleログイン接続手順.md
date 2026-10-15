# ニュースポケットのGoogleログイン接続手順

2026年10月15日。公開先は `https://news-pocket.iori-sato-4637.workers.dev`。Google認証だけを接続し、記事はサンプル、AIと未確認情報源は無効のままにする。

**今回の接続は完了済み。**専用プロジェクト・OAuthクライアント・CloudflareのSecrets・AUTH_ENABLEDを設定し、本番で本人のGoogleログイン、サンプル保存、再読み込み、ログアウト・再ログイン後の復元を確認した。利用者から普段使う環境でも「あとで読む」に表示されたとの報告があった。端末の種類・機種は未記録。以下は再設定や更新時の手順で、同じクライアントや秘密をもう一度作る必要はない。Googleはテスト段階で、一般公開・ブランド確認と別Googleアカウントでの実機確認は未実施。

## Googleの画面で登録する

Google Cloud Consoleの専用プロジェクトは **news-pocket**、プロジェクトIDは **news-pocket-511705**。新たに同じ名前のプロジェクトを作る必要はない。

1. [このプロジェクトのGoogle Auth Platform](https://console.cloud.google.com/auth/branding?project=news-pocket-511705)を開く。別プロジェクトを編集しない。概要が読み込みエラーならブランディングを開く。
2. 初期登録ではアプリ名を「ニュースポケット」、サポートメールは本人が承認した管理先にする。対象は「外部」。テストモードから始める。
3. 「連絡先情報」にはGoogleから変更通知を受ける本人管理のメールを入れる。サポート窓口とは用途が異なる。個人の値をこの文書へ書かない。
4. 最終画面でGoogleのユーザーデータに関するポリシーを本人が確認し、同意できる場合だけ登録する。
5. 「クライアント」→「クライアントを作成」で以下を入れる。OAuthクライアントは、このサイトがGoogleの本人確認結果を受け取るための登録。

| 項目 | 入れる内容 |
|---|---|
| アプリケーションの種類 | ウェブ アプリケーション |
| 名前 | ニュースポケット Web |
| 承認済みJavaScript生成元（必要な場合） | `https://news-pocket.iori-sato-4637.workers.dev` |
| 承認済みのリダイレクトURI | `https://news-pocket.iori-sato-4637.workers.dev/api/auth/callback` |
| APIの権限・スコープ | サーバーはopenidのみ要求。Gmail・Drive・連絡先等は追加しない |

クライアントを作成すると本人確認用の認証情報が発行される。作成の確認を受けてから進める。表示された秘密の値や設定JSONを、チャット・README・公開リポジトリに貼り付けない。

6. JSONをダウンロードする。プロジェクトフォルダ内に`.secrets`フォルダを作り、ファイルを`google-oauth.json`という名前で置く。`.secrets/`と`client_secret*.json`はGitの対象から除外してある。ただし後で写真・クラウド共有等をする際は、自分で含めないよう注意する。

今回の実作業ではダウンロード完了の確認が時間切れとなったため、発行画面の値を一切表示せず私有JSONへ保存する方法を使った。指定のnews-pocketフォルダの`.secrets/google-oauth.json`に保管済み。内容を文書へ転載しない。
7. 「ブランディング」でホームは公開URL、プライバシーは`https://news-pocket.iori-sato-4637.workers.dev/privacy.html`、利用案内は`https://news-pocket.iori-sato-4637.workers.dev/terms.html`。Googleがドメイン確認を要求する場合は、その要件を満たすまで確認済み扱いにしない。問い合わせ先は一般公開前に整える。
8. 「対象」で必要に応じて本人をテストユーザーへ登録する。Testingの制限は要求スコープにより例外があるため、実際の画面とログイン結果で確認する。一般公開への移行は本人確認と動作確認の後で行う。

## 秘密情報をCloudflareへ登録する

PowerShellを開き、実際のフォルダへ移動する。

```powershell
cd "C:\Users\ユーザー\OneDrive\ドキュメント\news-pocket"
npm run connect:google
```

この命令は`.secrets/google-oauth.json`を読み、登録先URLが一致しているか確認する。`GOOGLE_CLIENT_SECRET`をCloudflareの暗号化したSecretsへ登録する。署名用の`SESSION_SECRET`はまだ存在しない場合だけランダム生成して登録する。既存のSESSION_SECRETを上書きせず、すでにログインした人のセッションが不用意に失効することを防ぐ。

Wranglerへのログインが必要というエラーになったら`npx wrangler login`を実行し、公式認証を完了してからやり直す。秘密をコマンドの引数へ直接入力しない。正常時は「秘密情報をCloudflareに登録し、公開クライアントIDとAUTH_ENABLEDを設定しました」と出る。この時点でログイン成功が確認できたわけではない。

このPCの既存Node.jsは20なので、通常のnpmでバージョンエラーになる場合は次を使う。`node`はJavaScript実行環境のこと。

```powershell
$newsPocketNode = "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
& $newsPocketNode scripts/connect-google.mjs
& $newsPocketNode scripts/check.mjs
& $newsPocketNode --test tests/*.test.mjs
& $newsPocketNode node_modules/wrangler/bin/wrangler.js deploy --dry-run --outdir build
& $newsPocketNode scripts/deploy.mjs
```

すべて`news-pocket`フォルダで実行する。順に秘密登録、構文検査、動作テスト、公開せずビルド、実際の公開を行う。失敗したら次へ進まず、エラーを解決する。Node.js 24が通常インストール済みなら`npm run check`→`npm test`→`npm run build`→`npm run deploy`でもよい。

設定項目の意味：`GOOGLE_CLIENT_ID`は公開してよい登録番号、`GOOGLE_CLIENT_SECRET`は公開しない本人確認用の秘密、`SESSION_SECRET`はCookieの改ざん防止用の秘密。`AUTH_ENABLED=true`は認証を有効化するフラグで、DATA_MODEとは別。現在の本番は実データ・4情報源・AI有効。ローカルのサンプル専用設定はwrangler.local.jsoncに分離している。

Cloudflareの「Workers & Pages → news-pocket → Settings → Variables and Secrets」で秘密項目の名前だけ確認できる。実際の値を画面や文書へ出さない。接続用JSONを失った場合はGoogleのクライアント画面の案内に従い、新しい秘密を登録してから旧秘密を廃止する。

## 本当に使えるか確認する

1. 公開URLの「設定」で、Googleが「接続設定あり・ログイン前」になる。これは登録情報がそろったという意味。
2. 「Googleでログイン」を押す。Googleのアカウント選択・同意を行う。サイトへ戻って「Googleでログインしています」「本人確認済み」と出れば認証成功。
3. 公開されている実記事を1件保存し、あとで読むで表示されること、再読み込みでも残ることを確認する。端末内デモの保存は自動移行しない。
4. ログアウト→再ログインして保存が残ること、同じGoogleアカウントの別端末でも見えること、別アカウントには見えないことを確認する。実際に行った確認だけ記録する。
5. サンプルの説明文が「AI生成ではありません」のままであることを確認する。情報源とAIの接続は別工程。

`redirect_uri_mismatch`は、Googleに登録したURIとAPP_ORIGIN＋`/api/auth/callback`の不一致。ログイン後に失敗する場合はクライアントIDと秘密の組み合わせ、Cookie、テストモード、Googleが表示するエラーを確認する。共有するときは認証コード・Cookie・秘密・メールを隠す。

## 本番環境への変更（今回実施）

1. [対象者](https://console.cloud.google.com/auth/audience?project=news-pocket-511705)を開く。「アプリを公開」が無効なら、左のブランディングを開く。
2. アプリ名「ニュースポケット」、本人が承認したGoogleアカウントのサポートメール・開発者連絡先を確認する。ロゴは任意で、今回アップロードしていない。
3. ホームに https://news-pocket.iori-sato-4637.workers.dev/ 、プライバシーに https://news-pocket.iori-sato-4637.workers.dev/privacy.html 、利用案内に https://news-pocket.iori-sato-4637.workers.dev/terms.html を入力して保存する。
4. 対象へ戻り「アプリを公開」から確認する。「公開ステータス：本番環境」になれば切り替え成功。今回、本人が普段のChromeで保存・本番環境への変更を確認した。操作用ブラウザは読み込みエラーが続いたため、こちらによる独立した管理画面確認ではない。
5. 要求範囲はopenidのみを維持する。Gmail・Drive等の権限を追加しない。公開対象者とブランド審査は別であり、ブランド審査完了は確認していない。

## 未完了の確認

この文書は接続用の操作手順。どこまで実施したかは[制作記録 第1部11](制作記録・運用手順書.md)と[検証報告](実装・検証報告.md)へ実績を記載する。手順が書いてあるだけの工程を実施済みと扱わない。
