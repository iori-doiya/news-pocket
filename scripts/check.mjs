import { readFile,readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { sourcePublic,THEMES } from '../src/model.mjs';
async function files(dir){const output=[];for(const entry of await readdir(dir,{withFileTypes:true})){const path=`${dir}/${entry.name}`;if(entry.isDirectory())output.push(...await files(path));else output.push(path);}return output;}
let count=0;
for(const folder of ['src','scripts','public','tests'])for(const file of await files(folder))if(/\.(mjs|js)$/.test(file)){const check=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(check.status){console.error(check.stderr);process.exit(1);}count++;}
const sources=JSON.parse(await readFile('config/sources.json','utf8'));
const ids=new Set();
for(const source of sources){if(ids.has(source.id))throw new Error('情報源IDが重複しています');ids.add(source.id);if(source.enabled&&!sourcePublic(source))throw new Error(`${source.id}: 公開条件と確認記録が不足しています`);if(source.themes.some(t=>!THEMES.includes(t)))throw new Error('未知のテーマがあります');}
console.log(`構文確認 ${count}ファイル。情報源 ${sources.length}件、有効 ${sources.filter(sourcePublic).length}件。`);
