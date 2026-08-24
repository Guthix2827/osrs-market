#!/usr/bin/env python3

import json
import sys
from pathlib import Path


def read_environment(
    environment_path: Path,
) -> dict[str, str]:
    environment: dict[str, str] = {}

    for line in (
        environment_path
        .read_text()
        .splitlines()
    ):
        if (
            not line or
            line.startswith("#")
        ):
            continue

        if "=" not in line:
            raise RuntimeError(
                f"Invalid environment line in "
                f"{environment_path}"
            )

        key, value = line.split(
            "=",
            1,
        )

        if not key or not value:
            raise RuntimeError(
                f"Invalid environment value "
                f"for {key!r}"
            )

        if key in environment:
            raise RuntimeError(
                f"Duplicate environment key: "
                f"{key}"
            )

        environment[key] = value

    return environment


def main() -> None:
    if len(sys.argv) != 5:
        raise SystemExit(
            "Usage: render-kickstart.py "
            "<auth-environment> "
            "<bootstrap-environment> "
            "<template> "
            "<output>"
        )

    auth_environment_path = Path(sys.argv[1])
    bootstrap_environment_path = Path(sys.argv[2])
    template_path = Path(sys.argv[3])
    output_path = Path(sys.argv[4])

    environment = {
        **read_environment(auth_environment_path),
        **read_environment(bootstrap_environment_path),
    }

    client_secret = environment.get(
        "FUSIONAUTH_CLIENT_SECRET",
    )

    if not client_secret:
        raise RuntimeError(
            "FUSIONAUTH_CLIENT_SECRET "
            "is missing"
        )

    placeholders = {
        "__FUSIONAUTH_APPLICATION_ID__":
            environment["FUSIONAUTH_APPLICATION_ID"],

        "__FUSIONAUTH_CLIENT_SECRET__":
            environment["FUSIONAUTH_CLIENT_SECRET"],

        "__FUSIONAUTH_API_KEY__":
            environment["FUSIONAUTH_API_KEY"],

        "__FUSIONAUTH_TENANT_ID__":
            environment["FUSIONAUTH_TENANT_ID"],

        "__FUSIONAUTH_ADMIN_PASSWORD__":
            environment["FUSIONAUTH_ADMIN_PASSWORD"],
    }

    rendered = template_path.read_text()

    for placeholder, value in placeholders.items():
        escaped_value = json.dumps(value)[1:-1]

        rendered = rendered.replace(
            placeholder,
            escaped_value,
        )

    remaining_placeholders = [
        placeholder
        for placeholder in placeholders
        if placeholder in rendered
    ]

    if remaining_placeholders:
        raise RuntimeError(
            "Kickstart placeholders remain: "
            + ", ".join(remaining_placeholders)
        )

    json.loads(rendered)

    output_path.write_text(rendered)


if __name__ == "__main__":
    try:
        main()
    except (
        OSError,
        RuntimeError,
        json.JSONDecodeError,
    ) as error:
        raise SystemExit(
            f"Failed to render Kickstart: "
            f"{error}"
        ) from error