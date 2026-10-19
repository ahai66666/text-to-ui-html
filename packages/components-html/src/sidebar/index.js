import { renderMarkup } from '../shared/render-markup.js';
import { slot } from "../shared/core-slot.js";
import { icon } from "../shared/core-icon.js";
import { escapeHtml } from "../shared/core-escapeHtml.js";
import { attrs } from "../shared/core-attrs.js";

export const sidebarItemsMarkup = (items = []) => items.map((item) => `<button class="tui-sidebar-item" type="button" data-state="${item.disabled ? "disabled" : item.selected ? "selected" : "default"}"${item.selected ? " aria-current=\"page\"" : ""}${item.disabled ? " disabled" : ""}>${item.leading !== undefined ? slot(item.leading) : `<span data-slot="leading">${icon(item.icon ?? "navigation/grid")}</span>`}<span data-slot="label" data-typography-role="body-l">${escapeHtml(item.label ?? "")}</span>${item.trailing !== undefined ? slot(item.trailing) : item.count !== undefined ? `<span class="tui-sidebar-item__count" data-slot="trailing" data-typography-role="body-m">${escapeHtml(item.count)}</span>` : ""}</button>`).join("");

export const sidebarNavMarkup = ({ items = [], ariaLabel = "主导航", collapsed = false } = {}) => `<nav class="tui-component tui-sidebar" ${attrs("sidebar", "Sidebar Item/Default", collapsed ? "collapsed" : "default", "default")} aria-label="${escapeHtml(ariaLabel)}">${sidebarItemsMarkup(items)}</nav>`;

export const sidebarState = ({ items = [{ label: "项目", icon: "navigation/grid", count: 24, selected: true }, { label: "最近访问", icon: "navigation/recent" }], groups = [], ariaLabel = "主导航", collapsed = false } = {}) => {
  const resolvedGroups = Array.isArray(groups) ? groups.filter((group) => group && Array.isArray(group.items)) : [];
  if (resolvedGroups.length <= 1) return sidebarNavMarkup({ items: resolvedGroups[0]?.items ?? items, ariaLabel: resolvedGroups[0]?.ariaLabel ?? ariaLabel, collapsed });
  return `<nav class="tui-component tui-sidebar-groups" data-component="sidebar-groups" data-logical-component="Sidebar Groups/Default" data-framework="html" aria-label="${escapeHtml(ariaLabel)}">${resolvedGroups.map((group, index) => {
    const expanded = group.expanded !== false;
    const contentId = `sidebar-group-content-${index + 1}`;
    return `<section class="tui-component tui-disclosure tui-sidebar-group" ${attrs("collapsible", "Collapsible/Default", expanded ? "open" : "default", expanded ? "open" : "default")}><button class="tui-disclosure__trigger tui-sidebar-group__trigger" type="button" aria-expanded="${expanded}" aria-controls="${contentId}" data-typography-role="subtitle-s"><span data-slot="label">${escapeHtml(group.label ?? `导航组 ${index + 1}`)}</span>${icon("navigation/chevron-down", "", { size: 16 })}</button><div class="tui-disclosure__content tui-sidebar-group__content" id="${contentId}" data-slot="content"${expanded ? "" : " hidden"}>${sidebarNavMarkup({ items: group.items, ariaLabel: group.ariaLabel ?? group.label ?? ariaLabel, collapsed })}</div></section>`;
  }).join("")}</nav>`;
};

export const componentId = "sidebar";
const renderer = (options = {}) => sidebarState(options);
export const render = (options) => renderMarkup(componentId, options, renderer);
export default render;
