import test from 'node:test';
import assert from 'node:assert/strict';
import {render as button} from '../packages/components-html/src/button/index.js';
import {render as select} from '../packages/components-html/src/select/index.js';
import {render as checkbox} from '../packages/components-html/src/checkbox/index.js';
import {render as segmented} from '../packages/components-html/src/segmented-button/index.js';
import {render as number} from '../packages/components-html/src/number-selector/index.js';
import {runtimeComponentFailures} from '../scripts/validate-runtime-component-reuse.mjs';
test('production Button uses actual split-dropdown structure and native disabled semantics',()=>{assert.match(button({mode:'split-dropdown'}),/tui-split-button__trigger/);assert.match(button({mode:'split-dropdown'}),/role="menu"/);assert.match(button({state:'disabled'}),/ disabled>/);assert.match(button({mode:'split-dropdown',state:'disabled'}),/ disabled>/);});
test('Select open state matches actual panel visibility',()=>{assert.match(select({open:true}),/role="listbox">/);assert.match(select({open:false}),/role="listbox" hidden>/);});
test('component no-argument calls and documented defaults stay consistent',()=>{assert.equal(checkbox(),checkbox({}));assert.match(segmented({options:['甲','乙'],defaultValue:'乙'}),/aria-pressed="true" data-value="乙"/);assert.match(number({defaultValue:3}),/value="3"/);assert.match(number({label:'数量'}),/aria-label="数量" type="number"/);});
test('runtime instance visibility ignores extra hidden clones but never accepts hidden-only or misplaced instances',()=>{
 const manifest={schemaVersion:3,enforcement:'strict-source',targetFramework:'html',layout:{pattern:'pattern-a-two-pane',structureDigest:'test',paneOrder:[]},registered:[{logicalName:'Button/Primary/Default',rendererKey:'button',expectedRuntimeCount:1,regions:['main-content']}]};
 const component={logicalName:'Button/Primary/Default',rendererKey:'button',framework:'html',visible:true,region:'main-content'};
 const evidence={schemaVersion:1,pattern:'pattern-a-two-pane',structureDigest:'test',unclassifiedInteractive:[],stylesheets:[{loaded:true,ruleCount:1}],patternLayout:{display:'grid',regions:[]},components:[component,{...component,visible:false}]};
 assert.deepEqual(runtimeComponentFailures(manifest,evidence),[]);assert.ok(runtimeComponentFailures(manifest,{...evidence,components:[{...component,visible:false}]}).some(e=>e.includes('visible')));assert.ok(runtimeComponentFailures(manifest,{...evidence,components:[{...component,region:'elsewhere'}]}).some(e=>e.includes('outside')));
});

test('common form and tab components honor their declared labels, values and disabled state',async()=>{
 const {render:input}=await import('../packages/components-html/src/input/index.js'),{render:tabs}=await import('../packages/components-html/src/tabs/index.js'),{render:toggle}=await import('../packages/components-html/src/switch/index.js'),{render:radio}=await import('../packages/components-html/src/radio-group/index.js'),{render:label}=await import('../packages/components-html/src/label/index.js');
 for(const render of [input,tabs,toggle,radio,label])assert.ok(render({label:'CUSTOM_LABEL'}).includes('CUSTOM_LABEL'));
 assert.match(input({variant:'tag-entry',label:'成员甲'}),/成员甲/);assert.match(tabs({value:'members',disabled:true}),/aria-selected="true" tabindex="0" class="is-selected" data-tab="members"[^>]* disabled/);assert.match(toggle({value:false}),/>已关闭</);assert.match(radio({disabled:true}),/ disabled><legend/);
});

test('runtime title geometry accepts subpixel CSS rounding without accepting a wrong title height',()=>{
 const manifest={schemaVersion:3,enforcement:'strict-source',targetFramework:'html',layout:{pattern:'pattern-a-two-pane',structureDigest:'test',paneOrder:['main-content'],geometry:{regions:{'main-content':{title:{kind:'pane-segment'}}}}},registered:[]};
 const evidence={schemaVersion:1,pattern:'pattern-a-two-pane',structureDigest:'test',unclassifiedInteractive:[],stylesheets:[{loaded:true,ruleCount:1}],patternLayout:{display:'grid',regions:[{region:'main-content',display:'grid',bounds:{x:0,y:0,width:800,height:600},scrollBody:{padding:{}},title:{bounds:{height:63.993}}}]},components:[]};
 assert.deepEqual(runtimeComponentFailures(manifest,evidence),[]);evidence.patternLayout.regions[0].title.bounds.height=70;assert.ok(runtimeComponentFailures(manifest,evidence).some(e=>e.includes('64px')));
});

test('Pattern A runtime validation checks canonical navigation and content insets',()=>{
 const inset={inlineStart:'space/5',inlineEnd:'space/5',blockStart:'space/2',blockEnd:'space/5'};
 const manifest={schemaVersion:3,enforcement:'strict-source',targetFramework:'html',layout:{pattern:'pattern-a-two-pane',structureDigest:'test',paneOrder:['primary-navigation'],geometry:{regions:{'primary-navigation':{scrollBody:{inset}}}}},registered:[]};
 const region={region:'primary-navigation',display:'flex',bounds:{x:0,y:64,width:240,height:600},scrollBody:{padding:{paddingInlineStart:'16px',paddingInlineEnd:'16px',paddingBlockStart:'4px',paddingBlockEnd:'16px'}}};const evidence={schemaVersion:1,pattern:'pattern-a-two-pane',structureDigest:'test',unclassifiedInteractive:[],stylesheets:[{loaded:true,ruleCount:1}],patternLayout:{display:'grid',regions:[region]},components:[]};
 assert.deepEqual(runtimeComponentFailures(manifest,evidence),[]);region.scrollBody.padding.paddingBlockStart='8px';assert.ok(runtimeComponentFailures(manifest,evidence).some(e=>e.includes('inset')));
});
