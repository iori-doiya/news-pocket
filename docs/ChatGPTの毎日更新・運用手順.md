# ChatGPTの毎日更新・運用手順

## 運用仕様
ニュースポケット専用のクラウド更新を1回実行する。ユーザーは本専用タスクの新規作成と、iori-doiya/news-pocket のmainへの日次便書込みを明示許可済み。既存「朝の重要ニュース」その他タスクは変更禁止。PC/Codexアプリ停止中でも接続ツールだけで動かす。ローカル自動化・PC常時起動・Tavily・有料OpenAI API・Workers AIへの置換禁止。秘密・個人データ・アプリコードには触れない。
まずGitHub mainの現在head、docs/ニュースの選定方針.md、docs/ChatGPTの毎日更新・運用手順.md、src/briefings.mjs、最近のdata/briefingsと公開 https://news-pocket.iori-sato-4637.workers.dev/api/articles を読む。手順書欠落時は本指示を使用する。旧バリデータがfactsChecked:true必須なら値を偽らず指定形式で準備・保存し、配信失敗を明示。コードは変更しない。
Webで最新の信頼できる公開情報を実際に調べ、新しい事実・続報を優先して短い独自解説を作る。同じニュースの単純再掲禁止。日経電子版・SmartNews・Yahoo!ニュースのような重要性・話題性を軸にするが、媒体を固定せず一次発表・信頼できる公開報道で照合する。政治・経済等の重要情報は一次発表や複数情報で照合。提案と決定を区別し未確認の噂は不採用。有料本文・制限の回避、未許諾RSS大量取得、本文・画像・見出しのコピー配信は禁止。読めない本文を読んだ扱いにしない。特定記事全文の要約ではなく、少数の事実を自分の言葉で説明し確認済み出典URLを付ける。利用条件は事実のみの利用範囲を確認し全文要約許諾と混同しない。
テーマは正確に6つ：AI（仕事で使えるサービス・新機能・新モデル・新AI）、日本経済（物価・税金・給料・企業・市場・家計影響）、株式投資（企業・市場・決算の事実、個別売買推奨と断定予測禁止）、国際情勢（世界を動かす重大ニュース、日本影響）、日本政治（重要な決定・制度・政策）、芸能ニュース（日本で話題の芸能人・番組・作品等、小さな雑ニュースや噂は除外）。各0～3件、全体1～18件、無理に全テーマを埋めない。新しい確認済み記事が0なら公開せず失敗・見送り理由を報告。古い記事の日付だけ更新しない。
JSON version:1,id:"YYYY-MM-DD-morning",issueDate:実行時の日本日付,cutoffAt:実際の確認締切ISO日時（同じ日本日付、48h以内、未来禁止）,producer:"ChatGPT ニュースポケット毎日更新"。
review:{"kind":"chatgpt-web","factsChecked":false,"automatedEvidenceChecked":true,"originalWriting":true,"sourceTermsChecked":true,"noRestrictedText":true}。人間の全件確認ではないのでfactsCheckedはfalse。他のtrueも実際の確認を満たした場合のみ。満たせなければ公開せず理由を報告。
items各項目：id（小文字英数ハイフン、先頭英数、1～71字、重複禁止）、theme（上記正確名）、title（独自3～120字）、summary（独自20～600字）、whyItMatters（10～400字）、impact（10～400字）、caution（1～300字）、references（1～5件）。各出典はname（1～100字）,url（実在公開HTTPS）,publishedAt（正確ISOまたは不明ならnull）,accessedAt（実際の確認時刻ISO、48h以内、未来禁止）,usage:"facts-only",reviewNote（読めた範囲、照合、表現・画像転載なし等の実際の確認10～400字）。
mainの data/briefings/YYYY-MM-DD-morning.json に接続GitHubツールで作成・更新する。同日訂正は同じ便と安定記事IDを使用。書込み直前にheadと対象ファイルを再確認し競合を避ける。既存ファイル更新時は現在blob SHAを使用。Secrets・INGEST_TOKENは読まない。GitHub Actionsが既存の秘密キーで受信APIへ配信する。
保存後は当該コミットのpushイベントのActions「Publish news briefing」を確認し、結果と実行URLを取得。fetch_commit_workflow_runsはPR限定なのでpush確認に使わずGitHub fetchでactions/runs?event=push&head_sha=...を使用できる。公開/api/articlesまたは/api/statusで当該便・記事IDと実記事数が反映されたことを読取り確認。ファイル保存だけで配信成功としない。失敗時は具体的な段階・理由を報告し秘密は表示しない。毎回承認で停止したら無人運転成功と報告しない。
最後に日本日付・確認締切・記事数・コミットURL・Actions URLと結果・公開反映・未完了事項を簡潔に報告。設定済み／手動実行成功／実際の定期実行成功を区別。利用枠・権限不足は明示し成功実績を捏造しない。関係する説明文は方針や指示の変更時に整合させる。

## 2026-10-16 接続・初回検証記録

- 専用クラウドタスク「ニュースポケット 毎日更新」を新規作成し、読取りで有効状態を再確認。既存タスクは変更していない。
- 識別子：6ad1b04e366c8191bf4c9ab71517bc8f
- タイムゾーン：Asia/Tokyo
- 保存スケジュール：
```
BEGIN:VEVENT
DTSTART;TZID=Asia/Tokyo:20261017T080000
RRULE:FREQ=DAILY;BYHOUR=8;BYMINUTE=0;BYSECOND=0
END:VEVENT
```
- 作成結果 success:true、読取り is_enabled:true。next_run_time:null、last_run_time:null。開始日時は設定値であり、将来の起動成功の証拠ではない。PC/Codexアプリのローカルスケジューラは使っていない。
- GitHub接続による資料読取りに成功。書込み直前のmain headは 0f7a9e4c6cb082afeddc6f3a03f12f03278ea684。対象朝便が存在しないことも確認。
- Figma公式発表のSpecsの機能・対象プランを新規確認し、公開APIの既存6件と重複しない実記事1件を独自執筆。
- 初回手動実行の確認締切：2026-10-16T05:04:52.203Z
- 作成便：data/briefings/2026-10-16-morning.json。review.factsChecked:false、kind:chatgpt-web、automatedEvidenceChecked:true。
- GitHub書込み成功。今回の書込みは追加承認で停止しなかった。コミットの親が確認済みheadと一致することも読取りで確認：
  https://github.com/iori-doiya/news-pocket/commit/618359ff8d1b5f7fd9b88238fc18f37acfc5e46a
- 当該pushの「Publish news briefing」は completed / failure：
  https://github.com/iori-doiya/news-pocket/actions/runs/38853920988
- publishジョブの配信スクリプトが終了コード1。「事実・独自執筆・出典の利用条件・制限本文不使用の確認が必要です」で停止。秘密の値は読まず、ログ中の値は転記していない。
- 現在mainのsrc/briefings.mjs（blob ddb46344c72cc5fa766dafe2d39d7f378256b9d5）はfactsChecked:true必須の旧仕様。指定された自動確認形式に未対応であることを再読取りで確認。手順書も本作成前は404だった。
- 未完了：公開反映、初回全工程成功、将来の実際の定期実行成功、無人の全工程成功の実証。今回のGitHub書込み成功だけで将来の権限承認不要を保証しない。
- 制作元で必要な対応：人間の全件確認と自動根拠確認を区別したchatgpt-web形式を、GitHub側検証と公開受信側の両方が受け付けることを確認する。今回はアプリコード変更禁止のため修正していない。falseをtrueに偽装して通さない。
- 仕様対応後に再実行する場合、当日便と記事IDを維持し、出典を再確認して実際の確認日時に更新する。過去日の便や確認日時を流用して成功扱いにしない。
