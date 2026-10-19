// Gallery-only demonstration bindings; product pages own their business behavior.
export function bindPreviewInteractions(root) {
  const controller = new AbortController(), options = {signal:controller.signal};
  const toggle = (trigger, panel) => { if (!panel) return; panel.hidden = !panel.hidden; trigger.setAttribute("aria-expanded", String(!panel.hidden)); };
  root.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button || button.disabled || button.hasAttribute("onclick")) return;
    const host = button.closest("[data-component]");
    if (button.matches('[data-slot="clear"]')) {
      const input = button.closest('[data-component="search"]')?.querySelector('input[type="search"]');
      if (input) { input.value = ""; button.hidden = true; input.focus(); }
    } else if (button.matches(".tui-select__trigger, .tui-advanced-menu__trigger")) toggle(button, host?.querySelector('[role="listbox"], [role="menu"]'));
    else if (button.matches('.tui-split-button__trigger, .tui-button-dropdown__trigger')) toggle(button, button.closest('.tui-split-button, .tui-button-dropdown')?.querySelector('[role="menu"]'));
    else if (button.matches('[role="option"]')) {
      const select = button.closest(".tui-select");
      if (!select) return;
      const value = select.querySelector('[data-slot="value"]');
      if (value?.tagName === "INPUT") value.value = button.dataset.value || button.textContent;
      else if (value) value.textContent = button.dataset.value || button.textContent;
      select.querySelectorAll('[role="option"]').forEach(el => el.setAttribute("aria-selected", String(el === button)));
      button.closest('[role="listbox"]').hidden = true;
      select.querySelector('[aria-expanded]')?.setAttribute("aria-expanded","false");
    } else if (button.matches(".tui-disclosure__trigger, .tui-generated__disclosure")) {
      const panel = host?.querySelector(".tui-disclosure__content, .tui-generated__disclosure-content"); toggle(button,panel);
    } else if (button.matches(".tui-number-selector__step")) {
      const input = host.querySelector('input[type="number"]');
      button.dataset.direction === "increment" ? input.stepUp() : input.stepDown(); input.dispatchEvent(new Event("input", {bubbles:true}));
    } else if (button.matches('[role="tab"]')) {
      host?.querySelectorAll('[role="tab"]').forEach(tab => { tab.setAttribute("aria-selected",String(tab === button)); tab.classList.toggle("is-selected",tab === button); });
      const panel = host?.querySelector('[role="tabpanel"]'); if (panel) panel.textContent = button.textContent + "内容预览";
    } else if (host?.matches('[data-component="popover"]')) toggle(button,host.querySelector('[role="dialog"]'));
  }, options);
  root.addEventListener("input", event => {
    const input = event.target;
    const search = input.closest('[data-component="search"]');
    if (search && input.matches("input")) { const clear = search.querySelector('[data-slot="clear"]'); if (clear) clear.hidden = !input.value; }
  }, options);
  root.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    root.querySelectorAll('[role="menu"], [role="listbox"]').forEach(menu => menu.hidden = true);
    root.querySelectorAll('[aria-expanded="true"]').forEach(el => el.setAttribute("aria-expanded","false"));
  }, options);
  return () => controller.abort();
}
