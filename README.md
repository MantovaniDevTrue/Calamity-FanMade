# Calamity FanMade — TLPro / TerLauncher

This repository contains the fan-made **Calamity FM mobile port** for Terraria running through **TLPro / TerLauncher**.

The port is implemented primarily in JavaScript and adapts Calamity content and behavior to the limitations and APIs available on the mobile TLPro environment. This is **not the official Calamity Mod repository**.

## Current development state

- **Current source:** `v21.5.7` — stored unpacked in [`src/current/`](src/current/).
- **Current packaged test build:** `v21.5.7` — stored in [`builds/testing/`](builds/testing/).
- **Known-good summon baseline:** `v21.3` — stored in [`builds/stable/`](builds/stable/).
- **Historical regression baseline:** `v19` — stored in [`archive/milestones/`](archive/milestones/).
- Intermediate `v20.x`, `v21.x`, `v21.4.x`, and `v21.5.x` builds are preserved under [`archive/intermediate/`](archive/intermediate/) through Git LFS.

A build is only marked **stable** after explicit in-game confirmation. Words such as `Fix`, `Hotfix`, `Audit`, or `Baseline` in a filename do not automatically mean the build is stable.

## Project goals

The port is developed with the following priorities:

1. Keep TLPro / TerLauncher compatibility and stability.
2. Preserve Calamity behavior as closely as the mobile platform allows.
3. Fix crashes, broken content, lifecycle problems, and regressions.
4. Improve mobile performance, especially JavaScript work executed every tick.
5. Avoid unnecessary changes to damage, AI, loot, progression, recipes, or balance.
6. Keep working baselines available so regressions can be compared and reverted safely.

## Repository structure

| Path | What it contains |
| --- | --- |
| [`src/current/`](src/current/) | Editable unpacked source of the current development build. |
| [`builds/stable/`](builds/stable/) | Builds explicitly confirmed as known-good in game. |
| [`builds/testing/`](builds/testing/) | Current candidates that still need runtime validation. |
| [`archive/milestones/`](archive/milestones/) | Important older snapshots used for major regression comparison. |
| [`archive/intermediate/`](archive/intermediate/) | Intermediate historical `.tl` builds preserved with Git LFS. |
| [`docs/validation/`](docs/validation/) | Static validation reports, runtime-test notes, and compatibility information. |
| [`history/`](history/) | Human-readable build lineage and repository history. |

## How versions are handled

Version numbers are always written in full. Examples:

- `v21.4.5`
- `v21.5.1`
- `v21.5.7`

Do not shorten them to `v4.5`, `v5.1`, `5.7`, or similar forms.

When two different builds share the same version number, a descriptive suffix is used to keep them distinct, for example:

- `v21.4.2-missing-save-dirs-hotfix`
- `v21.4.2-projectile-ai-nativeobject-fix`

## Development workflow

1. Make source changes in `src/current/`.
2. Package the next candidate as a `.tl` build.
3. Store the candidate in `builds/testing/<full-version>-<purpose>/`.
4. Run static checks and test the build in TLPro on Android.
5. Record the result under `docs/validation/` and `history/`.
6. Promote the exact tested artifact to `builds/stable/` only after it is confirmed working in game.
7. Preserve superseded builds in the archive rather than overwriting them.

## Git LFS

Packaged `.tl` files are binary archives and are tracked through **Git LFS**.

After cloning this repository on a new device:

```bash
git lfs install
git lfs pull
```

The active source in `src/current/` remains normal Git content so it can be searched, reviewed, compared, and edited normally.

## Credits

Calamity and its original content belong to the **Calamity Mod team** and the respective original creators. Music remains credited to its original composers, including **DM DOKURO** where applicable.

TLPro / TerLauncher fan-made port work: **Mantovani** and contributors.

This repository exists for development, preservation, testing, and compatibility work for the mobile fan-made port.
