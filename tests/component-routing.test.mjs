import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {spawnSync} from "node:child_process";
import {fileURLToPath,pathToFileURL} from "node:url";
import {queryResources} from "../scripts/stage-context-lib.mjs";
import {buildComponentRouteIndex} from "../scripts/component-route-index.mjs";
import {findComponent} from "../scripts/navigation-index-lib.mjs";
import {projectResourceText,stripResourceScopes} from "../scripts/resource-projection.mjs";
import {renderHtmlComponent,resolveHtmlRendererKey} from "../packages/components-html/src/index.js";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const index=buildComponentRouteIndex(root);
const rules=JSON.parse(fs.readFileSync(path.join(root,"references/components/component-selection-rules.json"))).rules;
const query=options=>queryResources(root,{stage:"bindings",view:"api",...options});
const cli=(id,context,flag="--component")=>{
 const r=spawnSync(process.execPath,[path.join(root,"scripts/query-components.mjs"),"--repo",root,"--skill-root",root,flag,id,...(context?["--semantic-context",context]:[])],{cwd:os.tmpdir(),encoding:"utf8"});
 assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout).results[0];
};
test("all 49 contracts resolve to independent renderers and one-component API packets",async()=>{
 assert.equal(index.components.length,49);
 for(const c of index.components){
  const source=c.frameworks.html.source;assert.equal(source,`packages/components-html/src/${c.id}/index.js#render`);
  const mod=await import(pathToFileURL(path.join(root,source.split("#")[0])));
  assert.equal(resolveHtmlRendererKey(c.id),c.id);
  assert.equal(mod.componentId,c.id);assert.equal(typeof mod.render,"function");
  assert.equal(mod.render({}),renderHtmlComponent(c.id,{}),c.id);
  const contexts=[...new Set(rules.filter(r=>r.logicalName===c.logicalName).map(r=>r.context))];
  for(const ctx of contexts.length?contexts:[null]){
   const q=query({component:c.id,...(ctx?{"semantic-context":ctx}:{})});
   assert.deepEqual(q.pack.components.map(c=>c.id),[c.id]);
   assert.equal(q.pack.components[0].implementation.sourcePath,source.split("#")[0]);
   assert.equal(q.pack.components[0].implementation.exportName,"render");
   assert.deepEqual(q.pack.resources.filter(r=>r.id.startsWith("component.")).map(r=>r.id),["component."+c.id]);
   assert.ok(!q.plan.sources.some(s=>/components-html\/src\/.*\.js$/.test(s.path)));
  }
 }
});
test("exact select identity is consistent across routing and both query entrypoints",()=>{
 assert.equal(findComponent(index,"select").id,"select");
 for(const key of ["component","capabilities"])assert.equal(query({[key]:"select"}).pack.components[0].id,"select");
 for(const flag of ["--component","--capabilities"])assert.equal(cli("select",null,flag).component,"select");
});
test("uncontracted compatibility adapters cannot enter new-page selection",()=>{
 assert.equal(index.compatibilityModules.length,6);
 for(const c of index.compatibilityModules){
  assert.throws(()=>findComponent(index,c.id),/Compatibility-only/);
  assert.throws(()=>query({component:c.id}),/Compatibility-only/);
 }
 assert.equal(cli("item").resolution,"compatibility-only");
});
test("semantic role, variant and Pattern ambiguities are never silently guessed",()=>{
 assert.throws(()=>query({component:"button"}),/Semantic context required/);
 assert.throws(()=>query({component:"titlebar","semantic-context":"main-detail-titlebar",pattern:"pattern-a-two-pane"}),/requires slot/);
 assert.equal(cli("button","toolbar-action").selection.status,"variant-required");
 assert.equal(cli("icon-button","toolbar-action","--capabilities").selection.requiredOptions.mode,"icon");
});
test("Titlebar scoped API remains complete for its role and short packs keep component prerequisites",()=>{
 const options={component:"titlebar","semantic-context":"primary-navigation-titlebar",pattern:"pattern-b-three-pane"};
 const a=query(options),s=query({...options,scope:"component"}),full=query({...options,view:"full"});
 assert.deepEqual(a.pack.components[0].slots,["logo","label"]);
 assert.ok(a.pack.components[0].apiProjection.inactiveSlots.includes("actions"));
 assert.ok(full.pack.components[0].slots.includes("main-detail-actions"));
 assert.ok(!full.pack.components[0].apiProjection);
 assert.ok(a.plan.metrics.modelPackBytes<full.plan.metrics.modelPackBytes);
 for(const id of ["titlebar.overview","titlebar.title-typography","titlebar.trailing-inset"])assert.ok(s.pack.resources.some(r=>r.id===id),id);
 const generic=new Set(query({}).plan.resources.map(r=>r.id));
 for(const ref of s.pack.sharedRules.references)assert.ok(generic.has(ref.id),ref.id);
 assert.ok(!a.pack.resources.some(r=>r.content?.includes("<!-- tui-scope")));
 const explicit=query({...options,resource:"titlebar.executable-html-slots"});
 assert.ok(explicit.pack.resources.find(r=>r.id==="titlebar.executable-html-slots").content.includes("The right segment"));
});
test("multi-binding projection retains the union of titlebar and middle-search constraints",()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),"component-query-")),file=path.join(temp,"bindings.json");
 try{
  fs.writeFileSync(file,JSON.stringify({componentBindings:[
   {id:"brand",logicalName:"Titlebar/Default",semanticContext:"primary-navigation-titlebar"},
   {id:"detail",logicalName:"Titlebar/Default",semanticContext:"main-detail-titlebar"},
   {id:"search",logicalName:"Search/White Surface/Default",semanticContext:"secondary-list-search"}
  ]}));
  const q=query({bindings:file,pattern:"pattern-b-three-pane"});
  const text=q.pack.resources.find(r=>r.id==="titlebar.executable-html-slots").content;
  assert.ok(text.includes("The same rule applies"));assert.ok(text.includes("The right segment"));assert.ok(text.includes("Search-only"));
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test("resource scopes preserve unknown/full rules and reject malformed or misspelled selectors",()=>{
 const source='common\n<!-- tui-scope {"contexts":["one"],"patterns":["pattern-a"]} -->\nscoped\n<!-- /tui-scope -->\n';
 assert.equal(projectResourceText(source),stripResourceScopes(source));
 assert.ok(projectResourceText(source,{contexts:["two"],pattern:"pattern-a"}).includes("common"));
 assert.ok(!projectResourceText(source,{contexts:["two"],pattern:"pattern-a"}).includes("scoped"));
 assert.ok(projectResourceText(source,{contexts:["two"],pattern:"pattern-b",full:true}).includes("scoped"));
 assert.throws(()=>stripResourceScopes(source,{allowedContexts:["two"]}),/Unknown semantic/);
 assert.throws(()=>projectResourceText('<!-- tui-scope {"contexts":["one"]} -->'),/Unclosed/);
});
