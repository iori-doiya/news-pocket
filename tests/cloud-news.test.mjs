import {test} from 'node:test';import assert from 'node:assert/strict';
import {validateBriefing} from '../src/briefings.mjs';import{japanDay}from'../src/model.mjs';
import {headlineRow} from '../public/headline-list.js';
test('ChatGPT cloud publication marks automatic checking separately from human fact checking',()=>{
  const day=japanDay(),now=new Date().toISOString();const data={version:1,id:day+'-morning',issueDate:day,cutoffAt:now,producer:'ChatGPT（ニュースポケット専用）',review:{kind:'chatgpt-web',factsChecked:false,automatedEvidenceChecked:true,originalWriting:true,sourceTermsChecked:true,noRestrictedText:true},items:[{id:'test-only',theme:'AI',title:'検証専用の架空データ',summary:'これは公開しない架空のテスト記事です。自動確認の印と出典の保存形式だけを検証します。',whyItMatters:'人による確認とAIの自動処理を区別するためです。',impact:'閲覧者が確認範囲を理解できる表示につながります。',caution:'テスト専用・公開しません。',references:[{name:'検証専用',url:'https://www.google.com/about/',publishedAt:null,accessedAt:now,usage:'facts-only',reviewNote:'ネットワーク送信せず形式の検査だけに使う架空の出典情報。'}]}]};
  const valid=validateBriefing(data);assert.equal(valid.review.kind,'chatgpt-web');assert.equal(valid.review.factsChecked,false);assert.equal(valid.review.automatedEvidenceChecked,true);
  assert.throws(()=>validateBriefing({...data,review:{...data.review,automatedEvidenceChecked:false}}),/確認/);assert.throws(()=>validateBriefing({...data,review:{...data.review,factsChecked:true}}),/確認/);
});
test('headline-only rows retain real detail links and accessible save controls',()=>{const html=headlineRow({id:'test',title:'見出し',summary:{text:'一覧には出さない説明'},source:'一覧には出さない配信元'},s=>String(s).replaceAll('<','&lt;'),()=>'<svg></svg>',false);assert.ok(html.includes('href="#article=test"'));assert.ok(html.includes('data-action="save"'));assert.ok(html.includes('aria-pressed="false"'));assert.ok(!html.includes('出さない'));});
