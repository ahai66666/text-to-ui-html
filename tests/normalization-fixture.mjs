import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import assert from "node:assert/strict";
import {initPlan,configurePlan,completeTask} from "../scripts/normalization-plan-lib.mjs";
export function proof(project,id,kind="review",extra={}){
 const rel=`.text-to-ui/test-evidence/${id}.json`;fs.mkdirSync(path.dirname(path.join(project,rel)),{recursive:true});
 fs.writeFileSync(path.join(project,rel),JSON.stringify({schemaVersion:1,taskId:id,kind,result:"passed",summary:"Synthetic test fixture; not a production acceptance claim",checks:[{name:"fixture",result:"passed",observed:"Test fixture observation"}],...extra},null,2));return rel;
}
export function prepareReviewSteps(project,source,root){
 initPlan({projectRoot:project,source,task:"设置",skillRoot:root});
 const preservation=JSON.parse(fs.readFileSync(path.join(project,"demo-preservation.json")));preservation.inventoryComplete=true;fs.writeFileSync(path.join(project,"demo-preservation.json"),JSON.stringify(preservation));
 configurePlan({projectRoot:project,skillRoot:root,decisions:{scope:"Test preservation scope",pattern:"pattern-a-two-pane",confirmed:[{id:"test",text:"Keep source behavior"}],open:[],gaps:[]}});
 const cp=spawnSync(process.execPath,[path.join(root,"scripts/resolve-context.mjs"),"--task","设置","--workflow-route","normalize-demo","--discover","--out",path.join(project,".text-to-ui/context-packet.json")],{encoding:"utf8"});assert.equal(cp.status,0,cp.stderr+cp.stdout);
 for(let i=1;i<=6;i++){const id="N"+String(i).padStart(2,"0");completeTask({projectRoot:project,id,evidencePath:proof(project,id),skillRoot:root});}
}
