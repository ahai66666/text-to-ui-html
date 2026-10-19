# text-to-ui-html
根据需求生成动态 HTML、规范化已确认 Demo 的样式、精确修改页面。

独立技能、独立仓库。发布候选版本 **1.0.0-rc.3**。支持交接协议 schemaVersion 1，共享数据 **1.0.1**。三层路由与独立组件已复查；完整视觉、外部模型及异步业务模块生命周期验收不属于本次通过项，正式版需另行完成。

## 安装
从本仓 Releases 下载精简 ZIP 和 .sha256，核对摘要后解压。把 ZIP 内的 text-to-ui-html/ 文件夹放入你的模型工具的 skills 目录；文件夹根目录应直接包含 SKILL.md。其他模型可读取 SKILL.md 并设置 RULES_ROOT 为其绝对目录。无需安装 text-to-ui-pixso。

直接从仓库根目录安装也可用，包含 tests 和 maintenance 等维护资料。更新前备份旧目录，在新目录验收通过后替换。不要把新版本覆盖到旧目录而留下过期文件。

## 使用
先读取 SKILL.md，再按当前阶段的查询结果读取指定主题，避免全量载入 references。Node.js 22+；项目生成与构建使用 pnpm，首次安装项目依赖需要包源或本地缓存。技能维护可执行 pnpm install --frozen-lockfile。

例：“使用 text-to-ui-html，把这个已确认交互 Demo 规范为 HarmonyOS PC 样式，保持内容、导航和状态变化；输出独立组件及 CSS。”

~~~bash
node scripts/resolve-context.mjs --task 设置 --discover --out /absolute/project/context.json --brief-out /absolute/project/page-brief.json
node scripts/query-resources.mjs --stage bindings --component button --semantic-context page-primary-action --view api
node scripts/generate-compliant-page.mjs --project /absolute/project --task 设置
node scripts/validate-page-project.mjs --project /absolute/project
node scripts/preview-page.mjs --project /absolute/project --port 4173
node scripts/html-handoff.mjs create --project /absolute/project --url http://127.0.0.1:4173/ --evidence .text-to-ui/validation-evidence.json
~~~
生成前需完成 Blueprint、内容配方和组件绑定；示例结构见维护源 tests/fixtures.mjs。已有 Demo 使用 normalize-demo 路由，在独立副本规范化并逐项记录保留行为。index.html 只做宿主，页面组合、行为、组件和 CSS 分开，main.js 统一加载 styles/index.css。

## 路由与阶段

保留 Workflow → Task → Pattern。`resolve-workflow-route.mjs --route <id>` 返回流程输入与完成条件；`query-resources.mjs --workflow <id> --stage <stage>` 按当前流程给出下一步。详情见 references/resource-workflow.md。

- 新建：new-page；已有 Demo 规范化：normalize-demo（保留原件和行为清单）。
- 局部修改：micro-revision，使用 `resolve-context.mjs --inherit-context <existing-context.json> --discover` 继承任务和布局。
- 技能维护：skill-maintenance，只查询 intake/validation，不要求页面 Blueprint。
- “邮件页面”“收件箱”“通讯录”等可直接解析；多义请求用 --primary-task 或 --task-route 明确主任务。
- 非默认布局需 --pattern 和 --pattern-reason，且必须在 Task 允许范围内；Pattern D 记录 B/C 基础布局。
- HTML 验收通过后创建 html-handoff.json；画板导入另行调用独立技能。

## 组件预览

在技能目录运行 `node scripts/preview-components.mjs`（或 `pnpm components:preview`），打开终端显示的本地地址。默认端口 4191，可加 `--port 4192`；`--component titlebar` 指定初始组件。无需安装依赖或启动 Pixso Bridge。

预览页位于 `apps/component-gallery/`，提供 49 个组件的中文搜索、分类、单组件链接、现有运行时场景、契约参数和 JSON 参数预览。组件、交互绑定和 CSS 分文件维护；组件外观直接使用 packages 内的实现和标准样式。分类目录只含摘要，选择组件后读取对应的单文件契约，不把全量契约载入页面或模型任务包。

契约中的就绪记录和未完成项会直接显示。预览并不证明视觉、业务行为或可访问性验收通过，参数声明也不代表所有状态均已实现。此入口随使用包交付，模型只在用户要查看组件时启动，无需在日常页面生成中读取预览代码。

## 目录与维护
- SKILL.md：模型入口；references/routes：操作路由；references/resources：按需规范源。
- assets/design-system、packages、scripts：本技能独立运行所需数据、代码与脚本。
- shared-data-lock.json、schemas：共享快照和交接接口。
- maintenance：来源、文件归属、迁移及验收记录；tests：维护回归。二者不进精简 ZIP。

修改主题小文件后按 resources:build → catalog:build → index:build 重建，再执行对应 check、pnpm test、skill:manifest。skill:pack --out dist/<new-name>.zip 会在临时副本重建索引和交付摘要。详细协议见 references/handoff-protocol.md；旧技能迁移见 maintenance/MIGRATION.md。

## 来源与许可证
来源为 ahai66666/text-to-ui-skill-compact 的本地2.1.1维护源；冻结清单、摘要及远程差异见 maintenance/origin.json。保留原 MIT LICENSE，组件和资源保留来源身份。外部 Symbol 库不随包交付。

## 独立组件 JS

49 个标准组件的真实实现位于 `packages/components-html/src/<id>/index.js`，原有 6 个兼容适配器也各有目录。`shared/` 保存跨组件工具，`gallery.js` 保存预览场景，`runtime.js` 保存运行证据采集。根 `index.js` 保留旧工厂调用及别名。

生成器按契约定位 `render`，只复制选中组件的传递依赖到页面 `components/_runtime/`，不带全量注册入口和图库。标准 CSS 与 Token 继续共享。旧页面应重新解析路由后重新生成，受管文件的手改保护仍生效。

组件源码路径变更对应本地共享数据版本 `1.0.1`；Pixso 消费端须通过版本化快照同步后才能接收新交接摘要。Pixso 仓仍固定原快照，不会自动接受 1.0.1 摘要。随本版提供发布方数据快照；消费者需同步后验收。路由和源码检查不代表视觉或画板验收通过。

## 组件路由与上下文投影

查询入口统一优先精确组件 ID；API 包返回独立实现路径与导出名，不附源码。Titlebar 按 semantic-context 和已知 A/B Pattern 投影规范，一级导航仅提供适用插槽并列出不适用项。缺少选择条件或使用 full 视图时保留完整资料；C/D 的未证明场景保守保留。短包只复用通用 bindings 包确实包含的规则。6 个兼容模块保留旧调用，但不进入 49 个标准组件的选择。优化未改变组件 DOM、CSS、Token 或 Pixso 运行逻辑；本版按候选版本发布；浏览器检查范围和未完成验收见发布说明。

## rc.3 已知边界

- 业务模块当前只应使用同步 mount。已知异步 mount 不会被 ready 等待，异步 cleanup 也不会自动登记；初始化异常与并发重挂载的失败/取消协议仍待完善。
- 严格运行时组件检查仍有全局 Titlebar 区域、隐藏浮层和分段几何的证据口径问题。源码与本次浏览器抽查通过不代表正式视觉或全状态规范验收。
- Pixso rc.1 固定共享数据 1.0.0，不能直接消费本版 1.0.1 交接。需后续更新消费者并完成真实导入验收；独立 HTML 生成不依赖 Pixso。

本版以预发布候选提供，未将上述项目声明为通过。
