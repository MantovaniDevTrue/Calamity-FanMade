# Packaged builds

This directory contains packaged Calamity FM `.tl` files that are still part of the active validation workflow.

- `testing/` — candidates that still need runtime confirmation.
- `stable/` — exact artifacts that were explicitly confirmed as known-good in game.

Historical builds that are no longer active candidates belong under `archive/` instead of being mixed with current testing builds.

## Rules

- Use a unique directory for each build and keep the complete version number, for example `v21.5.7-biome-runtime-render-audit`.
- Preserve the exact binary that was tested. Do not rebuild it after validation and call the rebuilt file the same stable artifact.
- Record the SHA-256 checksum and relevant source/build information in a manifest when one is needed.
- Promotion from `testing/` to `stable/` means preserving the **same tested bytes**, not creating a new package with the same name.
- Never overwrite an older stable baseline just to keep the directory tidy.
