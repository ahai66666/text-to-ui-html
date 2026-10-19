#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {parseArgs} from "./navigation-index-lib.mjs";
import {collectProjectDependencies,sha256} from "./artifact-dependencies.mjs";
const args=parseArgs(process.argv.slice(2));
if(args.help){console.log("normalize-demo.mjs --source <original> --project <separate-output> --task <task>");process.exit(0);}
if(!args.source||!args.project||!args.task)throw new Error("Provide --source --project --task and prepared page inputs");
const source=fs.realpathSync(path.resolve(args.source)),project=path.resolve(args.project);
if(source===project||project.startsWith(source+path.sep)||source.startsWith(project+path.sep))throw new Error("Preserve the original Demo; use a separate output project");
const recordFile=path.join(project,"demo-preservation.json"),record=JSON.parse(fs.readFileSync(recordFile));
if(record.schemaVersion!==1||!record.items?.length)throw new Error("demo-preservation.json requires schemaVersion 1 and nonempty items");
const ids=new Set();for(const item of record.items){if(!item.id||ids.has(item.id)||!["content","navigation","state","interaction"].includes(item.kind)||!item.expected||!item.action)throw new Error("Each unique preservation item needs id, kind, action and expected");ids.add(item.id);}
const dependencies=collectProjectDependencies(source);
const baseline={schemaVersion:1,kind:"text-to-ui-demo-baseline",sourceDigest:dependencies.digest,preservationSha256:sha256(fs.readFileSync(recordFile)),sourceFiles:dependencies.files};
fs.mkdirSync(path.join(project,".text-to-ui"),{recursive:true});fs.writeFileSync(path.join(project,".text-to-ui/demo-baseline.json"),JSON.stringify(baseline,null,2)+"\n");
const skill=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const forwarded=process.argv.slice(2).filter((v,i,a)=>v!=="--source"&&a[i-1]!=="--source");
const cp=spawnSync(process.execPath,[path.join(skill,"scripts/generate-compliant-page.mjs"),...forwarded,"--route","normalize-demo","--repo",skill,"--skill-root",skill],{cwd:skill,stdio:"inherit"});
if(cp.status!==0)process.exit(cp.status||1);
console.log(JSON.stringify({ok:true,workflow:"normalize-demo",sourceDigest:dependencies.digest,preservedItems:[...ids],behaviorValidation:"pending-browser-checks"}));
