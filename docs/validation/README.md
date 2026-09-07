# Validation documentation

Use the shared test plan and compatibility matrix to evaluate every candidate.

## Version naming

Always use the complete Calamity FM version identifier in documentation, folders and report names.

Examples:
- `v21.4.5`
- `v21.5.1`
- `v21.5.7`

Do not shorten these to `v4.5`, `v5.1`, `5.7`, or similar forms.

## Reports

Historical/static validation reports are stored directly in this directory using names such as:

`YYYY-MM-DD-v21.5.4-surface-render-hotpath-audit.txt`

Runtime test results may be saved under `results/` and linked from the corresponding build manifest/history entry. Record failures explicitly before replacing or promoting a candidate.

A successful static validation does not by itself promote a build to `stable`; stable status requires explicit known-good in-game confirmation.
