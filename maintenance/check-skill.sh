#!/bin/sh
# Maintenance only: format and source integrity; not browser or visual acceptance.
set -eu
root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
python_bin=${SKILL_VALIDATION_PYTHON:-"$root/outputs/skill-validation-venv/bin/python"}
validator=${SKILL_FORMAT_VALIDATOR:-"${CODEX_HOME:-$HOME/.codex}/skills/.system/skill-creator/scripts/quick_validate.py"}
if [ ! -x "$python_bin" ]; then
  printf '%s\n' "Validation Python is unavailable: $python_bin" "Follow maintenance/VALIDATION.md to prepare the isolated environment, or set SKILL_VALIDATION_PYTHON." >&2
  exit 2
fi
if ! "$python_bin" -c 'import yaml' >/dev/null 2>&1; then
  printf '%s\n' "Validation dependency PyYAML is missing. Install maintenance/requirements-validation.txt into the isolated environment; see maintenance/VALIDATION.md." >&2
  exit 2
fi
if [ ! -f "$validator" ]; then
  printf '%s\n' "skill-creator format validator is unavailable. Set SKILL_FORMAT_VALIDATOR to its quick_validate.py path." >&2
  exit 2
fi
"$python_bin" "$validator" "$root"
cd "$root"
node scripts/build-resource-index.mjs --repo . --check
node scripts/build-skill-catalog-index.mjs --check
node scripts/build-navigation-index.mjs --repo . --skill-root . --check
node scripts/shared-data.mjs check
node scripts/skill-distribution.mjs check
printf '%s\n' "Format and source integrity passed. Browser, visual and external-model acceptance are separate."
