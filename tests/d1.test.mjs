import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import worker, { maintenance } from '../src/worker.mjs';
test('real local D1 applies schema, enforces quota triggers, and cleans capacity', async()=>{
  const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB'],compatibilityDate:'2026-10-14'}));
  try{
    const db=await mf.getD1Database('DB');
    const sql=(await readFile(new URL('../migrations/0001_initial.sql',import.meta.url),'utf8'))+'\n'+(await readFile(new URL('../migrations/0002_connections.sql',import.meta.url),'utf8'))+'\n'+(await readFile(new URL('../migrations/0003_ai_model.sql',import.meta.url),'utf8'))+'\n'+(await readFile(new URL('../migrations/0004_input_cache.sql',import.meta.url),'utf8'))+'\n'+(await readFile(new URL('../migrations/0005_summary_limits.sql',import.meta.url),'utf8'))+'\n'+(await readFile(new URL('../migrations/0006_editorial_briefings.sql',import.meta.url),'utf8'))+'\n'+(await readFile(new URL('../migrations/0007_daily_news.sql',import.meta.url),'utf8'))+'\n'+(await readFile(new URL('../migrations/0008_chatgpt_news.sql',import.meta.url),'utf8'));
    // D1 exec requires one whole SQL command per line, including trigger bodies.
    const commands=sql.replace(/^--.*$/gm,'').split(/;(?=\s*(?:PRAGMA|CREATE|ALTER|DROP|$))/).map(s=>s.trim()).filter(Boolean);
    for(const command of commands)await db.exec(command.replace(/\s+/g,' ')+';');
    await db.prepare('INSERT INTO users VALUES(?,?,?)').bind('u','google-test','2026-10-15').run();
    await db.prepare('INSERT INTO articles(id,source_id,url,title,themes,published_at,collected_at,sort_at,content_hash) VALUES(?,?,?,?,?,?,?,?,?)').bind('a','test-source','https://fixture.example/a','title','["AI"]',null,'2026-10-15','2026-10-15','a'.repeat(64)).run();
    await db.prepare("INSERT INTO summary_jobs VALUES(?,?,?,?,?,'pending',250,?,?)").bind('j','a','u','2026-10-15','2026-10-15','2026-10-15','2026-10-16').run();
    await assert.rejects(db.prepare("INSERT INTO summary_jobs VALUES(?,?,?,?,?,'pending',250,?,?)").bind('j2','a','u','2026-10-15','2026-10-15','2026-10-15','2026-10-16').run(),/UNIQUE/);
    await db.prepare('INSERT INTO bookmarks VALUES(?,?,?)').bind('u','a','2026-10-15').run();
    await db.prepare('DELETE FROM articles WHERE id=?').bind('a').run();
    assert.equal(await db.prepare('SELECT count(*) n FROM bookmarks').first('n'),0);
    assert.equal(await db.prepare("SELECT article_id FROM summary_jobs WHERE id='j'").first('article_id'),null);
    await maintenance({DB:db});
    const result=await worker.fetch(new Request('https://news.example/api/admin/maintenance',{method:'POST',headers:{Authorization:'Bearer test-ingest-token-that-is-long-enough'}}),{DB:db,DATA_MODE:'live',FREE_PLAN_CONFIRMED:'true',INGEST_TOKEN:'test-ingest-token-that-is-long-enough'});
    assert.equal(result.status,200);
    assert.equal(typeof (await result.json()).estimatedBytes,'number');
  }finally{await mf.dispose();}
});

test('Workers runtime supports the feed redirect policy and does not follow redirects',async()=>{
  const code=await readFile(new URL('../src/feed.mjs',import.meta.url),'utf8');
  const policy=code.match(/fetcher\(feedUrl, \{ redirect: '([^']+)'/)[1];
  let calls=0;
  const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:`export default {async fetch(){const r=await fetch('https://fixture.example/feed',{redirect:${JSON.stringify(policy)}});return new Response(String(r.status));}}`,outboundService:()=>{calls++;return new Response('',{status:302,headers:{Location:'https://unreviewed.example/feed'}});},compatibilityDate:'2026-10-14'}));
  try{assert.equal(await(await mf.dispatchFetch('http://localhost')).text(),'302');assert.equal(calls,1);}finally{await mf.dispose();}
});
