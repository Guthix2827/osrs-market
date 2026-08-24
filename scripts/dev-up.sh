#!/usr/bin/env bash

set -euo pipefail

script_directory="$(
    cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
    pwd
)"

repository_root="$(
    cd -- "${script_directory}/.."
    pwd
)"

cd \
    "${repository_root}"

./scripts/auth-secrets.sh \
    ensure

docker compose \
    -f docker-compose.dev.yml \
    up -d \
    postgres \
    fusionauth \
    auth \
    backend