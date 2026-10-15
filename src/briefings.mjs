import { THEMES, japanDay, canonicalUrl } from './model.mjs';
import { hash } from './auth.mjs';

export const EDITORIAL_SOURCE = 'news-pocket-editorial';
const scope = '公開情報の事実関係を確認して作成したニュースポケットの独自解説。特定の記事全文の要約ではありません。';
const text = (value,min,max) => typeof value==='string' && value.trim().length>=min && value.length<=max && !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value);
function referenceUrl(value) {
  const url=new URL(canonicalUrl(value));
  if(!url.hostname.includes('.') || url.hostname==='localhost' || /(?:^|\.)(?:local|localhost|internal|invalid|test|example)$/.test(url.hostname) || /[\[\]:]/.test(url.hostname) || /^[\d.]+$/.test(url.hostname)) throw new Error('出典には公開サイトのURLが必要です');
  return url.href;
}
export function validateBriefing(data,now=new Date()) {
  const bad=message=>{throw new Error(message);};
  if(!data || data.version!==1 || !/^\d{4}-\d{2}-\d{2}-(?:morning|update|preview)$/.test(data.id??''))bad('編集便のID・版が不正です');
  if(data.issueDate!==data.id.slice(0,10) || data.issueDate>japanDay(now) || !Number.isFinite(Date.parse(`${data.issueDate}T00:00:00+09:00`)))bad('編集便の日付が不正です');
  const cutoff=Date.parse(data.cutoffAt);
  if(!Number.isFinite(cutoff)||cutoff>now.getTime()+60000||now.getTime()-cutoff>48*3600000||japanDay(new Date(cutoff))!==data.issueDate)bad('確認基準時刻は当日かつ48時間以内にしてください');
  if(!text(data.producer,1,80)||!Array.isArray(data.items)||!data.items.length||data.items.length>24)bad('作成者・記事数が不正です');
  if(data.review?.factsChecked!==true || data.review?.originalWriting!==true || data.review?.sourceTermsChecked!==true || data.review?.noRestrictedText!==true)bad('事実・独自執筆・出典の利用条件・制限本文不使用の確認が必要です');
  const ids=new Set();
  const items=data.items.map(item=>{
    if(!/^[a-z0-9][a-z0-9-]{0,70}$/.test(item.id??'')||ids.has(item.id))bad('記事IDが不正または重複しています');ids.add(item.id);
    if(!THEMES.includes(item.theme)||!text(item.title,3,120)||!text(item.summary,20,600)||!text(item.whyItMatters,10,400)||!text(item.impact,10,400)||!text(item.caution,1,300))bad('テーマまたは独自解説の形式が不正です');
    if(!Array.isArray(item.references)||item.references.length<1||item.references.length>5)bad('出典は1〜5件必要です');
    const references=item.references.map(ref=>{
      if(!text(ref.name,1,100)||!['facts-only','licensed'].includes(ref.usage)||!text(ref.reviewNote,10,400))bad('出典名・利用範囲・確認記録が必要です');
      const accessed=Date.parse(ref.accessedAt),published=ref.publishedAt===null?null:Date.parse(ref.publishedAt);
      if(!Number.isFinite(accessed)||accessed>now.getTime()+60000||now.getTime()-accessed>48*3600000||(published!==null&&(!Number.isFinite(published)||published>cutoff+60000)))bad('出典の確認日時・公開日時が不正です');
      return {name:ref.name.trim(),url:referenceUrl(ref.url),publishedAt:published===null?null:new Date(published).toISOString(),accessedAt:new Date(accessed).toISOString(),usage:ref.usage,reviewNote:ref.reviewNote.trim(),...(ref.usage==='licensed'?{licenseUrl:referenceUrl(ref.licenseUrl)}:{})};
    });
    return {id:item.id,theme:item.theme,title:item.title.trim(),summary:item.summary.trim(),whyItMatters:item.whyItMatters.trim(),impact:item.impact.trim(),caution:item.caution.trim(),references};
  });
  return {version:1,id:data.id,issueDate:data.issueDate,cutoffAt:new Date(cutoff).toISOString(),producer:data.producer.trim(),review:{factsChecked:true,originalWriting:true,sourceTermsChecked:true,noRestrictedText:true},items,missingThemes:THEMES.filter(t=>!items.some(i=>i.theme===t))};
}
export function editorialArticle(row) {
  const entry=JSON.parse(row.editorial_json);
  return {id:row.id,title:row.title,sourceId:EDITORIAL_SOURCE,source:'ニュースポケット編集便',url:entry.references[0].url,themes:JSON.parse(row.themes),publishedAt:row.published_at,collectedAt:row.collected_at,isSample:false,canGenerate:false,isEditorial:true,attribution:`${entry.producer}のAI支援による独自解説`,inputScope:scope,license:null,summary:{kind:'editorial',text:entry.summary,scope,createdAt:row.collected_at},editorial:entry};
}
export async function briefingState(env) {
  if(env.EDITORIAL_ENABLED!=='true'||!env.DB)return {enabled:false,latest:null,automaticPublication:false};
  const row=await env.DB.prepare('SELECT id,issue_date,cutoff_at,created_at,producer,trigger,article_count,missing_themes FROM editorial_editions ORDER BY created_at DESC LIMIT 1').first();
  const scheduled=await env.DB.prepare("SELECT created_at FROM editorial_editions WHERE trigger='schedule' ORDER BY created_at DESC LIMIT 1").first('created_at');
  return {enabled:true,latest:row?{id:row.id,issueDate:row.issue_date,cutoffAt:row.cutoff_at,publishedAt:row.created_at,producer:row.producer,trigger:row.trigger,count:row.article_count,missingThemes:JSON.parse(row.missing_themes)}:null,automaticPublication:!!scheduled,lastScheduledPublication:scheduled??null};
}
export async function ingestBriefing(env,data,trigger='manual',now=new Date()) {
  const edition=validateBriefing(data,now),payloadHash=await hash(JSON.stringify(edition));
  const previous=await env.DB.prepare('SELECT payload_hash FROM editorial_editions WHERE id=?').bind(edition.id).first('payload_hash');
  if(previous===payloadHash)return {ok:true,id:edition.id,accepted:0,reused:true,missingThemes:edition.missingThemes};
  const stored=now.toISOString(),statements=[];
  // The publisher sends original briefs only. This endpoint never fetches a reference URL.
  for(const item of edition.items){
    const id=await hash(`editorial:${edition.id}:${item.id}`);
    const original={...item,editionId:edition.id,issueDate:edition.issueDate,cutoffAt:edition.cutoffAt,producer:edition.producer};
    statements.push(env.DB.prepare('INSERT INTO articles(id,source_id,url,title,themes,published_at,collected_at,sort_at,content_hash,editorial_json) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,themes=excluded.themes,published_at=excluded.published_at,collected_at=excluded.collected_at,sort_at=excluded.sort_at,content_hash=excluded.content_hash,editorial_json=excluded.editorial_json').bind(id,EDITORIAL_SOURCE,`${env.APP_ORIGIN}/briefs/${edition.id}/${item.id}`,item.title,JSON.stringify([item.theme]),edition.cutoffAt,stored,edition.cutoffAt,await hash(JSON.stringify(original)),JSON.stringify(original)));
  }
  // Remove withdrawn entries from this edition atomically; other editions are unaffected.
  const kept=await Promise.all(edition.items.map(item=>hash(`editorial:${edition.id}:${item.id}`)));
  statements.push(env.DB.prepare(`DELETE FROM articles WHERE source_id=? AND json_extract(editorial_json,'$.editionId')=? AND id NOT IN (${kept.map(()=>'?').join(',')})`).bind(EDITORIAL_SOURCE,edition.id,...kept));
  statements.push(env.DB.prepare('INSERT INTO editorial_editions(id,issue_date,cutoff_at,producer,trigger,created_at,article_count,missing_themes,payload_hash) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET cutoff_at=excluded.cutoff_at,producer=excluded.producer,trigger=excluded.trigger,created_at=excluded.created_at,article_count=excluded.article_count,missing_themes=excluded.missing_themes,payload_hash=excluded.payload_hash').bind(edition.id,edition.issueDate,edition.cutoffAt,edition.producer,trigger,stored,edition.items.length,JSON.stringify(edition.missingThemes),payloadHash));
  await env.DB.batch(statements);
  return {ok:true,id:edition.id,accepted:edition.items.length,reused:false,missingThemes:edition.missingThemes};
}
