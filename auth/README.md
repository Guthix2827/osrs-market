# FusionAuth

OSRS Market uses the FusionAuth Community Edition container for identity and
OAuth 2.0/OpenID Connect. FusionAuth owns credentials and authentication state;
the OSRS Market database will store only the FusionAuth user ID and application
profile data.

## Local development

Start the normal development stack:

```bash
docker compose -f docker-compose.dev.yml up -d
```

FusionAuth will be available at <http://localhost:9011>. On a new database
volume, `kickstart/kickstart.dev.json` creates the local OSRS Market application
and a development administrator:

```text
Email: admin@osrs-market.local
Password: development-only-change-me
```

These credentials and the Kickstart API key are intentionally limited to local
development. Never reuse them in production.

Kickstart runs only against an untouched FusionAuth database. To recreate only
the local FusionAuth database, use the FusionAuth admin/API or recreate the
entire disposable development PostgreSQL volume. Do not remove production
volumes.

## Production

Copy the FusionAuth variables from `.env.example` into `.env.production` and
replace every placeholder with a distinct random value. Production does not
mount or run the development Kickstart file.

Start FusionAuth after PostgreSQL is healthy:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  up -d fusionauth
```

The service binds to `127.0.0.1:9011` by default. Publish it through the HTTPS
reverse proxy as a dedicated origin such as `https://auth.example.com`; do not
expose port 9011 directly to the internet.

Complete the initial production setup in the FusionAuth admin interface, then:

- Set the tenant issuer to the final HTTPS authentication URL.
- Register exact production callback, origin, and logout URLs.
- Require Authorization Code with PKCE.
- Enable only Authorization Code and Refresh Token grants.
- Generate production signing keys and configure key rotation.
- Configure SMTP before enabling email verification or password reset.
- Enable multi-factor authentication for administrators.
- Store the emergency API key outside Git.
- Back up both the `fusionauth` database and signing/configuration material.

FusionAuth and OSRS Market share the PostgreSQL server to reduce resource use,
but use different databases and database users. Application code must never
read or modify FusionAuth tables directly.

Before changing `FUSIONAUTH_VERSION`, back up the FusionAuth database, review
the release notes, and test the upgrade in development.
