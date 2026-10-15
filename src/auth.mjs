import { createRemoteJWKSet, jwtVerify } from 'jose';
const keys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const encoder = new TextEncoder();
export function randomToken() { return Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2,'0')).join(''); }
export async function hash(value) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))), b => b.toString(16).padStart(2,'0')).join(''); }
export function cookie(request, name) { return (request.headers.get('cookie') ?? '').split(';').map(s => s.trim()).find(s => s.startsWith(`${name}=`))?.slice(name.length + 1) ?? ''; }
export function cookieValue(name, value, maxAge, origin, path = '/') { return `${name}=${value}; HttpOnly; SameSite=Lax; Path=${path}; Max-Age=${maxAge}${new URL(origin).protocol === 'https:' ? '; Secure' : ''}`; }
async function sign(value, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))), b => b.toString(16).padStart(2,'0')).join('');
}
export function equal(a, b) { if (a.length !== b.length) return false; let diff = 0; for (let i=0;i<a.length;i++) diff |= a.charCodeAt(i)^b.charCodeAt(i); return diff===0; }
export function authConfigured(env) { return !!(env.DB && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.SESSION_SECRET?.length >= 32 && env.APP_ORIGIN && env.AUTH_ENABLED === 'true'); }
export async function currentUser(request, env) {
  const token = cookie(request, 'np_session');
  if (!token || !env.DB || env.AUTH_ENABLED !== 'true') return null;
  return env.DB.prepare('SELECT users.id, sessions.created_at FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?').bind(await hash(token), new Date().toISOString()).first();
}
export async function startAuth(env, reauth = false) {
  const payload = { state:randomToken(), nonce:randomToken(), verifier:randomToken(), expires:Date.now()+600000, reauth };
  const data = btoa(JSON.stringify(payload));
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID, redirect_uri:`${env.APP_ORIGIN}/api/auth/callback`, response_type:'code', scope:'openid', state:payload.state, nonce:payload.nonce, code_challenge:btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(payload.verifier))))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_'), code_challenge_method:'S256', prompt:'select_account', ...(reauth ? {max_age:'0'} : {})}).toString();
  return new Response(null,{status:302,headers:{Location:url.href,'Set-Cookie':cookieValue('np_oauth',`${data}.${await sign(data,env.SESSION_SECRET)}`,600,env.APP_ORIGIN,'/api/auth/'),'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
}
export async function finishAuth(request, env) {
  const [data, signature] = cookie(request,'np_oauth').split('.');
  const url = new URL(request.url);
  if (!data || !signature || !equal(signature,await sign(data,env.SESSION_SECRET))) throw new Error('AUTH_STATE');
  const payload = JSON.parse(atob(data));
  if (payload.expires < Date.now() || !equal(url.searchParams.get('state') ?? '',payload.state) || !url.searchParams.get('code')) throw new Error('AUTH_STATE');
  const response = await fetch('https://oauth2.googleapis.com/token',{method:'POST',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code:url.searchParams.get('code'),client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,redirect_uri:`${env.APP_ORIGIN}/api/auth/callback`,grant_type:'authorization_code',code_verifier:payload.verifier})});
  if (!response.ok) throw new Error('AUTH_TOKEN');
  const tokenData = await response.json();
  const {payload: identity} = await jwtVerify(tokenData.id_token,keys,{issuer:['https://accounts.google.com','accounts.google.com'],audience:env.GOOGLE_CLIENT_ID,algorithms:['RS256'],maxTokenAge:'10m'});
  if (identity.nonce !== payload.nonce || typeof identity.sub !== 'string' || (payload.reauth && (!identity.auth_time || Date.now()/1000 - identity.auth_time > 600))) throw new Error('AUTH_IDENTITY');
  const now = new Date().toISOString();
  await env.DB.prepare('INSERT INTO users(id,google_sub,created_at) VALUES(?,?,?) ON CONFLICT(google_sub) DO NOTHING').bind(randomToken(),identity.sub,now).run();
  const user = await env.DB.prepare('SELECT id FROM users WHERE google_sub = ?').bind(identity.sub).first();
  const session = randomToken();
  const oldToken = cookie(request,'np_session');
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE token_hash = ? OR expires_at < ?').bind(oldToken ? await hash(oldToken) : '',now),
    env.DB.prepare('INSERT INTO sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)').bind(await hash(session),user.id,now,new Date(Date.now()+7*86400000).toISOString())
  ]);
  const headers = new Headers({Location:`${env.APP_ORIGIN}/#settings`,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
  headers.append('Set-Cookie',cookieValue('np_session',session,7*86400,env.APP_ORIGIN));
  headers.append('Set-Cookie',cookieValue('np_oauth','',0,env.APP_ORIGIN,'/api/auth/'));
  return new Response(null,{status:302,headers});
}
