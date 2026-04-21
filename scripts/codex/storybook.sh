#!/usr/bin/env bash

set -euo pipefail

source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/_lib.sh"

log "Starting Storybook for isolated Phase 1 surface QA"
run_pkg storybook -- "$@"
