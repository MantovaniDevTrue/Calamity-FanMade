# Changelog

All notable port and repository milestones are recorded here. This project uses versioned build directories; release headings should match those identifiers.

Version identifiers must always be written in full, for example `v21.5.1`, `v21.5.4`, and `v21.5.7`. Do not abbreviate them to `v5.1`, `5.4`, or similar forms.

## Unreleased

### Added

- Initial preservation-focused workspace for current source, testing builds, stable baselines, archived milestones, validation, and development history.
- Complete version-history index covering the v19, v20, v21, v21.4.x, and v21.5.x development lines.
- Historical validation reports for v21.4 through v21.5.4, plus the existing v21.5.7 current-build validation.

### Repository policy

- `v21.3` remains the explicitly confirmed known-good summon/minion lifecycle baseline.
- `v21.5.7` remains the current testing/source build.
- Intermediate builds remain historical/testing until explicitly confirmed in-game.
- Large `.tl` binaries are preserved selectively in normal Git to avoid unnecessary repository bloat; the history index retains the complete build lineage.
