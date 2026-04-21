#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"

log() {
  printf '[%s] %s\n' "$(basename "$0")" "$*"
}

fail() {
  printf '[%s] %s\n' "$(basename "$0")" "$*" >&2
  exit 1
}

detect_package_manager() {
  if [[ -f "$REPO_ROOT/pnpm-lock.yaml" ]]; then
    printf 'pnpm'
    return
  fi

  if [[ -f "$REPO_ROOT/yarn.lock" ]]; then
    printf 'yarn'
    return
  fi

  if [[ -f "$REPO_ROOT/package-lock.json" ]]; then
    printf 'npm'
    return
  fi

  if [[ -f "$REPO_ROOT/bun.lockb" || -f "$REPO_ROOT/bun.lock" ]]; then
    printf 'bun'
    return
  fi

  fail "Could not detect a supported package manager from lockfiles."
}

run_pkg() {
  local package_manager
  package_manager="$(detect_package_manager)"

  cd "$REPO_ROOT"

  case "$package_manager" in
    pnpm)
      if command -v pnpm >/dev/null 2>&1; then
        pnpm "$@"
      elif command -v corepack >/dev/null 2>&1; then
        corepack pnpm "$@"
      else
        fail "pnpm is required but neither pnpm nor corepack is available."
      fi
      ;;
    yarn)
      command -v yarn >/dev/null 2>&1 || fail "yarn is required but not installed."
      yarn "$@"
      ;;
    npm)
      command -v npm >/dev/null 2>&1 || fail "npm is required but not installed."
      npm "$@"
      ;;
    bun)
      command -v bun >/dev/null 2>&1 || fail "bun is required but not installed."
      bun "$@"
      ;;
    *)
      fail "Unsupported package manager: $package_manager"
      ;;
  esac
}
