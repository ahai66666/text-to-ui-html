import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {renderHtmlComponent} from '../packages/components-html/src/index.js';
import {sidebarInstanceCount} from '../packages/components-html/src/sidebar/index.js';
import {collectComponentIdentityViolations, validateComponentIdentityEvidence} from '../packages/components-html/src/component-identity.js';
import {settingsFixture} from './fixtures.mjs';
const root=path.resolve(import.meta.dirname,'..');
const run=(script,args)=>spawnSync(process.execPath,[path.join(root,'scripts',script),...args],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024});
export function sidebarFixture(project){
 settingsFixture(project);
 const file=path.join(project,'page-bindings.json');const bindings=JSON.parse(fs.readFileSync(file));
 const nav=bindings.componentBindings.find(b=>b.id==='nav');
 Object.assign(nav,{logicalName:'Sidebar Item/Default',semanticContext:'secondary-navigation',options:{groups:[{label:'邮件',items:[{label:'收件箱',selected:true,count:12},{label:'草稿箱',count:3}]},{label:'其他',expanded:false,items:[{label:'存档',disabled:true}]}]}});
 fs.writeFileSync(file,JSON.stringify(bindings));
 return file;
}
test('Sidebar single/batch/group adapters count and label actual rows',()=>{
 for(const options of [{label:'单项',selected:true,count:0},{items:[{label:'A'},{label:'B',disabled:true}]},{groups:[{items:[{label:'A'}]},{items:[{label:'B'}]}]},{items:[]}]){
  const html=renderHtmlComponent('sidebar',options);
  assert.equal((html.match(/<button[^>]+data-component="sidebar"/g)||[]).length,sidebarInstanceCount(options));
  assert.doesNotMatch(html,/<nav[^>]+data-(?:component|renderer-key|logical-component)=/);
  assert.doesNotMatch(html,/data-component="sidebar-item"|Sidebar Groups\/Default/);
 }
 assert.match(renderHtmlComponent('sidebar',{label:'A',selected:true,disabled:true}),/data-state="disabled"[^>]+aria-current="page" disabled/);
});
test('identity scanner catches missing labels even when the labelled-node collector is empty',()=>{
 const unlabelled={matches:()=>false};const root={querySelectorAll:selector=>selector==='.tui-sidebar-item'?[unlabelled]:[]};
 const failures=collectComponentIdentityViolations(root);
 assert(failures.some(f=>f.includes('sidebar: missing')));
 assert(validateComponentIdentityEvidence([],failures).length>0);
});
test('generated Sidebar renders once and expects three actual items, rejecting declared count mismatch',()=>{
 const project=fs.mkdtempSync(path.join(os.tmpdir(),'sidebar-delivery-'));
 try{
  const bindingFile=sidebarFixture(project);
  const args=['--project',project,'--task','设置','--capabilities','sidebar','--repo',root,'--skill-root',root];
  let cp=run('generate-compliant-page.mjs',args);assert.equal(cp.status,0,(cp.stdout+cp.stderr).slice(-5000));
  const usage=JSON.parse(fs.readFileSync(path.join(project,'component-usage.json'))).registered.find(r=>r.rendererKey==='sidebar');
  assert.equal(usage.expectedRuntimeCount,3);assert.equal(usage.runtimeCountPolicy,'exact-items');
  const source=fs.readFileSync(path.join(project,'generated-page.js'),'utf8');
  assert.match(source,/renderHtmlComponent\("sidebar"/);
  assert.doesNotMatch(source,/Array\.from\(\{ length: 3 \}/);
  cp=run('validate-page-project.mjs',['--project',project,'--skill-root',root]);assert.equal(cp.status,0,cp.stdout+cp.stderr);
  const bindings=JSON.parse(fs.readFileSync(bindingFile));bindings.componentBindings.find(b=>b.id==='nav').expectedRuntimeCount=1;fs.writeFileSync(bindingFile,JSON.stringify(bindings));
  cp=run('generate-compliant-page.mjs',args);assert.notEqual(cp.status,0);assert.match(cp.stdout+cp.stderr,/actual item count \(3\)/);
 }finally{fs.rmSync(project,{recursive:true,force:true});}
});
