import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateBriefing } from '../src/briefings.mjs';
import { japanDay } from '../src/model.mjs';

const folder=resolve('data/briefings');
async function main(){
  const filename=process.argv.slice(2).find(arg=>!arg.startsWith('--'));
  let path;
  if(filename)path=resolve(filename);
  else {
    const candidates=await Promise.all((await readdir(folder)).filter(f=>f.startsWith(`${japanDay()}-`)&&f.endsWith('.json')).map(async name=>({name,cutoff:Date.parse(JSON.parse(await readFile(resolve(folder,name),'utf8')).cutoffAt)})));
    candidates.sort((a,b)=>b.cutoff-a.cutoff||b.name.localeCompare(a.name));
    if(!candidates.length){console.log('今日の編集便データはありません。反映成功時刻は変更しません。');return;}
    path=resolve(folder,candidates[0].name);
  }
  const data=JSON.parse(await readFile(path,'utf8'));
  const edition=validateBriefing(data);
  if(process.argv.includes('--check')){console.log(`編集便の形式・出典・確認欄：${edition.items.length}件、未掲載テーマ${edition.missingThemes.length}件。内容の真偽の自動保証ではありません。`);return;}
  const origin=process.env.SITE_URL,token=process.env.INGEST_TOKEN;
  if(!origin||!token||token.length<32)throw new Error('SITE_URLとINGEST_TOKENが必要です。秘密の値は表示しません。');
  const url=new URL(origin);if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('SITE_URLにはHTTPSの公開サイトのルートを指定してください。');
  const trigger=['push','schedule'].includes(process.env.GITHUB_EVENT_NAME)?process.env.GITHUB_EVENT_NAME:'manual';
  const response=await fetch(new URL('/api/admin/briefings',url),{method:'POST',redirect:'error',signal:AbortSignal.timeout(30000),headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({...data,trigger,runId:process.env.GITHUB_RUN_ID??null})});
  if(!response.ok)throw new Error(`編集便の反映失敗 HTTP ${response.status}。秘密・記事本文はログへ出しません。`);
  const result=await response.json();
  console.log(result.reused?'同じ編集便は反映済みです。再生成・重複登録は行いません。':`編集便 ${result.id} を${result.accepted}件反映しました。`);
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
