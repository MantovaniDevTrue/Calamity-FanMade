#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

required_paths=(
  src/current/SOURCE_MANIFEST.md
  builds/stable/README.md
  builds/testing/README.md
  archive/milestones/README.md
  docs/validation/TEST_PLAN.md
  docs/validation/COMPATIBILITY_MATRIX.md
  docs/validation/results/README.md
  history/CHANGELOG.md
  history/entries/README.md
)

failed=0
for path in "${required_paths[@]}"; do
  if [[ ! -f "$path" ]]; then
    printf 'missing required file: %s\n' "$path" >&2
    failed=1
  fi
done

while IFS= read -r directory; do
  name="$(basename "$directory")"
  if [[ ! "$name" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    printf 'invalid stable version directory: %s\n' "$directory" >&2
    failed=1
  fi
  if [[ ! -f "$directory/BUILD_MANIFEST.md" ]]; then
    printf 'stable build lacks BUILD_MANIFEST.md: %s\n' "$directory" >&2
    failed=1
  fi
done < <(find builds/stable -mindepth 1 -maxdepth 1 -type d -print | sort)

while IFS= read -r directory; do
  name="$(basename "$directory")"
  if [[ ! "$name" =~ ^v[0-9]+\.[0-9]+\.[0-9]+-[a-z0-9][a-z0-9.-]*$ ]]; then
    printf 'invalid testing build directory: %s\n' "$directory" >&2
    failed=1
  fi
  if [[ ! -f "$directory/BUILD_MANIFEST.md" ]]; then
    printf 'testing build lacks BUILD_MANIFEST.md: %s\n' "$directory" >&2
    failed=1
  fi
done < <(find builds/testing -mindepth 1 -maxdepth 1 -type d -print | sort)

while IFS= read -r directory; do
  name="$(basename "$directory")"
  if [[ ! "$name" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9][a-z0-9-]*$ ]]; then
    printf 'invalid milestone directory: %s\n' "$directory" >&2
    failed=1
  fi
  if [[ ! -f "$directory/ARCHIVE_MANIFEST.md" ]]; then
    printf 'milestone lacks ARCHIVE_MANIFEST.md: %s\n' "$directory" >&2
    failed=1
  fi
done < <(find archive/milestones -mindepth 1 -maxdepth 1 -type d -print | sort)

if (( failed != 0 )); then
  exit 1
fi

printf 'Repository layout is valid.\n'
