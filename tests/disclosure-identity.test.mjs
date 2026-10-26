import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {renderHtmlComponent} from '../packages/components-html/src/index.js';
import {componentIdentityContracts} from '../packages/components-html/src/identity-contracts.js';
import {settingsFixture} from './fixtures.mjs';
const root=path.resolve(import.meta.dirname,'..');
const run=(script,args)=>spawnSync(process.execPath,[path.join(root,'scripts',script),...args],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024});
test('both disclosure adapters and Sidebar groups put identity on triggers',()=>{
 for(const id of ['accordion','collapsible'])for(const expanded of [false,true]){
  const markup=renderHtmlComponent(id,{expanded,contentId:id+'-test'});
  assert.match(markup,new RegExp('<button[^>]+data-component="'+id+'"'));
  assert.doesNotMatch(markup,/<(?:div|section)[^>]+data-logical-component=/);
  assert.equal(componentIdentityContracts[id].tagName,'button');
 }
 const markup=renderHtmlComponent('sidebar',{groups:[{label:'A',items:[{label:'A1'}]},{label:'B',items:[{label:'B1'}]}]});
 assert.equal((markup.match(/<button[^>]+data-component="collapsible"/g)||[]).length,2);
 assert.doesNotMatch(markup,/<section[^>]+data-component="collapsible"/);
});
test('runtime validator rejects legacy/misplaced identity and accepts current evidence',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'disclosure-evidence-'));
 try{
  const manifest={schemaVersion:3,enforcement:'strict-source',targetFramework:'html',layout:{pattern:'test',structureDigest:'test',paneOrder:[]},registered:[]};
  const base={schemaVersion:1,pattern:'test',structureDigest:'test',stylesheets:[{loaded:true,ruleCount:1}],unclassifiedInteractive:[],patternLayout:{display:'grid'},components:[]};
  const mf=path.join(temp,'manifest.json'),ef=path.join(temp,'evidence.json');fs.writeFileSync(mf,JSON.stringify(manifest));
  for(const id of ['accordion','collapsible']){
   const good={componentId:id,logicalName:id,tagName:'button',bounds:{width:200,height:32},identity:{valid:true,contract:componentIdentityContracts[id],errors:[]}};
   for(const [item,valid]of [[good,true],[{...good,identity:null},false],[{...good,tagName:'div',identity:{...good.identity,valid:false,errors:['wrapper owns identity']}},false]]){
    fs.writeFileSync(ef,JSON.stringify({...base,components:[item]}));const cp=run('validate-runtime-component-reuse.mjs',['--manifest',mf,'--evidence',ef]);assert.equal(cp.status===0,valid,cp.stdout+cp.stderr);if(!valid)assert.match(cp.stderr,/identity must be button/);
   }
  }
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('generated project includes contract-driven identity metadata and corrected adapters',async()=>{
 const project=fs.mkdtempSync(path.join(os.tmpdir(),'disclosure-delivery-'));
 try{
  settingsFixture(project);
  // Fixture input filenames are part of its public helper contract.
  const bindingFile=fs.readdirSync(project).find(f=>f.includes('bindings')&&f.endsWith('.json'));
  assert(bindingFile);const file=path.join(project,bindingFile);const b=JSON.parse(fs.readFileSync(file));
  for(const id of ['accordion','collapsible'])b.componentBindings.push({id,logicalName:id==='accordion'?'Accordion/Default':'Collapsible/Default',region:'main-content',options:{},semanticContext:id});
  b.composition.regions["main-content"][0].children.push(...["accordion","collapsible"].map(bindingId=>({kind:"component",bindingId})));
  const rf=path.join(project,"page-content-recipes.json");const recipes=JSON.parse(fs.readFileSync(rf));recipes.recipes.find(r=>r.contentGroupId==="preferences").bindingIds.push("accordion","collapsible");fs.writeFileSync(rf,JSON.stringify(recipes));
  fs.writeFileSync(file,JSON.stringify(b));
  const cp=run('generate-compliant-page.mjs',['--project',project,'--task','设置','--capabilities','accordion,collapsible','--repo',root,'--skill-root',root]);assert.equal(cp.status,0,(cp.stdout+cp.stderr).slice(-4000));
  const {renderHtmlComponent:render}=await import(path.join(project,'components/index.js'));
  for(const id of ['accordion','collapsible'])assert.match(render(id),new RegExp('<button[^>]+data-component="'+id+'"'));
  assert(fs.existsSync(path.join(project,'components/_runtime/packages/components-html/src/identity-contracts.js')));
  const validate=run('validate-page-project.mjs',['--project',project,'--skill-root',root]);assert.equal(validate.status,0,validate.stdout+validate.stderr);
 }finally{fs.rmSync(project,{recursive:true,force:true});}
});
