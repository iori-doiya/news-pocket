import {mkdir,writeFile,readFile} from 'node:fs/promises';
const folder='docs/diagrams';await mkdir(folder,{recursive:true});
let state={cloudWriteVerified:false,scheduleVerified:false,publicationVerified:false};try{state={...state,...JSON.parse(await readFile(`${folder}/status.json`,'utf8'))};}catch{}
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const colors={ink:'#eef4ff',muted:'#b9c9e4',border:'#3d587d',card:'#182b46',blue:'#84b9ff',green:'#8be0be',yellow:'#ffd48a'};
function start(height,title,subtitle){return `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="${height}" viewBox="0 0 1440 ${height}"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#10223b"/><stop offset="1" stop-color="#0c1729"/></linearGradient><linearGradient id="band"><stop stop-color="#1645b8"/><stop offset="1" stop-color="#2f77ef"/></linearGradient><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto"><path d="M0 0L8 4L0 8" fill="none" stroke="#84b9ff" stroke-width="1.5"/></marker></defs><rect width="1440" height="${height}" fill="url(#bg)"/><rect x="36" y="28" width="1368" height="126" rx="22" fill="url(#band)"/><g font-family="'Yu Gothic',Meiryo,'Noto Sans JP',sans-serif" fill="${colors.ink}"><text x="66" y="60" font-size="14" letter-spacing="3">NEWS POCKET / 2026.10.16</text><text x="66" y="104" font-size="31" font-weight="700">${esc(title)}</text><text x="66" y="134" font-size="17">${esc(subtitle)}</text>`;}
function label(x,y,text,size=17,color=colors.muted){return `<text x="${x}" y="${y}" font-size="${size}" fill="${color}">${esc(text)}</text>`;}
function box(x,y,w,h,title,lines,status,good=true){return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="17" fill="${colors.card}" stroke="${colors.border}" stroke-width="1.5"/>${label(x+20,y+32,title,23,colors.ink)}${lines.map((line,i)=>label(x+20,y+63+i*27,line,16)).join('')}${status?`<rect x="${x+18}" y="${y+h-37}" width="${w-36}" height="25" rx="7" fill="${good?'#173f3b':'#483b24'}"/>${label(x+29,y+h-19,status,14,good?colors.green:colors.yellow)}`:''}`;}
function arrow(points,text='',x=0,y=0){return `<path d="${points}" fill="none" stroke="${colors.blue}" stroke-width="2.5" marker-end="url(#arrow)"/>${text?label(x,y,text,15,colors.blue):''}`;}
let svg=start(1140,'ニュースポケット 全体の構造図','既存アプリを拡張。毎日の更新はクラウドで動く設計。自宅PCの常時起動は不要。');
svg+=label(60,188,'青い線：処理・データの流れ　　緑：接続・動作を確認済み　　黄：設定・実ニュースの検証待ち',16);
svg+='<rect x="36" y="210" width="1368" height="700" rx="22" fill="#112139" stroke="#2b4264"/>';
svg+=box(65,238,350,158,'GitHub / GitHub Actions',['記事JSONを保存 → 形式を検査','Node.js 24 → 既存WorkerのAPI','INGEST_TOKENで記事の受信を認証'],'既存の記事反映経路は確認済み',true);
svg+=box(535,238,370,158,'ChatGPT 専用クラウドタスク',['毎日8:00ごろ：Webで調査・選定','6テーマの短い独自解説・出典を作る','既存ChatGPT契約の利用枠を使用'],state.scheduleVerified&&state.publicationVerified?'定期設定・初回のサイト反映を確認済み':'定期設定・クラウド書込みの検証待ち',state.scheduleVerified&&state.publicationVerified);
svg+=box(1025,238,350,158,'Googleログイン',['OpenID Connect：本人を確認','取得権限はopenidのみ','メールやパスワードをDBへ保存しない'],'既存ログインを維持',true);
svg+=box(65,520,350,175,'閲覧画面（ブラウザ）',['HTML / CSS / JavaScript','見出し一覧 → クリックで詳細へ','6タブ・あとで読む・設定・問い合わせ'],'既存URL・一覧と詳細を確認済み',true);
svg+=box(535,495,370,218,'Cloudflare Workers',['既存サイトのAPI・記事受信と表示','Secrets：Google秘密情報・認証キー','INGEST_TOKENを公開コードから分離','ログイン・利用者別保存・無料枠制御'],'既存 news-pocket を更新',true);
svg+=box(1025,520,350,175,'Cloudflare D1',['SQLite互換のデータベース','記事・出典・更新実績を保存','利用者・保存・利用枠・非公開問い合わせ'],'既存DB・保存済みデータを維持',true);
svg+=box(535,760,370,145,'Cloudflare Workers AI',['Qwen3：従来の本文要約用に接続','利用条件の確認待ちで本文要約は停止'],'今回の毎日更新では使用しない',false);
svg+=arrow('M240 396V445H610V488','できた記事を配信',260,434);
svg+=arrow('M535 315H422','記事JSONの書込み',430,215);
svg+=arrow('M1200 396V455H825V488','Googleで本人確認',1028,444);
svg+=arrow('M415 574H528','HTTPS /api',427,556);
svg+=arrow('M535 628H422');
svg+=arrow('M905 575H1018','保存・参照',926,556);
svg+=label(65,747,'閲覧はスマホ・PCから',18,colors.ink)+label(65,777,'記事を読むだけでAIを再実行しない',16)+label(65,807,'出典リンクは詳細画面に表示',16);
svg+=label(1030,747,'通常の未保存記事は90日で整理',16)+label(1030,777,'件数・容量でも整理',16)+label(1030,807,'整理処理は毎日8:35ごろに設定',16);
svg+='<rect x="36" y="938" width="1368" height="162" rx="20" fill="#172b43" stroke="#3d587d"/>';
svg+=label(62,974,'開発・更新に使うツール（毎日の運転中はPC不要）',22,colors.ink)+label(62,1010,'Codex：実装・検証　／　Git・GitHub：コード管理　／　Node.js 24・npm：起動と検査',19)+label(62,1045,'Wrangler：Cloudflareへの公開・D1移行・Secrets登録　／　Google Cloud：ログインの設定',19)+label(62,1078,'確認済み・設定待ちは図の作成時点の状態。日次scheduleの実績は、初回自動実行後に別途確認する。',16,colors.yellow);
svg+='</g></svg>';await writeFile(`${folder}/architecture.svg`,svg);

svg=start(1070,'毎日、新しいニュースが届く仕組み','一覧は見出しだけ。解説・重要な理由・自分への影響・出典は、記事を開いて読む。');
const cards=[['01  専用タスクを起動','ChatGPTのクラウド定期タスク','日本時間8:00ごろを設定する','PCを止めたまま動かす方式','既存の朝ニュースタスクは変更しない'],['02  Webで調査・照合','ChatGPTのWeb検索','6テーマの重要・身近な話を探す','一次発表や信頼できる報道を確認','有料部分・制限された本文は使わない'],['03  ニュースを選ぶ','ChatGPTによる選定','各テーマ0〜3件・全体最大18件','前回の掲載内容と比べて重複を避ける','条件に合わない話で件数を埋めない'],['04  短い独自解説を保存','ChatGPT → GitHubの記事JSON','要点・重要な理由・自分への影響','出典URL・実際の確認日時を付ける','人による全件確認とは表示しない'],['05  検査してサイトへ配信','GitHub Actions → Workers','形式・日時・出典欄を検査','既存の専用キーで受信APIへ送信','形式検査は内容の正しさの保証ではない'],['06  既存サイトへ反映','Cloudflare D1 → 画面','見出し一覧に新しい記事を追加','クリックで詳細・出典を表示','あとで読むはGoogleの利用者別']];
for(let i=0;i<6;i++){const col=i%3,row=Math.floor(i/3),x=48+col*464,y=216+row*288;svg+=box(x,y,416,230,cards[i][0],cards[i].slice(1),null);}
svg+=arrow('M464 330H503')+arrow('M928 330H967')+arrow('M1184 446V476H256V497')+arrow('M464 618H503')+arrow('M928 618H967');
svg+='<rect x="48" y="804" width="1344" height="112" rx="18" fill="#483b24" stroke="#947445"/>';
svg+=label(72,840,'作成できない・承認待ち・利用上限に達したとき',22,colors.yellow)+label(72,872,'前の記事を残す。古い記事を新しい日付で再配信しない。ChatGPT側とActionsの実行履歴を調べる。',18,colors.ink)+label(72,899,'サイトの設定画面では、接続設定と最終反映を区別。定期実行の実績は初回自動実行後に別途確認する。',16);
svg+=label(60,958,'追加の検索API・有料OpenAI APIは使わない。ChatGPTの既存契約の利用枠内で実行する設計。',19,colors.ink)+label(60,993,'Workers AIは今回の毎日更新では呼ばない。既存の本文要約は1人30件・全体50件／日の上限を維持。',17)+label(60,1032,state.publicationVerified?'初回の全工程は成功。10月17日以降、予定時刻に自動で動いた実績を別途確認する。':'現在：専用クラウドタスクからの書込み・定期設定の検証は未完了。追加費用を伴う代替には切り替えない。',17,colors.yellow);
svg+='</g></svg>';await writeFile(`${folder}/daily-flow.svg`,svg);
for(const name of ['architecture','daily-flow'])await writeFile(`${folder}/${name}.html`,`<!doctype html><html lang="ja"><meta charset="utf-8"><title>ニュースポケット ${name}</title><style>html,body{margin:0;background:#10223b;width:1440px}img{display:block;width:1440px}</style><img alt="ニュースポケットの構成・動作を説明する図" src="${name}.svg"></html>`);
console.log('実装と接続状態に基づくSVG図を2点作成しました。');
