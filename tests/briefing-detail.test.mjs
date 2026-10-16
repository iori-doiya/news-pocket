import {test} from 'node:test';
import assert from 'node:assert/strict';
import {briefingDetail} from '../public/briefings-ui.js';

test('long explanations keep paragraphs and escape markup in every section',()=>{
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const article={id:'test',title:'見出し',attribution:'独自解説',inputScope:'確認時点の情報',editorial:{theme:'AI',summary:'最初の段落。\n\n<script>test</script>',whyItMatters:'背景。\n\n条件の説明。',impact:'生活への影響。\n\n確認すること。',caution:'注意点。',references:[]}};
  const html=briefingDetail(article,escape,()=>'',false,'10/16');
  assert.ok(html.includes('<p>最初の段落。</p><p>&lt;script&gt;test&lt;/script&gt;</p>'));
  assert.ok(html.includes('<p>背景。</p><p>条件の説明。</p>'));
  assert.ok(html.includes('<p>生活への影響。</p><p>確認すること。</p>'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('line-clamp'));
});
