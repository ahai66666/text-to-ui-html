import { renderMarkup } from '../shared/render-markup.js';
import { attrs } from "../shared/core-attrs.js";

export const subTabsState = () => `<div class="tui-component tui-sub-tabs" ${attrs("sub-tabs", "Sub Tabs/Default", "default", "default")}><div class="tui-sub-tabs__list" role="tablist" aria-label="子页签"><button type="button" role="tab" id="sub-tab-overview" aria-controls="sub-tabs-panel" aria-selected="true" tabindex="0" class="is-selected" data-tab="overview" data-typography-role="subtitle-m">概览</button><button type="button" role="tab" id="sub-tab-activity" aria-controls="sub-tabs-panel" aria-selected="false" tabindex="-1" data-tab="activity" data-typography-role="body-l">活动</button><button type="button" role="tab" id="sub-tab-settings" aria-controls="sub-tabs-panel" aria-selected="false" tabindex="-1" data-tab="settings" data-typography-role="body-l">设置</button></div><div class="tui-sub-tabs__panel" id="sub-tabs-panel" role="tabpanel" aria-labelledby="sub-tab-overview" data-tab-panel="overview" data-slot="content" data-typography-role="body-l">项目概览</div></div>`;

export const componentId = "sub-tabs";
const renderer = () => subTabsState();
export const render = (options) => renderMarkup(componentId, options, renderer);
export default render;
