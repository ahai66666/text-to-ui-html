# 组件框架验收结果（2026-10-22）

结论：已覆盖的框架接入与常用原生行为通过；49 个组件的整库正式发布验收尚未通过。没有提高组件 approved/readiness 标记。

| 检查 | 结果 |
|---|---|
| 真实实现与页面复制实现默认输出一致 | 49/49 |
| 无参数与空参数调用一致 | 49/49 |
| 旧占位命中 | 0 |
| 生产构建中的组件接入/行为检查 | 18/18 |
| 真实生成页面 | 9 类绑定，12 个运行时实例（含标题栏动作） |
| 正式源码与严格运行时验收 | 通过 |
| 单元/集成回归 | 67/67 |
| 全组件/全变体视觉及完整可访问性 | 未完成 |

已修复：生产页缺少原生行为绑定、分裂按钮渲染、禁用语义、Select 初态、Checkbox 默认参数、部分公开 label/defaultValue 参数、单选实例隔离、页签隐藏状态及 Pattern A 内边距与契约不一致等问题。组件事件不生成业务内容，不执行保存/导航；页签业务内容仍由页面提供。

## 仍阻止整库批准的明确缺口

以下组件声明了 label 参数，但本次传入唯一标记后输出没有体现该参数。它们需要逐一核对规范和实现，不能仅修改 readiness 来绕过：

- `accordion`
- `avatar`
- `breadcrumb`
- `calendar`
- `context-menu`
- `date-picker`
- `form-field`
- `hover-card`
- `menubar`
- `pagination`
- `popover`
- `sidebar`
- `table`
- `time-picker`
- `tooltip`

本轮仅探测这一项公共参数，不代表其余参数、状态或组件均已完整验收。完整视觉/像素对照和可访问性一致性仍待完成；18 个浏览器检查不能替代全部 49 个组件的全部状态。

## 可复验入口

从技能源根目录执行以下命令；每次使用新的输出路径保留既有证据：

```sh
node maintenance/component-acceptance/build.mjs outputs/component-acceptance-new
node maintenance/component-acceptance/build-generated.mjs outputs/component-generated-new
```

两个项目分别安装依赖并运行 pnpm build / Vite preview。组件接入页点击“运行接入验收”；真实生成页面等待 data-tui-ready=ready 后采集实际 DOM/CSS 证据，然后执行：

```sh
node scripts/validate-page-project.mjs --project outputs/component-generated-new --runtime-evidence <实际浏览器证据.json> --require-runtime
node --test tests/*.test.mjs
```

已保存的 JSON 是实际浏览器观察的记录，不是自动证明任意页面的证据。更换页面/依赖后必须重新采集。维护工具及证据不随运行 ZIP 分发。

交付分支：`codex/component-framework-acceptance`。本报告记录该分支的验收结果；不合并 main，不替换已安装技能。
