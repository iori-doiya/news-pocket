// Workers Assets also serves HTML at extensionless URLs.
export const PAGE_PATHS = ['/', '/index.html', '/contact.html', '/contact', '/privacy.html', '/privacy', '/terms.html', '/terms', '/home-screen.html', '/home-screen'];

export function deploymentOrigin(config) {
  const value=config.vars?.APP_ORIGIN;
  let url;
  try { url=new URL(value); } catch { throw new Error('APP_ORIGINに正しいHTTPSのURLを設定してください。'); }
  if(url.protocol!=='https:'||url.origin!==value||url.port||! /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(url.hostname))throw new Error('APP_ORIGINは末尾スラッシュ・認証情報・ポートを含まないHTTPSのドメインにしてください。');
  if(!url.hostname.endsWith('.workers.dev')&&!config.routes?.some(route=>route.custom_domain===true&&route.pattern===url.hostname))throw new Error('独自ドメインはroutesのcustom_domain:trueとAPP_ORIGINのホスト名を一致させてください。');
  return url;
}

export function legacyRedirect(request,env) {
  if(env.DATA_MODE!=='live'||!env.LEGACY_APP_ORIGIN||env.APP_ORIGIN===env.LEGACY_APP_ORIGIN||!['GET','HEAD'].includes(request.method))return null;
  const incoming=new URL(request.url);
  if(incoming.origin!==env.LEGACY_APP_ORIGIN||(!PAGE_PATHS.includes(incoming.pathname)&&incoming.pathname!=='/api/auth/start'))return null;
  const target=new URL(env.APP_ORIGIN);
  if(target.protocol!=='https:')return null;
  target.pathname=incoming.pathname;
  target.search=incoming.search;
  // A temporary, uncached redirect also permits a safe rollback during migration.
  return new Response(null,{status:302,headers:{Location:target.href,'Cache-Control':'no-store'}});
}
