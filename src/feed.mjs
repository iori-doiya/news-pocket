import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { canonicalUrl, classify, cleanText } from './model.mjs';
const array = value => value == null ? [] : Array.isArray(value) ? value : [value];
const text = value => typeof value === 'object' ? value?.['#text'] ?? '' : value;
export function parseFeed(xml, source, now = new Date().toISOString()) {
  if (xml.length > 1_000_000 || /<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true) throw new Error('RSS形式または容量が不正です');
  const data = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', processEntities: false, parseTagValue: false }).parse(xml);
  if (!data.rss?.channel && !data.feed && !data['rdf:RDF']) throw new Error('RSS/Atomの文書ではありません');
  const entries = array(data.rss?.channel?.item ?? data.feed?.entry ?? data['rdf:RDF']?.item);
  return entries.slice(0, 100).flatMap(entry => {
    try {
      const links = array(entry.link);
      const link = links.find(l => l?.['@_rel'] === 'alternate') ?? links[0];
      const url = canonicalUrl(typeof link === 'object' ? link?.['@_href'] ?? text(link) : link);
      if (!source.articleHosts.includes(new URL(url).hostname)) return [];
      const title = cleanText(text(entry.title)).slice(0, 300);
      if (!title) return [];
      // FSA uses JST, which V8 does not parse. Convert only that explicit suffix.
      const rawDate = String(text(entry.pubDate ?? entry.published ?? entry.updated ?? entry['dc:date']) ?? '').replace(/\sJST$/i, ' +0900');
      const date = rawDate && Number.isFinite(Date.parse(rawDate)) && Date.parse(rawDate) <= Date.parse(now) + 86400000 ? new Date(rawDate).toISOString() : null;
      const categories = array(entry.category).map(c => text(c) || c?.['@_term'] || '');
      const body = source.rights.body ? cleanText(text(source.bodyField ? entry[source.bodyField] : entry['content:encoded'] ?? entry.content ?? entry.description ?? entry.summary)) : '';
      let attribution = '';
      if(source.attribution === 'gv-rss') {
        const footer = String(text(entry['content:encoded']) ?? '').split("class='gv-rss-footer'")[1] ?? '';
        attribution = [...footer.matchAll(/<div class=['"]text-credits-section['"]>([\s\S]*?)<\/div>/g)].map(m=>cleanText(m[1])).join(' / ').slice(0,1000);
        // The publisher requires both the original writer and Japanese translator.
        if(!/翻訳/.test(attribution) || !/記者|原文/.test(attribution)) return [];
      }
      if(source.attribution === 'atom-authors') attribution='著者：'+array(entry.author).map(a=>cleanText(text(a.name))).filter(Boolean).join(', ').slice(0,900);
      let themes = classify(title, categories, source.themes);
      if(source.international) {
        themes = themes.filter(t=>!['日本経済','株式投資','日本政治'].includes(t));
        if(!themes.includes('国際情勢')) themes.push('国際情勢');
        if(categories.includes('日本') && /政治|政策|選挙|米軍|基地|首相|内閣|国会|政党/.test(title)) themes.push('日本政治');
      }
      return [{ title, url, sourceId: source.id, publishedAt: date, collectedAt: now, themes, attribution, body, scope: source.inputScope??(source.bodyField==='description'?'RSSの短い説明文のみ（記事全文・画像・埋め込み投稿は使用しません）':'RSSで配信された本文・抜粋のみ（記事全文の取得なし）') }];
    } catch { return []; }
  });
}
export async function fetchFeed(source, fetcher = fetch, selectedUrl = null) {
  const urls = source.feedUrls ?? [source.feedUrl];
  if(selectedUrl && !urls.includes(selectedUrl)) throw new Error('未登録のRSSです');
  if(!selectedUrl && urls.length>1) {
    const feeds=[];
    for(const url of urls) feeds.push(await fetchFeed(source,fetcher,url));
    return [...new Map(feeds.flat().map(a=>[a.url,a])).values()];
  }
  const feedUrl=selectedUrl??source.feedUrl;
  // workerd rejects redirect:'error'. Manual mode + !ok also rejects 3xx,
  // without following a redirect to an unreviewed host.
  const response = await fetcher(feedUrl, { redirect: 'manual', signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'NewsPocket/0.1 (RSS; no full-text scraping)', Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' } });
  if (!response.ok) throw new Error(`RSS_HTTP_${response.status}`);
  const reader = response.body.getReader();
  let size = 0; const parts = [];
  try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 1_000_000) throw new Error('RSS容量超過'); parts.push(value); } }
  finally { await reader.cancel(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  return parseFeed(new TextDecoder().decode(bytes), source).map(a=>({...a,feedUrl}));
}
