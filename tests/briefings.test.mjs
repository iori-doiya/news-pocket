import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile,readdir } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import worker from '../src/worker.mjs';
import { validateBriefing, EDITORIAL_SOURCE } from '../src/briefings.mjs';
import { hash } from '../src/auth.mjs';
import { japanDay } from '../src/model.mjs';
const now=new Date(),day=japanDay(now);
const payload=()=>({version:1,id:`${day}-preview`,issueDate:day,cutoffAt:now.toISOString(),producer:'検証用AI',review:{factsChecked:true,originalWriting:true,sourceTermsChecked:true,noRestrictedText:true},items:[{id:'ai-update',theme:'AI',title:'検証用の新機能に関する独自解説',summary:'これはテストだけで使う架空の独自解説です。新機能についての確認済みの情報を整理しています。',whyItMatters:'普段の作業に関わる変更があるためです。',impact:'実際の用途に合うかを確認して判断できます。',caution:'実ニュースではなくテスト用です。',references:[{name:'検証用出典',url:'https://www.google.com/about/',publishedAt:null,accessedAt:now.toISOString(),usage:'facts-only',reviewNote:'外部取得せず、テストの形式を確認する架空データ。'}]}]});
async function setup(){
  const sql=new DatabaseSync(':memory:');for(const file of (await readdir(new URL('../migrations/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())sql.exec(await readFile(new URL(`../migrations/${file}`,import.meta.url),'utf8'));
  const db={prepare(query){let args=[];return{bind(...values){args=values;return this;},async first(column){const row=sql.prepare(query).get(...args);return column?row?.[column]??null:row??null;},async all(){return{results:sql.prepare(query).all(...args)};},async run(){return{meta:{changes:Number(sql.prepare(query).run(...args).changes)}};}};},async batch(statements){sql.exec('BEGIN');try{const output=[];for(const statement of statements)output.push(await statement.run());sql.exec('COMMIT');return output;}catch(error){sql.exec('ROLLBACK');throw error;}}};
  return {sql,env:{DB:db,DATA_MODE:'live',AUTH_ENABLED:'true',APP_ORIGIN:'https://news.example',INGEST_TOKEN:'test-token-for-briefings-long-enough',FREE_PLAN_CONFIRMED:'true',EDITORIAL_ENABLED:'true',AI_ENABLED:'false'}};
}
const request=(path,method='GET',data,headers={})=>new Request(`https://news.example${path}`,{method,headers:{'Content-Type':'application/json',...headers},...(data?{body:JSON.stringify(data)}:{})});
const admin={Authorization:'Bearer test-token-for-briefings-long-enough'};

test('briefing validates review, source safety, freshness and real themes',()=>{
  const valid=payload();assert.deepEqual(validateBriefing(valid).missingThemes,['日本経済','株式投資','国際情勢','芸能ニュース','日本政治']);
  for(const flag of Object.keys(valid.review)){const invalid=structuredClone(valid);invalid.review[flag]=false;assert.throws(()=>validateBriefing(invalid),/確認/);}
  for(const url of ['http://www.google.com/','https://127.0.0.1/a','https://localhost/a','https://host.internal/a','javascript:alert(1)']){const invalid=payload();invalid.items[0].references[0].url=url;assert.throws(()=>validateBriefing(invalid));}
  const stale=payload();stale.cutoffAt=new Date(Date.now()-49*3600000).toISOString();assert.throws(()=>validateBriefing(stale),/基準時刻/);
  const future=payload();future.cutoffAt=new Date(Date.now()+3600000).toISOString();assert.throws(()=>validateBriefing(future));
  const missing=payload();missing.items[0].references=[];assert.throws(()=>validateBriefing(missing),/出典/);
  const wrong=payload();wrong.items[0].theme='無関係';assert.throws(()=>validateBriefing(wrong),/テーマ/);
});
test('briefing ingestion requires existing ingest auth and explicit enable',async()=>{
  const {env}=await setup();assert.equal((await worker.fetch(request('/api/admin/briefings','POST',payload()),env)).status,401);
  assert.equal((await worker.fetch(request('/api/admin/briefings','POST',payload(),admin),{...env,EDITORIAL_ENABLED:'false'})).status,503);
  const invalid=payload();invalid.review.originalWriting=false;assert.equal((await worker.fetch(request('/api/admin/briefings','POST',invalid,admin),env)).status,400);
  assert.equal(await env.DB.prepare('SELECT count(*) n FROM articles').first('n'),0);
});
test('existing articles, tabs, detail and bookmarks work with a briefing without AI or feed access',async()=>{
  const {env}=await setup();const oldFetch=globalThis.fetch;globalThis.fetch=()=>{throw new Error('External fetching is forbidden for publication and viewing');};
  try{
    const published=await worker.fetch(request('/api/admin/briefings','POST',payload(),admin),env);assert.equal(published.status,200);
    const again=await(await worker.fetch(request('/api/admin/briefings','POST',payload(),admin),env)).json();assert.equal(again.reused,true);assert.equal(again.accepted,0);
    assert.equal(await env.DB.prepare('SELECT count(*) n FROM articles').first('n'),1);
    const list=await(await worker.fetch(request('/api/articles?theme=AI'),env)).json();assert.equal(list.articles.length,1);const article=list.articles[0];assert.equal(article.sourceId,EDITORIAL_SOURCE);assert.equal(article.summary.kind,'editorial');assert.equal(article.canGenerate,false);
    assert.equal((await(await worker.fetch(request('/api/articles?theme=芸能ニュース'),env)).json()).articles.length,0);
    const detail=await(await worker.fetch(request(`/api/articles/${article.id}`),env)).json();assert.ok(detail.article.editorial.whyItMatters);assert.equal(detail.article.editorial.references.length,1);
    const db=env.DB;await db.prepare('INSERT INTO users VALUES(?,?,?)').bind('editorial-reader','subject',now.toISOString()).run();await db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').bind(await hash('editorial-session'),'editorial-reader',now.toISOString(),new Date(Date.now()+3600000).toISOString()).run();
    const auth={Cookie:'np_session=editorial-session',Origin:env.APP_ORIGIN};assert.equal((await worker.fetch(request(`/api/articles/${article.id}/bookmark`,'PUT',null,auth),env)).status,200);
    assert.equal((await(await worker.fetch(request('/api/bookmarks','GET',null,auth),env)).json()).articles[0].id,article.id);
    assert.equal((await worker.fetch(request(`/api/articles/${article.id}/summary`,'POST',null,auth),env)).status,422);assert.equal(await db.prepare('SELECT count(*) n FROM summary_jobs').first('n'),0);
    const status=await(await worker.fetch(request('/api/status'),env)).json();assert.equal(status.sourceCount,0);assert.equal(status.briefing.latest.count,1);assert.equal(status.briefing.automaticPublication,false);assert.equal(status.lastSuccess,null);
    assert.equal((await(await worker.fetch(request('/api/articles'),{...env,EDITORIAL_ENABLED:'false'})).json()).articles.length,0);
  }finally{globalThis.fetch=oldFetch;}
});
test('updates preserve saved article IDs and bad batches cannot partially change an edition',async()=>{
  const {env}=await setup();const initial=payload();await worker.fetch(request('/api/admin/briefings','POST',initial,admin),env);
  const id=await env.DB.prepare('SELECT id FROM articles').first('id');const changed=payload();changed.items[0].summary='内容を更新したテスト用の解説です。変更後も同じ記事IDを使うので、保存との対応を維持できます。';
  await worker.fetch(request('/api/admin/briefings','POST',changed,admin),env);assert.equal(await env.DB.prepare('SELECT id FROM articles').first('id'),id);
  const invalid=payload();invalid.items.push({...invalid.items[0],id:'other',references:[]});assert.equal((await worker.fetch(request('/api/admin/briefings','POST',invalid,admin),env)).status,400);
  assert.equal(await env.DB.prepare('SELECT count(*) n FROM articles').first('n'),1);assert.match(JSON.parse(await env.DB.prepare('SELECT editorial_json FROM articles').first('editorial_json')).summary,/内容を更新/);
  await worker.fetch(request('/api/admin/maintenance','POST',{},admin),env);assert.equal(await env.DB.prepare('SELECT count(*) n FROM articles').first('n'),1);
});
