import {renderHtmlComponent,bindComponentInteractions,bindInputTagEntry,bindTitlebarOverflow} from './components/index.js';
import {renderPatternHtml} from './components/_runtime/packages/pattern-runtime/src/index.js';
import cases from './cases.json';
import registry from './pattern.json';
const pattern=registry.patterns.find(p=>p.id==='pattern-a-two-pane');
const extras=[
 {id:'radio-second',component:'radio-group',options:{}},
 {id:'button-disabled',component:'button',options:{label:'禁用按钮',state:'disabled'}},
 {id:'button-split',component:'button',options:{label:'导出文件',mode:'split-dropdown'}},
 {id:'number-bounds',component:'number-selector',options:{label:'数量',value:1,min:0,max:2}},
 {id:'select-second',component:'select',options:{label:'第二选择器',value:'已完成'}},
 {id:'sub-tabs-second',component:'sub-tabs',options:{}},
 {id:'static-segment',component:'segmented-button',options:{label:'静态分段',options:['甲','乙']},static:true}
];
const markup=cases.map(c=>`<section class="acceptance-case" data-case="${c.id}"><h2>${c.id}</h2><div class="acceptance-preview">${renderHtmlComponent(c.id)}</div></section>`).join('')+extras.map(c=>`<section class="acceptance-case" data-case="${c.id}"><h2>${c.id}</h2><div class="acceptance-preview"${c.static?' data-tui-static-behavior="true"':''}>${renderHtmlComponent(c.component,c.options)}</div></section>`).join('');
const app=document.querySelector('#app');
app.innerHTML=renderPatternHtml({contract:pattern,mode:'runtime',slots:{'global-title-layer':renderHtmlComponent('titlebar',{label:'组件框架验收',layout:'two-column',segmentRole:'global',size:'large'}),'primary-navigation-shell':renderHtmlComponent('primary-navigation-item',{label:'组件',selected:true})},regionContent:{'main-content':`<div class="acceptance-list"><button type="button" id="run-acceptance">运行接入验收</button><pre data-acceptance-report>等待运行</pre>${markup}</div>`}});
const cleanup=()=>{app.__nativeCleanup?.();};
app.__nativeCleanup=bindComponentInteractions(app);bindInputTagEntry(app);bindTitlebarOverflow(app);
app.__tuiReady=Promise.all([document.fonts.ready,...[...app.querySelectorAll('img')].map(i=>i.decode())]);
const observed=[];
app.addEventListener('text-to-ui:component-change',e=>observed.push(e.detail));
const checks=[];
const check=(name,fn)=>{try{fn();checks.push({name,status:'passed'});}catch(e){checks.push({name,status:'failed',error:e.message});}};
const expect=(x,message)=>{if(!x)throw new Error(message);};
const host=id=>app.querySelector(`[data-case="${id}"]`);
const key=(el,value)=>el.dispatchEvent(new KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true}));
document.querySelector('#run-acceptance').addEventListener('click',()=>{
 checks.length=0;
 check('49 production components mounted in Pattern Runtime',()=>expect(cases.every(c=>host(c.id)?.querySelector('[data-component]')),'Missing mounted component'));
 check('state=disabled creates a native disabled Button',()=>expect(host('button-disabled').querySelector('button').disabled,'Button not disabled'));
 check('split-dropdown renders actual trigger and menu',()=>{const h=host('button-split'),t=h.querySelector('.tui-split-button__trigger'),m=h.querySelector('[role="menu"]');expect(t&&m,'Missing split structure');t.click();expect(!m.hidden&&t.getAttribute('aria-expanded')==='true','Menu did not open');key(m.querySelector('[role="menuitem"]'),'Escape');expect(m.hidden&&document.activeElement===t,'Escape/focus restore failed');});
 check('Select click, value update and instance isolation',()=>{const h=host('select'),t=h.querySelector('.tui-select__trigger'),other=host('select-second').querySelector('[data-slot="value"]').textContent;t.click();const option=h.querySelectorAll('[role="option"]')[1];option.click();expect(h.querySelector('[data-slot="value"]').textContent===option.textContent,'Value unchanged');expect(host('select-second').querySelector('[data-slot="value"]').textContent===other,'Another instance changed');});
 check('Select keyboard open, arrow navigation and Escape',()=>{const h=host('select'),t=h.querySelector('.tui-select__trigger'),m=h.querySelector('[role="listbox"]');key(t,'ArrowDown');expect(!m.hidden,'ArrowDown did not open');const first=document.activeElement;key(first,'ArrowDown');expect(document.activeElement!==first,'Option focus did not advance');key(document.activeElement,'Escape');expect(m.hidden&&document.activeElement===t,'Focus not restored');});
 check('Segmented Button selects the clicked option',()=>{const h=host('segmented-button'),buttons=h.querySelectorAll('button');buttons[1].click();expect(buttons[1].getAttribute('aria-pressed')==='true'&&buttons[0].getAttribute('aria-pressed')==='false','Selection unchanged');});
 check('static-Demo undefined control stays inert',()=>{const buttons=host('static-segment').querySelectorAll('button');buttons[1].click();expect(buttons[0].getAttribute('aria-pressed')==='true'&&buttons[1].getAttribute('aria-pressed')==='false','Static behavior invented');});
 for(const id of ['tabs','sub-tabs'])check(id+' roving focus and selected semantics',()=>{const tabs=host(id).querySelectorAll('[role="tab"]');tabs[0].focus();key(tabs[0],'ArrowRight');expect(document.activeElement===tabs[1]&&tabs[1].tabIndex===0&&tabs[0].tabIndex===-1&&tabs[1].getAttribute('aria-selected')==='true','Arrow selection failed');});
 check('Tabs do not display stale page-owned content after selection',()=>{for(const id of ['tabs','sub-tabs']){const panel=host(id).querySelector('[role="tabpanel"]');expect(panel.hidden&&getComputedStyle(panel).display==='none',id+' stale panel is visible');}});
 check('Sub Tabs instances have distinct panel IDs',()=>{const a=host('sub-tabs').querySelector('[role="tabpanel"]'),b=host('sub-tabs-second').querySelector('[role="tabpanel"]');expect(a.id!==b.id,'Duplicate panel ID');});
 check('Number Selector clamps min/max and dispatches once after rebind',()=>{const h=host('number-bounds'),input=h.querySelector('input');h.querySelector('[data-direction="increment"]').click();h.querySelector('[data-direction="increment"]').click();expect(input.value==='2','Max bound not respected');h.querySelector('[data-direction="decrement"]').click();h.querySelector('[data-direction="decrement"]').click();h.querySelector('[data-direction="decrement"]').click();expect(input.value==='0','Min bound not respected');app.__nativeCleanup=bindComponentInteractions(app);h.querySelector('[data-direction="increment"]').click();expect(input.value==='1','Duplicate listener after rebind');});
 check('Search input and clear control',()=>{const h=host('search'),input=h.querySelector('input[type="search"]'),clear=h.querySelector('[data-slot="clear"]');input.value='组件';input.dispatchEvent(new Event('input',{bubbles:true}));expect(!clear.hidden,'Clear stays hidden');clear.click();expect(input.value===''&&clear.hidden,'Clear failed');});
 check('declared labels are applied by prepared production renderers',()=>{for(const id of ['input','tabs','switch','radio-group','label'])expect(renderHtmlComponent(id,{label:'ACCEPT_LABEL'}).includes('ACCEPT_LABEL'),id+' ignored label');});
 check('Radio Group instances retain separate native selections',()=>{const a=host('radio-group').querySelectorAll('input'),b=host('radio-second').querySelectorAll('input');expect(a[0].checked&&b[0].checked,'Initial group defaults collided');a[1].click();expect(a[1].checked&&b[0].checked,'Radio groups are coupled');});
 check('Switch description follows native checked state',()=>{const h=host('switch'),input=h.querySelector('input');input.click();expect(h.querySelector('[data-slot="description"]').textContent===(input.checked?'已开启':'已关闭'),'Switch description is stale');});
 check('component change events reach page-owned code',()=>expect(observed.length>0,'No component-change event'));
 check('cleanup removes component-native listeners',()=>{const buttons=host('segmented-button').querySelectorAll('button'),selected=[...buttons].find(b=>b.getAttribute('aria-pressed')==='true');app.__nativeCleanup();const other=[...buttons].find(b=>b!==selected);other.click();expect(selected.getAttribute('aria-pressed')==='true','Listener not removed');app.__nativeCleanup=bindComponentInteractions(app);});
 const report={scope:'Prepared production-component Pattern harness; not formal all-state approval',count:cases.length,passed:checks.filter(c=>c.status==='passed').length,failed:checks.filter(c=>c.status==='failed').length,checks,at:new Date().toISOString(),viewport:{width:innerWidth,height:innerHeight}};
 document.querySelector('[data-acceptance-report]').textContent=JSON.stringify(report,null,2);
});

export function mountGeneratedPage(){ return app; }
