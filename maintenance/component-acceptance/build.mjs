// Maintenance-only acceptance harness: prepared production modules inside Pattern Runtime, no gallery bindings.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {preparePageComponents} from '../../scripts/prepare-page-components.mjs';
import {preparePageStyles} from '../../scripts/prepare-page-styles.mjs';
const root=process.cwd(),project=path.resolve(root,process.argv[2]||'outputs/component-acceptance');
if(fs.existsSync(path.join(project,'components')))throw new Error('Use a new output or deliberately remove the previous generated test fixture');
fs.mkdirSync(project,{recursive:true});
const contracts=fs.readdirSync('packages/component-contracts/src/components').sort().map(f=>JSON.parse(fs.readFileSync('packages/component-contracts/src/components/'+f)));
const run=(file,args)=>{const cp=spawnSync(process.execPath,[path.join(root,'scripts',file),...args],{encoding:'utf8',maxBuffer:8*1024*1024});if(cp.status!==0)throw new Error(cp.stdout+cp.stderr);};
const context=path.join(project,'context.json'),bindings=path.join(project,'bindings.json');
run('resolve-context.mjs',['--task','设置','--capabilities',contracts.map(c=>c.id).join(','),'--discover','--out',context]);
fs.writeFileSync(bindings,JSON.stringify({componentBindings:contracts.map(c=>({logicalName:c.logicalName}))}));
preparePageComponents({projectRoot:project,contextPath:context,bindingsPath:bindings,skillRoot:root});
const rows=[];
for(const c of contracts){const source=await import(pathToFileURL(path.join(root,c.implementations.html.split('#')[0]))),copy=await import(pathToFileURL(path.join(project,'components',c.id,'index.js')));const a=source.render(),b=copy.render();rows.push({id:c.id,sourceRender:!!a,preparedMatchesSource:a===b,placeholder:/tui-generated/.test(b),declaredReadiness:c.readiness,defaultHtmlBytes:b.length,...(c.props?.includes("label")?{labelPropApplied:source.render({label:"ACCEPT_LABEL_42"}).includes("ACCEPT_LABEL_42")}: {})});}
fs.writeFileSync(path.join(project,'static-audit.json'),JSON.stringify({schemaVersion:1,count:rows.length,components:rows},null,2));
fs.writeFileSync(path.join(project,'cases.json'),JSON.stringify(contracts.map(c=>({id:c.id,logicalName:c.logicalName}))));
fs.writeFileSync(path.join(project,'pattern.json'),fs.readFileSync('assets/design-system/pattern-contracts.json'));
fs.writeFileSync(path.join(project,'acceptance-entry.js'),fs.readFileSync('maintenance/component-acceptance/entry.js'));
fs.mkdirSync(path.join(project,'styles'),{recursive:true});fs.writeFileSync(path.join(project,'styles/page-composition.css'),'.acceptance-list { display: grid; gap: var(--space-5); padding: var(--space-5); }\n.acceptance-case { min-width: 0; padding: var(--space-5); background: var(--color-surface); border-radius: var(--radius-card); }\n.acceptance-preview { min-height: var(--space-6); }\n');
run('scaffold-standalone-project.mjs',['--project',project,'--repo',root,'--entry','./acceptance-entry.js']);
preparePageStyles({projectRoot:project,skillRoot:root,entryPath:path.join(project,'acceptance-entry.js')});
console.log(JSON.stringify({project,count:rows.length,preparedMatchesSource:rows.every(r=>r.preparedMatchesSource),placeholders:rows.filter(r=>r.placeholder).map(r=>r.id)},null,2));
