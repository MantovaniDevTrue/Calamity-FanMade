# Changelog

This file records meaningful changes to the Calamity FM port workspace and its preserved build history.

Version identifiers are always written in full, for example `v21.5.1`, `v21.5.4`, and `v21.5.7`.

## Unreleased

### Repository organization

- Added the unpacked `v21.5.7` source under `src/current/` so the active code can be searched, reviewed, compared, and edited directly on GitHub.
- Preserved `v21.3` under `builds/stable/` as the explicitly confirmed known-good summon/minion lifecycle baseline.
- Preserved `v21.5.7` under `builds/testing/` as the current packaged candidate.
- Preserved `v19` as an important historical milestone.
- Added the complete development lineage covering `v20.x`, `v21.x`, `v21.4.x`, and `v21.5.x`.
- Imported intermediate historical `.tl` builds under `archive/intermediate/`.
- Added SHA-256 verification for archived intermediate binaries.
- Configured Git LFS for `.tl` packages so large binary builds do not bloat normal Git objects.
- Added and organized historical validation reports for the available `v21.4.x` and `v21.5.x` builds.

### Documentation

- Rewrote the repository documentation to explain the difference between current source, testing builds, stable baselines, historical milestones, and intermediate builds.
- Clarified that static validation does not equal in-game stability.
- Standardized full version naming (`v21.5.1`, not `v5.1`).
- Corrected project references to **TLPro / TerLauncher**.

### Build-status policy

- A build is considered **stable** only after explicit known-good in-game confirmation.
- Intermediate builds remain historical/testing unless they are separately confirmed and promoted.
- Words such as `Fix`, `Hotfix`, `Audit`, or `Baseline` in a filename do not determine stability.
- Existing stable artifacts are preserved unchanged; new fixes receive a new version/build instead of overwriting a known-good baseline.
