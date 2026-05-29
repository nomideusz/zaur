# ZAUR identity (Logto + passkeys)

Passkey-first sign-in for [webmail](https://webmail.zaur.app) uses **Logto** as the OIDC provider. Stalwart validates access tokens for JMAP; LLDAP remains the directory for mailbox passwords and app passwords (Thunderbird / Apple Mail).

## Architecture

```
Browser → webmail (PKCE) → Logto @ auth.zaur.app (passkeys)
webmail session → OIDC refresh token (encrypted, no mailbox password)
webmail → Stalwart JMAP (Bearer access token)
Thunderbird → Stalwart app password (later / settings UI)
```

Logto runs as a single container (OIDC on port 3001, admin console on 3002). CapRover exposes:

| App | URL | Purpose |
|-----|-----|---------|
| `auth` | `https://auth.zaur.app` | Logto OIDC + sign-in (do **not** open `/` or `/console` here) |
| `auth-admin` | `https://auth-admin.zaur.app` | Admin console — **open `/console/welcome` here** |
| `auth-db` | internal | Postgres 17 |

## Deploy on CapRover

```bash
./infra/deploy/reset-logto.sh    # wipe broken state (optional)
./infra/deploy/deploy-logto.sh   # provision + deploy
```

Secrets are written to `/captain/data/zaur-auth-secrets.json` on the server.

Reference: [Logto OSS deployment](https://docs.logto.io/logto-oss/deployment-and-configuration)

## Troubleshooting: `logtoSsr is not defined` / CSP inline script blocked

Logto’s admin app selects the console UI from `Host` + `X-Forwarded-Proto`. CapRover terminates TLS before `auth-admin` nginx, so the proxy must send `X-Forwarded-Proto: https` (not `$scheme`, which is `http` on the internal hop). Without it, port 3002 serves the sign-in experience SPA and `/console/welcome` shows a client-side **404 Not Found**.

Use **https://auth-admin.zaur.app/** or **/console/welcome**. Hard-refresh after redeploy.

If the console shows “Unauthorized. Please check credentials and its scope” on pages like Sign-in experience → Branding, upgrade Logto to **1.40+** (includes [PR #8869](https://github.com/logto-io/logto/pull/8869): OSS admin JWT validation reads signing keys from the DB instead of fetching JWKS over HTTP from `ADMIN_ENDPOINT`). Split-domain setups (`auth` + `auth-admin`) need this fix.

Stale Zitadel CapRover apps (`auth-login`, `zitadel-db`) are removed by `caprover-provision.js`. Keep the `auth` app — it is Logto, not Zitadel.

## 1. First-time admin setup

1. Open **https://auth-admin.zaur.app/console/welcome**
2. Create the admin account (OSS allows one admin on first launch)
3. **Sign-in experience** → enable **Passkey sign-in**
4. **Multi-factor authentication** → enable **Passkeys (WebAuthn)** if you want MFA as well

## 2. Webmail OIDC application

In Logto Console → **Applications** → Create application:

| Field | Value |
|-------|-------|
| Type | **Traditional web** (recommended — token exchange runs server-side) |
| Redirect URI | `https://webmail.zaur.app/oauth/callback` |
| Post sign-out redirect | `https://webmail.zaur.app` |

Note the **App ID** and **App Secret**. Traditional web apps require the secret at the token endpoint (`invalid_client` without it).  
Alternatively use a **Single-page app** (PKCE only, no secret) if you prefer a public client.

Logto issues **opaque** access tokens when no API resource is requested; Stalwart cannot use those for JMAP Bearer auth. Create an API resource in Logto Console → **API resources**:

| Field | Value |
|-------|-------|
| Name | Stalwart JMAP |
| API identifier | `https://mail.zaur.app/api` |

Set webmail `OAUTH_RESOURCE=https://mail.zaur.app/api` so tokens are JWTs with an `email` claim. Set Stalwart OIDC **Required audience** to the same URI (`apply-stalwart-logto.sh` does this when `LOGTO_AUDIENCE` is set).

Discovery: `https://auth.zaur.app/oidc/.well-known/openid-configuration`

## 3. Webmail env (CapRover `webmail` app)

```env
OAUTH_ENABLED=true
OAUTH_ISSUER_URL=https://auth.zaur.app/oidc
OAUTH_CLIENT_ID=<logto-app-id>
OAUTH_CLIENT_SECRET=<logto-app-secret>
OAUTH_RESOURCE=https://mail.zaur.app/api
OAUTH_SCOPES=openid profile email offline_access
# OAUTH_PASSWORD_FALLBACK=true   # dev only: local LDAP password form
```

Redeploy webmail after setting vars.

## 4. Stalwart OIDC directory

Run on the CapRover host (or use the WebUI with the same values):

```bash
./infra/mail/apply-stalwart-logto.sh
```

| Field | Value |
|-------|-------|
| Type | OpenID Connect |
| Issuer URL | `https://auth.zaur.app/oidc` |
| Username claim | `email` |
| Required audience | *(unset — see below)* |
| Domain `zaur.app` → Directory | Logto OIDC |
| Authentication → Directory | **LLDAP** (unchanged) |

Logto’s userinfo endpoint is `https://auth.zaur.app/oidc/me` (from discovery). Opaque access tokens (no API resource in the OAuth request) are validated via userinfo; JWT tokens need a matching `aud` if you set **Required audience**.

Pre-create Stalwart accounts for each mailbox (register already does this). Logto users must share the same **email** claim.

See [Stalwart OIDC docs](https://stalw.art/docs/auth/backend/oidc/) and [infra/mail/README.md](../mail/README.md).

## 5. Register → Logto

On signup, `apps/register` creates a matching Logto user via the [Management API](https://docs.logto.io/docs/references/api/).

### M2M application (register service)

1. Logto Console → **Applications** → **Machine-to-machine**
2. Name it `register` (or similar)
3. Assign the **Logto Management API access** role (or a custom role with `users:write`)
4. Copy **App ID** and **App Secret**

CapRover `register` app env:

```env
LOGTO_ENDPOINT=https://auth.zaur.app
LOGTO_API_RESOURCE=https://default.logto.app/api
LOGTO_M2M_CLIENT_ID=<m2m-app-id>
LOGTO_M2M_CLIENT_SECRET=<m2m-app-secret>
```

Redeploy register after setting vars. Registration creates users in this order: **LLDAP → Logto → Stalwart**. If Logto vars are unset, signup still works (mailbox only) but webmail passkey login will fail until a Logto user exists.

## 6. Migrate existing users

For each LLDAP user:

1. Create matching user in Logto (same email)
2. User visits webmail → **Continue with passkey** → enroll device
3. LLDAP password stays for IMAP until they create a Stalwart **app password**

## Local development

Without Logto, leave `OAUTH_ENABLED=false` — webmail uses the direct password form (LLDAP/Stalwart basic auth).
