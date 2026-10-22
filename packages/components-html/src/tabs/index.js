import {renderMarkup} from '../shared/render-markup.js';
import {attrs} from '../shared/core-attrs.js';
import {escapeHtml} from '../shared/core-escapeHtml.js';
export const tabsState = ({label='项目视图',value='overview',disabled=false,state='default',className=''}={}) => {
 const selected=['overview','projects','members'].includes(value)?value:'overview',inactive=disabled||state==='disabled';
 return `<div class="tui-component tui-tabs${className?' '+escapeHtml(className):''}" ${attrs('tabs','Tabs/Default','default',inactive?'disabled':state)}><div class="tui-tabs__list" role="tablist" aria-label="${escapeHtml(label)}">${[['overview','概览'],['projects','项目'],['members','成员']].map(([id,text])=>`<button type="button" role="tab" aria-selected="${id===selected}" tabindex="${id===selected?0:-1}"${id===selected?' class="is-selected"':''} data-tab="${id}" data-typography-role="body-l"${inactive?' disabled':''}>${text}</button>`).join('')}</div><div class="tui-tabs__panel" role="tabpanel" data-tab-panel="overview" data-typography-role="body-l"${selected==='overview'?'':' hidden'}>工作空间概览</div></div>`;
};
export const componentId='tabs';
export const render=options=>renderMarkup(componentId,options,tabsState);
export default render;
