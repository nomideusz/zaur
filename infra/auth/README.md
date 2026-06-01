# ZAUR identity (Logto + passkeys)

[Webmail](https://webmail.zaur.app) sign-in uses the **email + password** from registration (LLDAP/Stalwart). **Logto** provides optional passkey/OIDC sign-in. Stalwart validates Bearer tokens for OIDC sessions; LLDAP remains the directory for mailbox passwords and app passwords (Thunderbird / Apple Mail).

## Architecture

```
Browser → webmail login form (email + password → LLDAP/Stalwart JMAP)
Optional: webmail (PKCE) → Logto @ auth.zaur.app (passkeys)
webmail session → encrypted cookie (password or OIDC refresh token)
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
3. **Sign-in experience** → enable **Passkey sign-in** (optional; users can add passkeys later)
4. **Multi-factor authentication** → passkeys optional (`NoPrompt` policy recommended)
5. Set sign-in identifier to **Email address** (password), **not username** — Logto’s internal username field cannot contain `@`; register creates users with `primaryEmail` only (e.g. `you@zaur.app`)

Or apply the same settings via Management API (recommended after redeploys):

```bash
export LOGTO_ENDPOINT=https://auth.zaur.app
export LOGTO_M2M_CLIENT_ID=<register-m2m-app-id>
export LOGTO_M2M_CLIENT_SECRET=<register-m2m-app-secret>
export LOGTO_API_RESOURCE=https://default.logto.app/api
./infra/auth/configure-logto-signin.sh
```

### Custom sign-in UI (BYUI)

To replace Logto’s default sign-in page with a ZAUR-branded experience:

1. Run `./infra/auth/configure-logto-signin.sh` for email sign-in + colors (works on OSS today).
2. Optional: build the official [Logto experience](https://github.com/logto-io/logto/tree/master/packages/experience) package and deploy with `./infra/auth/deploy-logto-byui.sh`.

**OSS note:** BYUI upload requires object storage configured in Logto (`storage.not_configured` without it). Until then, branding via `configure-logto-signin.sh` is the supported path on self-hosted Logto.

After registration, users are redirected to webmail sign-in with the same **full email address** and password (no Logto redirect).

## 2. Webmail OIDC application

In Logto Console → **Applications** → Create application:

| Field | Value |
|-------|-------|
| Type | **Traditional web** (recommended — token exchange runs server-side) |
| Redirect URI | `https://webmail.zaur.app/oauth/callback` |
| Post sign-out redirect | `https://webmail.zaur.app` |

Note the **App ID** and **App Secret**. Traditional web apps require the secret at the token endpoint (`invalid_client` without it).

**Do not set `OAUTH_RESOURCE`** for Stalwart. Logto API-resource JWTs (ES384) fail Stalwart validation and are rejected by `/oidc/me`. Use **opaque userinfo tokens** instead — Stalwart calls Logto’s userinfo endpoint to resolve `email`.

Discovery: `https://auth.zaur.app/oidc/.well-known/openid-configuration`

## 3. Webmail env (CapRover `webmail` app)

```env
OAUTH_ENABLED=true
OAUTH_ISSUER_URL=https://auth.zaur.app/oidc
OAUTH_CLIENT_ID=<logto-app-id>
OAUTH_CLIENT_SECRET=<logto-app-secret>
OAUTH_SCOPES=openid profile email offline_access
# Do NOT set OAUTH_RESOURCE — Stalwart needs opaque userinfo tokens from Logto
# OAUTH_PASSWORD_FALLBACK=false  # optional: passkey-only (default allows email+password)
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
| Authentication → Directory | **Logto OIDC** (Bearer / passkey tokens) |
| Every mail domain → Directory | **LLDAP** (password — must be explicit, never unset) |

After changing directories, **restart the mail service** (`docker service update --force srv-captain--mail`) so running Stalwart reloads config.

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
REGISTER_PUBLIC_URL=https://register.zaur.app
```

Redeploy register after setting vars. Registration creates users in this order: **LLDAP → Logto → Stalwart**. If Logto vars are unset, signup still works (mailbox only) but webmail passkey login will fail until a Logto user exists.

Logto users are created with **email + password only** (no internal username). The user’s **personal / recovery email** from the magic link is stored in Logto `customData.recoveryEmail` for future account recovery.

### Invitation-only registration (magic links)

When Logto M2M is configured, registration requires a **Logto one-time token** magic link:

1. Admin → `register.zaur.app/admin` → enter email → **Send invitation**
2. With SMTP configured (`INVITE_SMTP_*`), the link is emailed automatically; otherwise copy the link from the success message
3. User opens the link, picks username + domain + password
4. Success page auto-redirects to webmail sign-in (same email + password)

CLI:

```bash
node apps/register/scripts/send-invitation.js user@gmail.com --hours 72
```

Set `REGISTRATION_OPEN=true` on the register app to bypass invitations in local dev.

## 7. Forgot password (webmail)

Webmail links to `/forgot-password`. The register app handles reset tokens and email delivery (same `INVITE_SMTP_*` transport as invitations). A reset updates **both LLDAP and Logto** so webmail and OIDC stay in sync.

Flow:

1. User enters mailbox address on webmail → `POST /api/auth/forgot-password` (proxied to register)
2. Register looks up the account in LLDAP and resolves a **recovery email** (Logto `customData.recoveryEmail`, invitations audit, or mailbox address as fallback)
3. Email contains a link to `webmail.zaur.app/forgot-password/reset?token=…&email=…`
4. New password is written to LLDAP + Logto

Register env (CapRover `register` app):

```env
WEBMAIL_URL=https://webmail.zaur.app
# INVITE_SMTP_* (required for reset emails)
# PASSWORD_RESET_TOKENS_PATH=/app/data/password_reset_tokens.json
# PASSKEY_SETUP_TOKEN_EXPIRES_SEC=900
```

After registration, the success page links to **webmail** `/setup-passkey/start` with a short-lived Logto one-time token and `login_hint`. Logto verifies the token automatically (no email re-entry) and prompts for passkey creation on its sign-in experience, then returns to webmail via OAuth callback.

Webmail env:

```env
REGISTER_API_URL=https://register.zaur.app
```

## 8. Migrate existing users

For each LLDAP user:

1. Create matching user in Logto (same email)
2. User visits webmail → **Continue with passkey** → enroll device
3. LLDAP password stays for IMAP until they create a Stalwart **app password**

## Local development

Without Logto, leave `OAUTH_ENABLED=false` — webmail uses the direct password form (LLDAP/Stalwart basic auth).
