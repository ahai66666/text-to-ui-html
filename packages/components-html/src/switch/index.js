import { renderMarkup } from '../shared/render-markup.js';
import { escapeHtml } from "../shared/core-escapeHtml.js";
import { attrs } from "../shared/core-attrs.js";

export const switchState = ({ value, checked = typeof value === "boolean" ? value : true, label = "自动同步", disabled = false } = {}) => `<label class="tui-component tui-choice tui-switch" ${attrs("switch", "Switch/Default", "default", disabled ? "disabled" : checked ? "selected" : "default")}><input type="checkbox" role="switch"${checked ? " checked" : ""}${disabled ? " disabled" : ""}/><span class="tui-switch__track" aria-hidden="true"></span><span data-slot="label" data-typography-role="body-m">${escapeHtml(label)}</span><span data-slot="description" data-typography-role="body-m">${checked ? "已开启" : "已关闭"}</span></label>`;

export const componentId = "switch";
const renderer = (options = {}) => switchState(options);
export const render = (options) => renderMarkup(componentId, options, renderer);
export default render;
