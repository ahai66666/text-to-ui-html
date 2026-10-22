import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";
import {initPlan,planStatus,resumePlan,completeTask,setTaskState,configurePlan,assertPlanReady,invalidateTask,runPlanCheck} from "../scripts/normalization-plan-lib.mjs";
import {collectProjectDependencies} from "../scripts/artifact-dependencies.mjs";
import {queryResources} from "../scripts/stage-context-lib.mjs";
import {createHandoff,verifyHandoff} from "../scripts/html-handoff.mjs";
import {settingsFixture} from "./fixtures.mjs";
import {prepareReviewSteps,proof} from "./normalization-fixture.mjs";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
function fixture(fn){const temp=fs.mkdtempSync(path.join(os.tmpdir(),"normalize-plan-")),source=path.join(temp,"original demo"),project=path.join(temp,"output page");try{fs.mkdirSync(source);fs.writeFileSync(path.join(source,"index.html"),"<!doctype html><title>Settings</title><main>Original settings</main>");return fn({temp,source,project,options:{projectRoot:project,skillRoot:root}});}finally{fs.rmSync(temp,{recursive:true,force:true});}}
const accept=(options,id,extra={})=>completeTask({...options,id,evidencePath:proof(options.projectRoot,id,extra.kind||"review",extra)});
const generate=(project,source)=>spawnSync(process.execPath,[path.join(root,"scripts/normalize-demo.mjs"),"--source",source,"--project",project,"--task","设置"],{encoding:"utf8",maxBuffer:8*1024*1024});
test("plan initialization preserves originals, supports a named HTML and refuses overwrite or nested aliases",()=>fixture(({source,project,options,temp})=>{
 const file=path.join(source,"index.html"),bytes=fs.readFileSync(file);const s=initPlan({...options,source:file,task:"设置"});assert.equal(s.tasks.length,17);assert.equal(s.currentTask.id,"N01");assert.deepEqual(fs.readFileSync(file),bytes);assert.equal(JSON.parse(fs.readFileSync(path.join(project,"demo-preservation.json"))).inventoryComplete,false);
 assert.throws(()=>initPlan({...options,source,task:"设置"}),/existing plan/);
 fs.symlinkSync(source,path.join(temp,"alias"),"dir");assert.throws(()=>initPlan({projectRoot:path.join(temp,"alias","child"),source,task:"设置",skillRoot:root}),/separate/);
 fs.renameSync(file,path.join(source,"demo.html"));const p2=path.join(temp,"named-output");assert.equal(initPlan({projectRoot:p2,source:path.join(source,"demo.html"),task:"设置",skillRoot:root}).source.entry,"demo.html");
}));
test("checkpoint evidence and prerequisites cannot be skipped; inventory must be confirmed",()=>fixture(({source,options,project})=>{
 initPlan({...options,source,task:"设置"});assert.throws(()=>accept(options,"N02"),/Prerequisite/);assert.throws(()=>completeTask({...options,id:"N01",evidencePath:"missing.json"}),/Missing/);
 assert.throws(()=>accept(options,"N01",{checks:[{name:"failed",result:"failed",observed:"Fail"}]}),/Evidence/);accept(options,"N01");assert.throws(()=>accept(options,"N02"),/inventoryComplete/);
 assert.throws(()=>setTaskState({...options,id:"N02",status:"passed",reason:"trust me"}),/complete/);
 assert.equal(planStatus(options).currentTask.id,"N02");assert.equal(fs.existsSync(path.join(project,"normalization-evidence.json")),true);
}));
test("fresh-process recovery keeps passed work, reconciles interruption and repairs derived views",()=>fixture(({source,options,project})=>{
 initPlan({...options,source,task:"设置"});accept(options,"N01");setTaskState({...options,id:"N02",status:"in_progress",reason:"Inspect inventory"});fs.unlinkSync(path.join(project,"normalization-plan.md"));
 const cp=spawnSync(process.execPath,[path.join(root,"scripts/normalization-plan.mjs"),"resume","--project",project],{encoding:"utf8"});assert.equal(cp.status,0,cp.stderr);const recovered=JSON.parse(cp.stdout);assert.equal(recovered.tasks[0].status,"passed");assert.equal(recovered.tasks[1].status,"pending_validation");assert.ok(fs.readFileSync(path.join(project,"normalization-plan.md"),"utf8").includes("N02"));
}));
test("source edits, proof changes and dependent invalidation are detected without mutating read-only status",()=>fixture(({source,project,options})=>{
 initPlan({...options,source,task:"设置"});accept(options,"N01");const before=fs.readFileSync(path.join(project,"normalization-plan.json"));fs.appendFileSync(path.join(source,"index.html"),"changed");assert.equal(planStatus(options).stale[0].id,"N01");assert.deepEqual(fs.readFileSync(path.join(project,"normalization-plan.json")),before);assert.throws(()=>assertPlanReady(options),/stale/);
 resumePlan(options);assert.equal(planStatus(options).tasks[0].status,"pending_validation");accept(options,"N01");fs.appendFileSync(path.join(project,".text-to-ui/test-evidence/N01.json")," ");assert.equal(planStatus(options).stale[0].id,"N01");
}));
test("task packs carry resume context and preserve the plan selector across stages",()=>fixture(({source,project,options})=>{
 initPlan({...options,source,task:"设置"});const plan=path.join(project,"normalization-plan.json");
 const {pack}=queryResources(root,{workflow:"normalize-demo",stage:"intake","normalization-plan":plan});assert.equal(pack.handoff.normalization.currentTask.id,"N01");assert.ok(pack.commands.nextQuery.includes("--normalization-plan"));assert.ok(pack.commands.planInit);assert.throws(()=>queryResources(root,{workflow:"new-page",stage:"intake","normalization-plan":plan}),/only to normalize-demo/);
}));
test("generation requires reviews, completes only N07 and leaves browser acceptance pending",()=>fixture(({source,project,options})=>{
 settingsFixture(project);assert.notEqual(generate(project,source).status,0);prepareReviewSteps(project,source,root);const cp=generate(project,source);assert.equal(cp.status,0,cp.stderr+cp.stdout);
 const s=planStatus(options);assert.deepEqual(s.stale,[]);assert.equal(s.tasks[6].status,"passed");assert.equal(s.currentTask.id,"N08");assert.equal(s.tasks[7].status,"pending");
 assert.throws(()=>accept(options,"N08",{kind:"browser",dependencyDigest:collectProjectDependencies(project).digest,url:"http://localhost:1",viewport:{width:1440,height:900},readiness:"passed",preservation:{}}),/Every preservation/);
 assert.throws(()=>createHandoff({projectRoot:project,skillRoot:root,url:"http://localhost:1",evidencePath:"none.json"}),/not passed/);
 fs.appendFileSync(path.join(project,"page-blueprint.json")," ");const resumed=resumePlan(options);assert.equal(resumed.tasks[3].status,"passed");assert.equal(resumed.tasks[4].status,"pending_validation");assert.equal(resumed.tasks[6].status,"pending_validation");
}));
test("a failed actual generator records N07 blocked and leaves the original intact",()=>fixture(({source,project,options})=>{
 settingsFixture(project);fs.writeFileSync(path.join(project,"styles/page-composition.css"),".verification-content { gap: 123px; }\n");prepareReviewSteps(project,source,root);const original=fs.readFileSync(path.join(source,"index.html"));const cp=generate(project,source);assert.notEqual(cp.status,0);assert.equal(planStatus(options).tasks[6].status,"blocked");assert.deepEqual(fs.readFileSync(path.join(source,"index.html")),original);
}));
test("blocking decisions, changed decision scope, invalid status and concurrent writers fail explicitly",()=>fixture(({source,project,options})=>{
 settingsFixture(project);prepareReviewSteps(project,source,root);configurePlan({...options,decisions:{scope:"Changed scope",pattern:"pattern-a-two-pane",confirmed:[],open:[{id:"choice",text:"Which destination?"}],gaps:[]}});assert.equal(planStatus(options).tasks[1].status,"passed");assert.equal(planStatus(options).tasks[2].status,"pending_validation");assert.throws(()=>accept(options,"N03"),/blocking/);
 fs.writeFileSync(path.join(project,".normalization-plan.lock"),"active");assert.throws(()=>resumePlan(options),/EEXIST/);fs.unlinkSync(path.join(project,".normalization-plan.lock"));
 const file=path.join(project,"normalization-plan.json"),p=JSON.parse(fs.readFileSync(file));p.tasks[0].status="invented";fs.writeFileSync(file,JSON.stringify(p));assert.throws(()=>planStatus(options),/Invalid task/);
}));
test("review artifacts cannot escape the project or rely on symlinks",()=>fixture(({source,project,options,temp})=>{
 initPlan({...options,source,task:"设置"});assert.throws(()=>accept(options,"N01",{artifacts:["../original demo/index.html"]}),/escapes/);fs.symlinkSync(path.join(source,"index.html"),path.join(project,"external.html"));assert.throws(()=>accept(options,"N01",{artifacts:["external.html"]}),/symlink/);
}));
test("skill changes invalidate migration while retaining original registration checkpoints",()=>fixture(({source,temp,project})=>{
 const mini=path.join(temp,"mini-skill");fs.mkdirSync(path.join(mini,"references/workflows"),{recursive:true});for(const f of ["package.json","skill-profile.json","references/workflows/normalization-tasks.json"])fs.copyFileSync(path.join(root,f),path.join(mini,f));const options={projectRoot:project,skillRoot:mini};initPlan({...options,source,task:"设置"});accept(options,"N01");fs.writeFileSync(path.join(mini,"new-rule.txt"),"rule change");const s=resumePlan(options);assert.equal(s.tasks[0].status,"passed");assert.equal(s.tasks[4].status,"pending_validation");
}));

test("handoff completes N17 only after current source/build/browser checkpoints; output edits invalidate it",()=>fixture(({temp,source,project,options})=>{
 settingsFixture(project);prepareReviewSteps(project,source,root);const generated=generate(project,source);assert.equal(generated.status,0,generated.stderr+generated.stdout);
 const preservation=JSON.parse(fs.readFileSync(path.join(project,"demo-preservation.json")));const preserved=Object.fromEntries(preservation.items.map(x=>[x.id,"passed"]));
 const browser=(id)=>accept(options,id,{kind:"browser",dependencyDigest:collectProjectDependencies(project).digest,url:"http://127.0.0.1:4173",viewport:{width:1440,height:900,zoom:1,stateId:"default",scroll:{x:0,y:0}},readiness:"passed",preservation:preserved,source:"passed",build:"passed",browser:"passed",visual:"pending"});
 browser("N08");accept(options,"N09");accept(options,"N10");browser("N11");accept(options,"N12");
 const sourceResult=runPlanCheck({...options,id:"N13"});assert.equal(sourceResult.tasks[12].status,"passed");
 // An isolated command stub tests persistence of real exit codes/logs without downloading build dependencies.
 const bin=path.join(temp,"fake-bin");fs.mkdirSync(bin);const stub=path.join(bin,"pnpm");fs.writeFileSync(stub,'#!/bin/sh\nmkdir -p dist\ncp index.html dist/index.html\nprintf "synthetic test build log\\n"\n');fs.chmodSync(stub,0o755);
 const old=process.env.PATH;process.env.PATH=bin+path.delimiter+old;try{assert.equal(runPlanCheck({...options,id:"N14"}).tasks[13].status,"passed");}finally{process.env.PATH=old;}
 const rel=proof(project,"N15","browser",{dependencyDigest:"0".repeat(64),url:"http://127.0.0.1:4173",viewport:{width:1440,height:900},source:"passed",build:"passed",browser:"passed",visual:"pending",preservation:preserved});assert.throws(()=>completeTask({...options,id:"N15",evidencePath:rel}),/stale/);
 browser("N15");accept(options,"N16");const evidencePath=".text-to-ui/test-evidence/N15.json";
 const handoff=createHandoff({projectRoot:project,skillRoot:root,url:"http://127.0.0.1:4173",evidencePath});assert.ok(handoff.sha256);assert.equal(planStatus(options).complete,true);verifyHandoff({projectRoot:project,skillRoot:root});
 fs.appendFileSync(path.join(project,"styles/page-composition.css"),"\n/* changed after acceptance */\n");assert.equal(planStatus(options).complete,false);assert.throws(()=>verifyHandoff({projectRoot:project,skillRoot:root}),/stale/);const s=resumePlan(options);assert.equal(s.tasks[3].status,"passed");assert.notEqual(s.tasks[16].status,"passed");
}));

test("a failed build records its log and never marks the build task passed",()=>fixture(({temp,source,project,options})=>{
 settingsFixture(project);prepareReviewSteps(project,source,root);const generated=generate(project,source);assert.equal(generated.status,0,generated.stderr+generated.stdout);
 const preservation=JSON.parse(fs.readFileSync(path.join(project,"demo-preservation.json")));const preserved=Object.fromEntries(preservation.items.map(x=>[x.id,"passed"]));
 for(const id of ["N08","N09","N10","N11","N12"]){if(["N08","N11"].includes(id))accept(options,id,{kind:"browser",dependencyDigest:collectProjectDependencies(project).digest,url:"http://localhost:4173",viewport:{width:1440,height:900},readiness:"passed",preservation:preserved});else accept(options,id);}
 runPlanCheck({...options,id:"N13"});const bin=path.join(temp,"fake-bin");fs.mkdirSync(bin);fs.writeFileSync(path.join(bin,"pnpm"),'#!/bin/sh\nprintf "synthetic failure\\n" >&2\nexit 9\n');fs.chmodSync(path.join(bin,"pnpm"),0o755);const old=process.env.PATH;process.env.PATH=bin+path.delimiter+old;
 try{assert.throws(()=>runPlanCheck({...options,id:"N14"}),/Check failed/);}finally{process.env.PATH=old;}
 assert.equal(planStatus(options).tasks[13].status,"blocked");assert.match(fs.readFileSync(path.join(project,".text-to-ui/normalization/N14.log"),"utf8"),/synthetic failure/);
}));

test("explicitly static Demo generates without inventing a click behavior; default missing behavior still fails",()=>fixture(({source,project,options})=>{
 const {blueprint,bindings}=settingsFixture(project);blueprint.interactions=[];blueprint.staticDemo={reason:"Original has no defined interactions",undefinedBindingIds:["nav","toggle"]};for(const b of bindings.componentBindings)delete b.behaviorId;bindings.behaviorPlan.interactions=[];fs.writeFileSync(path.join(project,"page-blueprint.json"),JSON.stringify(blueprint));fs.writeFileSync(path.join(project,"page-bindings.json"),JSON.stringify(bindings));
 initPlan({...options,source,task:"设置"});const preservation=JSON.parse(fs.readFileSync(path.join(project,"demo-preservation.json")));preservation.inventoryComplete=true;fs.writeFileSync(path.join(project,"demo-preservation.json"),JSON.stringify(preservation));configurePlan({...options,decisions:{scope:"Preserve static original",pattern:"pattern-a-two-pane",confirmed:[],open:[],gaps:[{id:"undefined",text:"No business behavior defined for source controls"}]}});
 const ctx=spawnSync(process.execPath,[path.join(root,"scripts/resolve-context.mjs"),"--task","设置","--workflow-route","normalize-demo","--discover","--out",path.join(project,".text-to-ui/context-packet.json")],{encoding:"utf8"});assert.equal(ctx.status,0,ctx.stderr);
 for(let i=1;i<=6;i++)accept(options,"N"+String(i).padStart(2,"0"));const cp=generate(project,source);assert.equal(cp.status,0,cp.stderr+cp.stdout);assert.equal(planStatus(options).currentTask.id,"N08");const generated=fs.readFileSync(path.join(project,"generated-entry.js"),"utf8");assert.ok(!generated.includes('"kind":"toggle-hidden"'));
}));

test("static declaration cannot silently relax normal new-page behavior requirements",()=>fixture(({project})=>{
 const {blueprint}=settingsFixture(project);blueprint.interactions=[];fs.writeFileSync(path.join(project,"page-blueprint.json"),JSON.stringify(blueprint));
 const run=()=>spawnSync(process.execPath,[path.join(root,"scripts/generate-compliant-page.mjs"),"--project",project,"--task","设置"],{encoding:"utf8",maxBuffer:8*1024*1024});
 let cp=run();assert.notEqual(cp.status,0);assert.match(cp.stderr,/interactions must be a non-empty array/);
 blueprint.staticDemo={reason:"Static original",undefinedBindingIds:["nav","toggle"]};fs.writeFileSync(path.join(project,"page-blueprint.json"),JSON.stringify(blueprint));cp=run();assert.notEqual(cp.status,0);assert.match(cp.stderr,/staticDemo declaration is only valid for normalize-demo/);
}));
