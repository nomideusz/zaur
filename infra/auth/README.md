# ZAUR identity (Zitadel + passkeys)

Passkey-first sign-in for [webmail](https://webmail.zaur.app) uses **Zitadel** as the OIDC provider. Stalwart validates access tokens for JMAP; LLDAP remains the directory for mailbox passwords and app passwords (Thunderbird / Apple Mail).

## Architecture

```
Browser → webmail (PKCE) → Zitadel @ auth.zaur.app (passkeys)
webmail session → OIDC refresh token (encrypted, no mailbox password)
webmail → Stalwart JMAP (Bearer access token)
Thunderbird → Stalwart app password (later / settings UI)
```

## 1. Deploy Zitadel on CapRover

Use the upstream compose pack as reference: [Zitadel Docker Compose docs](https://zitadel.com/docs/self-hosting/deploy/compose).

Recommended CapRover apps:

| App | Image | Notes |
|-----|-------|-------|
| `zitadel-db` | `postgres:17-alpine` | Persistent volume on `/var/lib/postgresql/data` |
| `zitadel` | `ghcr.io/zitadel/zitadel:latest` | HTTP on 8080 behind CapRover HTTPS |

Minimum env (adjust for production):

```env
ZITADEL_MASTERKEY=<32-character-secret>
ZITADEL_EXTERNALDOMAIN=auth.zaur.app
ZITADEL_EXTERNALSECURE=true
ZITADEL_TLS_ENABLED=false
ZITADEL_DATABASE_POSTGRES_HOST=srv-captain--zitadel-db
ZITADEL_DATABASE_POSTGRES_PORT=5432
ZITADEL_DATABASE_POSTGRES_DATABASE=zitadel
ZITADEL_DATABASE_POSTGRES_USER_USERNAME=zitadel
ZITADEL_DATABASE_POSTGRES_USER_PASSWORD=<db-password>
ZITADEL_DATABASE_POSTGRES_USER_SSL_MODE=disable
```

Point CapRover **zitadel** app to `https://auth.zaur.app`.

## 2. Zitadel console setup

1. Create project **ZAUR Mail**
2. Add application **Webmail**:
   - Type: **User Agent** (PKCE / public client)
   - Redirect URI: `https://webmail.zaur.app/oauth/callback`
   - Grant types: Authorization Code, Refresh Token
   - Scopes: `openid`, `profile`, `email`, `offline_access`
3. **Login policy** → enable passkeys, set **passkey allowed** / prefer passkey where available
4. Note the **client ID** (e.g. `webmail`)

## 3. Webmail env (CapRover `webmail` app)

```env
OAUTH_ENABLED=true
OAUTH_ISSUER_URL=https://auth.zaur.app
OAUTH_CLIENT_ID=<zitadel-client-id>
# OAUTH_CLIENT_SECRET=   # only if using confidential client
OAUTH_SCOPES=openid profile email offline_access
# OAUTH_PASSWORD_FALLBACK=true   # dev only: local LDAP password form
```

Redeploy webmail after setting vars.

## 4. Stalwart OIDC directory

In Stalwart → Settings → Authentication → Directories → Create:

| Field | Value |
|-------|-------|
| Type | OpenID Connect |
| Issuer URL | `https://auth.zaur.app` |
| (or Userinfo URL) | From Zitadel discovery `userinfo_endpoint` |

Pre-create Stalwart accounts for each mailbox (register already does this). Tokens from Zitadel must map `email` / `preferred_username` to the mailbox address.

See also [Stalwart OIDC docs](https://stalw.art/docs/auth/backend/oidc/).

## 5. Migrate existing users

For each LLDAP user:

1. Create matching user in Zitadel (same email)
2. User visits webmail → **Continue with passkey** → enroll device
3. LLDAP password stays for IMAP until they create a Stalwart **app password**

## 6. Thunderbird / Apple Mail (phase 2)

Not in scope for initial rollout. Users continue with mailbox password or app passwords from Stalwart self-service until webmail exposes “Create app password” in settings.

## Local development

Without Zitadel, leave `OAUTH_ENABLED=false` — webmail uses the direct password form (LLDAP/Stalwart basic auth).
