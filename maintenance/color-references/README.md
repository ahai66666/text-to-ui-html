# 颜色变量统一类名验收 — 2026-10-28

- 命名按原始变量区分，同变量同类名；结构化解析值与选择器，不靠计算颜色反推变量。
- 56 项自动测试通过，含命名/转义、嵌套回退、状态投影、业务条件及生成依赖。
- 浏览器 15 项回归全部通过；对照颜色、背景、宽高、原有类名和组件身份均一致。包含新增/删除/样式变化、CSSOM 手动刷新、重绑清理、跨域样式及 Shadow DOM/iframe 诊断。
- 真正生成的独立项目已在浏览器验证：__tuiReady=ready、11 个标记节点、status=complete、无诊断；按钮行为及重挂载清理正常。该结论仅针对颜色标记集成，不提升为整页 Pattern 几何或全库视觉验收。
- 颜色关联示例 apps/color-reference-demo/ 已在浏览器查看。预览与生成器调用同一模块。
- 浏览器回归证据见 browser-evidence.json；功能测试特意引入 ::part 未覆盖规则，最终证据 partial 属预期，不能把 partial 描述为完整覆盖。

复现：在仓库根用 HTTP 服务监听 127.0.0.1:4197，打开 /maintenance/color-references/browser-regression.html。跨域用 localhost 同端口的 cross.css 验证 CSSOM 访问限制，所有资源仍为本机测试资源。浏览器脚本通过页内下载保存证据。

新增颜色 Token 后执行 node scripts/build-color-reference-tokens.mjs，再重建页面依赖。闭合 ShadowRoot 无法由普通 DOM 枚举发现；文档只承诺可见边界诊断。复杂嵌套状态否定、构造样式表、关键帧和跨域样式等限制详见 references/components/color-reference-markers.md。

已安装组件预览服务重新启动后，真实浏览器确认 643 个节点包含 tui-colorref 标记，49 个组件目录正常加载。
