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
      const body = source.rights.body ? cleanText(text(entry['content:encoded'] ?? entry.content ?? entry.description ?? entry.summary)) : '';
      return [{ title, url, sourceId: source.id, publishedAt: date, collectedAt: now, themes: classify(title, categories, source.themes), body, scope: 'RSSで配信された本文・抜粋のみ（記事全文の取得なし）' }];
    } catch { return []; }
  });
}
export async function fetchFeed(source, fetcher = fetch) {
  const response = await fetcher(source.feedUrl, { redirect: 'error', signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'NewsPocket/0.1 (RSS; no full-text scraping)', Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' } });
  if (!response.ok) throw new Error('RSS取得失敗');
  const reader = response.body.getReader();
  let size = 0; const parts = [];
  try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 1_000_000) throw new Error('RSS容量超過'); parts.push(value); } }
  finally { await reader.cancel(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  return parseFeed(new TextDecoder().decode(bytes), source);
}
