# Archive

This directory keeps older Calamity FM builds that are no longer the active source or current stable baseline but are still useful for **regression testing, historical comparison, and recovery**.

## Sections

- `milestones/` — major checkpoints worth preserving as long-term references.
- `intermediate/` — development builds between major checkpoints, including experimental fixes and audits.

## Important distinction

An archived build is **not automatically bad or broken**. It simply means the build is no longer the current development target or the selected stable baseline.

Likewise, words such as `Baseline`, `Fix`, `Hotfix`, or `Audit` in a filename do not define stability. Only explicit in-game confirmation determines whether a build belongs in `builds/stable/`.

## Preservation rules

- Do not modify archived `.tl` binaries after they are committed.
- Add notes, manifests, checksums, or validation documents instead of changing the original artifact.
- Keep full version numbers in names, such as `v21.5.4` rather than `v5.4`.
- Binary `.tl` packages are stored through Git LFS.
