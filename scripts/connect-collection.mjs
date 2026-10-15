import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const config=JSON.parse(await readFile('wrangler.jsonc','utf8'));
if(config.vars.FREE_PLAN_CONFIRMED!=='true')throw new Error('Freeプランの確認が必要です。');
await mkdir('.secrets',{recursive:true});
const path='.secrets/ingest-token.txt';
let token;
try{token=(await readFile(path,'utf8')).trim();}catch(error){if(error.code!=='ENOENT')throw error;token=randomBytes(48).toString('hex');await writeFile(path,token+'\n',{flag:'wx',mode:0o600});}
if(!/^[a-f0-9]{96}$/.test(token))throw new Error('収集用キーの私有ファイルの形式が不正です。');
const result=spawnSync(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'secret','bulk'],{input:JSON.stringify({INGEST_TOKEN:token}),encoding:'utf8',env:{...process.env,WRANGLER_SEND_METRICS:'false'},maxBuffer:2*1024*1024});
if(result.status!==0)throw new Error('CloudflareへのINGEST_TOKEN登録に失敗しました。秘密の値は表示していません。');
console.log('INGEST_TOKENをCloudflareに登録しました。同じ値をこのリポジトリのGitHub Actions Secretsへ登録してください。値は公開コード・ログに出していません。');
