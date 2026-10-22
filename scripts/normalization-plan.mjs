#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {parseArgs} from "./navigation-index-lib.mjs";
import {initPlan,planStatus,resumePlan,configurePlan,setTaskState,completeTask,runPlanCheck,invalidateTask} from "./normalization-plan-lib.mjs";
const command=process.argv[2],a=parseArgs(process.argv.slice(3));
try{
 if(!a.project)throw new Error("Provide --project <output-directory>");
 const options={projectRoot:path.resolve(a.project),...(a["skill-root"]?{skillRoot:fs.realpathSync(a["skill-root"])}:{})};
 let result;
 if(command==="init")result=initPlan({...options,source:a.source,task:a.task});
 else if(command==="status"||command==="check"){result=planStatus(options);if(command==="check"&&result.stale.length)throw new Error("Stale evidence; use resume: "+result.stale.map(x=>x.id).join(","));}
 else if(command==="resume")result=resumePlan(options);
 else if(command==="configure")result=configurePlan({...options,decisions:JSON.parse(fs.readFileSync(a.decisions,"utf8"))});
 else if(command==="update")result=setTaskState({...options,id:a.id,status:a.status,reason:a.reason});
 else if(command==="invalidate")result=invalidateTask({...options,id:a.id,reason:a.reason});
 else if(command==="complete")result=completeTask({...options,id:a.id,evidencePath:a.evidence});
 else if(command==="run-check")result=runPlanCheck({...options,id:a.id});
 else throw new Error("Commands: init | status | check | resume | configure | update | invalidate | complete | run-check");
 console.log(JSON.stringify({ok:true,...result},null,2));
}catch(error){console.error(JSON.stringify({ok:false,error:error.message}));process.exitCode=2;}
