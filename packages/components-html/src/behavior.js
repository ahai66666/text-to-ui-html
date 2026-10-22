// Component-native UI behavior only. Business navigation, persistence and panel content remain page-owned.
const boundRoots = new WeakMap();
let sequence = 0;
export function bindComponentInteractions(root) {
  boundRoots.get(root)?.();
  const document = root.ownerDocument || root;
  const window = document.defaultView;
  const controller = new window.AbortController();
  const listen = (target, type, handler) => target.addEventListener(type, handler, {signal:controller.signal});
  const disabled = target => target.disabled || target.closest('[aria-disabled="true"], [data-tui-static-behavior="true"]');
  const emit = (host, value) => host.dispatchEvent(new window.CustomEvent('text-to-ui:component-change', {bubbles:true,detail:{componentId:host.dataset.component,value}}));
  const menus = () => [...root.querySelectorAll('.tui-select__menu, .tui-split-button .tui-button-dropdown__menu')];
  const triggerFor = menu => menu.closest('.tui-select, .tui-split-button')?.querySelector('.tui-select__trigger, .tui-split-button__trigger');
  const close = (menu, restore=false) => {menu.hidden=true;const trigger=triggerFor(menu);trigger?.setAttribute('aria-expanded','false');if(restore)trigger?.focus();};
  const open = menu => {
    menus().forEach(other=>{if(other!==menu)close(other);});
    menu.hidden=false;triggerFor(menu)?.setAttribute('aria-expanded','true');
    menu.querySelector('[aria-selected="true"], [role="option"]:not(:disabled), [role="menuitem"]:not(:disabled)')?.focus();
  };
  for(const host of root.querySelectorAll('.tui-select, .tui-split-button')){
    const menu=host.querySelector('.tui-select__menu, .tui-button-dropdown__menu'),trigger=host.querySelector('.tui-select__trigger, .tui-split-button__trigger');
    if(!menu||!trigger)continue;
    if(!menu.id)menu.id=`tui-native-menu-${++sequence}`;
    trigger.setAttribute('aria-controls',menu.id);
    if(menu.getAttribute('role')==='listbox'&&!menu.getAttribute('aria-label')&&!menu.getAttribute('aria-labelledby'))menu.setAttribute('aria-label',host.querySelector('[data-slot="label"]')?.textContent?.trim()||trigger.getAttribute('aria-label')||'选择选项');
    menu.querySelectorAll('[role="option"], [role="menuitem"]').forEach(item=>item.tabIndex=-1);
  }
  for(const group of root.querySelectorAll('.tui-radio-group')){
    const fresh=!group.dataset.tuiNativeRadioName;
    if(fresh)group.dataset.tuiNativeRadioName=`tui-native-radio-${++sequence}`;
    const inputs=[...group.querySelectorAll('input[type="radio"]')];
    inputs.forEach(input=>input.name=group.dataset.tuiNativeRadioName);
    if(fresh)inputs.forEach(input=>input.checked=input.defaultChecked);
  }
  for(const host of root.querySelectorAll('.tui-tabs, .tui-sub-tabs')){
    const tabs=[...host.querySelectorAll('[role="tab"]')],panels=[...host.querySelectorAll('[role="tabpanel"]')],prefix=`tui-native-tabs-${++sequence}`;
    tabs.forEach((tab,i)=>{tab.id=`${prefix}-tab-${i}`;tab.tabIndex=tab.getAttribute('aria-selected')==='true'?0:-1;const panel=panels.find(p=>p.dataset.tabPanel===tab.dataset.tab)|| (panels.length===1?panels[0]:null);if(panel){if(!panel.dataset.tuiScopedPanel){panel.id=`${prefix}-panel-${panels.indexOf(panel)}`;panel.dataset.tuiScopedPanel='true';}tab.setAttribute('aria-controls',panel.id);if(tab.getAttribute('aria-selected')==='true')panel.setAttribute('aria-labelledby',tab.id);}});
  }
  const selectTab = (host, tab) => {
    for(const item of host.querySelectorAll('[role="tab"]')){const selected=item===tab;item.setAttribute('aria-selected',String(selected));item.tabIndex=selected?0:-1;item.classList.toggle('is-selected',selected);}
    const panels=[...host.querySelectorAll('[role="tabpanel"]')];
    // Never fabricate panel contents from a tab label. A single supplied panel stays page-owned.
    for(const panel of panels){panel.hidden=panels.length>1?panel.id!==tab.getAttribute('aria-controls'):Boolean(panel.dataset.tabPanel&&panel.dataset.tabPanel!==tab.dataset.tab);if(!panel.hidden)panel.setAttribute('aria-labelledby',tab.id);}
    emit(host,tab.dataset.tab);
  };
  listen(root,'click',event=>{
    const target=event.target.closest?.('button');if(!target||!root.contains(target)||disabled(target))return;
    const host=target.closest('[data-component]');
    if(target.matches('.tui-select__trigger, .tui-split-button__trigger')){
      const menu=target.closest('.tui-select, .tui-split-button')?.querySelector('.tui-select__menu, .tui-button-dropdown__menu');if(menu){menu.hidden?open(menu):close(menu);}return;
    }
    const menu=target.closest('.tui-select__menu, .tui-split-button .tui-button-dropdown__menu');
    if(menu){
      const component=menu.closest('.tui-select, .tui-split-button');
      if(target.getAttribute('role')==='option'){
        menu.querySelectorAll('[role="option"]').forEach(option=>option.setAttribute('aria-selected',String(option===target)));
        const value=target.dataset.value||target.textContent.trim(),label=component.querySelector('[data-slot="value"]');if(label){if(label.tagName==='INPUT')label.value=value;else label.textContent=value;}
        emit(component,value);
      }else if(target.getAttribute('role')==='menuitem')component.dispatchEvent(new window.CustomEvent('text-to-ui:component-action',{bubbles:true,detail:{componentId:'button',action:target.textContent.trim()}}));
      close(menu,true);return;
    }
    if(target.matches('.tui-segmented-button__item')){
      const component=target.closest('.tui-segmented-button');component.querySelectorAll('button').forEach(button=>{button.setAttribute('aria-pressed',String(button===target));button.classList.toggle('is-selected',button===target);});emit(component,target.dataset.value);return;
    }
    if(target.matches('[role="tab"]')&&host?.matches('.tui-tabs, .tui-sub-tabs')){selectTab(host,target);return;}
    if(target.matches('.tui-number-selector__step')){
      const component=target.closest('.tui-number-selector'),input=component.querySelector('input[type="number"]');if(!input||disabled(input))return;
      target.dataset.direction==='increment'?input.stepUp():input.stepDown();input.dispatchEvent(new window.Event('input',{bubbles:true}));input.dispatchEvent(new window.Event('change',{bubbles:true}));emit(component,input.value);return;
    }
    if(target.matches('.tui-search [data-slot="clear"]')){
      const component=target.closest('.tui-search'),input=component.querySelector('input[type="search"]');if(!input||disabled(input))return;input.value='';target.hidden=true;input.dispatchEvent(new window.Event('input',{bubbles:true}));input.focus();emit(component,'');
    }
  });
  listen(root,'input',event=>{const input=event.target;if(input.matches?.('.tui-search input[type="search"]')){const clear=input.closest('.tui-search').querySelector('[data-slot="clear"]');if(clear)clear.hidden=!input.value;}});
  listen(root,'change',event=>{const input=event.target;if(input.matches?.('input[type="checkbox"], input[type="radio"]')){const component=input.closest('.tui-choice');if(component){component.dataset.state=input.disabled?'disabled':input.checked?'selected':'default';if(component.matches('.tui-switch')){const description=component.querySelector('[data-slot="description"]');if(description)description.textContent=input.checked?'已开启':'已关闭';}}}});
  listen(root,'keydown',event=>{
    const target=event.target;if(disabled(target))return;
    const menu=target.closest?.('.tui-select__menu, .tui-split-button .tui-button-dropdown__menu');
    if(menu){
      if(event.key==='Escape'){event.preventDefault();close(menu,true);return;}
      if(event.key==='Tab'){close(menu);return;}
      const items=[...menu.querySelectorAll('[role="option"]:not(:disabled), [role="menuitem"]:not(:disabled)')];
      if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)&&items.length){event.preventDefault();const i=items.indexOf(target),next=event.key==='Home'?0:event.key==='End'?items.length-1:(i+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;items[next].focus();}return;
    }
    if(target.matches?.('.tui-select__trigger, .tui-split-button__trigger')&&['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();const component=target.closest('.tui-select, .tui-split-button');open(component.querySelector('.tui-select__menu, .tui-button-dropdown__menu'));return;}
    if(target.getAttribute?.('role')==='tab'&&['ArrowRight','ArrowLeft','Home','End'].includes(event.key)){
      const host=target.closest('.tui-tabs, .tui-sub-tabs');if(!host)return;const tabs=[...host.querySelectorAll('[role="tab"]:not(:disabled)')];if(!tabs.length)return;event.preventDefault();const i=tabs.indexOf(target),n=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[n].focus();selectTab(host,tabs[n]);
    }
  });
  listen(document,'click',event=>{for(const menu of menus())if(!menu.hidden&&!menu.closest('.tui-select, .tui-split-button').contains(event.target))close(menu);});
  const cleanup=()=>{controller.abort();if(boundRoots.get(root)===cleanup)boundRoots.delete(root);};boundRoots.set(root,cleanup);return cleanup;
}
