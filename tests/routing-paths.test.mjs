import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {sharedIdentity} from "../scripts/shared-data.mjs";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {workflowCommands,workflowCard,workflowPolicy} from "../scripts/workflow-policy.mjs";
import {stageCards} from "../scripts/stage-context-lib.mjs";
import {materialSnapshot} from "../scripts/route-material-lib.mjs";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const run=(script,args=[])=>{
 const cp=spawnSync(process.execPath,[path.join(root,"scripts",script),...args],{cwd:root,encoding:"utf8",maxBuffer:8e6});
 assert.equal(cp.status,0,cp.stderr);return JSON.parse(cp.stdout);
};
test("every workflow command preserves paths with spaces as shell arguments",()=>{
 const replacements={RULES_ROOT:"/tmp/技能 目录",PROJECT_DIR:"/tmp/页面 项目",ORIGINAL_PROJECT:"/tmp/原始 Demo","context.json":"/tmp/上下文 文件.json","next-pack-dir":"/tmp/任务 包","preview-url":"http://localhost:4190/?a=1&b=2","relative-validation-evidence.json":"evidence/验证 结果.json"};
 let count=0;
 for(const id of ["new-page","normalize-demo","micro-revision","skill-maintenance"]){
  const policy=workflowPolicy(root,id);
  for(const stage of policy.stages){
   const card=workflowCard(policy,stage,stageCards[stage]);
   const commands=workflowCommands(policy,stage,{}, {request:{task:"邮箱草稿",mode:"fast-preview"}},card);
   for(const key of ["nextQuery","rebuild","checks","manifest","generate","validate","stylesCheck","handoff"]){
    for(const command of (Array.isArray(commands[key])?commands[key]:commands[key]?[commands[key]]:[])){
     const rendered=command.replace(/<([^>]+)>/g,(all,name)=>replacements[name]??all);
     const cp=spawnSync("sh",["-c",'node() { printf "%s\\n" "$@"; }; '+rendered],{encoding:"utf8"});
     assert.equal(cp.status,0,id+"/"+stage+"/"+key+": "+cp.stderr);
     const args=cp.stdout.trimEnd().split("\n");
     assert.ok(args[0].startsWith(replacements.RULES_ROOT+"/scripts/"));
     for(const [flag,value] of [["--project",replacements.PROJECT_DIR],["--source",replacements.ORIGINAL_PROJECT],["--repo",replacements.RULES_ROOT],["--skill-root",replacements.RULES_ROOT],["--context",replacements["context.json"]],["--out-dir",replacements["next-pack-dir"]],["--url",replacements["preview-url"]],["--evidence",replacements["relative-validation-evidence.json"]]]){
      if(args.includes(flag))assert.equal(args[args.indexOf(flag)+1],value);
     }
     count++;
    }
   }
  }
 }
 assert.ok(count>30);
});
test("workflow route exposes real files while preserving logical IDs and material digest",()=>{
 for(const id of ["new-page","normalize-demo","micro-revision","skill-maintenance"]){
  const result=run("resolve-workflow-route.mjs",["--route",id,"--repo",root]);
  assert.equal(result.materialReadLocations.length,result.materials.length);
  for(const location of result.materialReadLocations){
   assert.ok(fs.statSync(location.absolute).isFile());
   assert.equal(path.resolve(root,location.relative),location.absolute);
   assert.ok(!location.relative.startsWith("skill-support/"));
   assert.ok(result.materials.some(m=>m.path===location.materialId));
  }
  const snapshot=materialSnapshot({repo:root,skillRoot:root,definitions:result.materials});
  assert.equal(snapshot.digest,result.materialsDigest);
 }
});
test("full context provides a resolved reading map without changing the evidence identity",()=>{
 const context=run("resolve-context.mjs",["--task","设置","--discover"]);
 const snapshot=materialSnapshot({repo:root,skillRoot:root,definitions:context.materials});
 assert.equal(context.materialsDigest,snapshot.digest);
 assert.equal(context.materialReadLocations.length,context.materials.length);
 for(const location of context.materialReadLocations){
  assert.ok(fs.existsSync(location.absolute));
  assert.equal(path.resolve(root,location.relative),location.absolute);
 }
});

test("temporary validation environments are excluded while shared resource symlinks remain blocked",()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),"shared-output-boundary-"));
 try {
  fs.writeFileSync(path.join(temp,"skill-profile.json"),JSON.stringify({sharedDataVersion:"1.0.1"}));
  fs.mkdirSync(path.join(temp,"packages/tokens"),{recursive:true});
  fs.writeFileSync(path.join(temp,"packages/tokens/example.json"),"{}");
  const baseline=sharedIdentity(temp);
  fs.mkdirSync(path.join(temp,"outputs/venv/bin"),{recursive:true});
  fs.symlinkSync(process.execPath,path.join(temp,"outputs/venv/bin/python"));
  assert.deepEqual(sharedIdentity(temp),baseline);
  fs.symlinkSync(process.execPath,path.join(temp,"packages/tokens/link"));
  assert.throws(()=>sharedIdentity(temp),/Shared data symlink/);
 } finally {fs.rmSync(temp,{recursive:true,force:true});}
});
