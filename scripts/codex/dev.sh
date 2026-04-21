#!/usr/bin/env bash

set -euo pipefail

source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/_lib.sh"

log "Starting the repo-local Next.js dev server"
log "Use ../start.sh instead when you need the archived partner support stack."
run_pkg dev -- "$@"
