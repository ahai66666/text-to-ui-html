# Durable Demo normalization plan

## Purpose and execution phases
Accept a low-fidelity static HTML file/directory or an interactive Demo. Preserve confirmed content, hierarchy, navigation and existing behavior in a separate output. Dynamic rendering does not authorize invented business semantics. Unknown abilities belong in decisions.gaps; only material unresolved decisions block work. Continue automatically across ordinary task boundaries.

The stable task template is `references/workflows/normalization-tasks.json`: N01–N04 intake/plan, N05–N08 dynamic migration, N09–N12 components/Tokens/layout, N13–N17 acceptance/handoff. These are execution checkpoints, not extra resource stages. First use Task/Pattern resolution; load only the current intake/design/discovery/bindings/styling/validation pack. Framework and styling checks share one generator and project, with early reuse of known standard components.

## Authority and responsibilities
`normalization-plan.json` is the only maintained execution record (schema: schemas/normalization-plan.schema.json). `normalization-plan.md` and `normalization-evidence.json` are generated views; never hand-maintain their status. `demo-preservation.json` is model-authored and must contain the complete confirmed content/navigation/state/interaction inventory, stable IDs, actions and expected results. Set inventoryComplete true only after inspection. The generated initial item is an unfinished reminder, not an approved inventory. Preserve original files; compare baseline digests. Third-party/static HTML adaptation is deliberate model work, not automatic semantic conversion.

Models own scope, confirmed decisions, unresolved decisions, gap explanations, Blueprint/recipes/bindings/business code/CSS and actual browser observations. Scripts own progress serialization, fingerprints, dependency enforcement, generated standard files and derived views. A review proof is an explicit model attestation, not an independently automated semantic or visual test. Script success cannot create browser evidence.

## Start and resume
Run commands from any directory with absolute paths; quote paths containing spaces:

```sh
node "<RULES_ROOT>/scripts/normalization-plan.mjs" init --source "<original directory or HTML file>" --project "<PROJECT_DIR>" --task "设置"
node "<RULES_ROOT>/scripts/normalization-plan.mjs" status --project "<PROJECT_DIR>"
node "<RULES_ROOT>/scripts/normalization-plan.mjs" resume --project "<PROJECT_DIR>"
```

Initialize before page edits. Existing projects can initialize without overwriting inputs, but must establish their current baseline and complete review checkpoints. Original/output must be non-nested directories, including resolved symlink aliases. HTML file inputs may have names other than index.html; give the same original input to the generator wrapper. The original snapshot covers all files except .git, node_modules, dist, build, outputs, coverage and .DS_Store; pages/assets outside this local root and remote content require separate browser evidence.

Before every fresh context, inspect resume output and read the plan, preservation inventory and the evidence needed for the current task. Reconcile interrupted in_progress tasks against actual files: resume changes them to pending_validation, never passed. It refreshes baseline references and records invalidation reasons. Missing/changed outputs or evidence invalidate that task and its dependents; source changes restart N01, skill changes invalidate N05 onward, scope/decisions changes invalidate N03 onward, inventory changes invalidate N02 onward. Page changes conservatively invalidate dependent browser/source/build evidence; exact impact localization is not promised. Valid earlier checkpoints survive. A moved output directory is rejected; reinitialize a deliberate migration rather than silently changing project identity.

`status` is read-only and reports stale evidence. `check` fails on stale evidence (it does not mean the whole plan is complete). `resume` reconciles and repairs derived views. Never treat an existing file or a previous chat claim as a passed task. A process killed between JSON and Markdown writes is recoverable from JSON. Concurrent writers fail on the project lock; do not delete a live lock.

## Decisions and task commands
Write a decisions file with scope, pattern (null until chosen), confirmed[], open[], gaps[]. Each list entry has a unique id and text. Open decisions block unless blocking:false; preserve prior confirmed decisions when configuring. Record uncertainty in the task rather than repeatedly asking resolved questions. Only pause dependent work for unresolved material choices.

```json
{
  "scope": "Preserve Demo content and existing behavior; normalize dynamic HTML",
  "pattern": "pattern-a-two-pane",
  "confirmed": [{"id":"retain-content","text":"Keep existing content and relationships"}],
  "open": [],
  "gaps": [{"id":"save","text":"Demo has no defined persistence; do not invent it"}]
}
```

```sh
node "<RULES_ROOT>/scripts/normalization-plan.mjs" configure --project "<PROJECT_DIR>" --decisions "<decisions.json>"
node "<RULES_ROOT>/scripts/normalization-plan.mjs" update --project "<PROJECT_DIR>" --id N01 --status in_progress --reason "Inspect original content and resources"
node "<RULES_ROOT>/scripts/normalization-plan.mjs" complete --project "<PROJECT_DIR>" --id N01 --evidence ".text-to-ui/normalization/N01.json"
```

States: pending, in_progress, pending_validation, passed, blocked. Passed requires satisfied predecessors, actual required files and current task-specific evidence. N03 requires Context Packet Task/Pattern resolution; save it at .text-to-ui/context-packet.json and configure the same Pattern. Its semantic route identity may stay valid as a discovery context becomes a full generation context. N04 confirms plan persistence. N05–N06 review model inputs and business behavior before generation. Complete N09–N12 with component-query/reuse, Token/CSS and browser observations, and resolved or explicitly scoped gaps.

Evidence is a project-relative JSON file with this envelope (schema: schemas/normalization-evidence.schema.json):

```json
{
  "schemaVersion": 1,
  "taskId": "N01",
  "kind": "review",
  "result": "passed",
  "summary": "Inspected the original and confirmed a separate output",
  "checks": [{"name":"original","result":"passed","observed":"Describe concrete content and observations"}],
  "artifacts": []
}
```

Use each task's kind from the template. artifacts lists additional project-relative files to fingerprint (e.g. mapping report, screenshots, resource checks); do not list plan/derived views. The task template defines required artifact files. Evidence and artifact hashes are checked on recovery. Hashing is freshness checking, not independent proof of truth.

Browser evidence additionally requires actual HTTP url, positive viewport.width/height, dependencyDigest from collectProjectDependencies(project), checks with concrete observed results, and artifact references for captures/logs. N08 requires readiness:"passed" after awaiting #app.__tuiReady and preservation:{"item-id":"passed"} for every item. N11 checks layout, fonts, images and relevant states. N15 adds source/build/browser:"passed", visual:"passed" or explicitly "pending", the complete preservation map, and the existing handoff viewport contract (width,height,zoom,stateId,scroll:{x,y}). Failed checks must not be submitted as passed; record a blocked task with reason, repair and rerun affected checks. Visual pending is permitted only as the handoff's disclosed limitation, not a claim of full visual acceptance.

## Generation, repair, checks and handoff

```sh
node "<RULES_ROOT>/scripts/normalize-demo.mjs" --source "<original>" --project "<PROJECT_DIR>" --task "设置"
node "<RULES_ROOT>/scripts/query-resources.mjs" --workflow normalize-demo --stage bindings --normalization-plan "<PROJECT_DIR>/normalization-plan.json" --preservation "<PROJECT_DIR>/demo-preservation.json"
node "<RULES_ROOT>/scripts/normalization-plan.mjs" run-check --project "<PROJECT_DIR>" --id N13
node "<RULES_ROOT>/scripts/normalization-plan.mjs" run-check --project "<PROJECT_DIR>" --id N14
```

run-check executes source validation (N13) or pnpm build (N14) in the project and stores real command logs/exit status; install project dependencies before building. It marks failures blocked, not passed. Other tasks use explicit evidence from their actual review/browser operations. N07 is completed by the wrapper, N17 by formal html-handoff creation; neither promotes other tasks.

For a repair, first invalidate the earliest affected task with `invalidate --project ... --id N10 --reason "..."`, edit model-owned inputs and regenerate through normalize-demo. Input/output/evidence changes discovered later are reconciled by resume. Re-review invalidated prerequisites before regenerating. Do not edit generated files to bypass their ownership checks. Full-page reruns can conservatively invalidate more browser evidence when dependency boundaries are uncertain.

Complete N15 with actual browser evidence, then N16 after no failed preservation items remain. Use that N15 JSON as the existing html-handoff.mjs create --evidence argument (project-relative). The formal command reruns source validation, verifies acceptance/dependencies and requires N01–N16 current; then completes N17. The final report gives preview, evidence, handoff and limitations separately. Build/source/browser success does not prove all visual states or production business semantics. Do not upload or merge unless requested; a branch upload does not authorize merging main.

## Explicitly static inputs

For an original with no defined business interactions, set Blueprint `interactions: []` and `staticDemo: {reason: "Describe the inspected absence of behavior", undefinedBindingIds: ["binding-id"]}`. List each interactive-looking binding that stays undefined, set behaviorPlan.interactions to [], omit its behaviorId, and record the gaps in plan decisions. The normalize-demo generator accepts this explicit static declaration only for this workflow; undeclared missing behaviors remain errors. Do not use it to erase existing defined interactions. Native control focus/press affordances are not new business semantics. Verify in the browser that undefined controls do not gain invented state changes.
