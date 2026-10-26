# Accordion / Collapsible 身份节点修正

日期：2026-10-26。标准组件及 Sidebar 分组统一将身份属性落在直接触发 button 上，外层只保留 data-disclosure-component 组织标识。布局容器和内容区域不再占用同一个组件身份。

契约新增 identityNode，注册表构建器生成轻量 identity-contracts.js；运行时根据契约检查目标标签、容器重复身份、直接子触发器数量、aria-controls、自身内容与状态显隐。证据保存按钮 bounds 和关联内容标识，内容中的其他组件独立采集。

预览与生成项目共用 toggleDisclosure，保证点击和原生键盘激活后 aria-expanded、data-state、data-variant、hidden 同步。CSS 通过布局组织标识区分两种组件，不将身份放回外层。

验证：
- 完整 Node 测试：49/49 通过，包含新增三项回归。
- 独立生成项目 source 检查通过，准备后的模块包含新契约和身份校验。
- 真实浏览器九项检查通过，包括按钮边界、展开收起、错误外层标签、错误内容关联、Sidebar 分组独立身份。
- 浏览器键盘 Enter 展开、Space 收起通过。
- 保存的真实浏览器证据通过 validate-component-identity.mjs；完整页面校验器使用同一身份检查函数。
- 注册表、资源、目录、导航索引一致性检查通过。

范围限制：完整页面运行时验收仍会对测试宿主报 Pattern A 的 inset/title 层和测试注入区域声明问题，详见 full-runtime-limitations.log；这些并非组件身份检查通过的证据，也未作为本次布局修复范围。未宣称整个页面视觉或布局验收通过。

共享契约快照由 HTML 发布方刷新为 1.0.2；未同步覆盖独立 Pixso 技能的数据副本。

升级旧页面：先备份已有项目，使用当前技能重新准备标准组件与 CSS、重新生成/构建、在真实浏览器回采证据并验证、刷新 html-handoff。不得直接编辑受管组件文件或旧压缩 bundle。线上 Coremail 未发布更新。
