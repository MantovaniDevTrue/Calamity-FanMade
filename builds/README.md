# Builds

- `testing/` contains unapproved candidates and experiments.
- `stable/` contains known-good baselines that passed the documented test plan.

Put each build in a uniquely named subdirectory and include a completed
`BUILD_MANIFEST.md`, copied from `BUILD_MANIFEST_TEMPLATE.md`. Promotion must be
a byte-for-byte copy: never rebuild, rename in place, or overwrite an existing
stable baseline.
