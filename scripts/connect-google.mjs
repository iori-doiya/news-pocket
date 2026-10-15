import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {resolve} from 'node:path';

// The downloaded credential stays local. Only secrets are sent on stdin to
// official Wrangler; neither values nor the download's contents are printed.
const configPath=resolve('wrangler.jsonc');
const config=JSON.parse(await readFile(configPath,'utf8'));
let web;
try { web=JSON.parse(await readFile(process.argv[2]??'.secrets/google-oauth.json','utf8')).web; }
catch { throw new Error('GoogleからダウンロードしたJSONを .secrets/google-oauth.json に置いてください。内容は画面やチャットへ貼り付けないでください。'); }
const origin=config.vars.APP_ORIGIN;
if(!/^https:\/\/[^/]+\.workers\.dev$/.test(origin)||config.vars.FREE_PLAN_CONFIRMED!=='true')throw new Error('公開先URLとWorkers Freeの確認が必要です。');
if(!web||!/^\w[\w-]*\.apps\.googleusercontent\.com$/.test(web.client_id??'')||typeof web.client_secret!=='string'||web.client_secret.length<16||!web.redirect_uris?.includes(`${origin}/api/auth/callback`))throw new Error('ウェブアプリ用JSONのクライアントID・シークレット・承認済みリダイレクトURIを確認してください。');
const cli=resolve('node_modules/wrangler/bin/wrangler.js');
const run=(args,input)=>spawnSync(process.execPath,[cli,...args],{input,encoding:'utf8',env:{...process.env,WRANGLER_SEND_METRICS:'false'},maxBuffer:2*1024*1024});
const list=run(['secret','list','--format','json']);
if(list.status!==0)throw new Error('Cloudflare Secretsの一覧を取得できません。wrangler loginを確認してください。秘密の値は表示していません。');
let existing;
try {existing=JSON.parse(list.stdout);}catch{throw new Error('Secrets一覧の形式を読み取れません。秘密の値は表示していません。');}
const secrets={GOOGLE_CLIENT_SECRET:web.client_secret};
if(!existing.some(s=>s.name==='SESSION_SECRET'))secrets.SESSION_SECRET=randomBytes(48).toString('hex');
const result=run(['secret','bulk'],JSON.stringify(secrets));
if(result.status!==0)throw new Error('CloudflareへのSecrets登録に失敗しました。AUTH_ENABLEDは変更していません。再ログイン後に再実行してください。');
config.vars.GOOGLE_CLIENT_ID=web.client_id; // This ID is public by design.
config.vars.AUTH_ENABLED='true';
await writeFile(configPath,JSON.stringify(config,null,2)+'\n');
console.log('Google用の秘密情報をCloudflareに登録し、公開クライアントIDとAUTH_ENABLEDを設定しました。秘密の値は表示していません。');
console.log('次に npm run check、npm test、npm run build、npm run deploy を実行してください。Googleでの実ログイン成功は別途確認が必要です。');
