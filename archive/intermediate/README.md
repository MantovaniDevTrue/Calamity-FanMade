# Intermediate Calamity FM builds

This directory preserves **development builds between major baselines** so regressions can be traced to a specific version instead of relying on filenames from old chats or local storage.

These builds include performance experiments, compatibility fixes, world-load fixes, summon iterations, boss audits, rendering changes, and other steps that led to the current source.

## How to read this archive

- Each directory keeps the **complete Calamity FM version number**: `v21.5.1`, `v21.4.5`, etc.
- When two different builds reused the same version number, the directory name includes a descriptive suffix so both remain distinguishable.
- These builds are classified as historical/testing unless a specific artifact was explicitly confirmed working in game and promoted to `builds/stable/`.
- `.tl` binaries are stored with Git LFS and should not be edited in place.

## Builds intentionally stored elsewhere

- **v21.3** is not duplicated here because the validated artifact is preserved in `builds/stable/v21.3-summons-lifecycle/`.
- **v21.5.7** is not duplicated here because it is the current testing/source line, stored in `builds/testing/` and `src/current/`.
- **v19** is kept as a major historical checkpoint under `archive/milestones/`.

See `history/VERSION_HISTORY.md` for the chronological development line and `MANIFEST.sha256` for integrity checks of the preserved intermediate binaries.
