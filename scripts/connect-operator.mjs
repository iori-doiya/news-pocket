import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const wrangler='node_modules/wrangler/bin/wrangler.js';
const r=spawnSync(process.execPath,[wrangler,'d1','execute','news-pocket-db','--remote','--json','--command','SELECT google_sub FROM users'],{encoding:'utf8',maxBuffer:1_000_000,env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
if(r.status!==0)throw new Error('本番D1の利用者を確認できません。Wranglerの認証を確認してください。');
let rows;try{rows=JSON.parse(r.stdout)[0].results;}catch{throw new Error('D1の応答形式を確認してください。秘密値は表示しません。');}
if(rows.length!==1)throw new Error('利用者が1人の初回接続専用です。複数人の場合は運営者を個別に選ぶ必要があります。');
const adminHash=createHash('sha256').update(rows[0].google_sub).digest('hex');
const secret=spawnSync(process.execPath,[wrangler,'secret','bulk'],{input:JSON.stringify({ADMIN_SUB_HASH:adminHash}),encoding:'utf8',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
if(secret.status!==0)throw new Error('運営者の照合値をCloudflare Secretsに登録できませんでした。');
console.log('現在の唯一の利用者を非公開受信箱の運営者に設定しました。Googleの識別子・秘密値は表示していません。');
