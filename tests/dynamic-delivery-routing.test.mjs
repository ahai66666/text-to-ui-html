import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {queryResources,packMarkdown} from "../scripts/stage-context-lib.mjs";
import {workflowCommands,workflowPolicy} from "../scripts/workflow-policy.mjs";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
for(const workflow of ["new-page","normalize-demo"]) test(workflow+" automatically delivers the dynamic output contract by stage",()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),"dynamic-route-"));
 try {
  const context=path.join(temp,"context.json");
  const cp=spawnSync(process.execPath,[path.join(root,"scripts/resolve-context.mjs"),"--task","设置","--workflow-route",workflow,"--discover","--out",context],{cwd:root,encoding:"utf8"});
  assert.equal(cp.status,0,cp.stderr+cp.stdout);
  const required={design:["delivery.project-output"],bindings:["delivery.prepare","delivery.calling"],styling:["delivery.styles"],validation:["delivery.project-output","delivery.prepare"]};
  for(const [stage,ids] of Object.entries(required)){
   const {pack}=queryResources(root,{workflow,stage,context,view:"api"});
   for(const id of ids){
    const resource=pack.resources.find(r=>r.id===id);
    assert.ok(resource,id+" missing from "+stage);
    assert.equal(resource.content,fs.readFileSync(path.join(root,resource.path),"utf8"));
    assert.ok(packMarkdown(pack).includes(JSON.stringify(resource.content)),"Markdown must carry the same contract body");
   }
   assert.equal(pack.routes.workflow,workflow);
   if(stage==="validation"){
    assert.match(pack.commands.generate,workflow==="new-page"?/generate-compliant-page/:/normalize-demo/);
    for(const flag of ["--project","--blueprint","--content-recipes","--bindings","--page-css"])assert.ok(pack.commands.generate.includes(flag));
    assert.ok(pack.commands.validate);assert.ok(pack.commands.stylesCheck);
   }
  }
 } finally {fs.rmSync(temp,{recursive:true,force:true});}
});
test("component short packets reuse delivery instructions from the shared packet",()=>{
 const shared=queryResources(root,{stage:"bindings",view:"api"}).pack;
 const short=queryResources(root,{stage:"bindings",view:"api",component:"button","semantic-context":"page-primary-action",scope:"component"}).pack;
 for(const id of ["delivery.prepare","delivery.calling"]){
  assert.ok(shared.resources.some(r=>r.id===id));
  assert.ok(short.sharedRules.references.some(r=>r.id===id));
  assert.ok(!short.resources.some(r=>r.id===id));
 }
 for(const workflow of ["micro-revision","skill-maintenance"]){
  const pack=queryResources(root,{workflow,stage:"validation",view:"api"}).pack;
  assert.ok(!pack.resources.some(r=>["delivery.project-output","delivery.prepare","delivery.calling"].includes(r.id)));
  assert.equal(pack.commands.generate,undefined);
 }
});
test("generation command preserves paths and task text as individual shell arguments",()=>{
 const task="邮箱 '草稿' $(printf bad)";
 const policy=workflowPolicy(root,"new-page");
 const commands=workflowCommands(policy,"validation",{}, {request:{task,mode:"fast-preview"}},{});
 const stub='node() { printf "%s\\n" "$@"; }; ';
 const cp=spawnSync("sh",["-c",stub+commands.generate],{encoding:"utf8"});
 assert.equal(cp.status,0,cp.stderr);
 const args=cp.stdout.trimEnd().split("\n");
 assert.equal(args[0],"<RULES_ROOT>/scripts/generate-compliant-page.mjs");
 assert.equal(args[args.indexOf("--task")+1],task);
 assert.equal(args[args.indexOf("--project")+1],"<PROJECT_DIR>");
});
