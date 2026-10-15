import { currentUser, hash, sign, randomToken, equal } from './auth.mjs';
import { utcDay } from './model.mjs';

export const contactConfigured = env => env.DATA_MODE==='live' && !!env.DB && /^[a-f0-9]{64}$/.test(env.ADMIN_SUB_HASH??'') && env.SESSION_SECRET?.length>=32;
export async function isOperator(env,user) { return !!(user?.google_sub && env.ADMIN_SUB_HASH && equal(await hash(user.google_sub),env.ADMIN_SUB_HASH)); }

// Returns data; the main API owns JSON errors, CSRF checks and response headers.
export async function contactApi(request,env,{fail,readJson,originCheck}) {
  const path=new URL(request.url).pathname;
  if(path==='/api/contact'&&request.method==='GET') return {available:contactConfigured(env)};
  if(!contactConfigured(env))fail(503,'非公開の問い合わせ窓口は未接続です。');
  if(path==='/api/contact'&&request.method==='POST') {
    originCheck(request,env);
    const data=await readJson(request,14000);
    const subject=String(data.subject??'').trim(),message=String(data.message??'').trim(),replyEmail=String(data.replyEmail??'').trim();
    if(data.website || !subject || subject.length>100 || message.length<10 || message.length>3000 || replyEmail.length>254 || (replyEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyEmail)))fail(400,'件名は100文字、本文は10〜3,000文字で入力してください。返信先は任意です。');
    const user=await currentUser(request,env), id=randomToken();
    const day=utcDay(),rateKey=await sign(`${day}:${request.headers.get('CF-Connecting-IP')??'local'}`,env.SESSION_SECRET);
    try { await env.DB.batch([
      env.DB.prepare('INSERT INTO contact_quota(day,rate_key,count) VALUES(?,?,1) ON CONFLICT(day,rate_key) DO UPDATE SET count=count+1').bind(day,'site'),
      env.DB.prepare('INSERT INTO contact_quota(day,rate_key,count) VALUES(?,?,1) ON CONFLICT(day,rate_key) DO UPDATE SET count=count+1').bind(day,rateKey),
      env.DB.prepare('INSERT INTO contacts(id,user_id,subject,message,reply_email,created_at) VALUES(?,?,?,?,?,?)').bind(id,user?.id??null,subject,message,replyEmail,new Date().toISOString())
    ]); }catch(error){if(/CONTACT_/.test(String(error.message)))fail(429,'本日の問い合わせ送信上限に達しました。翌日以降にお試しください。');throw error;}
    return {ok:true,reference:id.slice(0,12)};
  }
  const user=await currentUser(request,env);
  if(!await isOperator(env,user))fail(403,'運営者のGoogleログインが必要です。');
  if(path==='/api/operator/contacts'&&request.method==='GET')return {contacts:(await env.DB.prepare('SELECT id,subject,message,reply_email AS replyEmail,created_at AS createdAt,status FROM contacts ORDER BY created_at DESC LIMIT 100').all()).results};
  const match=path.match(/^\/api\/operator\/contacts\/([a-f0-9]{64})$/);
  if(match&&request.method==='PATCH') {originCheck(request,env);await env.DB.prepare("UPDATE contacts SET status='read' WHERE id=?").bind(match[1]).run();return {ok:true};}
  if(match&&request.method==='DELETE') {originCheck(request,env);const data=await readJson(request,200);if(data.confirm!=='削除する')fail(400,'削除確認が必要です。');await env.DB.prepare('DELETE FROM contacts WHERE id=?').bind(match[1]).run();return {ok:true};}
  fail(404,'この操作は見つかりません。');
}
