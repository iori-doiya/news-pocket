# ニュースポケット

[公開サイト](https://news-pocket.iori-sato-4637.workers.dev) · [公開コード](https://github.com/iori-doiya/news-pocket)

## 現在の状態

新規AI要約の上限は**1人30件・サイト全体50件／日**に変更。Googleログイン・非公開問い合わせ・AI基盤は接続済みです。対象媒体はYahoo!ニュース、ITmedia AI＋、ITmedia NEWS、ITmedia ビジネスオンライン、SmartNews、日経電子版です。**各媒体の取得・公開・AI要約の許諾確認中で、現在はニュース収集と新しい記事の要約を停止しています。** 未接続を接続済みとして扱いません。

財務省・金融庁・Global Voices・arXivは対象から外し、記事と要約を公開表示しません。取り下げだけで本人の保存記録を削除しません。過去の収集日時は過去の実績として表示します。定期ワークフローは期限切れデータの整理のみを行います。

[指定6媒体の取得方法・AI要約可否](docs/指定6媒体の取得方法・AI要約可否.md)に、公式RSSのURL・実応答、本文とAI利用の条件、難しい場合の代替案を記載しました。問い合わせや有料契約はまだ行っていません。指定外の媒体を勝手に追加しません。

## PCで起動・終了

このフォルダの **start.cmdをダブルクリック**。Ready onが出たら[http://localhost:8787](http://localhost:8787)を開きます。終了は起動した画面で**Ctrl+C**。PCを再起動した後は再度start.cmdを起動してください。ローカルは架空のサンプル6件で、Google・外部AI・収集は無効です。

Node.js 24を使います。このPCでは起動スクリプトが同梱の24を検出します。他のPCは24 LTSを用意してください。PowerShellで操作する場合：

```powershell
cd "C:\Users\ユーザー\OneDrive\ドキュメント\news-pocket"
npm ci
npm run db:local
npm run dev
```

## 公開・更新

Cloudflare Workers・D1・Workers AI、Google OpenID Connect、GitHub Actionsを使用。無料workers.dev URLを使い、有料契約は追加していません。GitHubへ保存するだけではCloudflareは更新されません。実際のサイトはPCを止めても利用できます。

news-pocketフォルダで `npm run db:remote` → `npm run check` → `npm test` → `npm run build` → `npm run deploy`。既存D1を再作成しないでください。今回の上限移行は0005です。許諾未確認の6媒体を有効にして公開しないでください。

無料枠の保護は維持します。失敗を含む最大50試行、UTC日に7,500 Neuronsの保護用予約、新規1試行150。記事8,000文字・出力900トークン・固定モデルQwenを維持。実際の利用量や失敗、UTC日と日本時間の違いによって50成功より前に停止する場合があります。既存の要約を読むだけでは回数を消費しません。現在は許諾確認中のため新規生成できません。

秘密はCloudflare SecretsとGitHub Actions Secretsへ登録済みで、公開コードへ含めません。問い合わせは運営者専用受信箱で読み、自動メール通知はありません。

## 記録・操作手順

- [ニュースポケット 制作記録・運用手順書](docs/制作記録・運用手順書.md)
- [指定6媒体の取得方法・AI要約可否](docs/指定6媒体の取得方法・AI要約可否.md)
- [実装・検証報告](docs/実装・検証報告.md)
- [AI・問い合わせ・復旧の運用手順](docs/AI・問い合わせ・復旧の運用手順.md)
- [Googleログイン接続手順](docs/Googleログイン接続手順.md)
- [定期収集の接続・停止手順](docs/定期収集の接続・停止手順.md)

今後コード・設定を変更したら、関係する説明・確認結果も更新してください。
