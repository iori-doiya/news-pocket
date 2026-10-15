export const THEMES = ['AI', '日本経済', '株式投資', '国際情勢', '芸能ニュース', '日本政治'];
export const LIMITS = Object.freeze({ userDaily: 5, siteDaily: 20, attemptsDaily: 30, neuronsReserve: 250, neuronsBudget: 7500, bodyCharacters: 8000, outputTokens: 900, articleCount: 10000, databaseBytes: 350 * 1024 * 1024 });
export const FREE_MODEL = '@cf/qwen/qwen3-30b-a3b-fp8';
export function japanDay(date = new Date()) { return new Date(date.getTime() + 9 * 3600000).toISOString().slice(0, 10); }
export function utcDay(date = new Date()) { return date.toISOString().slice(0, 10); }
export function canonicalUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('HTTPSの公開URLが必要です');
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
  return url.href;
}
export function sourcePublic(source) {
  return !!(source.enabled && source.reviewedAt && source.evidenceUrl?.startsWith('https://') && source.rights.collect && source.rights.display && source.feedUrl?.startsWith('https://') && source.articleHosts?.length);
}
export function sourceAI(source) { return sourcePublic(source) && source.rights.body && source.rights.aiInput && source.rights.summary; }
export function classify(title, categories = [], defaults = []) {
  const text = [title, ...categories].join(' ');
  const rules = { AI: /\bAI\b|人工知能|生成AI|機械学習/i, 日本経済: /物価|消費|日本経済|日銀|円安|賃金/, 株式投資: /株式(?!会社)|株価|決算|上場|投資|証券/, 国際情勢: /外交|国際|紛争|首脳|海外|国連/, 芸能ニュース: /芸能|映画|俳優|音楽|歌手|出演/, 日本政治: /国会|日本政治|政党|選挙|政策|内閣/ };
  return THEMES.filter(t => defaults.includes(t) || rules[t].test(text));
}
export function cleanText(value) { return String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/&(?:nbsp|amp|lt|gt|quot|apos);/g, m => ({'&nbsp;':' ', '&amp;':'&', '&lt;':'<', '&gt;':'>', '&quot;':'"', '&apos;':"'"}[m])).replace(/\s+/g, ' ').trim(); }
