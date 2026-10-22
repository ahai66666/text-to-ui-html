# HTML Component Coverage

Use this reference when adding a component or reviewing registered component support.

## Current source

- `packages/component-contracts/src/components/<id>.json` is the source of truth for each component contract. `registry.json` stores registry-wide metadata, while `components.json` is regenerated for scripts that still need the aggregate format.
- `packages/components-html` contains this Skill's production HTML implementation snapshot.
- `apps/component-gallery/index.html#runtime-view` is the managed component preview.
- The registry currently contains 49 logical components. Check current readiness in the repository rather than maintaining a separate count here.
- This Skill bundles `apps/component-gallery/`; start it with `node scripts/preview-components.mjs`. Its category/card layout, inspector and scene styling come from the full Text-to-UI Gallery. The inspector parameter preview calls the same `renderHtmlComponent(componentId, options)` entry as generated project adapters. Individual contracts load when cards enter view; scenes and preview interactions are not approval evidence.

## Coverage gate

The production registry must not include legacy generated placeholder adapters. Keep those specimens in the separate legacy export; registered component IDs must call real implementations.

For a component addition or change, edit its individual contract and keep the HTML implementation, Tokens, Pixso mapping, and Gallery specimen aligned. Rebuild the aggregate registry and route index afterward. Repeatable interaction, keyboard, accessibility, and visual evidence is needed before marking a component approved. A fixture or copied preview cannot replace Gallery review.

## Production framework behavior

Generated pages and prepared component bundles now expose and mount `bindComponentInteractions(root)` from `packages/components-html/src/behavior.js`. It provides component-native Select/split-menu, Segmented Button, Tabs/Sub Tabs, Number Selector and Search-clear behavior, plus checkbox/switch state synchronization and Radio Group instance isolation. Rebinding disposes previous listeners; the returned cleanup is part of generated-page disposal. `text-to-ui:component-change` carries componentId/value; split-menu actions emit `text-to-ui:component-action`. Business navigation, persistence and panel content remain page-owned. Undefined bindings declared by static-Demo normalization are explicitly excluded from native behavior.

Use `validate-page-project.mjs --project <project> --runtime-evidence <actual-browser-json> --require-runtime` for concrete page integration acceptance. A prepared-component harness, parameter smoke check or one accepted page does not promote all component variants to approved. Keep visual/state/accessibility maturity separate; the contract flags remain unchanged until their required evidence is complete. Maintenance harnesses and scoped reports live under maintenance/component-acceptance and are excluded from runtime ZIPs.
