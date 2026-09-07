# Calamity FM — TLPro/TLauncher port workspace

This repository is the staging, development, and preservation workspace for the Calamity FM port to TLPro/TLauncher.

The current unpacked source is stored in [`src/current/`](src/current/). Packaged `.tl` artifacts are preserved separately so source development remains easy to browse and historical builds remain available for regression comparison.

## Repository map

| Path | Purpose | Change policy |
| --- | --- | --- |
| [`src/current/`](src/current/) | Current unpacked port source and assets | Active development |
| [`builds/stable/`](builds/stable/) | Known-good, user-validated baselines | Immutable; add a new version instead of overwriting |
| [`builds/testing/`](builds/testing/) | Current candidate/testing builds | Replace only after results are recorded |
| [`archive/milestones/`](archive/milestones/) | Important historical milestones | Immutable |
| [`archive/intermediate/`](archive/intermediate/) | Intermediate historical `.tl` builds for regression comparison | Immutable; Git LFS |
| [`docs/validation/`](docs/validation/) | Test plans, compatibility notes, and validation reports | Append/update with each candidate |
| [`history/`](history/) | Human-readable development/version history | Append-only where practical |

## Current preservation state

- `v21.3` is preserved under `builds/stable/` as the known-good summon/minion lifecycle baseline confirmed in game.
- `v21.5.7` is the current source/testing line under `src/current/` and `builds/testing/`.
- `v19` is preserved as a historical milestone.
- Intermediate v20.x/v21.x builds are catalogued in `history/VERSION_HISTORY.md` and stored under `archive/intermediate/` when their physical artifacts are imported.

A filename containing words such as `Baseline`, `Fix`, `Audit`, or `Hotfix` does not by itself make a build stable. Only explicit runtime validation promotes a build into `builds/stable/`.

## Git LFS

`.tl` packages are binary archives and are tracked with Git LFS through `.gitattributes`.

After cloning on a new device, install/enable LFS before adding new `.tl` files:

```bash
git lfs install
git lfs pull
```

Do not decompress historical `.tl` artifacts inside `archive/intermediate/`. The unpacked active source belongs only in `src/current/`.

## Build lifecycle

1. **Develop** in `src/current/`.
2. **Package** a candidate into `builds/testing/<full-version>-<purpose>/`.
3. **Validate** using `docs/validation/` and record the result.
4. **Promote** the exact tested artifact to `builds/stable/<full-version>-<purpose>/` only after explicit in-game confirmation.
5. **Archive** superseded/intermediate builds without editing their bytes.
6. **Document** every meaningful transition in `history/`.

## Naming conventions

- Always keep the complete Calamity FM version number in directory/history names: `v21.5.1`, never `v5.1`.
- When multiple experimental branches share a version, append a descriptive suffix, e.g. `v21.4.2-missing-save-dirs-hotfix`.
- Validation results should use the same full version number.
- Use SHA-256 checksums for preserved packaged artifacts.

Generated caches, logs, and local launcher data are excluded by `.gitignore`.
