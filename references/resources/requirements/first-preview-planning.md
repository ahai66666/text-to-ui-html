## 5. First preview planning

Use this optional brief when explaining a material design choice:

```markdown
## Proposed Solution
- Design goal:
- Page structure (tree):
  ```text
  ├── 登录
  ├── 注册
  └── 找回密码
  ```
- Key interactions and states:
- Technology/output:
- Assumptions:
- Open questions:
- Assumptions requiring a user decision, if any:
```

Rules:

- Ask at most three high-impact questions in the same message; infer low-risk details.
- Continue automatically when the request provides enough information.
- Only a specific unresolved user decision pauses dependent work.

Read the selected Pattern and relevant component interfaces before composing
the page. Save planning decisions alongside the project, then generate it.

The proposal must also expose the task model: primary user, work object, start
state, success state, failure/recovery path, and state that must be preserved.
This is the part that prevents the Skill from jumping directly from a one-line
request to a generic page.


## normalize-demo 的持久计划

静态或交互 Demo 使用 references/workflows/normalize-demo-plan.md 的固定四阶段与 17 项任务。先执行 normalization-plan.mjs init 再修改页面；换模型/清理上下文后先 resume。normalization-plan.json 是唯一计划/进度源，Markdown 与证据清单由脚本生成。模型登记原始保留清单和已确认决定，只补当前 Demo 的差异；按当前资料阶段查询并携带 --normalization-plan。未定义业务行为记为缺口，不把动态挂载当成业务行为已验收。

纯静态 Demo 的无业务交互状态使用 Blueprint staticDemo 声明（原因及 undefinedBindingIds），并在计划 gaps 中登记；空 interactions 只在此明确声明下有效，生成器仅允许 normalize-demo 使用。已有行为不能通过此声明删除。
