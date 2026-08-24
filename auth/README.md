# Authentication

OSRS Market uses FusionAuth Community Edition for user identity and a small
Node.js authentication service for the OAuth flow and application sessions.

The browser never stores FusionAuth access or refresh tokens. The authentication
service encrypts them before storing them in PostgreSQL and gives the browser an
opaque, HTTP-only session cookie.

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

FusionAuth owns user credentials and identity. The Node.js service owns the
application session and OAuth flow.

The C++ backend remains responsible for market functionality. Protected
features can validate the authenticated session through the authentication
service without adding user-management logic to the C++ backend.

## Requirements

Authentication setup requires:

- Docker with Docker Compose
- Bash
- OpenSSL
- Python 3

Make the included scripts executable:

```bash
chmod +x \
  scripts/auth-secrets.sh \
  scripts/production-auth-secrets.sh \
  scripts/dev-up.sh \
  scripts/prod-up.sh
```

## Generated secret files

Generated authentication files are stored under:

```text
.secrets/
```

This directory is excluded from Git and Docker build contexts. Never commit,
publish, or copy its contents into a Docker image.

Development generates:

```text
.secrets/auth-service.env
.secrets/fusionauth-bootstrap.env
.secrets/kickstart.dev.json
```

Production generates:

```text
.secrets/production.env
.secrets/kickstart.prod.json
```

The production files must be backed up securely. Losing them may prevent the
authentication service from decrypting stored tokens or connecting to the
existing FusionAuth installation.

# Local development

## Start a fresh development environment

Generate or validate the development authentication configuration:

```bash
./scripts/auth-secrets.sh ensure
```

The command is idempotent. Running it again validates and preserves existing
values.

Start the development stack:

```bash
./scripts/dev-up.sh
```

This performs secret generation before starting:

```text
postgres
fusionauth
auth
backend
frontend
```

Alternatively, run the commands manually:

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

## Development administrator

The generated FusionAuth administrator email and password are stored in:

```text
.secrets/fusionauth-bootstrap.env
```

Show the administrator email:

```bash
grep '^FUSIONAUTH_ADMIN_EMAIL=' \
  .secrets/fusionauth-bootstrap.env
```

Show the generated administrator password:

```bash
grep '^FUSIONAUTH_ADMIN_PASSWORD=' \
  .secrets/fusionauth-bootstrap.env
```

Treat the password as a local secret even though it is used only for
development.

## Existing local FusionAuth installation

If the local FusionAuth database already exists, Kickstart will not replace its
application credentials.

Save the existing FusionAuth application ID and client secret:

```bash
./scripts/auth-secrets.sh set-client-secret
```

The application ID is shown as `Client Id` in the FusionAuth application OAuth
settings.

The client secret is shown separately in the same OAuth configuration. The
client secret is not the application ID or an API key.

After updating the local secret files, recreate the authentication service:

```bash
docker compose \
  -f docker-compose.dev.yml \
  up -d \
  --force-recreate \
  auth
```

## Recreating local FusionAuth

Kickstart provisions FusionAuth only when it starts with a fresh database. It is
not intended to modify an established installation on every container restart.

To stop development without deleting data:

```bash
docker compose \
  -f docker-compose.dev.yml \
  down
```

To delete all local Docker Compose volumes and recreate the complete
development database:

```bash
docker compose \
  -f docker-compose.dev.yml \
  down \
  -v
```

Warning: `down -v` deletes all local PostgreSQL, FusionAuth, session, and market
data stored in this development Compose project.

It must never be used for production.

After deleting the disposable development volumes:

```bash
./scripts/auth-secrets.sh ensure
./scripts/dev-up.sh
```

## Development verification

Check the containers:

```bash
docker compose \
  -f docker-compose.dev.yml \
  ps
```

Check authentication logs:

```bash
docker compose \
  -f docker-compose.dev.yml \
  logs \
  --tail=200 \
  fusionauth \
  auth
```

Then verify the complete flow:

1. Open the frontend.
2. Select `Login`.
3. Register or sign in through FusionAuth.
4. Confirm that the browser returns to the original frontend route.
5. Refresh the page and confirm that the session remains active.
6. Log out and confirm that the session cookie is cleared.

# Production

## Production environment file

Create the production environment file on the server:

```bash
cp \
  .env.example \
  .env.production

chmod \
  600 \
  .env.production
```

`.env.production` is deployment-specific and must remain outside Git.

Example:

```env
# Main PostgreSQL database
POSTGRES_DB=osrs_market
POSTGRES_USER=osrs_market
POSTGRES_PASSWORD=replace-with-the-existing-production-password

# FusionAuth runtime
FUSIONAUTH_VERSION=1.69.0
FUSIONAUTH_PORT=9011
FUSIONAUTH_APP_MEMORY=512M

# FusionAuth database
FUSIONAUTH_DATABASE_NAME=fusionauth
FUSIONAUTH_DATABASE_USER=fusionauth

# Public URLs
FRONTEND_URL=https://<application-domain>
FUSIONAUTH_PUBLIC_URL=https://<fusionauth-domain>
FUSIONAUTH_REDIRECT_URI=https://<application-domain>/auth/callback
FUSIONAUTH_LOGOUT_URL=https://<application-domain>/

# Initial FusionAuth administrator
FUSIONAUTH_ADMIN_EMAIL=<administrator-email>
```

Replace every placeholder before deployment.

On an existing OSRS Market installation, `POSTGRES_PASSWORD` must contain the
current production PostgreSQL password. Generating a different value in the
environment file does not change PostgreSQL's stored password and would break
existing database connections.

## Production domains and reverse proxy

The application and FusionAuth should use separate HTTPS domains:

```text
https://<application-domain>
https://<fusionauth-domain>
```

The reverse proxy should forward them to their loopback-bound services:

```text
<application-domain>
  -> 127.0.0.1:8080

<fusionauth-domain>
  -> 127.0.0.1:9011
```

FusionAuth remains bound to the host loopback interface:

```yaml
ports:
  - "127.0.0.1:9011:9011"
```

The Node.js authentication service does not require a public port. Browser
requests reach it through the frontend Nginx `/auth/*` allowlist.

Configure DNS, HTTPS certificates, and both reverse-proxy hosts before testing
the production login flow.

## Generate production authentication secrets

Generate the production authentication configuration:

```bash
./scripts/production-auth-secrets.sh
```

On its first run, the script creates:

```text
.secrets/production.env
.secrets/kickstart.prod.json
```

`production.env` contains:

```text
FUSIONAUTH_DATABASE_PASSWORD
FUSIONAUTH_APPLICATION_ID
FUSIONAUTH_CLIENT_SECRET
AUTH_TOKEN_ENCRYPTION_KEY
FUSIONAUTH_API_KEY
FUSIONAUTH_TENANT_ID
FUSIONAUTH_ADMIN_PASSWORD
```

Later runs preserve and validate the existing values. If the file exists but is
incomplete or malformed, the script stops instead of silently replacing it.

The rendered production Kickstart file provisions:

- the FusionAuth tenant;
- the tenant issuer;
- the signing key;
- the OSRS Market application;
- the OAuth client;
- exact redirect, origin, and logout URLs;
- the initial administrator;
- the bootstrap API key.

Kickstart runs only against a fresh FusionAuth database.

## Validate production configuration

Validate the scripts:

```bash
bash -n \
  scripts/auth-secrets.sh \
  scripts/production-auth-secrets.sh \
  scripts/dev-up.sh \
  scripts/prod-up.sh
```

Validate the renderer:

```bash
python3 \
  -m py_compile \
  scripts/render-kickstart.py
```

Validate the generated Kickstart JSON:

```bash
python3 \
  -m json.tool \
  .secrets/kickstart.prod.json \
  >/dev/null
```

Confirm that production files are ignored:

```bash
git check-ignore -v \
  .env.production \
  .secrets/production.env \
  .secrets/kickstart.prod.json
```

Resolve the production Compose configuration without starting containers:

```bash
docker compose \
  --env-file .env.production \
  --env-file .secrets/production.env \
  -f docker-compose.prod.yml \
  config \
  --quiet
```

The order of the environment files matters. Generated authentication values are
provided by `.secrets/production.env`.

## Back up production before deployment

Before adding or upgrading authentication, back up the existing OSRS Market
database.

Also back up these files after generating them:

```text
.env.production
.secrets/production.env
.secrets/kickstart.prod.json
```

Store the backup outside the repository and restrict access to it.

Do not delete production Docker volumes to rerun Kickstart.

## First production deployment

For the first deployment, start PostgreSQL and FusionAuth separately so the
bootstrap can be inspected before starting the remaining services.

Start PostgreSQL and FusionAuth:

```bash
docker compose \
  --env-file .env.production \
  --env-file .secrets/production.env \
  -f docker-compose.prod.yml \
  up \
  -d \
  postgres \
  fusionauth
```

Follow the FusionAuth bootstrap logs:

```bash
docker compose \
  --env-file .env.production \
  --env-file .secrets/production.env \
  -f docker-compose.prod.yml \
  logs \
  -f \
  fusionauth
```

The first bootstrap should complete without errors such as:

```text
InvalidTenantIdException
duplicate key
Status [400]
```

Check container health:

```bash
docker compose \
  --env-file .env.production \
  --env-file .secrets/production.env \
  -f docker-compose.prod.yml \
  ps
```

After FusionAuth is healthy, start the remaining services:

```bash
docker compose \
  --env-file .env.production \
  --env-file .secrets/production.env \
  -f docker-compose.prod.yml \
  up \
  -d \
  auth \
  backend \
  frontend
```

Check all services:

```bash
docker compose \
  --env-file .env.production \
  --env-file .secrets/production.env \
  -f docker-compose.prod.yml \
  ps
```

Inspect authentication logs:

```bash
docker compose \
  --env-file .env.production \
  --env-file .secrets/production.env \
  -f docker-compose.prod.yml \
  logs \
  --tail=200 \
  fusionauth \
  auth
```

## Later production deployments

After the initial FusionAuth bootstrap has completed successfully, deploy
updates with:

```bash
./scripts/prod-up.sh
```

The script:

1. validates or creates the production authentication secrets;
2. renders the production Kickstart file;
3. loads `.env.production`;
4. loads `.secrets/production.env`;
5. builds and recreates the production services.

Existing production secrets are preserved.

## Production verification

Verify the public authentication flow:

1. Open the application through its HTTPS domain.
2. Select `Login`.
3. Confirm redirection to `FUSIONAUTH_PUBLIC_URL`.
4. Register or sign in.
5. Confirm redirection to `FUSIONAUTH_REDIRECT_URI`.
6. Confirm that the user appears authenticated.
7. Refresh the application and confirm that the session remains active.
8. Log out and confirm that the session is removed.
9. Attempt to revisit a protected endpoint after logout.
10. Check the auth and FusionAuth logs for errors.

## Database separation

FusionAuth and OSRS Market can use the same PostgreSQL server, but they use
different databases and database users.

The Node.js authentication service stores application sessions in the main OSRS
Market database:

```yaml
DATABASE_URL: postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
```

FusionAuth uses its own database through JDBC:

```yaml
DATABASE_URL: jdbc:postgresql://postgres:5432/${FUSIONAUTH_DATABASE_NAME}
```

Application code must never read or modify FusionAuth tables directly.

## Production security checklist

Before allowing public registration:

- Use HTTPS for the application and FusionAuth domains.
- Confirm that the tenant issuer exactly matches `FUSIONAUTH_PUBLIC_URL`.
- Register only exact production callback, origin, and logout URLs.
- Require Authorization Code with PKCE.
- Enable only the required OAuth grants.
- Enable multi-factor authentication for administrators.
- Replace or disable unnecessary bootstrap API keys.
- Configure SMTP before enabling password reset or email verification.
- Back up both PostgreSQL databases.
- Back up `.env.production` and `.secrets/` securely.
- Never commit generated secrets.
- Test login, refresh, logout, and expired-session handling.
- Review FusionAuth release notes before changing `FUSIONAUTH_VERSION`.

## Secret rotation

Changing `AUTH_TOKEN_ENCRYPTION_KEY` makes previously encrypted tokens
unreadable and logs out active application sessions.

Changing the FusionAuth client secret requires updating both FusionAuth and the
Node.js authentication service with the same value.

Changing the application ID or tenant ID requires corresponding FusionAuth
configuration changes and should not be treated as ordinary secret rotation.

Changing database passwords requires changing the password inside PostgreSQL as
well as updating the environment file.

Secret rotation does not delete users or application data, but it may invalidate
active sessions.

Back up the current production configuration before rotating any value.

## Git safety checks

Confirm that generated files are not staged:

```bash
git status --short
```

Review staged filenames:

```bash
git diff \
  --cached \
  --name-only
```

The following must never appear:

```text
.env.production
.secrets/auth-service.env
.secrets/fusionauth-bootstrap.env
.secrets/kickstart.dev.json
.secrets/production.env
.secrets/kickstart.prod.json
```