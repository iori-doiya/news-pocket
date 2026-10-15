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
  if(!enabled.length||process.env.COLLECTION_ENABLED==='false'){console.log('ニュース収集は停止中。期限切れデータの整理のみ実行し、記事の収集成功時刻は変更しません。');return;}
  const articles=[],successSources=[],failedSources=[];
  for(const source of enabled){
    try{
      if(source.cacheInput)await post('/api/admin/source-lease',{sourceId:source.id});
      const feed=await fetchFeed(source);
      if(!feed.length)throw new Error('公開可能な項目が0件です');
      successSources.push(source.id);
      for(const {body,scope,...entry} of feed){articles.push({...entry,contentHash:createHash('sha256').update(body).digest('hex'),...(source.cacheInput&&body.length<=8000?{inputText:body}:{})});}
      console.log(`${source.id}: ${feed.length}件取得（${source.cacheInput?'CC0の要旨のみ24時間キャッシュ':'本文は送信・保存しません'}）`);
    }catch{failedSources.push(source.id);console.error(`${source.id}: 取得失敗。秘密情報・原文はログに出しません。`);}
  }
  // Limit the complete hourly batch so D1's free write/CPU budget stays bounded.
  // Give every publisher room before filling the remainder with newest items.
  const buckets=enabled.map(s=>articles.filter(a=>a.sourceId===s.id).sort((a,b)=>Date.parse(b.publishedAt??b.collectedAt)-Date.parse(a.publishedAt??a.collectedAt)));
  const picked=[],seen=new Set();
  for(let i=0;picked.length<100 && buckets.some(b=>b.length>i);i++)for(const bucket of buckets){const a=bucket[i];if(a&&!seen.has(a.url)&&picked.length<100){seen.add(a.url);picked.push(a);}}
  const unique=picked;
  const trigger=process.env.GITHUB_EVENT_NAME==='schedule'?'schedule':process.env.GITHUB_EVENT_NAME==='workflow_dispatch'?'workflow_dispatch':'local';
  const runId=/^\d{1,20}$/.test(process.env.GITHUB_RUN_ID??'')?process.env.GITHUB_RUN_ID:null;
  const result=await post('/api/admin/ingest',{articles:unique,successSources,failedSources,trigger,runId});
  console.log(`登録対象 ${result.accepted}件。${failedSources.length?'取得失敗あり・最終成功時刻は据え置き':'収集成功'}`);
  if(failedSources.length)process.exitCode=1;
}
run().catch(error=>{console.error(error.message);process.exitCode=1;});
