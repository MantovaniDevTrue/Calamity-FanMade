# Validation documentation

This directory records the evidence used to decide whether a Calamity FM build is safe to keep, test further, promote to stable, or archive.

## Two different kinds of validation

### Static validation

Static checks verify the package without launching the game. Depending on the build, reports may include:

- JavaScript syntax checks
- JSON parsing
- relative-import validation
- ZIP / `.tl` integrity
- file-count comparisons
- registry-order comparisons
- checks that specific files changed and unrelated files did not

Passing these checks means the package is internally consistent. It does **not** prove that the build performs correctly in TLPro at runtime.

### Runtime validation

Runtime validation means actually testing the build in TLPro / TerLauncher on Android. This is where crashes, FPS regressions, broken AI, missing projectiles, world-generation problems, lighting issues, touch problems, and other real in-game behavior are confirmed.

A build is promoted to `builds/stable/` only after explicit known-good in-game confirmation.

## Version naming

Always use the complete Calamity FM version identifier in documentation, folders, and report names.

Examples:

- `v21.4.5`
- `v21.5.1`
- `v21.5.7`

Do not shorten these to `v4.5`, `v5.1`, `5.7`, or similar forms.

## Reports

Historical/static validation reports are stored directly in this directory with descriptive names. Runtime test results can be stored under `results/` when a separate result file is useful.

If a candidate fails, record the failure before replacing or archiving it. Keeping failed results is useful because it explains why a later build exists and makes regression investigation much easier.
