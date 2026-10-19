---
name: text-to-ui-html
description: Generate and revise HarmonyOS PC dynamic HTML pages, or normalize an approved interactive Demo using canonical components, Patterns and Tokens. Deliver separate components and CSS, browser evidence and a versioned handoff.
---

# Text to UI HTML

本目录为 RULES_ROOT，HTML 命令的 --repo 和 --skill-root 都指向此目录。此技能独立生成和验收页面；画板导入交给 text-to-ui-pixso，安装和生成不依赖该技能。

## 选择操作与资料
Workflow 选择 new-page、normalize-demo、micro-revision 或 skill-maintenance。页面业务结构变化时继续按 Task → Pattern 定位；保留四种 Pattern 和 49 个组件契约。规则入口见 references/routes/ 中对应文件。

先 resolve-context.mjs --task <task> --discover --out <context.json> --brief-out <page-brief.json>，再用 query-resources.mjs 查询当前阶段。阶段为 intake → design → discovery → bindings → styling → validation。模型只读当前任务包 JSON/Markdown 之一，不读聚合手册、完整索引或全量组件源码。组件 API 按精确 ID 和 semantic-context 查询，Token 按 --roles 查询。

## 页面生成与样式优化
新页面按 references/routes/new-page.md 执行：写 Blueprint、内容配方、组件绑定/行为计划和业务 CSS，再运行 generate-compliant-page.mjs。已有 Demo 按 normalize-demo 路由先登记已确认内容、交互、状态和导航，原件保留；在副本中规范化并逐项核对。单一局部修改走 micro-revision。

先查共享组件和项目已有业务组件，有合适组件就引用原实现与样式。缺失能力需记录查询及候选，才创建独立 page-components/<id>/index.js 与 styles.css，并通过 pageModules 声明。组件参数、变体和插槽遵守契约，不重画标准控件。

所有产物动态渲染：index.html 为空 #app 宿主；generated-page.js 引用 components/index.js；generated-entry.js 挂载并绑定行为。脚本交付选中组件到 components/<id>/，公共运行时只复制一次。main.js 统一导入 styles/index.css；模型写 styles/page-composition.css 及声明业务组件私有 CSS，脚本装配标准样式。禁止覆盖组件内部和 Pattern 几何，不手改受管文件。Pattern Runtime 渲染页面骨架，当前部分标题分段逻辑仍在生成器中。

## 验收与交接
执行 page:validate --project <PROJECT_DIR>，构建并打开实际 HTTP 页面。等待 #app.__tuiReady，检查布局、主要交互、字体和图片。分别报告源码、构建、浏览器和视觉结论，缺失证据不算通过。

页面确认后执行 page:handoff --project <PROJECT_DIR> --url <preview-url> --evidence <validation-evidence.json>，生成 html-handoff.json。交接记录页面依赖、版本、视口和状态；页面变化后重新验收并生成。共享数据通过 data:export 发布，消费者固定版本使用本地快照。

## 维护与分发
只维护此仓库。主题小文件是规范源，兼容长手册自动生成。依次运行 resources:build → catalog:build → index:build，检查后 skill:manifest。布局参考图只存 maintenance/reference-assets，测试和维护资料不进入运行包。skill:pack 输出独立 ZIP；README 说明安装和迁移。来源见 maintenance/origin.json。正式发布需对应真实验收；未完成的外部模型和画板验证单独标注。
