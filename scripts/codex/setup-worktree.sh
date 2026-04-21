#!/usr/bin/env bash

set -euo pipefail

source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/_lib.sh"

log "Installing dependencies for the worktree"
if command -v corepack >/dev/null 2>&1; then
  corepack enable
fi
run_pkg install --frozen-lockfile

log "Building the app once so the worktree is ready for coding and QA"
run_pkg build
