import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {sourcePublic,FREE_MODEL} from '../src/model.mjs';
// This configuration file intentionally uses JSON syntax (JSONC extension for Wrangler).
const config=JSON.parse(await readFile('wrangler.jsonc','utf8'));
const sources=JSON.parse(await readFile('config/sources.json','utf8'));
if(config.vars.FREE_PLAN_CONFIRMED!=='true')throw new Error('CloudflareのFreeプランを画面で確認後、FREE_PLAN_CONFIRMEDをtrueにしてください。');
if(!/^https:\/\/[^/]+\.workers\.dev$/.test(config.vars.APP_ORIGIN))throw new Error('APP_ORIGINを末尾スラッシュなしの無料workers.dev URLに設定してください。');
if(config.d1_databases[0].database_id==='00000000-0000-0000-0000-000000000000')throw new Error('D1を作成し、実際のdatabase_idを設定してください。');
if(config.vars.DATA_MODE==='live'){
  if(!sources.some(sourcePublic))throw new Error('実ニュース版の公開には、公開条件確認済みの情報源が最低1件必要です。サンプル公開はDATA_MODE=sampleで行えます。');
  if(config.vars.AUTH_ENABLED!=='true'||!config.vars.GOOGLE_CLIENT_ID||!config.vars.CONTACT_URL?.startsWith('https://'))throw new Error('実ニュース版はGoogle設定とCONTACT_URL（問い合わせ先）が必要です。');
}
if(config.vars.AUTH_ENABLED==='true'&&!/^[\w-]+\.apps\.googleusercontent\.com$/.test(config.vars.GOOGLE_CLIENT_ID))throw new Error('Googleの公開クライアントIDを設定してください。シークレットはwrangler secretで登録します。');
if(config.vars.AI_ENABLED==='true'&&config.vars.AI_MODEL!==FREE_MODEL)throw new Error('検証対象の無料モデル以外は使用できません。');
const result=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','deploy'],{stdio:'inherit'});
process.exit(result.status??1);
