import { renderRuntimeHtmlComponent, renderHtmlComponent, resolveHtmlRendererKey, bindInputTagEntry, bindTitlebarOverflow } from "../../packages/components-html/src/index.js";
import { bindPreviewInteractions } from "./preview-interactions.js";
const names = {accordion:"手风琴", "alert-dialog":"警告弹窗",alert:"提示条",attachment:"附件",avatar:"头像",badge:"徽标",breadcrumb:"面包屑",button:"按钮",calendar:"日历",checkbox:"复选框",chips:"标签",collapsible:"折叠面板","color-picker":"颜色选择器",combobox:"组合框","context-menu":"右键菜单","date-picker":"日期选择器",dialog:"对话框","dropdown-menu":"下拉菜单",field:"字段","form-field":"表单字段","hover-card":"悬浮信息卡",input:"输入框",label:"标签文本","list-card":"列表卡片",menubar:"菜单栏","native-select":"原生选择框","number-selector":"数字选择器",pagination:"分页",popover:"浮层","primary-navigation-item":"一级导航项",progress:"进度条","radio-group":"单选组",radio:"单选框",search:"搜索框","segmented-button":"分段按钮",select:"选择器","semi-modal":"半模态窗口",sidebar:"侧边导航",slider:"滑块",snackbar:"反馈条","sub-tabs":"子级页签",switch:"开关",table:"表格",tabs:"页签",textarea:"多行输入框","time-picker":"时间选择器",titlebar:"标题栏",tooltip:"文字提示","tree-view":"树形导航"};
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const json = value => JSON.stringify(value, null, 2);
const tags = values => `<div class="gallery-tags">${(values || []).map(v => `<span class="gallery-tag">${esc(v)}</span>`).join("") || "—"}</div>`;
const app = document.querySelector("#app");
app.innerHTML = `<div class="gallery"><aside class="gallery-sidebar"><div class="gallery-brand">Text to UI<span style="color:var(--color-primary)"> / HTML</span></div><p class="gallery-caption">原生组件 · 按需预览</p><label for="component-search">查找组件</label><input id="component-search" class="gallery-search" type="search" placeholder="搜索名称或 ID"><label for="component-category">组件分类</label><select id="component-category" class="gallery-category"><option value="">全部分类</option></select><div id="component-count" class="gallery-caption" aria-live="polite"></div><nav class="gallery-nav" aria-label="组件列表"></nav></aside><main class="gallery-main" id="runtime-view"><p role="status">正在加载组件目录…</p></main></div>`;
const main = app.querySelector("main"), nav = app.querySelector("nav"), search = app.querySelector("input"), category = app.querySelector("select");
let components = [], current, request = 0, cleanup = () => {};
const cache = new Map();
async function readJson(url) { const r = await fetch(url); if (!r.ok) throw new Error(`无法加载 ${url} (${r.status})`); return r.json(); }
function navigation() {
  const query = search.value.trim().toLowerCase();
  const filtered = components.filter(c => (!category.value || c.category === category.value) && `${c.id} ${c.logicalName} ${names[c.id] || ""}`.toLowerCase().includes(query));
  nav.innerHTML = filtered.map(c => `<a class="gallery-link" href="#${esc(c.id)}" ${current === c.id ? 'aria-current="page"' : ""}>${esc(names[c.id] || c.id)}<small>${esc(c.id)}</small></a>`).join("") || '<p>没有匹配的组件</p>';
  app.querySelector("#component-count").textContent = `${filtered.length} / ${components.length} 个组件`;
}
let previewSequence = 0;
function bindPreview(root) {
  // Two live examples can contain the same canonical IDs; scope their references.
  const prefix = `preview-${++previewSequence}-`, ids = new Map();
  root.querySelectorAll("[id]").forEach(el => { ids.set(el.id, prefix + el.id); el.id = prefix + el.id; });
  root.querySelectorAll("[for], [aria-controls], [aria-labelledby], [aria-describedby]").forEach(el => {
    for (const name of ["for", "aria-controls", "aria-labelledby", "aria-describedby"]) {
      if (el.hasAttribute(name)) el.setAttribute(name, el.getAttribute(name).split(/\s+/).map(id => ids.get(id) || id).join(" "));
    }
  });
  const unbind = [bindInputTagEntry(root), bindTitlebarOverflow(root), bindPreviewInteractions(root)];
  return () => unbind.forEach(fn => typeof fn === "function" && fn());
}
async function selectComponent() {
  const sequence = ++request;
  const id = location.hash.slice(1) || "button";
  cleanup(); cleanup = () => {};
  if (!components.some(c => c.id === id)) { main.innerHTML = '<h1>组件不存在</h1><p>请从左侧选择组件。</p>'; return; }
  current = id; navigation();
  main.innerHTML = '<p role="status">正在加载组件…</p>';
  try {
    const contractPath = `packages/component-contracts/src/components/${id}.json`;
    const c = cache.get(id) || await readJson(`/${contractPath}`);
    if (sequence !== request) return;
    cache.set(id, c);
    const key = resolveHtmlRendererKey(id);
    const readiness = Object.entries(c.readiness || {}).map(([label, ready]) => `<tr><td>${esc(({sourceReady:"实现文件", contractReady:"组件契约", visualParity:"视觉一致性", behaviorParity:"行为一致性", accessibilityParity:"可访问性一致性", tokenParity:"Token 一致性"})[label] || label)}</td><td>${ready === true ? "已记录就绪" : "待验收"}</td></tr>`).join("");
    main.innerHTML = `<div class="gallery-eyebrow">COMPONENT LIBRARY / ${esc(c.categoryLabel)}</div><div class="gallery-heading"><div><h1>${esc(names[id] || id)}</h1><p class="gallery-subtitle">${esc(c.logicalName)} · ${esc(id)}</p></div><div class="gallery-actions"><button class="gallery-control" id="copy-link">复制链接</button><button class="gallery-control" id="reset-preview">重置示例</button></div></div><div class="gallery-note">直接调用技能内的 HTML 实现和标准样式。状态为 <strong>${esc(c.status || "未声明")}</strong>；可展示不代表已完成正式验收。悬停、按下和焦点请用鼠标与键盘体验；部分业务行为由使用页面绑定。</div><section class="gallery-card"><header class="gallery-card-header"><h2>页面实际调用 · 默认参数</h2><span class="gallery-tag">renderHtmlComponent</span></header><div class="gallery-preview" id="production-preview"></div><p class="gallery-details gallery-status">此处使用页面生成器相同的组件 ID 和正式调用入口；下方场景用于查看已有组合示例。</p></section><section class="gallery-card"><header class="gallery-card-header"><h2>场景预览</h2><span class="gallery-tag">HTML · canonical runtime</span></header><div class="gallery-preview" id="scene" data-runtime-category="${esc(c.category)}"></div></section><div class="gallery-info"><section class="gallery-card"><header class="gallery-card-header"><h2>契约与调用</h2></header><div class="gallery-details"><h3>变体</h3>${tags(c.variants)}<h3>状态</h3>${tags(c.states)}<h3>参数</h3>${tags(c.props)}<h3>插槽</h3>${tags(c.slots)}<h3>查询当前组件</h3><pre class="gallery-code">${esc(`node scripts/query-components.mjs --component ${id} --framework html`)}</pre><p><a href="/${contractPath}" target="_blank" rel="noopener">查看单组件契约 JSON</a></p></div></section><section class="gallery-card"><header class="gallery-card-header"><h2>实现与验收记录</h2></header><div class="gallery-details"><table class="gallery-status-table"><tbody>${readiness}</tbody></table><p class="gallery-status">以上为契约记录，不是本次预览的自动验收结论。</p><h3>实现位置</h3><pre class="gallery-code">${esc(c.implementations?.html || c.frameworks?.html?.source || "未声明")}</pre><h3>契约位置</h3><pre class="gallery-code">${esc(contractPath)}</pre></div></section></div><section class="gallery-card"><header class="gallery-card-header"><h2>参数预览</h2><button class="gallery-control" id="apply-props">应用参数</button></header><div class="gallery-details"><p class="gallery-status">以 JSON 输入契约允许的参数。变体与状态列表为声明范围；实现尚未支持的参数可能不产生外观变化。场景预览展示运行时已有的组合示例。</p><label for="props-editor">组件参数 JSON</label><textarea class="gallery-editor" id="props-editor" spellcheck="false">{}</textarea><div class="gallery-status" role="status" id="props-message"></div><pre class="gallery-code" id="call-example"></pre></div><div class="gallery-preview" id="parameter-preview"></div></section><p class="gallery-status" id="action-status" role="status"></p>`;
    const scene = main.querySelector("#scene"), parameter = main.querySelector("#parameter-preview"), production = main.querySelector("#production-preview");
    const renderScene = () => {
      production.innerHTML = renderHtmlComponent(id, {});
      scene.innerHTML = renderRuntimeHtmlComponent(id, {specimens:c.specimens});
      const unbindProduction = bindPreview(production), unbindScene = bindPreview(scene);
      return () => { unbindProduction(); unbindScene(); };
    };
    let sceneCleanup = renderScene(), parameterCleanup = () => {};
    function applyParameters() {
      const message = main.querySelector("#props-message");
      try {
        const props = JSON.parse(main.querySelector("#props-editor").value);
        if (!props || typeof props !== "object" || Array.isArray(props)) throw new Error("参数必须是 JSON 对象");
        const allowed = new Set([...(c.props || []), ...(c.variants?.length ? ["variant"] : []), ...(c.states?.length ? ["state"] : [])]);
        const unknown = Object.keys(props).filter(k => !allowed.has(k));
        if (unknown.length) throw new Error(`契约未声明参数：${unknown.join(", ")}`);
        if (props.variant && !c.variants.includes(props.variant)) throw new Error("variant 不在契约声明范围内");
        if (props.state && !c.states.includes(props.state)) throw new Error("state 不在契约声明范围内");
        const markup = renderHtmlComponent(key, props);
        parameterCleanup(); parameter.innerHTML = markup; parameterCleanup = bindPreview(parameter);
        main.querySelector("#call-example").textContent = `renderHtmlComponent(${JSON.stringify(key)}, ${json(props)})`;
        message.classList.remove("gallery-error"); message.textContent = "已使用现有组件渲染；请核对实际效果。";
      } catch (error) { message.classList.add("gallery-error"); message.textContent = error.message; }
    }
    applyParameters();
    main.querySelector("#apply-props").onclick = applyParameters;
    main.querySelector("#reset-preview").onclick = () => { sceneCleanup(); sceneCleanup = renderScene(); main.querySelector("#props-editor").value = "{}"; applyParameters(); };
    main.querySelector("#copy-link").onclick = async () => {
      try { await navigator.clipboard.writeText(location.href); main.querySelector("#action-status").textContent = "组件链接已复制"; }
      catch { main.querySelector("#action-status").textContent = `请复制地址栏：${location.href}`; }
    };
    cleanup = () => { sceneCleanup(); parameterCleanup(); };
    document.title = `${names[id] || id} · Text to UI 组件预览`;
  } catch (error) { if (sequence === request) main.innerHTML = `<h1>预览加载失败</h1><pre class="gallery-error">${esc(error.message)}</pre>`; }
}
search.addEventListener("input", navigation); category.addEventListener("change", navigation);
window.addEventListener("hashchange", selectComponent);
try {
  ({components} = await readJson("/api/components"));
  const categories = [...new Map(components.map(c => [c.category,c.categoryLabel])).entries()];
  category.insertAdjacentHTML("beforeend", categories.map(([id,label]) => `<option value="${esc(id)}">${esc(label)}</option>`).join(""));
  await selectComponent();
} catch (error) { main.innerHTML = `<h1>目录加载失败</h1><pre>${esc(error.message)}</pre>`; }
