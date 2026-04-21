#!/usr/bin/env bash

set -euo pipefail

source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/_lib.sh"

log "Running Playwright smoke and visual QA checks"
run_pkg test:e2e -- "$@"
