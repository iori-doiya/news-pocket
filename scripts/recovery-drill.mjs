// This drill creates its own disposable production user and a separate recovery DB.
// It never deletes an existing user's account and never rewinds the serving DB.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { randomBytes,createHash } from 'node:crypto';
const origin=JSON.parse(fs.readFileSync('wrangler.jsonc','utf8')).vars.APP_ORIGIN,production='news-pocket-db';
const dir='.secrets';fs.mkdirSync(dir,{recursive:true});
const stateFile=`${dir}/recovery-drill.json`;
const wrangler=args=>{const r=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args],{encoding:'utf8',maxBuffer:10_000_000,env:{...process.env,WRANGLER_SEND_METRICS:'false'}});if(r.status!==0)throw new Error(`Wrangler失敗: ${args.slice(0,2).join(' ')}。詳細には個人情報が含まれる場合があるため表示しません。`);return r.stdout;};
const query=(name,sql)=>JSON.parse(wrangler(['d1','execute',name,'--remote','--json','--command',sql]))[0].results;
const counts=name=>query(name,'SELECT (SELECT count(*) FROM users) AS users,(SELECT count(*) FROM bookmarks) AS bookmarks,(SELECT count(*) FROM articles) AS articles,(SELECT count(*) FROM summaries) AS summaries,(SELECT count(*) FROM contacts) AS contacts')[0];
const command=process.argv[2];
if(command==='verify-current'){
  const name=`news-pocket-recovery-check-${randomBytes(10).toString('hex')}`;
  const backup=`${dir}/current-recovery-check.sql`;
  const sql='SELECT (SELECT count(*) FROM users) AS users,(SELECT count(*) FROM bookmarks) AS bookmarks,(SELECT count(*) FROM articles) AS articles,(SELECT count(*) FROM summaries) AS summaries,(SELECT count(*) FROM contacts) AS contacts,(SELECT count(*) FROM article_inputs) AS temporaryAbstracts,(SELECT count(*) FROM summary_metrics) AS measurements';
  const before=query(production,sql)[0];
  if(fs.existsSync(backup))throw new Error('今回の復元用SQLが既にあります。上書きしません。');
  wrangler(['d1','export',production,'--remote','--output',backup]);
  let created=false;
  try{
    wrangler(['d1','create',name,'--location','apac','--update-config=false']);created=true;
    wrangler(['d1','execute',name,'--remote','--file',backup,'--yes']);
    const restored=query(name,sql)[0];
    if(JSON.stringify(before)!==JSON.stringify(restored))throw new Error('現在の全表の復元件数が一致しません。');
    fs.writeFileSync(`${dir}/current-recovery-result.json`,JSON.stringify({checkedAt:new Date().toISOString(),counts:restored,passed:true},null,2));
    console.log(JSON.stringify({currentSchemaRestore:'passed',counts:restored}));
  }finally{if(created){wrangler(['d1','delete',name,'--skip-confirmation']);console.log('今回の復元検証専用DBを整理しました。公開DBは変更していません。');}}
}else if(command==='seed'){
  if(fs.existsSync(stateFile))throw new Error('検証記録が既にあります。二重に作成しません。');
  const suffix=randomBytes(10).toString('hex'),id=`drill-${suffix}`,sub=`test-recovery-${suffix}`,token=randomBytes(32).toString('hex');
  const now=new Date().toISOString(),expires=new Date(Date.now()+3600000).toISOString(),contact=randomBytes(32).toString('hex');
  const article=query(production,'SELECT id FROM articles ORDER BY sort_at DESC LIMIT 1')[0]?.id;
  if(!/^[a-f0-9]{64}$/.test(article??''))throw new Error('検証用保存に使う公開記事がありません。');
  const before=counts(production);
  query(production,`INSERT INTO users VALUES('${id}','${sub}','${now}'); INSERT INTO sessions VALUES('${createHash('sha256').update(token).digest('hex')}','${id}','${now}','${expires}'); INSERT INTO bookmarks VALUES('${id}','${article}','${now}'); INSERT INTO contacts(id,user_id,subject,message,created_at) VALUES('${contact}','${id}','復旧検証専用','この検証用レコードは削除・復元テスト後に整理します。','${now}');`);
  fs.writeFileSync(stateFile,JSON.stringify({id,token,before,backup:`${dir}/production-recovery-drill.sql`,recoveryDb:`news-pocket-recovery-check-${suffix}`},null,2));
  console.log('本番に検証専用ユーザー・セッション・保存1件・問い合わせ1件を作成しました。既存ユーザーは変更していません。');
}else{
  const state=JSON.parse(fs.readFileSync(stateFile,'utf8'));
  if(!/^drill-[a-f0-9]{20}$/.test(state.id)||!/^news-pocket-recovery-check-[a-f0-9]{20}$/.test(state.recoveryDb))throw new Error('検証専用の対象を確認できません。');
  if(state.cleaned){console.log('この検証は完了・整理済みです。既存の本番データは変更しません。');process.exit(0);}
  if(command==='backup'){
    if(fs.existsSync(state.backup))throw new Error('既存バックアップを上書きしません。');
    wrangler(['d1','export',production,'--remote','--output',state.backup]);
    console.log('本番DBを非公開SQLへ保存しました。ダウンロードURL・SQL・利用者情報は表示していません。');
  }else if(command==='delete'){
    if(!fs.existsSync(state.backup))throw new Error('先にbackupを実行してください。');
    const response=await fetch(`${origin}/api/account`,{method:'DELETE',headers:{Origin:origin,Cookie:`np_session=${state.token}`,'Content-Type':'application/json'},body:JSON.stringify({confirm:'削除する'})});
    const remaining=query(production,`SELECT (SELECT count(*) FROM users WHERE id='${state.id}') AS users,(SELECT count(*) FROM sessions WHERE user_id='${state.id}') AS sessions,(SELECT count(*) FROM bookmarks WHERE user_id='${state.id}') AS bookmarks,(SELECT count(*) FROM contacts WHERE user_id='${state.id}') AS contacts`)[0];
    const me=await(await fetch(`${origin}/api/me`,{headers:{Cookie:`np_session=${state.token}`}})).json();
    if(response.status!==200||Object.values(remaining).some(n=>n!==0)||me.user!==null)throw new Error('本番削除またはセッション失効の検証に失敗しました。');
    const after=counts(production);if(after.users!==state.before.users||after.bookmarks!==state.before.bookmarks||after.articles!==state.before.articles||after.summaries!==state.before.summaries)throw new Error('既存データの件数が変化しました。公開収集との重なりも含めて確認してください。');
    state.deleted=true;fs.writeFileSync(stateFile,JSON.stringify(state,null,2));
    console.log(JSON.stringify({productionDelete:'passed',remaining,sessionInvalidated:me.user===null,existingDataUnchanged:true}));
  }else if(command==='restore'){
    if(!state.deleted)throw new Error('先に本番削除の検証を完了してください。');
    wrangler(['d1','create',state.recoveryDb,'--location','apac','--update-config=false']);
    state.created=true;fs.writeFileSync(stateFile,JSON.stringify(state,null,2));
    wrangler(['d1','execute',state.recoveryDb,'--remote','--file',state.backup,'--yes']);
    const restored=query(state.recoveryDb,`SELECT (SELECT count(*) FROM users WHERE id='${state.id}') AS users,(SELECT count(*) FROM sessions WHERE user_id='${state.id}') AS sessions,(SELECT count(*) FROM bookmarks WHERE user_id='${state.id}') AS bookmarks,(SELECT count(*) FROM contacts WHERE user_id='${state.id}') AS contacts`)[0];
    if(Object.values(restored).some(n=>n!==1))throw new Error('別DBへの復元結果が期待と異なります。');
    state.restored=true;fs.writeFileSync(stateFile,JSON.stringify(state,null,2));
    console.log(JSON.stringify({separateRemoteDatabaseRestore:'passed',restored,servingDatabaseUnchanged:true}));
  }else if(command==='cleanup'){
    if(!state.created)throw new Error('この検証で作成したDBがありません。');
    wrangler(['d1','delete',state.recoveryDb,'--skip-confirmation']);
    state.cleaned=true;delete state.token;fs.writeFileSync(stateFile,JSON.stringify(state,null,2));
    console.log('検証専用の別DBを削除しました。本番DBと非公開バックアップは保持しています。');
  }else throw new Error('seed / backup / delete / restore / cleanup のいずれかを指定してください。');
}
