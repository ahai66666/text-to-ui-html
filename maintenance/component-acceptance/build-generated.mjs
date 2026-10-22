import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {settingsFixture} from '../../tests/fixtures.mjs';
const root=process.cwd(),project=path.resolve(root,process.argv[2]||'outputs/component-generated');if(fs.existsSync(project))throw new Error('Preserve previous fixture; use a new output');
const {blueprint,bindings,recipes}=settingsFixture(project);
const ids=['segmented-button','select','number-selector','input','tabs','checkbox'];
for(const id of ids){const c=JSON.parse(fs.readFileSync(path.join(root,'packages/component-contracts/src/components',id+'.json')));const behaviorId='native-'+id,options=id==='number-selector'?{label:'数量',value:1,min:0,max:2}:{};
 bindings.componentBindings.push({id,logicalName:c.logicalName,region:'main-content',...(id==='checkbox'?{semanticContext:'selection-control'}:{}),options,behaviorId});bindings.composition.regions['main-content'][0].children.push({kind:'component',bindingId:id});bindings.behaviorPlan.interactions.push({id:behaviorId,kind:'component-native',sourceGroup:'preferences',triggerBindingIds:[id],outcome:'组件原生状态变化由标准交互绑定提供'});recipes.recipes.find(r=>r.id==='settings-recipe').bindingIds.push(id);
}
for(const [f,v]of Object.entries({'page-blueprint.json':blueprint,'page-bindings.json':bindings,'page-content-recipes.json':recipes}))fs.writeFileSync(path.join(project,f),JSON.stringify(v,null,2));
const cp=spawnSync(process.execPath,['scripts/generate-compliant-page.mjs','--project',project,'--task','设置','--capabilities',ids.join(',')],{encoding:'utf8',maxBuffer:8*1024*1024});fs.writeFileSync(path.join(project,'generation.log'),cp.stdout+cp.stderr);if(cp.status!==0)throw new Error((cp.stdout+cp.stderr).slice(-5000));console.log(project);
