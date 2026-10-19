import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";
import {settingsFixture} from "./fixtures.mjs";
import {preparePageStyles,verifyPageStyles} from "../scripts/prepare-page-styles.mjs";
import {createHandoff} from "../scripts/html-handoff.mjs";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const run=(name,args,ok=true)=>{const r=spawnSync(process.execPath,[path.join(root,"scripts",name),...args],{cwd:root,encoding:"utf8",maxBuffer:8*1024*1024});assert.equal(r.status===0,ok,(r.stdout+r.stderr).slice(-14000));return r;};
test("independent generator delivers dynamic components styles and source evidence",()=>{
 const project=fs.mkdtempSync(path.join(os.tmpdir(),"split-html-"));
 try{settingsFixture(project);const args=["--project",project,"--task","设置","--repo",root,"--skill-root",root];
 run("generate-compliant-page.mjs",args);run("validate-page-project.mjs",["--project",project]);
 assert.ok(!/<style\b/.test(fs.readFileSync(path.join(project,"index.html"),"utf8")));
 assert.match(fs.readFileSync(path.join(project,"main.js"),"utf8"),/import "\.\/styles\/index\.css"/);
 for(const f of ["generated-page.js","generated-entry.js"])assert.ok(!/import\s+["'][^"']+\.css/.test(fs.readFileSync(path.join(project,f),"utf8")));
 const bundle=JSON.parse(fs.readFileSync(path.join(project,"components/component-manifest.json")));
 for(const name of ["index.js","advanced.js","gallery.js"])assert.ok(!Object.keys(bundle.files).includes("components/_runtime/packages/components-html/src/"+name));
 assert.ok(Object.keys(bundle.files).includes("components/_runtime/packages/components-html/src/button/index.js"));
 verifyPageStyles({projectRoot:project,skillRoot:root});
 const file=path.join(project,"styles/base.css"),old=fs.readFileSync(file);fs.appendFileSync(file,"/* user edit */");assert.throws(()=>preparePageStyles({projectRoot:project,skillRoot:root}),/Preserve edited/);fs.writeFileSync(file,old);
 const generated=fs.readFileSync(path.join(project,"generated-page.js"));
 const css=path.join(project,"styles/page-composition.css"),original=fs.readFileSync(css);fs.appendFileSync(css,".verification-content{gap:123px}");
 run("generate-compliant-page.mjs",args,false);assert.deepEqual(fs.readFileSync(path.join(project,"generated-page.js")),generated);fs.writeFileSync(css,original);run("generate-compliant-page.mjs",args);
 assert.throws(()=>createHandoff({projectRoot:project,url:"http://127.0.0.1:1",skillRoot:root}),/evidence/);
 }finally{fs.rmSync(project,{recursive:true,force:true});}
});
test("Demo normalization preserves original and records behavior checks as pending",()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),"split-normalize-")),source=path.join(temp,"original"),project=path.join(temp,"normalized");
 try{fs.mkdirSync(source);const original='<!doctype html><main><p id="status">动态组件已加载</p><button onclick="document.querySelector(\'#status\').hidden=!document.querySelector(\'#status\').hidden">切换提示</button></main>';fs.writeFileSync(path.join(source,"index.html"),original);settingsFixture(project);fs.writeFileSync(path.join(project,"demo-preservation.json"),JSON.stringify({schemaVersion:1,items:[{id:"toggle",kind:"interaction",action:"Click toggle twice",expected:"Hide and restore status"}]}));
 const normalized=spawnSync(process.execPath,[path.join(root,"scripts/normalize-demo.mjs"),"--source",path.relative(temp,source),"--project",path.relative(temp,project),"--task","设置","--repo",root,"--skill-root",root,"--route","normalize-demo"],{cwd:temp,encoding:"utf8",maxBuffer:8*1024*1024});assert.equal(normalized.status,0,normalized.stdout+normalized.stderr);
 assert.equal(fs.readFileSync(path.join(source,"index.html"),"utf8"),original);
 const receipt=JSON.parse(fs.readFileSync(path.join(project,".text-to-ui/generation-receipt.json")));assert.equal(receipt.route.workflowRouteId,"normalize-demo");
 const baseline=JSON.parse(fs.readFileSync(path.join(project,".text-to-ui/demo-baseline.json")));assert.ok(baseline.sourceDigest);
 run("normalize-demo.mjs",["--source",source,"--project",source,"--task","设置"],false);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test("installed skill path aliases do not change component receipts",()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),"route-alias-")),alias=path.join(temp,"skill-link"),project=path.join(temp,"page");
 try{
  fs.symlinkSync(root,alias,"dir");settingsFixture(project);
  run("generate-compliant-page.mjs",["--project",project,"--task","设置","--repo",alias,"--skill-root",alias]);
  run("validate-page-project.mjs",["--project",project,"--skill-root",alias]);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
