# Calamity FM — TLPro/TLauncher port workspace

This repository is the staging and preservation workspace for the Calamity FM
port to TLPro/TLauncher. The Calamity `.tl` source files are intentionally not
included yet; place them in [`src/current/`](src/current/) when they are
provided.

## Repository map

| Path | Purpose | Change policy |
| --- | --- | --- |
| [`src/current/`](src/current/) | Current port source and its assets | Active development |
| [`builds/stable/`](builds/stable/) | Known-good, validated baselines | Immutable; add a new version instead of overwriting |
| [`builds/testing/`](builds/testing/) | Candidate and experimental builds | May be replaced after results are recorded |
| [`archive/milestones/`](archive/milestones/) | Historical milestone snapshots | Immutable |
| [`docs/validation/`](docs/validation/) | Test plans, compatibility matrix, and validation results | Update with every candidate |
| [`history/`](history/) | Human-readable development and release history | Append-only where practical |

Every stored build or milestone belongs in its own versioned directory. Do not
move or edit a known-good artifact merely to reorganize it. Copy a validated
candidate into a new stable directory, record its checksum and provenance, and
retain the previous baseline.

## Adding the incoming `.tl` files

1. Copy the files into `src/current/` without changing their contents or names.
2. Record their origin and SHA-256 checksums in `src/current/SOURCE_MANIFEST.md`.
3. Add any required assets beneath `src/current/assets/`, preserving relative
   paths expected by the source.
4. Run `./scripts/validate-layout.sh` before committing.
5. Start a development-history entry using `history/ENTRY_TEMPLATE.md`.

## Build lifecycle

1. **Develop** in `src/current/`.
2. **Package** a candidate into `builds/testing/<version>/`; include a copy of
   `builds/BUILD_MANIFEST_TEMPLATE.md` completed for that build.
3. **Validate** using `docs/validation/TEST_PLAN.md` and store a result copied
   from `docs/validation/RESULT_TEMPLATE.md`.
4. **Promote** by copying the exact tested artifact to
   `builds/stable/<version>/`. Verify that its checksum remains unchanged.
5. **Archive** significant snapshots in `archive/milestones/<milestone>/`, with
   an `ARCHIVE_MANIFEST.md` based on the supplied template.
6. **Document** the promotion in `history/CHANGELOG.md`.

## Naming conventions

- Release directories: `v<major>.<minor>.<patch>` (for example `v0.1.0`).
- Testing directories: `<version>-<purpose>` (for example `v0.1.0-rc1`).
- Milestones: `YYYY-MM-DD-<short-name>`.
- Validation results: `YYYY-MM-DD-<build>-<platform>.md`.
- Use SHA-256 checksums for all packaged artifacts.

Generated caches, logs, and local launcher data are excluded by `.gitignore`.
Build artifacts are **not** globally ignored so approved baselines can be
preserved deliberately.
