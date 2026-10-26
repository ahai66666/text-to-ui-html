# Sidebar Item 身份修复验收

2026-10-26。源为 packages/component-contracts/src/components/sidebar.json 与 packages/components-html/src/sidebar/index.js。安装副本同步至 ~/.codex/skills/text-to-ui-html。

- 每个按钮独立使用 sidebar / Sidebar Item/Default；nav、分组容器不再冒充组件，不创建 Sidebar Groups 映射。
- 单项 label/icon/selected/disabled/count/插槽和批量 items/groups 共用单项适配器；支持 count=0、空列表和折叠组。
- 默认、选中、禁用与 aria-current 保持一致；共享选择行为交付至页面，预览调用同一实现。
- 生成器分开 renderCallCount 与 expectedRuntimeCount，Sidebar 按子项精确计数；显式错误计数会被拒绝。
- 契约驱动证据采集独立扫描漏标按钮、错误容器；隐藏折叠组保留身份，不以零可见尺寸误判丢失。
- Pixso 保留已有 logical-mapping 和 partial 状态。本次没有读取新的 Pixso 变体证据，也没有声称完整变体已映射。

验证：52 项自动测试通过；真实生成页面 7 项浏览器回归通过，3 个子项来自一次调用，含隐藏禁用项。原 Coremail 站点 9 行的宽高逐项与修改前相同；验证了鼠标/键盘选择、邮箱折叠展开、搜索重绘和返回。Accordion/Collapsible 仍在 trigger 按钮上。

本记录覆盖组件身份与相关交互，并非全组件库视觉或 Pixso 完整验收。

完整 runtime-reuse 检查的身份与计数均无报错，但测试夹具仍有既有 Pattern A 布局问题：主导航/内容滚动内边距、内容标题 64px 分段、Titlebar 区域归属。完整布局验收未通过，不能把本次身份验证提升为整页或全库验收。详见 full-runtime-limitations.log；这些项不属于本次 Sidebar 身份改动。
