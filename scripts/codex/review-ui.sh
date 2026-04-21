#!/usr/bin/env bash

set -euo pipefail

source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/_lib.sh"

log "Running the full frontend quality sequence"
run_pkg lint
run_pkg typecheck
run_pkg test
run_pkg build
run_pkg storybook:build
run_pkg test:e2e
