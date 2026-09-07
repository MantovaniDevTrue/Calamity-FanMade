# Archive

The archive preserves historical snapshots that are no longer the active source or stable baseline.

- `milestones/` keeps major historical checkpoints.
- `intermediate/` keeps physical intermediate `.tl` builds used for regression comparison.

Archived artifacts are immutable. Add context or manifests instead of modifying their bytes.

Binary `.tl` files are tracked through Git LFS. A build is not considered stable merely because its filename contains `Baseline`, `Fix`, `Audit`, or `Hotfix`; stable promotion requires explicit runtime validation.
