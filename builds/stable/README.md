# Stable builds

This directory contains **known-good Calamity FM builds that were explicitly confirmed working in game**.

A build should only be placed here after runtime testing in TLPro / TerLauncher. Passing JavaScript syntax checks, JSON validation, ZIP integrity checks, or other static tests is useful, but it does **not** make a build stable by itself.

## Current stable baseline

- **v21.3 — Remaining Summons Lifecycle Audit**
  - Confirmed working in game.
  - Preserved as the known-good baseline for the audited summon/minion lifecycle behavior.

## Rules

- Never overwrite or modify an existing stable `.tl` artifact.
- If a stable build later needs a correction, create a new version and test it separately.
- Keep the complete version number in directory and documentation names, for example `v21.5.1` rather than `v5.1`.
- Preserve the exact tested binary and its checksum so future regressions can be compared against it reliably.
