import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deploymentOrigin,legacyRedirect,PAGE_PATHS} from '../src/site-origin.mjs';
import worker from '../src/worker.mjs';
import {readFile} from 'node:fs/promises';
const old='https://news-pocket.iori-sato-4637.workers.dev',site='https://my-news-pocket.com';
const env={DATA_MODE:'live',APP_ORIGIN:site,LEGACY_APP_ORIGIN:old};

test('deployment accepts HTTPS custom domains only when their exact route is configured',()=>{
  const config={vars:{APP_ORIGIN:site},routes:[{pattern:'my-news-pocket.com',custom_domain:true}]};
  assert.equal(deploymentOrigin(config).origin,site);
  assert.equal(deploymentOrigin({vars:{APP_ORIGIN:old}}).origin,old);
  for(const origin of ['http://my-news-pocket.com',site+'/',site+'/path',site+'?x=1',site+'#home','https://a:b@my-news-pocket.com','https://my-news-pocket.com:8443','https://127.0.0.1','https://localhost'])assert.throws(()=>deploymentOrigin({...config,vars:{APP_ORIGIN:origin}}));
  assert.throws(()=>deploymentOrigin({vars:{APP_ORIGIN:site}}));
  assert.throws(()=>deploymentOrigin({...config,routes:[{pattern:'other.example',custom_domain:true}]}));
});
test('legacy pages and login entry redirect before cookies are created; API reads and writes stay in place',async()=>{
  for(const path of [...PAGE_PATHS,'/api/auth/start?reauth=1']){
    const response=await worker.fetch(new Request(old+path),env);
    assert.equal(response.status,302);assert.equal(response.headers.get('location'),site+path);
    assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('set-cookie'),null);
  }
  for(const path of ['/api/articles','/api/status','/api/auth/callback?code=test','/styles.css'])assert.equal(legacyRedirect(new Request(old+path),env),null);
  for(const url of [site+'/', 'https://foreign.example/'])assert.equal(legacyRedirect(new Request(url),env),null);
  assert.equal(legacyRedirect(new Request(old+'/'),{...env,DATA_MODE:'sample'}),null);
  const post=new Request(old+'/api/auth/logout',{method:'POST',headers:{Origin:old}});
  assert.equal(legacyRedirect(post,env),null);assert.equal((await worker.fetch(post,env)).status,403);
});
test('all legacy HTML pages reach the Worker so the hostname redirect is applied in production',async()=>{
  const config=JSON.parse(await readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
  for(const path of PAGE_PATHS)assert.ok(config.assets.run_worker_first.includes(path));
});
