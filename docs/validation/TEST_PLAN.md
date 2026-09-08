# Calamity FM — TLPro / TerLauncher validation plan

This checklist is the default runtime test plan for Calamity FM candidates. Not every build needs every feature test, but every candidate should at least pass the basic loading/save checks and the regression checks related to the files it changed.

## Before testing

- [ ] Record the full build version and exact `.tl` filename.
- [ ] Record the artifact SHA-256 when the build is intended for preservation/promotion.
- [ ] Record TLPro / TerLauncher and Terraria versions.
- [ ] Record the device and relevant enabled mods when they may affect the result.
- [ ] Keep the last known-good baseline available for direct comparison.

## Basic stability

- [ ] The mod installs and loads without JavaScript/native exceptions.
- [ ] The main menu works normally.
- [ ] An existing test world loads successfully.
- [ ] A new world can be created/generated when the build touches worldgen or world-loading code.
- [ ] Save → exit → re-enter preserves expected state.
- [ ] No unexpected recurring error appears in runtime logs.

## Feature regression checks

Test the systems touched by the candidate and any known-good behavior that could share the same hooks/loaders. Depending on the build, this may include:

- [ ] Items can be obtained, used, and animated correctly.
- [ ] Projectiles spawn, move, collide, deal damage, and disappear correctly.
- [ ] Summons/minions spawn, attack, persist, dismiss, and render correctly.
- [ ] Boss AI and boss summons still behave correctly.
- [ ] NPC registration/spawning works with other ExMod-derived mods enabled when relevant.
- [ ] Recipes, Guide/crafting UI, and item registries remain functional when relevant.
- [ ] Calamity biomes generate and behave correctly.
- [ ] Draedon laboratories keep correct collision, mining, overlays, and dynamic lighting.
- [ ] Menu background/music lifecycle remains correct when relevant.
- [ ] World migration/repair systems finish without long stalls or repeated work.

## Performance checks

When a build changes hot paths or optimization code, compare against the previous known-good build on the same device/world where possible.

- [ ] Menu idle performance.
- [ ] First world entry.
- [ ] 1–2 minutes of normal movement/exploration.
- [ ] Dense enemy/projectile combat.
- [ ] Mining/block breaking when tile hooks changed.
- [ ] Crafting/Guide UI when recipe/item hooks changed.
- [ ] Calamity biome/laboratory areas when rendering or biome systems changed.
- [ ] Relevant boss fight or summon-heavy scenario.

Do not remove or simplify gameplay content only to hide an FPS regression. Identify the hot path first whenever possible.

## Stable promotion gate

A candidate may be preserved under `builds/stable/` only when:

1. the exact artifact has been explicitly confirmed working in game;
2. required regression checks have passed or documented exceptions are acceptable;
3. no new critical crash or save/world corruption issue is known;
4. the promoted `.tl` is byte-for-byte the same tested artifact.

Static validation is evidence of package integrity, not a substitute for runtime testing.
