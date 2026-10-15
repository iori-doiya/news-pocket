# ニュースポケット

紺色の背景と青いグラデーションのニュース閲覧サイトです。**4情報源の実記事、Googleログイン、クラウド保存、Workers AI、非公開問い合わせを接続済み。6テーマに実記事があります。**

[公開サイト](https://news-pocket.iori-sato-4637.workers.dev) · [公開コード](https://github.com/iori-doiya/news-pocket)

## 自分のPCで起動

このフォルダの **start.cmdをダブルクリック**し、`Ready on` の後に [http://localhost:8787](http://localhost:8787) を開きます。終了は起動した画面で **Ctrl+C**。PCを再起動した後は、もう一度start.cmdを起動してください。

このPCの古いNode.js 20の代わりに、起動スクリプトが同梱のNode.js 24を検出します。他のPCではNode.js 24 LTSを用意してください。PowerShellで起動する場合：

```powershell
cd "C:\Users\ユーザー\OneDrive\ドキュメント\news-pocket"
npm ci
npm run db:local
npm run dev
```

ローカル専用の `wrangler.local.jsonc` を使い、架空のサンプル6件を表示します。Google・外部AI・定期収集には接続しません。端末内のデモ保存はクラウド同期とは別です。公開サイトは家のPCを止めても利用できます。

## 完成・検証した部分

| 項目 | 結果 |
|---|---|
| 画面 | 横一列のタブ、テーマ切り替え、記事詳細、保存・解除、設定を実装 |
| 情報源 | 財務省・金融庁は見出しのみ。Global Voicesは出典と著者・翻訳者を表示し、RSS説明文をAIへ使用。arXivはCC0の研究要旨のみ。PDF・記事全文は取得しない |
| AI | 無料対象のQwenへ接続。3件で原文との対応を確認。AI実行0.689〜1.838秒。共通要約の再閲覧でAI試行が増えず、当日5件の生成制限も本番で確認 |
| 定期収集 | [scheduleによる実行成功](https://github.com/iori-doiya/news-pocket/actions/runs/38728448868)。20:17予定に対し20:35:47開始。約19分遅延し、正確な時刻は保証できない |
| Google | 実ログイン・利用者別保存を確認。本人のGoogle画面で公開ステータスを「本番環境」へ変更済み。ブランド審査完了とは別 |
| 問い合わせ | 非公開フォームと運営者専用受信箱を本番確認。メールの自動通知・返信はない |
| 削除・復旧 | 本番の検証専用ユーザーで削除・セッション失効、別D1へのSQL復元を確認。本人のアカウントと保存は維持 |
| 自動検査 | 20テスト成功。構文・ビルド・本番APIも確認。詳しい実績は報告書に記録 |

芸能は海外の音楽・映画が中心で、古い配信も含みます。最新の国内芸能を毎日網羅する状態ではありません。研究プレプリントは査読済みとは限らず、AI要約の正確性も全記事で保証するものではありません。未確認の情報源7件は無効のままです。

## 詳しい記録と操作手順

- [ニュースポケット 制作記録・運用手順書](docs/制作記録・運用手順書.md)：実際の作業順、構成図、変更・公開・元に戻す方法。
- [AI・問い合わせ・復旧の運用手順](docs/AI・問い合わせ・復旧の運用手順.md)：実測値、無料枠、運営者受信箱、本番削除と別DBでの復元。
- [実装・検証報告](docs/実装・検証報告.md)：完成部分と未確認事項。
- [情報源の確認記録](docs/情報源の確認記録.md)：条件と有効・無効の根拠。
- [定期収集の接続・停止手順](docs/定期収集の接続・停止手順.md)、[Googleログイン接続手順](docs/Googleログイン接続手順.md)。

## Cloudflareへの更新

接続済みの本番は `wrangler.jsonc` を使います。既存のD1を再作成しないでください。フォルダ内で `npm run db:remote` → `npm run check` → `npm test` → `npm run build` → `npm run deploy`。GitHubへの保存だけではCloudflareは更新されません。初回接続の画面・入力値・成功結果は手順書にあります。

Google・収集キー・運営者照合値はCloudflare Secretsに登録済み。GitHubには収集専用INGEST_TOKENだけを登録し、SITE_URLとCOLLECTION_ENABLED=trueはVariablesへ設定済みです。秘密・実データ・reference原本・.secrets・バックアップは公開しません。

Workers・D1・AIはFree、GitHubは公開リポジトリと標準Ubuntuを使います。有料契約、カード登録、独自ドメイン購入は不要です。1人5件・全体20件/日、失敗を含む30試行、UTC日に保護用7,500 Neuronsの予約上限を設けます。予約と実使用量は別です。[公式AI料金](https://developers.cloudflare.com/workers-ai/platform/pricing/)。請求APIの読み取りは権限不足のため未実施です。

今後コード・設定を変更したら、関係する説明・操作手順・検証結果も同じ変更で更新してください。
