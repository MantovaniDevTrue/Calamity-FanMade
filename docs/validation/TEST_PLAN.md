# TLPro/TLauncher validation plan

## Preparation

- [ ] Record the source commit and candidate artifact SHA-256.
- [ ] Record device, OS, launcher name/version, and Terraria version.
- [ ] Back up launcher/user data and test with a clean profile where possible.
- [ ] Confirm the candidate is installed without altering a stable baseline.

## Smoke tests

- [ ] Launcher recognizes and loads the package without parse errors.
- [ ] A new world/session can be created and entered.
- [ ] An existing test world/session can be loaded.
- [ ] Core content expected from the port is visible and usable.
- [ ] Save, exit, and reload preserve state.
- [ ] No unexpected error is present in launcher/runtime logs.

## Regression and compatibility

- [ ] Complete applicable feature-specific regression checks.
- [ ] Test every supported launcher/platform combination in the matrix.
- [ ] Record performance or stability concerns and attach relevant log excerpts.
- [ ] Verify the tested artifact checksum against its build manifest.

## Promotion gate

A candidate may be copied to `builds/stable/` only when all required checks pass,
open exceptions are explicitly documented, and the promoted artifact has the
same SHA-256 checksum as the tested artifact.
