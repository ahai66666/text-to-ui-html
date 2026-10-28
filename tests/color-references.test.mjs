import test from 'node:test';
import assert from 'node:assert/strict';
import {variableReferences, colorReferenceClass, projectColorSelectors, parseCss, cssText} from '../packages/components-html/src/color-references/css-syntax.js';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {settingsFixture} from './fixtures.mjs';
test('stable variable identity, case sensitivity and collision-free special names',()=>{
 assert.equal(colorReferenceClass('--color-brand'),'tui-colorref--color-brand');
 assert.notEqual(colorReferenceClass('--Brand'),colorReferenceClass('--brand'));
 const names=['--a-b','--a_b','--a b','--你好','--u-2d2d'];assert.equal(new Set(names.map(colorReferenceClass)).size,names.length);
 assert.equal(colorReferenceClass('--你好'),colorReferenceClass('--你好'));
});
test('structured CSS values track nested fallbacks, functions, comments, strings and escapes',()=>{
 const refs=variableReferences('linear-gradient(var(--brand, var(--fallback)), rgba(var(--channels), var(--alpha)))');
 assert.deepEqual(refs.map(r=>[r.name,r.fallback]),[['--brand',false],['--fallback',true],['--channels',false],['--alpha',false]]);
 assert(refs[2].functions.includes('rgba'));
 assert.equal(variableReferences('"var(--fake)" url("var(--fake)") /*var(--fake)*/').length,0);
 assert.equal(variableReferences('var(--\\63 olor)')[0].name,'--color');
 assert.equal(cssText(parseCss('var(--a, rgb(1 2 3 / .5))')),'var(--a, rgb(1 2 3 / .5))');
 assert.throws(()=>parseCss('var(--a'));
});
test('state projection preserves structural and business conditions and variant identities',()=>{
 assert.deepEqual(projectColorSelectors('.button:hover, .button[data-state="selected"]').selectors,['.button','.button']);
 assert.equal(projectColorSelectors('.parent:hover > .button[data-kind="save"][data-variant="primary"]::before').selectors[0],'.parent > .button[data-kind="save"][data-variant="primary"]');
 assert.deepEqual(projectColorSelectors('.button:is(:hover,:focus)').selectors,['.button:is(*,*)']);
 assert.deepEqual(projectColorSelectors('.button:not(:disabled)').selectors,['.button']);
 assert.deepEqual(projectColorSelectors('.x:not(.excluded)').selectors,['.x:not(.excluded)']);
 assert.deepEqual(projectColorSelectors('.x:not(.excluded,:hover)').selectors,['.x:not(.excluded)']);
 assert.throws(()=>projectColorSelectors('x::part(foo)'));
 assert.throws(()=>projectColorSelectors('x:made-up'));
});
test('generated project independently delivers tagger and readiness integration',()=>{
 const root=path.resolve(import.meta.dirname,'..'), project=fs.mkdtempSync(path.join(os.tmpdir(),'colorref-delivery-'));
 try{
  settingsFixture(project);
  const cp=spawnSync(process.execPath,[path.join(root,'scripts/generate-compliant-page.mjs'),'--project',project,'--task','设置','--repo',root,'--skill-root',root],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024});
  assert.equal(cp.status,0,(cp.stdout+cp.stderr).slice(-3000));
  for(const f of ['index.js','css-syntax.js','token-colors.js'])assert(fs.existsSync(path.join(project,'components/_runtime/packages/components-html/src/color-references',f)));
  const entry=fs.readFileSync(path.join(project,'generated-entry.js'),'utf8');assert.match(entry,/bindColorReferences\(root\)/);assert.match(entry,/colorReferences.refresh\(\)/);assert.match(entry,/colorReferences.dispose\(\)/);
  assert.match(fs.readFileSync(path.join(project,'components/index.js'),'utf8'),/export \{ bindColorReferences \}/);
  const validation=spawnSync(process.execPath,[path.join(root,'scripts/validate-page-project.mjs'),'--project',project,'--skill-root',root],{cwd:root,encoding:'utf8'});assert.equal(validation.status,0,validation.stdout+validation.stderr);
 }finally{fs.rmSync(project,{recursive:true,force:true});}
});
