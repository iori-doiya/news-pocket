import {writeFile} from 'node:fs/promises';

// This is a plain-language view of the same deployed architecture.
// Keep services and connection claims aligned with status.json and the operating guide.
export async function renderSimpleArchitecture(folder,state){
  const ink='#17314d',muted='#49627b',blue='#2362d4',green='#087861';
  const text=(x,y,s,size=24,color=ink,weight=400,anchor='start')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}" text-anchor="${anchor}">${s}</text>`;
  const line=(d,color=blue)=>`<path d="${d}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" marker-end="url(#arrow)"/>`;
  const card=(x,n,title)=>`<rect x="${x}" y="245" width="326" height="298" rx="24" fill="white" stroke="#c9daee" stroke-width="2"/><circle cx="${x+36}" cy="280" r="19" fill="${blue}"/>${text(x+36,287,n,23,'white',700,'middle')}${text(x+163,330,title,30,ink,700,'middle')}`;
  const icon=(x,y,type)=>{
    const shapes={search:'<circle cx="23" cy="22" r="15"/><path d="m35 34 14 14M16 18h14M16 26h10"/>',file:'<path d="M12 4h26l12 12v38H12ZM38 4v14h12M21 29h20M21 39h20"/>',site:'<rect x="4" y="7" width="54" height="39" rx="5"/><path d="M4 18h54M23 46v9m16-9v9M17 55h28M12 12h1m6 0h1"/>',person:'<circle cx="30" cy="14" r="10"/><path d="M12 54V41c0-17 36-17 36 0v13M4 54h52"/>'};
    return `<g transform="translate(${x} ${y})" fill="none" stroke="${blue}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">${shapes[type]}</g>`;
  };
  let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1100" viewBox="0 0 1600 1100"><defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto"><path d="M0 0 8 4 0 8Z" fill="${blue}"/></marker></defs><rect width="1600" height="1100" fill="#f1f6fc"/><rect width="1600" height="155" fill="#133f91"/><g font-family="'Yu Gothic',Meiryo,'Noto Sans JP',sans-serif">`;
  svg+=text(55,66,'ニュースポケットは、こう動く',44,'white',700)+text(58,114,'ChatGPTがニュースを作り、GitHub Actionsがサイトへ届けます。',28,'#e1edff');
  svg+='<rect x="55" y="180" width="470" height="43" rx="21" fill="#e0edff"/>';
  svg+=text(290,209,'毎日 朝8:00ごろに自動更新する設定',24,blue,700,'middle')+text(1545,210,'あなたのPCを止めていても動く構成',24,muted,400,'end');
  const xs=[55,443,831,1219];
  svg+=card(xs[0],'1','探す・まとめる')+icon(186,350,'search')+text(218,445,'ChatGPT',32,blue,700,'middle')+text(218,485,'Webから重要ニュースを選び',22,ink,400,'middle')+text(218,516,'短い解説と出典を作る',22,ink,400,'middle');
  svg+=card(xs[1],'2','保存して届ける')+text(606,379,'GitHub',27,blue,700,'middle')+text(606,411,'できた記事の置き場',22,ink,400,'middle')+'<path d="M481 430h250" stroke="#dfE8f2" stroke-width="2"/>'+text(606,470,'GitHub Actions',27,blue,700,'middle')+text(606,510,'記事を検査してサイトへ送る',22,ink,400,'middle');
  svg+=card(xs[2],'3','サイトを動かす')+icon(964,350,'site')+text(994,445,'Cloudflare Workers',27,blue,700,'middle')+text(994,485,'記事を受け取り、画面を表示',22,ink,400,'middle')+text(994,516,'保存やログインも処理する',22,ink,400,'middle');
  svg+=card(xs[3],'4','読む・保存する')+icon(1352,350,'person')+text(1382,445,'あなたのスマホ・PC',27,blue,700,'middle')+text(1382,485,'見出しを選んで解説を読む',22,ink,400,'middle')+text(1382,516,'気になる記事を「あとで読む」へ',21,ink,400,'middle');
  for(const x of [381,769,1157])svg+=line(`M${x+7} 395h40`);
  // Supporting services sit below the part they support; the main flow stays straight.
  svg+=line('M994 543V620')+text(970,590,'保存・取り出し',20,muted,400,'end');
  svg+='<rect x="811" y="641" width="366" height="178" rx="22" fill="#e1f3ed" stroke="#b3daca" stroke-width="2"/>';
  svg+=text(994,681,'Cloudflare D1',29,green,700,'middle')+text(994,718,'サイトの保管庫',26,ink,700,'middle')+text(994,754,'記事・出典はみんなで共用',22,ink,400,'middle')+text(994,787,'「あとで読む」は利用者別',22,ink,400,'middle');
  svg+=line('M1382 543V620')+text(1410,590,'本人確認',18,muted);
  svg+='<rect x="1219" y="641" width="326" height="178" rx="22" fill="#e8edf8" stroke="#c9d3e9" stroke-width="2"/>';
  svg+=text(1382,681,'Googleログイン',29,blue,700,'middle')+text(1382,718,'あなたの本人確認',26,ink,700,'middle')+text(1382,754,'自分の「あとで読む」を',22,ink,400,'middle')+text(1382,787,'別の端末でも使える',22,ink,400,'middle');
  svg+='<rect x="55" y="641" width="705" height="178" rx="22" fill="white" stroke="#d6e1ef" stroke-width="2"/>';
  svg+=text(82,681,'扱うニュースは6テーマ',28,ink,700)+text(82,726,'AI　／　日本経済　／　株式投資',25,blue,700)+text(82,768,'国際情勢　／　日本政治　／　芸能ニュース',25,blue,700);
  svg+='<rect x="55" y="853" width="1490" height="68" rx="17" fill="#e6ebf1"/>';
  svg+=text(81,894,'Workers AI：以前の本文要約用。現在は停止中で、今回の毎日更新では使いません。',25,muted);
  svg+=text(57,970,'サイトを作る・直すときの道具',24,ink,700)+text(57,1008,'Codex：制作　／　Git・GitHub：変更の記録　／　Node.js・npm：起動と検査',22,muted)+text(57,1043,'Wrangler：Cloudflareへ公開　／　Google Cloud：ログインの設定',22,muted);
  const verified=state.scheduleVerified&&state.publicationVerified;
  svg+=text(57,1082,verified?'2026/10/16時点：接続と初回の反映は確認済み。予定時刻の自動実行実績は10/17以降に確認。':'接続と定期実行の確認は未完了。設定済みとして表示しません。',19,muted);
  svg+='</g></svg>';
  await writeFile(`${folder}/architecture.svg`,svg);
  await writeFile(`${folder}/architecture.html`,'<!doctype html><html lang="ja"><meta charset="utf-8"><title>ニュースポケット｜やさしい全体図</title><style>html,body{margin:0;width:1600px;background:#f1f6fc}img{display:block;width:1600px}</style><img src="architecture.svg" alt="ChatGPTがニュースを作り、GitHubとActionsが届け、Cloudflareがサイトを動かし、あなたが読む。D1は保管庫、Googleは本人確認。"></html>');
}
