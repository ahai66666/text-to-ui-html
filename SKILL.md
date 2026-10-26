---
name: text-to-ui-html
description: Generate and revise HarmonyOS PC dynamic HTML pages, or normalize an approved interactive Demo using canonical components, Patterns and Tokens. Deliver separate components and CSS, browser evidence and a versioned handoff.
---

# Text to UI HTML

本目录为 RULES_ROOT，HTML 命令的 --repo 和 --skill-root 都指向此目录。此技能独立生成和验收页面；画板导入交给 text-to-ui-pixso，安装和生成不依赖该技能。

## 目录与路由边界
- RULES_ROOT：技能安装目录。references/ 是规范与路由；packages/ 是标准组件和 Token 源；scripts/ 是工具；assets/ 是运行资源；apps/ 是组件预览。页面生成只通过脚本复制选中的依赖，不复制整个技能目录。
- PROJECT_DIR：独立页面项目目录，下方目录树属于这里。maintenance/、tests/、node_modules/ 和 outputs/ 是维护、依赖或临时产物，不是页面交付模板。
- 三级路由是 Workflow（操作）→ Task（业务）→ Pattern（布局），不是三层文件夹。intake → design → discovery → bindings → styling → validation 是资料读取阶段；组件按 ID 和语义查询，不增加路由层级。
- 机器材料清单中的 skill-support/ 是兼容逻辑标识，不是实际文件夹。路由和完整 Context 输出提供 materialReadLocations：读取其 absolute，或以 RULES_ROOT 为根读取 relative；保留 materials[].path 用于来源摘要，不手动拼接该前缀。

## 页面产物的固定结构
新建页面和 Demo 规范化从第一版预览起采用动态渲染：

```text
index.html                 空 #app 宿主
main.js                    启动；唯一导入 styles/index.css
generated-page.js          页面组合，由脚本生成
generated-entry.js         挂载与交互，由脚本生成
components/index.js         本页组件注册入口，由脚本生成
components/<id>/            脚本准备的标准组件入口与契约
components/_runtime/        所选实现及共享依赖
page-components/<id>/       按需编写的业务模块与私有 CSS
styles/                    统一入口、清单、页面组合 CSS
```

模型编写 Blueprint、内容配方、绑定、styles/page-composition.css 和必要的业务组件；运行 generate-compliant-page.mjs 准备标准组件、样式并生成页面，不手写替代受管文件。micro-revision 保留已有项目边界，skill-maintenance 不生成页面。无本地执行工具时只交付设计输入并标记“待生成”，不能报告页面已经生成或验收。

## 选择操作与资料
Workflow 选择 new-page、normalize-demo、micro-revision 或 skill-maintenance。页面业务结构变化时继续按 Task → Pattern 定位；保留四种 Pattern 和 49 个组件契约。先读取 references/routes/ 中对应流程文件，再按阶段读取短任务包；路由返回路径不代表已读取正文。

先 resolve-context.mjs --task <task> --discover --out <context.json> --brief-out <page-brief.json>，再用 query-resources.mjs --workflow <当前Workflow> 查询当前阶段。new-page 与 normalize-demo 的阶段为 intake → design → discovery → bindings → styling → validation；micro-revision 继承已有 Task/Pattern，只查询受影响阶段；skill-maintenance 使用 intake → validation，不要求页面设计输入。阶段和命令以 references/routes/index.json 为维护源。模型只读当前任务包 JSON/Markdown 之一，不读聚合手册、完整索引或全量组件源码。组件 API 按精确 ID 和 semantic-context 查询，返回 implementation.sourcePath/exportName 与页面 projectModule，不附源码正文；所有入口先匹配精确 ID，再解析能力别名，语义歧义需明确上下文。Titlebar 的正文按当前语义与已知 A/B Pattern 投影，缺少条件时保留完整约束；--view full 可查全量。6 个无契约兼容模块不能作为新页面标准组件，边界见 references/components/compatibility-modules.json。Token 按 --roles 查询。复杂请求用 --primary-task 指定主任务；替代布局仅可选 Task 允许项，并记录 --pattern-reason。组件短包 --scope component 仅在当前上下文已有共用 bindings 包时使用；更换模型需交接共用包或使用默认 complete。

## 组件外观预览
仅在用户需要查看组件时运行 `node scripts/preview-components.mjs [--component <id>] [--port 4191]`，打开输出地址。预览页采用完整版的分类卡片、Pattern 基线与组件规范弹窗，支持单组件链接、场景、参数和就绪记录；不作为正式验收证据。普通页面生成继续精确查询单组件资料，无需读取预览页源码。

## 页面生成与样式优化
新页面按 references/routes/new-page.md 执行：写 Blueprint、内容配方、组件绑定/行为计划和业务 CSS，再运行 generate-compliant-page.mjs。已有 Demo 按 normalize-demo 路由先登记已确认内容、交互、状态和导航，原件保留；在副本中规范化并逐项核对。单一局部修改走 micro-revision。

先查共享组件和项目已有业务组件，有合适组件就引用原实现与样式。缺失能力需记录查询及候选，才创建独立 page-components/<id>/index.js 与 styles.css，并通过 pageModules 声明。组件参数、变体和插槽遵守契约，不重画标准控件。

所有产物动态渲染：index.html 为空 #app 宿主；generated-page.js 引用 components/index.js；generated-entry.js 挂载并绑定行为。组件实现源为 packages/components-html/src/<id>/index.js，按契约的 implementations.html 精确定位；仅维护单个组件时读取该文件及其实际 import。index.js 是兼容注册入口，gallery.js 是预览场景，不作为全量阅读入口。脚本交付选中组件到 components/<id>/，复制对应实现及传递依赖到 components/_runtime/，共用工具只复制一次，不复制全量注册表和预览场景。main.js 统一导入 styles/index.css；模型写 styles/page-composition.css 及声明业务组件私有 CSS，脚本装配标准样式。禁止覆盖组件内部和 Pattern 几何，不手改受管文件。Pattern Runtime 渲染页面骨架，当前部分标题分段逻辑仍在生成器中。

## 验收与交接
执行 page:validate --project <PROJECT_DIR>，构建并打开实际 HTTP 页面。等待 #app.__tuiReady，检查布局、主要交互、字体和图片。分别报告源码、构建、浏览器和视觉结论，缺失证据不算通过。

组件身份必须遵守契约 identityNode：Sidebar Item 的 sidebar / Sidebar Item/Default 标记落在每个 button.tui-sidebar-item；nav 与组容器只负责布局。Accordion、Collapsible 标记落在各自 trigger 按钮。不得事后用扫描脚本补标替代适配器修复。Sidebar 的 items/groups 一次渲染可产生多个实例；count 表示重复调用次数，expectedRuntimeCount 表示最终子项总数，由生成器核算。采集证据须包含 identityViolations 并运行 validate-component-identity.mjs，漏标、外层误标、状态不一致、实例数不符均不能通过。

页面确认后执行 page:handoff --project <PROJECT_DIR> --url <preview-url> --evidence <validation-evidence.json>，生成 html-handoff.json。交接记录页面依赖、版本、视口和状态；页面变化后重新验收并生成。共享数据通过 data:export 发布，消费者固定版本使用本地快照。

## 维护与分发
只维护此仓库。主题小文件是规范源，兼容长手册自动生成。依次运行 resources:build → catalog:build → index:build，检查后 skill:manifest。布局参考图只存 maintenance/reference-assets，测试和维护资料不进入运行包。skill:pack 输出独立 ZIP；README 说明安装和迁移。来源见 maintenance/origin.json。正式发布需对应真实验收；未完成的外部模型和画板验证单独标注。
