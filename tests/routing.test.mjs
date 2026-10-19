import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {findTaskRouteCandidates,selectTaskRoute,selectTaskPattern} from "../scripts/task-route-lib.mjs";
import {queryResources} from "../scripts/stage-context-lib.mjs";
import {workflowPolicy,quote} from "../scripts/workflow-policy.mjs";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const routes=JSON.parse(fs.readFileSync(path.join(root,"references/index/task-routes.source.json"))).routes;
const run=(file,args=[],ok=true)=>{const r=spawnSync(process.execPath,[path.join(root,"scripts",file),...args],{cwd:root,encoding:"utf8",maxBuffer:8e6});assert.equal(r.status===0,ok,r.stderr+r.stdout);return r;};
for(const text of ["生成一个邮件页面","邮件收件箱","搜索邮件","邮箱","电子邮件"])
 test("mail request: "+text,()=>assert.equal(selectTaskRoute(text,routes).route.id,"communication-workbench"));
for(const text of ["通讯录","联系人","地址簿"])
 test("records request: "+text,()=>assert.equal(selectTaskRoute(text,routes).route.id,"record-management-workbench"));
test("ambiguous requests retain all candidates and matching evidence",()=>{const r=findTaskRouteCandidates("邮箱设置",routes);assert.equal(r.candidates.length,2);assert.ok(r.evidence.every(e=>e.matchedTerms.length));assert.throws(()=>selectTaskRoute("邮箱设置",routes),/Ambiguous/);});
test("unknown task is not guessed",()=>assert.equal(findTaskRouteCandidates("星际物流XYZ",routes).kind,"unmatched"));
test("allowed alternative needs reason and preserves Pattern identity",()=>{const route=routes[0];assert.throws(()=>selectTaskPattern(route,"pattern-a-two-pane"),/reason/);assert.equal(selectTaskPattern(route,"pattern-a-two-pane","Only a list, no detail pane").id,"pattern-a-two-pane");assert.throws(()=>selectTaskPattern(route,"pattern-c-tool-workspace","Reason"),/does not allow/);const d=selectTaskPattern(route,"pattern-d-inspector","Object properties inspector");assert.equal(d.base,"pattern-b-three-pane");assert.throws(()=>selectTaskPattern(route,"pattern-d-inspector","Reason","pattern-a-two-pane"),/Inspector/);});
test("each workflow has its own next stages and commands",()=>{
 for(const workflow of ["new-page","normalize-demo","micro-revision","skill-maintenance"]){
  const p=workflowPolicy(root,workflow);
  const first=queryResources(root,{workflow,stage:"intake"}).pack;
  assert.ok(first.commands.nextQuery.includes("--workflow "+workflow));assert.equal(first.card.next,p.stages[1]);
  const last=queryResources(root,{workflow,stage:"validation",...(p.requiresTaskPattern?{resource:"validation.preview"}:{})}).pack;
  assert.equal(last.card.next,null);assert.ok(last.commands.finish.length);
  if(workflow==="normalize-demo"){assert.match(last.commands.generate,/normalize-demo.mjs --source/);assert.ok(!last.commands.generate.includes("--route new-page"));}
  if(workflow==="micro-revision"){assert.equal(last.commands.generate,undefined);assert.match(last.commands.apply,/original project entry/);}
  if(workflow==="skill-maintenance"){assert.equal(last.commands.generate,undefined);assert.ok(last.commands.rebuild.length);assert.deepEqual(last.resources.map(r=>r.id),["core.delivery"]);}
 }
 assert.throws(()=>queryResources(root,{workflow:"micro-revision",stage:"design"}),/not available/);
 assert.throws(()=>queryResources(root,{workflow:"skill-maintenance",stage:"bindings"}),/not available/);
});
test("phase, mapping and import workflow cannot enter HTML",()=>{for(const options of [{stage:"pixso"},{stage:"bindings",phase:"capture"},{stage:"bindings",mapping:true},{stage:"intake",workflow:"existing-html-to-pixso"}])assert.throws(()=>queryResources(root,options));});
test("component short pack explicitly requires shared context",()=>{
 const opts={stage:"bindings",workflow:"new-page",component:"button","semantic-context":"page-primary-action",view:"api"};
 const a=queryResources(root,opts), b=queryResources(root,{...opts,scope:"component"});
 assert.deepEqual(a.pack.components,b.pack.components);assert.equal(b.pack.sharedRules.required,true);assert.ok(b.plan.metrics.modelPackBytes<a.plan.metrics.modelPackBytes);
 assert.ok(queryResources(root,{stage:"bindings"}).pack.resources.some(r=>r.id==="supplement.universal-contract"));
 assert.throws(()=>queryResources(root,{...opts,component:undefined,scope:"component"}),/requires/);
});
test("next query preserves selectors and safe paths",()=>{
 const r=queryResources(root,{workflow:"normalize-demo",stage:"bindings",component:"button","semantic-context":"page-primary-action",roles:"space/5",scope:"complete"});
 assert.match(r.pack.commands.nextQuery,/--workflow normalize-demo/);assert.match(r.pack.commands.nextQuery,/--component 'button'/);assert.match(r.pack.commands.nextQuery,/--roles 'space\/5'/);
 const value="mail 'draft' folder";const out=spawnSync("sh",["-c","printf %s "+quote(value)],{encoding:"utf8"});assert.equal(out.status,0,out.stderr);assert.equal(out.stdout,value);
});
test("page inheritance refreshes sources and rejects structural changes",()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),"routing-inherit-"));
 try{
  const context=path.join(temp,"original.json");run("resolve-context.mjs",["--task","邮箱","--capabilities","attachment,input,textarea","--discover","--out",context]);
  const inherited=JSON.parse(run("resolve-context.mjs",["--inherit-context",context,"--discover"]).stdout);
  assert.equal(inherited.route.workflowRouteId,"micro-revision");assert.equal(inherited.route.id,"communication-workbench");assert.equal(inherited.layout.id,"pattern-b-three-pane");assert.equal(inherited.inheritedDecisions.originalWorkflow,"new-page");assert.ok(inherited.components.some(c=>c.component==="attachment"));assert.ok(inherited.components.some(c=>c.component==="textarea"));
  const file=path.join(temp,"micro.json");fs.writeFileSync(file,JSON.stringify(inherited));
  assert.throws(()=>queryResources(root,{stage:"bindings",workflow:"new-page",context:file}),/Workflow conflicts/);
  const brief=path.join(temp,"brief.json");run("resolve-context.mjs",["--inherit-context",context,"--discover","--brief-out",brief]);assert.deepEqual(JSON.parse(fs.readFileSync(brief)).stages,["intake","bindings","styling","validation"]);
  run("resolve-context.mjs",["--inherit-context",context,"--pattern","pattern-a-two-pane","--discover"],false);
  run("resolve-context.mjs",["--task","设置","--workflow-route","skill-maintenance","--discover"],false);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test("primary task and explicit alternate selection are recorded",()=>{
 const packet=JSON.parse(run("resolve-context.mjs",["--task","邮箱设置","--primary-task","设置","--discover"]).stdout);assert.equal(packet.route.id,"dashboard-or-settings");assert.equal(packet.routeEvidence.primaryTask,"设置");
 const a=JSON.parse(run("resolve-context.mjs",["--task","邮箱","--pattern","pattern-a-two-pane","--pattern-reason","Only list, no detail","--discover"]).stdout);assert.equal(a.layout.id,"pattern-a-two-pane");assert.equal(a.patternSelection.reason,"Only list, no detail");
});
test("entry documentation no longer targets local import routes",()=>{
 for(const file of ["references/routes/new-page.md","references/workflows/release-validation.md","references/resources/requirements/generated-requirement-contract.md"]){const text=fs.readFileSync(path.join(root,file),"utf8");assert.ok(!/existing-html-to-pixso|pixso-fidelity-routing|pixso-visual-parity|--phase readiness|Pixso fidelity target/.test(text),file);}
});
