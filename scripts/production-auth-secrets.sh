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

production_environment_file="${repository_root}/.env.production"
secrets_directory="${repository_root}/.secrets"
production_secrets_file="${secrets_directory}/production.env"

kickstart_template_file="${repository_root}/auth/kickstart/kickstart.template.json"
generated_kickstart_file="${secrets_directory}/kickstart.prod.json"
kickstart_renderer="${script_directory}/render-kickstart.py"

umask 077


fail()
{
    printf \
        'Error: %s\n' \
        "$1" \
        >&2

    exit 1
}


require_command()
{
    command -v "$1" >/dev/null 2>&1 ||
        fail \
            "Required command is missing: $1"
}


generate_secret()
{
    openssl rand -hex 32
}


generate_uuid()
{
    if [[ ! -r /proc/sys/kernel/random/uuid ]]
    then
        fail \
            "Unable to generate a UUID"
    fi

    tr \
        -d \
        '\r\n' \
        < /proc/sys/kernel/random/uuid
}


generate_admin_password()
{
    python3 -c '
import secrets
import string

symbols = "!@#%^&*_-"
alphabet = string.ascii_letters + string.digits + symbols

while True:
    password = "".join(
        secrets.choice(alphabet)
        for _ in range(24)
    )

    if (
        any(value.islower() for value in password)
        and any(value.isupper() for value in password)
        and any(value.isdigit() for value in password)
        and any(value in symbols for value in password)
    ):
        print(password)
        break
'
}


validate_environment_file()
{
    python3 \
        - \
        "${production_secrets_file}" \
        <<'PY'
import re
import sys

from pathlib import Path


path = Path(sys.argv[1])

required = {
    "FUSIONAUTH_DATABASE_PASSWORD",
    "FUSIONAUTH_APPLICATION_ID",
    "FUSIONAUTH_CLIENT_SECRET",
    "AUTH_TOKEN_ENCRYPTION_KEY",
    "FUSIONAUTH_API_KEY",
    "FUSIONAUTH_TENANT_ID",
    "FUSIONAUTH_ADMIN_PASSWORD",
}

values = {}

for line in path.read_text().splitlines():
    if (
        not line
        or line.startswith("#")
    ):
        continue

    if "=" not in line:
        raise SystemExit(
            f"Invalid line in {path}: "
            f"{line!r}"
        )

    key, value = line.split(
        "=",
        1,
    )

    if key in values:
        raise SystemExit(
            f"Duplicate key in {path}: "
            f"{key}"
        )

    values[key] = value


missing = required - values.keys()
unexpected = values.keys() - required

if missing:
    raise SystemExit(
        "Missing production secrets: "
        + ", ".join(
            sorted(missing)
        )
    )

if unexpected:
    raise SystemExit(
        "Unexpected production secrets: "
        + ", ".join(
            sorted(unexpected)
        )
    )

if any(
    not values[key]
    for key in required
):
    raise SystemExit(
        "Production secret values "
        "cannot be empty"
    )


uuid_pattern = re.compile(
    r"^[0-9a-fA-F]{8}-"
    r"[0-9a-fA-F]{4}-"
    r"[0-9a-fA-F]{4}-"
    r"[0-9a-fA-F]{4}-"
    r"[0-9a-fA-F]{12}$"
)

for key in (
    "FUSIONAUTH_APPLICATION_ID",
    "FUSIONAUTH_TENANT_ID",
):
    if not uuid_pattern.fullmatch(
        values[key]
    ):
        raise SystemExit(
            f"{key} must be a valid UUID"
        )


if not re.fullmatch(
    r"[0-9a-fA-F]{64}",
    values["AUTH_TOKEN_ENCRYPTION_KEY"],
):
    raise SystemExit(
        "AUTH_TOKEN_ENCRYPTION_KEY "
        "must contain 64 hexadecimal characters"
    )
PY
}


generate_environment_file()
{
    local temporary_file

    temporary_file="$(
        mktemp \
            "${secrets_directory}/production.env.tmp.XXXXXX"
    )"

    {
        printf \
            'FUSIONAUTH_DATABASE_PASSWORD=%s\n' \
            "$(generate_secret)"

        printf \
            'FUSIONAUTH_APPLICATION_ID=%s\n' \
            "$(generate_uuid)"

        printf \
            'FUSIONAUTH_CLIENT_SECRET=%s\n' \
            "$(generate_secret)"

        printf \
            'AUTH_TOKEN_ENCRYPTION_KEY=%s\n' \
            "$(generate_secret)"

        printf \
            'FUSIONAUTH_API_KEY=%s\n' \
            "$(generate_secret)"

        printf \
            'FUSIONAUTH_TENANT_ID=%s\n' \
            "$(generate_uuid)"

        printf \
            'FUSIONAUTH_ADMIN_PASSWORD=%s\n' \
            "$(generate_admin_password)"
    } > "${temporary_file}"

    chmod \
        600 \
        "${temporary_file}"

    mv \
        "${temporary_file}" \
        "${production_secrets_file}"
}


render_kickstart()
{
    local temporary_file

    temporary_file="$(
        mktemp \
            "${secrets_directory}/kickstart.prod.tmp.XXXXXX"
    )"

    if ! python3 \
        "${kickstart_renderer}" \
        "${production_secrets_file}" \
        "${production_environment_file}" \
        "${kickstart_template_file}" \
        "${temporary_file}"
    then
        rm \
            -f \
            "${temporary_file}"

        fail \
            "Unable to render the production Kickstart file"
    fi

    chmod \
        600 \
        "${temporary_file}"

    mv \
        "${temporary_file}" \
        "${generated_kickstart_file}"
}


require_command \
    "openssl"

require_command \
    "python3"


if [[ ! -f "${production_environment_file}" ]]
then
    fail \
        ".env.production was not found"
fi

if [[ ! -f "${kickstart_template_file}" ]]
then
    fail \
        "Kickstart template was not found"
fi

if [[ ! -f "${kickstart_renderer}" ]]
then
    fail \
        "Kickstart renderer was not found"
fi


mkdir \
    -p \
    "${secrets_directory}"

chmod \
    700 \
    "${secrets_directory}"


if [[ ! -e "${production_secrets_file}" ]]
then
    generate_environment_file

    printf \
        'Generated production authentication secrets.\n'
fi


if [[ ! -f "${production_secrets_file}" ]]
then
    fail \
        "Production secret path is not a regular file"
fi


validate_environment_file

render_kickstart


printf \
    'Production authentication configuration is ready.\n'

printf \
    'Secrets:   %s\n' \
    "${production_secrets_file}"

printf \
    'Kickstart: %s\n' \
    "${generated_kickstart_file}"