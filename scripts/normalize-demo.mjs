#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {parseArgs} from "./navigation-index-lib.mjs";
import {collectProjectDependencies,sha256} from "./artifact-dependencies.mjs";
import {assertPlanReady,setTaskState,generatedCheckpoint,invalidateTask} from "./normalization-plan-lib.mjs";
const args=parseArgs(process.argv.slice(2));
if(args.help){console.log("normalize-demo.mjs --source <original> --project <separate-output> --task <task>");process.exit(0);}
if(!args.source||!args.project||!args.task)throw new Error("Provide --source --project --task and prepared page inputs");
const skill=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const project=fs.realpathSync(path.resolve(args.project));
const plan=assertPlanReady({projectRoot:project,skillRoot:skill});
const input=fs.realpathSync(path.resolve(args.source));
const source=fs.statSync(input).isFile()?path.dirname(input):input;
const entry=fs.statSync(input).isFile()?path.basename(input):"index.html";
if(plan.source.root!==source||plan.source.entry!==entry||plan.request.task!==args.task)throw new Error("Source/task differs from durable plan");
for(const [flag,relative]of Object.entries({blueprint:"page-blueprint.json","content-recipes":"page-content-recipes.json",bindings:"page-bindings.json","page-css":"styles/page-composition.css",context:".text-to-ui/context-packet.json","receipt-out":".text-to-ui/generation-receipt.json"}))if(args[flag]&&path.resolve(args[flag])!==path.join(project,relative))throw new Error("Normalization plan uses fixed project input paths: "+flag);
if(source===project||project.startsWith(source+path.sep)||source.startsWith(project+path.sep))throw new Error("Preserve the original Demo; use a separate output project");
const recordFile=path.join(project,"demo-preservation.json"),record=JSON.parse(fs.readFileSync(recordFile));
if(record.schemaVersion!==1||!record.items?.length)throw new Error("demo-preservation.json requires schemaVersion 1 and nonempty items");
const ids=new Set();for(const item of record.items){if(!item.id||ids.has(item.id)||!["content","navigation","state","interaction"].includes(item.kind)||!item.expected||!item.action)throw new Error("Each unique preservation item needs id, kind, action and expected");ids.add(item.id);}
const dependencies=collectProjectDependencies(source,entry);
const baseline={schemaVersion:1,kind:"text-to-ui-demo-baseline",sourceDigest:dependencies.digest,preservationSha256:sha256(fs.readFileSync(recordFile)),sourceFiles:dependencies.files};
fs.mkdirSync(path.join(project,".text-to-ui"),{recursive:true});fs.writeFileSync(path.join(project,".text-to-ui/demo-baseline.json"),JSON.stringify(baseline,null,2)+"\n");
// These flags belong to this wrapper; forwarding and appending them twice
// turns parser values into arrays and breaks standalone path resolution.
const forwarded=[];
const owned=new Set(["--source","--repo","--skill-root","--route"]);
const pathFlags=new Set(["--project","--context","--blueprint","--content-recipes","--bindings","--page-css","--layout-contract","--component-selection","--route-receipt","--context-receipt","--receipt-out"]);
for(let i=2;i<process.argv.length;i++) {
 const value=process.argv[i];
 if(owned.has(value)){i++;continue;}
 if(pathFlags.has(value)){if(!process.argv[i+1] || process.argv[i+1].startsWith("--"))throw new Error("Missing path for "+value);forwarded.push(value,path.resolve(process.argv[++i]));continue;}
 forwarded.push(value);
}
if(plan.tasks.find(t=>t.id==="N07").status==="passed")invalidateTask({projectRoot:project,id:"N07",reason:"Regenerating dynamic project",skillRoot:skill});
setTaskState({projectRoot:project,id:"N07",status:"in_progress",reason:"Generating dynamic project; browser checks remain pending",skillRoot:skill});
const cp=spawnSync(process.execPath,[path.join(skill,"scripts/generate-compliant-page.mjs"),...forwarded,"--route","normalize-demo","--repo",skill,"--skill-root",skill],{cwd:skill,stdio:"inherit"});
if(cp.status!==0){setTaskState({projectRoot:project,id:"N07",status:"blocked",reason:"Generator failed; inspect output and repair current inputs",skillRoot:skill});process.exit(cp.status||1);}
generatedCheckpoint({projectRoot:project,skillRoot:skill});
console.log(JSON.stringify({ok:true,workflow:"normalize-demo",sourceDigest:dependencies.digest,preservedItems:[...ids],behaviorValidation:"pending-browser-checks"}));
