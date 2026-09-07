# Calamity FM version history

This file records the preserved development line used during the TLPro / TerLauncher port work.

Status meanings:

- **stable** — explicitly confirmed working in-game and safe to use as a regression baseline.
- **current/testing** — current development candidate; not promoted to stable yet.
- **historical/testing** — intermediate audit/fix build retained for traceability and regression investigation.
- **milestone/archive** — important older reference retained for comparison.

> A build name containing words such as `Baseline`, `Fix`, `Audit`, or `Validation` does not by itself make that build stable. Promotion requires explicit in-game confirmation.

## v19 line

| Version | Build | Status | Notes |
| --- | --- | --- | --- |
| v19 | `Calamity_FM_Proxy_Safety_Audit_Hotfix_v19.tl` | milestone/archive | Preserved pre-v20 milestone used for regression comparison. Binary is stored under `archive/milestones/2026-09-02-v19-proxy-safety-audit/`. |

## v20 line — ExMod alignment and performance

| Version | Build | Status | Notes |
| --- | --- | --- | --- |
| v20 | `Calamity_FM_ExMod_1.7.1_Full_Base_Alignment_v20.tl` | historical/testing | Full ExMod 1.7.1 base-alignment attempt. |
| v20.1 | `Calamity_FM_ExMod_Selective_Alignment_v20_1.tl` | historical/testing | Selective alignment follow-up. |
| v20.2 | `Calamity_FM_ExMod_Alignment_Performance_Hotfix_v20_2.tl` | historical/testing | Performance-oriented correction after alignment work. |
| v20.3 | `Calamity_FM_Performance_Baseline_v20_3.tl` | historical/testing | Named performance baseline in development history; not promoted here without explicit in-game confirmation. |
| v20.4 | `Calamity_FM_ExMod_Selective_Core_Parity_v20_4.tl` | historical/testing | Selective core parity pass. |

## v21 line — boss summons and summon lifecycle

| Version | Build | Status | Notes |
| --- | --- | --- | --- |
| v21 | `Calamity_FM_Boss_Summon_Fidelity_Audit_v21.tl` | historical/testing | Boss summon fidelity audit. |
| v21.1 | `Calamity_FM_Rusty_Beacon_Fix_v21_1.tl` | historical/testing | Rusty Beacon correction. |
| v21.2 | `Calamity_FM_Summon_Persistence_Visual_Fix_v21_2.tl` | historical/testing | Summon persistence/visual iteration. |
| v21.2 | `Calamity_FM_Summon_Lifecycle_Visual_Audit_v21_2.tl` | historical/testing | Summon lifecycle visual audit iteration. |
| v21.2 | `Calamity_FM_Summon_Dismiss_Visual_Audit_v21_2.tl` | historical/testing | Dismiss/visual behavior iteration. |
| v21.2 | `Calamity_FM_Frost_Blossom_Summon_Lifecycle_Fix_v21_2.tl` | historical/testing | Frost Blossom lifecycle fix attempt. |
| v21.2 | `Calamity_FM_Summon_Lifecycle_FrostBlossom_Fix_v21_2.tl` | historical/testing | Follow-up Frost Blossom lifecycle build. |
| v21.3 | `Calamity_FM_Remaining_Summons_Lifecycle_Audit_v21_3.tl` | **stable** | Explicitly confirmed working perfectly in-game. Known-good summon/minion lifecycle baseline. Binary is stored under `builds/stable/v21.3-summons-lifecycle/`. |

## v21.4 line — pre-Slime God, registry, save paths, lab and menu

| Version | Build | Status | Validation |
| --- | --- | --- | --- |
| v21.4 | `Calamity_FM_PreSlimeGod_Boss_Audit_v21_4.tl` | historical/testing | `Calamity_FM_PreSlimeGod_Boss_Audit_v21_4_Validation.txt` |
| v21.4.1 | `Calamity_FM_PreSlimeGod_Boss_Audit_v21_4_1_NPC_Registry_Compat.tl` | historical/testing | `Calamity_FM_PreSlimeGod_Boss_Audit_v21_4_1_NPC_Registry_Compat_Validation.txt` |
| v21.4.2 | `Calamity_FM_PreSlimeGod_Boss_Audit_v21_4_2_Projectile_AI_NativeObject_Fix.tl` | historical/testing | No paired validation file located. |
| v21.4.2 | `Calamity_FM_PreSlimeGod_Boss_Audit_v21_4_2_Missing_Save_Dirs_Hotfix.tl` | historical/testing | `Calamity_FM_PreSlimeGod_Boss_Audit_v21_4_2_Missing_Save_Dirs_Hotfix_Validation.txt` |
| v21.4.3 | `Calamity_FM_Menu_Music_Persistence_Fix_v21_4_3.tl` | historical/testing | `Calamity_FM_Menu_Music_Persistence_Fix_v21_4_3_Validation.txt` |
| v21.4.3 | `Calamity_FM_PreSlimeGod_Boss_Audit_v21_4_3_Ice_Lab_Pipes_Dynamic_Lighting_Fix.tl` | historical/testing | Parallel v21.4.3 lab/lighting fix build; no paired validation file located. |
| v21.4.4 | `Calamity_FM_v21_4_4_Menu_Music_Ice_Lab_Merged.tl` | historical/testing | `Calamity_FM_v21_4_4_Menu_Music_Ice_Lab_Merged_Validation.txt` |
| v21.4.5 | `Calamity_FM_v21_4_5_QoL_Hotpath_Performance_Fix.tl` | historical/testing | `Calamity_FM_v21_4_5_QoL_Hotpath_Performance_Fix_Validation.txt` |

The v21.4.2 and v21.4.3 version numbers were reused for separate fixes. They are intentionally listed as distinct builds instead of being treated as the same artifact.

## v21.5 line — runtime performance, persistence, worldgen and rendering

| Version | Build | Status | Validation |
| --- | --- | --- | --- |
| v21.5 | `Calamity_FM_v21_5_General_Runtime_Performance_Audit.tl` | historical/testing | `Calamity_FM_v21_5_General_Runtime_Performance_Audit_Validation.txt` |
| v21.5.1 | `Calamity_FM_v21_5_1_Tile_Mining_Hotpath_Audit.tl` | historical/testing | `Calamity_FM_v21_5_1_Tile_Mining_Hotpath_Audit_Validation.txt` |
| v21.5.2 | `Calamity_FM_v21_5_2_World_Load_Stability_Hotfix.tl` | historical/testing | `Calamity_FM_v21_5_2_World_Load_Stability_Hotfix_Validation.txt` |
| v21.5.3 | `Calamity_FM_v21_5_3_Aerialite_One_Time_Persistence_Fix.tl` | historical/testing | `Calamity_FM_v21_5_3_Aerialite_One_Time_Persistence_Fix_Validation.txt` |
| v21.5.4 | `Calamity_FM_v21_5_4_Surface_Render_Hotpath_Audit.tl` | historical/testing | `Calamity_FM_v21_5_4_Surface_Render_Hotpath_Audit_Validation.txt` |
| v21.5.5 | `Calamity_FM_v21_5_5_Audio_Spawn_Optimization.tl` | historical/testing | No paired validation file located. |
| v21.5.6 | `Calamity_FM_v21_5_6_Abyss_Worldgen_Only_Hotfix.tl` | historical/testing | No paired validation file located. |
| v21.5.7 | `Calamity_FM_v21_5_7_Biome_Runtime_Render_Audit.tl` | **current/testing** | `Calamity_FM_v21_5_7_Biome_Runtime_Render_Audit_Validation.txt`; current unpacked source is in `src/current/`, and the packaged candidate is in `builds/testing/v21.5.7-biome-runtime-render-audit/`. |

## Preservation policy

1. `src/current/` is the canonical editable source for the current development build.
2. Only explicitly confirmed known-good builds belong in `builds/stable/`.
3. Large `.tl` binaries should not all be duplicated into normal Git history. Important stable/current/milestone artifacts are preserved in the repository; intermediate builds are indexed here and may be stored as release/archive assets when needed.
4. Validation text belongs in `docs/validation/` and should remain small, searchable, and versioned in Git.
5. Never overwrite a stable baseline. Add a new version instead.
