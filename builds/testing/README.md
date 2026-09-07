# Testing builds

This directory contains **current Calamity FM candidates that still need in-game validation**.

Testing builds may already pass static checks and may include fixes, optimizations, or compatibility changes, but they are not treated as stable until they are explicitly confirmed working in TLPro / TerLauncher.

## Current testing line

- **v21.5.7 — Biome Runtime / Render Audit**
  - Current packaged candidate.
  - The unpacked editable source for this line is in `src/current/`.

## When adding a candidate

1. Use the complete version number, for example `v21.5.8-some-fix`.
2. Preserve the exact `.tl` binary that was tested.
3. Record what changed and what must be tested.
4. Store static/runtime validation notes under `docs/validation/`.
5. If the candidate is confirmed working, preserve that exact artifact in `builds/stable/` rather than rebuilding or modifying it afterward.

Failed or superseded candidates should remain traceable through the archive/history when they are useful for regression comparison.
