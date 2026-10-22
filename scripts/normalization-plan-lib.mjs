import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {randomUUID} from "node:crypto";
import {spawnSync} from "node:child_process";
import {sha256,projectFile,collectProjectDependencies} from "./artifact-dependencies.mjs";
import {deliveryManifest} from "./skill-distribution.mjs";
const ownRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=f=>JSON.parse(fs.readFileSync(f,"utf8"));
const json=v=>JSON.stringify(v,null,2)+"\n";
const now=()=>new Date().toISOString();
const statuses=["pending","in_progress","pending_validation","passed","blocked"];
const labels={pending:"待执行",in_progress:"执行中",pending_validation:"待验收",passed:"已通过",blocked:"受阻"};
const definitions=root=>read(path.join(root,"references/workflows/normalization-tasks.json"));
const digestFile=f=>fs.existsSync(f)?sha256(fs.readFileSync(f)):null;
function safePath(root,rel){
 if(typeof rel!=="string"||!rel||path.isAbsolute(rel))throw new Error("Expected a project-relative path");
 const full=path.resolve(root,rel);
 if(!full.startsWith(root+path.sep))throw new Error("Path escapes project: "+rel);
 let p=full;while(p!==root){if(fs.existsSync(p)&&fs.lstatSync(p).isSymbolicLink())throw new Error("Symlink is forbidden: "+rel);p=path.dirname(p);}
 return full;
}
function canonical(p){p=path.resolve(p);if(fs.existsSync(p))return fs.realpathSync(p);return path.join(canonical(path.dirname(p)),path.basename(p));}
function separate(source,project){if(source===project||project.startsWith(source+path.sep)||source.startsWith(project+path.sep))throw new Error("Preserve original: source and output must be separate non-nested projects");}
function originalSnapshot(root){
 const files=[];const skip=new Set([".git","node_modules","dist","build","outputs","coverage",".DS_Store"]);
 function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){if(skip.has(e.name))continue;const f=path.join(dir,e.name);if(e.isSymbolicLink())throw new Error("Original Demo symlink: "+f);if(e.isDirectory())walk(f);else if(e.isFile())files.push({path:path.relative(root,f).split(path.sep).join("/"),sha256:digestFile(f)});}}
 walk(root);return {digest:sha256(json(files)),files};
}
export function validatePreservation(record){
 if(record.schemaVersion!==1||!record.items?.length)throw new Error("Preservation requires schemaVersion 1 and nonempty items");
 const ids=new Set();for(const i of record.items){if(!i.id||ids.has(i.id)||!["content","navigation","state","interaction"].includes(i.kind)||!i.action?.trim()||!i.expected?.trim())throw new Error("Every preservation item needs unique id, kind, action and expected");ids.add(i.id);}
 return record;
}
function validate(plan,root){
 const defs=definitions(root);
 if(plan.schemaVersion!==1||plan.kind!=="text-to-ui-normalization-plan"||plan.workflow!=="normalize-demo"||!Number.isInteger(plan.revision)||!plan.source?.root||!plan.source.entry||!plan.baseline?.source?.digest||!plan.baseline.skill||!plan.project||!plan.request?.task||!plan.decisions||!Array.isArray(plan.history)||!Array.isArray(plan.tasks)||plan.tasks.length!==defs.tasks.length)throw new Error("Invalid normalization plan");
 for(let n=0;n<defs.tasks.length;n++){const t=plan.tasks[n],d=defs.tasks[n];if(t.id!==d.id||t.phase!==d.phase||t.kind!==d.kind||JSON.stringify(t.requires)!==JSON.stringify(d.requires)||JSON.stringify(t.requiredArtifacts)!==JSON.stringify(d.artifacts)||!statuses.includes(t.status))throw new Error("Invalid task identity/dependency/status: "+d.id);if(t.status==="passed"&&(!t.proof?.path||!t.snapshot||!t.artifacts))throw new Error("Passed task lacks evidence: "+t.id);}
 if(!Array.isArray(plan.decisions.open)||!Array.isArray(plan.decisions.confirmed)||!Array.isArray(plan.decisions.gaps)||typeof plan.decisions.scope!=="string")throw new Error("Invalid decisions");
 separate(canonical(plan.source.root),canonical(plan.project));
 return plan;
}
function load(project,root){project=canonical(project);const p=validate(read(projectFile(project,"normalization-plan.json")),root);if(p.project!==project)throw new Error("Project moved: reinitialize in a separate directory and preserve the old plan");return p;}
function atomic(root,rel,body){const target=safePath(root,rel);fs.mkdirSync(path.dirname(target),{recursive:true});const temp=target+"."+randomUUID()+".tmp";try{fs.writeFileSync(temp,body,{flag:"wx"});fs.renameSync(temp,target);}finally{fs.rmSync(temp,{force:true});}}
export function renderPlan(p,defs){
 const rows=p.tasks.map(t=>`| ${t.id} | ${t.title} | ${labels[t.status]} | ${t.reason||""} |`);
 return `# Demo 规范化执行计划\n\n此文件由 normalization-plan.json 生成；仅修改 JSON 的受支持字段或使用计划命令。\n\n任务：${p.request.task}\n原件：${p.source.root}/${p.source.entry}\n输出：${p.project}\n修订：${p.revision}\n\n范围与决定：\n\`\`\`json\n${json(p.decisions)}\`\`\`\n\n`+defs.phases.map((name,i)=>`## ${i+1}. ${name}\n\n| ID | 任务 | 状态 | 原因 |\n|---|---|---|---|\n`+rows.filter((_,n)=>p.tasks[n].phase===i+1).join("\n")).join("\n\n")+"\n\n通过条件与依赖见 normalization-plan.json；证据引用见 normalization-evidence.json。\n";
}
function save(p,root){
 p.revision++;p.updatedAt=now();
 atomic(p.project,"normalization-plan.json",json(p));
 // Derived views may be repaired after an interruption; JSON is the only authority.
 atomic(p.project,"normalization-plan.md",renderPlan(p,definitions(root)));
 atomic(p.project,"normalization-evidence.json",json({schemaVersion:1,planRevision:p.revision,tasks:p.tasks.filter(t=>t.proof).map(({id,status,proof,artifacts,snapshot})=>({id,status,proof,artifacts,snapshot}))}));
}
function locked(project,fn){
 const lock=safePath(project,".normalization-plan.lock");let fd;
 try{fd=fs.openSync(lock,"wx");fs.writeFileSync(fd,json({pid:process.pid,startedAt:now()}));return fn();}
 finally{if(fd!==undefined){fs.closeSync(fd);fs.unlinkSync(lock);}}
}
function fingerprint(p,root){return {source:originalSnapshot(p.source.root),skill:deliveryManifest(root).sourceDigest,preservation:digestFile(safePath(p.project,"demo-preservation.json")),decisions:sha256(json({request:p.request,decisions:p.decisions}))};}
function contextIdentity(project){const c=read(projectFile(project,".text-to-ui/context-packet.json"));return sha256(json({task:c.request?.task,route:c.route?.id,workflow:c.route?.workflowRouteId,pattern:c.layout?.id}));}
function fileRefs(project,paths){return [...new Set(paths)].map(f=>({path:f,sha256:sha256(fs.readFileSync(projectFile(project,f)))}));}
function staleTasks(p,root){
 const current=fingerprint(p,root),bad=new Map();const mark=(id,why)=>{if(!bad.has(id))bad.set(id,why);};
 if(current.source.digest!==p.baseline.source.digest)mark("N01","原始 Demo 已变化，需要重新登记");
 if(current.skill!==p.baseline.skill)mark("N05","技能源已变化，需要重新核对设计输入与依赖");
 for(const t of p.tasks){
  if(t.status!=="passed")continue;
  const s=t.snapshot;
  if(t.requires.some(id=>p.tasks.find(x=>x.id===id).status!=="passed"))mark(t.id,"前置任务未通过");
  if(t.id>="N02"&&s.preservation!==current.preservation)mark("N02","保留清单已变化");
  if(t.id>="N03"&&s.decisions!==current.decisions)mark("N03","任务范围或已确认决定已变化");
  for(const ref of [t.proof,...t.artifacts]){try{if(digestFile(projectFile(p.project,ref.path))!==ref.sha256)mark(t.id,"产物或证据变化："+ref.path);}catch{mark(t.id,"产物或证据缺失："+ref.path);}}
  if(s.contextIdentity){try{if(s.contextIdentity!==contextIdentity(p.project))mark(t.id,"Context Task/Pattern changed");}catch{mark(t.id,"Context missing");}}
  if(s.pageDigest){try{if(collectProjectDependencies(p.project).digest!==s.pageDigest)mark(t.id,"页面依赖已变化，需要重新验收");}catch{mark(t.id,"页面依赖缺失");}}
 }
 for(const t of p.tasks)if(t.requires.some(id=>bad.has(id)))mark(t.id,"前置任务证据已过期");
 return {current,stale:[...bad].map(([id,reason])=>({id,reason}))};
}
function summary(p,state){
 const stale=new Set(state.stale.map(t=>t.id)),blocking=p.decisions.open.filter(x=>x.blocking!==false);
 const next=p.tasks.find(t=>t.status!=="passed"||stale.has(t.id));
 return {planPath:path.join(p.project,"normalization-plan.json"),revision:p.revision,workflow:p.workflow,source:p.source,skill:p.skill,task:p.request.task,decisions:p.decisions,stale:state.stale,blockingDecisions:blocking,currentTask:next?{id:next.id,phase:next.phase,title:next.title,status:next.status,acceptance:next.acceptance,requires:next.requires,requiredArtifacts:next.requiredArtifacts}:null,nextAction:blocking.length?"Resolve recorded blocking decisions before dependent work":next?`核对 ${next.id} 产物及通过条件；通过计划命令记录结果后继续`:"全部步骤通过；交接后页面如有变化需重新验收",interrupted:p.tasks.filter(t=>t.status==="in_progress").map(t=>t.id),tasks:p.tasks.map(({id,phase,title,status,reason})=>({id,phase,title,status,reason})),readFiles:["normalization-plan.json","demo-preservation.json","normalization-evidence.json"],complete:!next&&!blocking.length};
}
export function planStatus({projectRoot,skillRoot=ownRoot}){const p=load(projectRoot,skillRoot);return summary(p,staleTasks(p,skillRoot));}
export function initPlan({source,projectRoot,task,skillRoot=ownRoot}){
 if(!task?.trim())throw new Error("Provide --task");
 const input=fs.realpathSync(source),sourceRoot=fs.statSync(input).isFile()?path.dirname(input):input,entry=fs.statSync(input).isFile()?path.basename(input):"index.html",project=canonical(projectRoot);
 separate(sourceRoot,project);projectFile(sourceRoot,entry);fs.mkdirSync(project,{recursive:true});
 return locked(project,()=>{
  if(fs.existsSync(safePath(project,"normalization-plan.json")))throw new Error("Preserve existing plan; use status/resume");
  const preservation=safePath(project,"demo-preservation.json");if(!fs.existsSync(preservation))atomic(project,"demo-preservation.json",json({schemaVersion:1,inventoryComplete:false,items:[{id:"source-content",kind:"content",action:"Open "+entry,expected:"Preserve confirmed source content and information relationships; refine this inventory before N02"}]}));
  const defs=definitions(skillRoot),profile=read(path.join(skillRoot,"skill-profile.json"));
  const p={schemaVersion:1,kind:"text-to-ui-normalization-plan",workflow:"normalize-demo",revision:0,createdAt:now(),project,source:{root:sourceRoot,entry},skill:{root:fs.realpathSync(skillRoot),version:profile.version},request:{task},decisions:{scope:"保留原 Demo 内容、信息关系和已定义行为；迁移动态框架并规范所选组件、Token 和排版",pattern:null,confirmed:[],open:[],gaps:[]},tasks:defs.tasks.map(t=>({...t,requiredArtifacts:t.artifacts,artifacts:[],status:"pending"})),history:[]};
  p.baseline=fingerprint(p,skillRoot);save(p,skillRoot);return summary(p,staleTasks(p,skillRoot));
 });
}
function mutate(projectRoot,skillRoot,fn){const project=canonical(projectRoot);return locked(project,()=>{const p=load(project,skillRoot);const result=fn(p);save(p,skillRoot);return result??summary(p,staleTasks(p,skillRoot));});}
export function resumePlan({projectRoot,skillRoot=ownRoot}){return mutate(projectRoot,skillRoot,p=>{
 const state=staleTasks(p,skillRoot);
 for(const {id,reason}of state.stale){const t=p.tasks.find(t=>t.id===id);if(t.proof){t.previousProof=t.proof;delete t.proof;}delete t.snapshot;t.status="pending_validation";t.reason=reason;}
 for(const t of p.tasks)if(t.status==="in_progress"){t.status="pending_validation";t.reason="上次执行中断；检查实际产物后恢复，不能自动视为通过";}
 if(state.stale.length)p.history.push({at:now(),event:"invalidate",tasks:state.stale});
 p.baseline=state.current;p.skill={root:fs.realpathSync(skillRoot),version:read(path.join(skillRoot,"skill-profile.json")).version};
 });}
export function configurePlan({projectRoot,decisions,skillRoot=ownRoot}){
 if(!decisions||typeof decisions.scope!=="string"||!decisions.scope.trim()||!(decisions.pattern===null||typeof decisions.pattern==="string")||!["confirmed","open","gaps"].every(k=>Array.isArray(decisions[k])))throw new Error("Decisions require scope, pattern, confirmed[], open[], gaps[]");
 for(const key of ["confirmed","open","gaps"]){const ids=new Set();for(const d of decisions[key]){if(!d.id||!d.text||ids.has(d.id))throw new Error("Decisions need unique id and text");ids.add(d.id);}}
 mutate(projectRoot,skillRoot,p=>{p.decisions=decisions;p.history.push({at:now(),event:"decisions-updated"});});return resumePlan({projectRoot,skillRoot});
}
export function assertPlanReady({projectRoot,through="N06",skillRoot=ownRoot}){
 const p=load(projectRoot,skillRoot),s=staleTasks(p,skillRoot);
 if(s.stale.length)throw new Error("Plan evidence is stale; run normalization-plan.mjs resume: "+s.stale.map(x=>x.id).join(","));
 if(p.decisions.open.some(x=>x.blocking!==false))throw new Error("Resolve blocking decisions before generation/handoff");
 const missing=p.tasks.filter(t=>t.id<=through&&t.status!=="passed");if(missing.length)throw new Error("Required plan tasks not passed: "+missing.map(t=>t.id).join(","));return p;
}
export function setTaskState({projectRoot,id,status,reason,skillRoot=ownRoot}){
 if(!["in_progress","pending_validation","blocked"].includes(status))throw new Error("Use complete with evidence for passed; resume for invalidation");
 return mutate(projectRoot,skillRoot,p=>{const t=p.tasks.find(t=>t.id===id);if(!t)throw new Error("Unknown task");if(!reason?.trim())throw new Error("Provide a reason/next action");if(t.status==="passed")throw new Error("Passed task must be invalidated through changed evidence/resume");if(staleTasks(p,skillRoot).stale.length)throw new Error("Run resume before changing task status");if(status!=="blocked"&&t.requires.some(id=>p.tasks.find(x=>x.id===id).status!=="passed"))throw new Error("Prerequisite not passed");t.status=status;t.reason=reason;p.history.push({at:now(),event:status,task:id,reason});});
}
function checkProof(p,t,proof,root){
 if(proof.schemaVersion!==1||proof.taskId!==t.id||proof.kind!==t.kind||proof.result!=="passed"||!proof.summary?.trim()||!Array.isArray(proof.checks)||!proof.checks.length||proof.checks.some(c=>!c.name||c.result!=="passed"||!c.observed))throw new Error("Evidence needs matching taskId/kind, passed result, summary and observed checks");
 if(["N02","N03"].includes(t.id)){
  const record=validatePreservation(read(projectFile(p.project,"demo-preservation.json")));if(record.inventoryComplete!==true)throw new Error("Confirm inventoryComplete only after refining preservation items");
 }
 if(t.id==="N03"){
  const ctx=read(projectFile(p.project,".text-to-ui/context-packet.json"));
  if(!p.decisions.pattern||ctx.layout?.id!==p.decisions.pattern||ctx.route?.workflowRouteId!=="normalize-demo")throw new Error("Confirmed Pattern must match normalize-demo Context Packet");
 }
 if(t.id==="N06"){
  const b=read(projectFile(p.project,"page-blueprint.json"));
  if(b.staticDemo?.undefinedBindingIds?.length&&!p.decisions.gaps.length)throw new Error("Record undefined static behavior in decisions.gaps");
 }
 if(t.id==="N07"){
  const receipt=read(projectFile(p.project,".text-to-ui/generation-receipt.json"));if(receipt.route?.workflowRouteId!=="normalize-demo"||!receipt.gates?.length||receipt.gates.some(g=>g.status!=="passed"))throw new Error("Generation receipt is not passed normalize-demo output");
 }
 if(["browser","source","build"].includes(t.kind)){
  if(proof.dependencyDigest!==collectProjectDependencies(p.project).digest)throw new Error("Evidence dependencyDigest is stale");
 }
 if(t.kind==="browser"){
  if(!/^https?:\/\//.test(proof.url||"")||!proof.viewport||![proof.viewport.width,proof.viewport.height].every(n=>Number.isFinite(n)&&n>0))throw new Error("Browser evidence requires actual HTTP URL and viewport");
  if(t.id==="N08"&&proof.readiness!=="passed")throw new Error("Dynamic checkpoint requires observed readiness");
  if(["N08","N15"].includes(t.id)){const record=validatePreservation(read(projectFile(p.project,"demo-preservation.json")));if(record.items.some(i=>proof.preservation?.[i.id]!=="passed"))throw new Error("Every preservation item requires browser evidence");}
  if(t.id==="N15"&&(["source","build","browser"].some(k=>proof[k]!=="passed")||!["passed","pending"].includes(proof.visual)))throw new Error("Final evidence requires source/build/browser passed and visual passed or explicitly pending");
 }
 if(t.kind==="source"){
  const cp=spawnSync(process.execPath,[path.join(root,"scripts/validate-page-project.mjs"),"--project",p.project,"--skill-root",root],{encoding:"utf8"});if(cp.status!==0)throw new Error("Source check failed: "+cp.stdout+cp.stderr);
 }
 if(t.kind==="build"&&(!proof.log||JSON.stringify(proof.command)!==JSON.stringify(["pnpm","build"])||proof.exitCode!==0))throw new Error("Build evidence needs command, exitCode 0 and saved log");
 if(t.kind==="handoff"){
  const h=read(projectFile(p.project,"html-handoff.json"));if(h.kind!=="text-to-ui-html-handoff"||h.dependencies?.digest!==collectProjectDependencies(p.project).digest)throw new Error("Handoff dependencies are stale");
  const cp=spawnSync(process.execPath,[path.join(root,"scripts/html-handoff.mjs"),"check","--project",p.project],{encoding:"utf8"});if(cp.status!==0)throw new Error("Formal handoff verification failed: "+cp.stdout+cp.stderr);
 }
}
export function completeTask({projectRoot,id,evidencePath,skillRoot=ownRoot}){return mutate(projectRoot,skillRoot,p=>{
 const t=p.tasks.find(t=>t.id===id);if(!t)throw new Error("Unknown task: "+id);
 const state=staleTasks(p,skillRoot);if(state.stale.length)throw new Error("Run resume before accepting stale results");
 if(t.requires.some(id=>p.tasks.find(x=>x.id===id).status!=="passed"))throw new Error("Prerequisite not passed");
 if(t.id>="N03"&&p.decisions.open.some(x=>x.blocking!==false))throw new Error("Resolve blocking decisions");
 const proofFile=projectFile(p.project,evidencePath),proof=read(proofFile);checkProof(p,t,proof,skillRoot);
 const definition=definitions(skillRoot).tasks.find(x=>x.id===id);
 const paths=[...definition.artifacts,...(proof.artifacts||[]),...(proof.log?[proof.log]:[])];
 // Plans and their derived views are self-referential; never accept them as stable artifact hashes.
 if(paths.some(f=>["normalization-plan.json","normalization-plan.md","normalization-evidence.json"].includes(f)))throw new Error("Plan projections cannot be evidence artifacts");
 t.artifacts=fileRefs(p.project,paths.filter(f=>t.id!=="N03"||f!==".text-to-ui/context-packet.json"));t.proof={path:evidencePath,sha256:sha256(fs.readFileSync(proofFile))};
 t.snapshot={...(t.id==="N03"?{contextIdentity:contextIdentity(p.project)}:{}),preservation:state.current.preservation,decisions:state.current.decisions,...(t.kind!=="review"&&t.kind!=="generation"||t.id>="N13"?{pageDigest:collectProjectDependencies(p.project).digest}:{})};
 t.status="passed";t.reason="";t.completedAt=now();p.history.push({at:now(),event:"passed",task:id,proof:t.proof});
 });}
export function generatedCheckpoint({projectRoot,skillRoot=ownRoot}){
 const rel=".text-to-ui/normalization/N07.json",project=canonical(projectRoot);
 atomic(project,rel,json({schemaVersion:1,taskId:"N07",kind:"generation",result:"passed",summary:"normalize-demo generator completed",checks:[{name:"generation",result:"passed",observed:"Generator exited with code 0; browser acceptance remains separate"}]}));
 return completeTask({projectRoot:project,id:"N07",evidencePath:rel,skillRoot});
}
export function handoffCheckpoint({projectRoot,skillRoot=ownRoot}){
 const project=canonical(projectRoot),rel=".text-to-ui/normalization/N17.json";
 atomic(project,rel,json({schemaVersion:1,taskId:"N17",kind:"handoff",result:"passed",summary:"Formal HTML handoff was generated and verified",checks:[{name:"handoff",result:"passed",observed:"createHandoff and verifyHandoff passed"}]}));
 return completeTask({projectRoot:project,id:"N17",evidencePath:rel,skillRoot});
}
export function runPlanCheck({projectRoot,id,skillRoot=ownRoot}){
 if(!["N13","N14"].includes(id))throw new Error("run-check supports N13 source and N14 build only");
 setTaskState({projectRoot,id,status:"in_progress",reason:"Running actual check",skillRoot});
 const project=canonical(projectRoot),cmd=id==="N13"?[process.execPath,path.join(skillRoot,"scripts/validate-page-project.mjs"),"--project",project,"--skill-root",skillRoot]:["pnpm","build"];
 const result=spawnSync(cmd[0],cmd.slice(1),{cwd:project,encoding:"utf8",maxBuffer:16*1024*1024});
 const log=`.text-to-ui/normalization/${id}.log`;atomic(project,log,(result.stdout||"")+(result.stderr||"")+(result.error?.message||""));
 if(result.status!==0){setTaskState({projectRoot:project,id,status:"blocked",reason:"Actual check failed; see "+log,skillRoot});throw new Error("Check failed; see "+log);}
 const rel=`.text-to-ui/normalization/${id}.json`;atomic(project,rel,json({schemaVersion:1,taskId:id,kind:id==="N13"?"source":"build",result:"passed",summary:"Actual command completed",checks:[{name:"command",result:"passed",observed:"Exit code 0; see saved log"}],command:cmd,exitCode:0,log,dependencyDigest:collectProjectDependencies(project).digest}));
 return completeTask({projectRoot:project,id,evidencePath:rel,skillRoot});
}

export function invalidateTask({projectRoot,id,reason,skillRoot=ownRoot}){
 if(!reason?.trim())throw new Error("Provide invalidation reason");
 return mutate(projectRoot,skillRoot,p=>{
  const first=p.tasks.findIndex(t=>t.id===id);if(first<0)throw new Error("Unknown task");
  for(const t of p.tasks.slice(first)){if(t.proof)t.previousProof=t.proof;delete t.proof;delete t.snapshot;t.status="pending_validation";t.reason=reason;}
  p.history.push({at:now(),event:"invalidate",task:id,reason});
 });
}
