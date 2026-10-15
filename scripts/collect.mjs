import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { sourcePublic } from '../src/model.mjs';
import { fetchFeed } from '../src/feed.mjs';
const sources=JSON.parse(await readFile(new URL('../config/sources.json',import.meta.url),'utf8'));
const enabled=sources.filter(sourcePublic);
const origin=process.env.SITE_URL;
const token=process.env.INGEST_TOKEN;
async function post(path,data){const response=await fetch(new URL(path,origin),{method:'POST',signal:AbortSignal.timeout(30000),headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(data)});if(!response.ok)throw new Error(`サイト登録失敗 HTTP ${response.status}`);return response.json();}
async function run(){
  if(!origin||!token){if(!enabled.length){console.log('有効な情報源は0件。収集は行っていません。接続設定も未確認です。');return;}throw new Error('SITE_URLとINGEST_TOKENをGitHub Secrets/Variablesに登録してください。');}
  const url=new URL(origin);if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('SITE_URLにはHTTPSのサイトのルートURLを指定してください。');
  await post('/api/admin/maintenance',{});
  if(!enabled.length){console.log('容量整理のみ実行。情報源0件のため収集成功時刻は変更しません。');return;}
  const articles=[],successSources=[],failedSources=[];
  for(const source of enabled){
    try{
      const feed=await fetchFeed(source);
      if(!feed.length)throw new Error('公開可能な項目が0件です');
      successSources.push(source.id);
      for(const {body,scope,...entry} of feed){articles.push({...entry,contentHash:createHash('sha256').update(body).digest('hex')});}
      console.log(`${source.id}: ${feed.length}件取得（本文は送信・保存しません）`);
    }catch{failedSources.push(source.id);console.error(`${source.id}: 取得失敗。秘密情報・原文はログに出しません。`);}
  }
  // Limit the complete hourly batch so D1's free write/CPU budget stays bounded.
  const unique=[...new Map(articles.map(a=>[a.url,a])).values()].sort((a,b)=>Date.parse(b.publishedAt??b.collectedAt)-Date.parse(a.publishedAt??a.collectedAt)).slice(0,100);
  const result=await post('/api/admin/ingest',{articles:unique,successSources,failedSources});
  console.log(`登録対象 ${result.accepted}件。${failedSources.length?'取得失敗あり・最終成功時刻は据え置き':'収集成功'}`);
  if(failedSources.length)process.exitCode=1;
}
run().catch(error=>{console.error(error.message);process.exitCode=1;});
