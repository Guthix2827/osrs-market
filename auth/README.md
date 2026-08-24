# Authentication

OSRS Market uses FusionAuth Community Edition for user identity and a small
Node.js authentication service for the OAuth flow and application sessions.

The browser never stores FusionAuth access or refresh tokens. The authentication
service stores them encrypted in PostgreSQL and gives the browser an opaque,
HTTP-only session cookie.

## Architecture

```text
Browser
  |
  | /auth/*
  v
Frontend Nginx
  |
  v
Node authentication service
  |
  +---- FusionAuth
  |
  +---- PostgreSQL
```

The C++ backend remains responsible for market functionality. It can validate
authenticated users through the authentication service when protected features
are added.

## Secret files

Generated development secrets are stored under:

```text
.secrets/
```

This directory is excluded from Git and Docker build contexts. Do not commit its
contents.

The generated files include:

```text
.secrets/auth-service.env
.secrets/fusionauth-bootstrap.env
.secrets/kickstart.dev.json
```

`auth-service.env` contains the FusionAuth application ID, OAuth client secret,
and token-encryption key.

`fusionauth-bootstrap.env` contains values needed when creating a fresh
FusionAuth development installation.

`kickstart.dev.json` is generated from the committed Kickstart template and the
secret files.

## Requirements

Local authentication setup requires:

- Docker with Docker Compose
- Bash
- OpenSSL
- Python 3

## Local development

Generate or validate the authentication secrets:

```bash
./scripts/auth-secrets.sh ensure
```

This command is safe to run repeatedly. Existing valid values are preserved.

Start the development services:

```bash
./scripts/dev-up.sh
```

Alternatively:

```bash
./scripts/auth-secrets.sh ensure

docker compose \
  -f docker-compose.dev.yml \
  up -d \
  postgres \
  fusionauth \
  auth \
  backend \
  frontend
```

Local endpoints:

```text
Frontend:     http://localhost:5173
Backend:      http://localhost:8081
Auth service: http://localhost:3000
FusionAuth:   http://localhost:9011
```

The FusionAuth administrator email and generated password are stored in:

```text
.secrets/fusionauth-bootstrap.env
```

To inspect the administrator email without printing the password:

```bash
grep '^FUSIONAUTH_ADMIN_EMAIL=' \
  .secrets/fusionauth-bootstrap.env
```

## Existing local FusionAuth installation

If FusionAuth already has an application and its client secret differs from the
generated value, save the existing secret with:

```bash
./scripts/auth-secrets.sh set-client-secret
```

Enter the client secret from the FusionAuth application OAuth configuration.
The value is entered silently and is not printed.

The FusionAuth application ID is the value shown as `Client Id` in the
FusionAuth application OAuth settings.

After updating the secret files, recreate the authentication service:

```bash
docker compose \
  -f docker-compose.dev.yml \
  up -d \
  --force-recreate \
  auth
```

## Recreating local FusionAuth

Kickstart only configures a fresh FusionAuth database. It is not intended to
modify an existing installation every time the containers start.

Before recreating anything, stop the development stack:

```bash
docker compose \
  -f docker-compose.dev.yml \
  down
```

Only delete development data when losing all local users and FusionAuth
configuration is acceptable.

Do not delete production volumes.

After removing the disposable development database, generate the files and
start the stack again:

```bash
./scripts/auth-secrets.sh ensure
./scripts/dev-up.sh
```

## Production configuration

The temporary production application origin is:

```text
https://<application-domain>
```

FusionAuth should use a separate HTTPS subdomain pointing to the same server,
for example:

```text
https://<fusionauth-domain>
```

The corresponding production configuration is:

```env
FRONTEND_URL=https://<application-domain>
FUSIONAUTH_PUBLIC_URL=https://<fusionauth-domain>
FUSIONAUTH_REDIRECT_URI=https://<application-domain>/auth/callback
```

The reverse proxy should forward:

```text
https://<application-domain>
  -> 127.0.0.1:8080

https://<fusionauth-domain>
  -> 127.0.0.1:9011
```

FusionAuth should remain bound to the loopback interface:

```yaml
ports:
  - "127.0.0.1:9011:9011"
```

The Node authentication service does not need a public port. Requests reach it
through the frontend Nginx `/auth/*` allowlist.

## Production database separation

FusionAuth and OSRS Market may use the same PostgreSQL server, but they use
different databases and database users.

The authentication service stores application sessions in the OSRS Market
database:

```yaml
DATABASE_URL: postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
```

FusionAuth uses its own database through JDBC:

```yaml
DATABASE_URL: jdbc:postgresql://postgres:5432/${FUSIONAUTH_DATABASE_NAME}
```

Application code must never read or modify FusionAuth tables directly.

## Production deployment

Build the services:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  build
```

Start or recreate them:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  up -d
```

Check their status:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  ps
```

Check authentication logs:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  logs \
  --tail=200 \
  fusionauth \
  auth
```

## Production security checklist

Before allowing public registrations:

- Use HTTPS for both the application and FusionAuth domains.
- Confirm the tenant issuer matches the public FusionAuth URL.
- Register only the exact production callback and logout URLs.
- Use Authorization Code with PKCE.
- Enable only the required OAuth grants.
- Enable multi-factor authentication for administrators.
- Use a unique administrator password.
- Configure SMTP before enabling verification or password reset.
- Back up the OSRS Market and FusionAuth databases.
- Do not commit `.env.production` or `.secrets/`.
- Test login, refresh, logout, and expired-session handling.
- Review FusionAuth release notes before upgrading its Docker image.

## Secret rotation

Changing `TOKEN_ENCRYPTION_KEY` makes previously encrypted FusionAuth tokens
unreadable and logs out existing application sessions.

Changing the FusionAuth OAuth client secret requires updating both FusionAuth
and the authentication service with the same value.

Secret rotation does not delete users or portfolio data, but active sessions may
be invalidated.

Back up the current production secrets before rotating them.

## Useful checks

Validate the shell script:

```bash
bash -n scripts/auth-secrets.sh
```

Validate the Kickstart renderer:

```bash
python3 \
  -m py_compile \
  scripts/render-kickstart.py
```

Confirm that generated files are ignored:

```bash
git check-ignore -v \
  .secrets/auth-service.env \
  .secrets/fusionauth-bootstrap.env \
  .secrets/kickstart.dev.json
```

Confirm that no generated authentication files are staged:

```bash
git status --short
```