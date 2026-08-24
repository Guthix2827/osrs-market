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


"${script_directory}/production-auth-secrets.sh"


docker compose \
    --env-file "${repository_root}/.env.production" \
    --env-file "${repository_root}/.secrets/production.env" \
    -f "${repository_root}/docker-compose.prod.yml" \
    up \
    -d \
    --build