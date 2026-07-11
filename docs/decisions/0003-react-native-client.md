# ADR-0003: React Native native client, direct Stalwart auth

## Status

Accepted (supersedes [ADR-0002](0002-capacitor-shell.md) as the product direction; the
Capacitor shell keeps shipping until the native app reaches feature parity)

## Date

2026-07-11

## Context

ADR-0002's WebView shell ships today but is not a native experience. ADR-0001 planned Kotlin
Multiplatform, which means rewriting the JMAP client, sync engine, and mail domain logic in
Kotlin plus two native UI codebases — for a solo developer on an all-TypeScript stack.

A reuse audit (2026-07-11) found roughly half of webmail's non-UI logic is portable pure TS:
`JMAPClient` already has a direct-Bearer mode (used server-side today), the JMAP mappers/types/
email-build/address-parsing modules have zero browser coupling, and Stalwart's auth is a JSON
PKCE flow (`POST {issuer}/api/auth` → `clientCode` → standard token endpoint) that supports
public clients (no secret), refresh-token rotation, and inline TOTP — no browser redirect
required. Discovery at `mail.zaur.app/.well-known/oauth-authorization-server` confirms S256
PKCE and `token_endpoint_auth_methods_supported: none` live.

## Decision

Build `apps/native` with **React Native + Expo (TypeScript)**. The app talks **directly to
Stalwart** (`mail.zaur.app`): OAuth PKCE via the `/api/auth` JSON flow with a native login UI
(email + password + TOTP step), refresh tokens in Keychain/Keystore via `expo-secure-store`,
and JMAP over `JMAPClient` in direct-Bearer mode. No webmail server dependency, no cookies,
no WebView shell.

Shared protocol/domain code moves to **`packages/mail-core`** (pure TS, no Svelte/DOM/Node
imports; crypto and unauthorized-handling injected), consumed by both webmail (via thin
re-export shims, zero behavior change) and the native app.

Signup and account recovery stay on the web (`register.zaur.app`, opened in the system
browser) — they are rare, server-trusting flows not worth reimplementing natively.

## Consequences

- KMP (ADR-0001) is retired as the upgrade path; this replaces it.
- Milestone 1 (this ADR's implementation): auth, mailbox list, inbox, thread reader
  (sanitized HTML in a WebView using webmail's frame CSS), compose/send. In-memory cache only.
- Milestone 2: offline store (SQLite; reuse the RxDB schema shapes and sync-cursor algorithm
  from webmail's `sync/engine.ts`) and outbox.
- Milestone 3: push. The existing FCM pipeline stores subscriptions per **webmail session**;
  a native direct-JMAP client has none. Extend webmail's `/api/push/subscribe` to accept a
  Stalwart Bearer token (validated via introspection), keyed by account — small change, reuses
  push-watcher/fcm.ts unchanged. Until then: foreground JMAP EventSource/polling only.
- iOS builds still need macOS + Apple developer account; Expo/EAS covers both platforms from
  one codebase. Android builds locally (SDK at ~/Android/Sdk).
- The Capacitor shell (`apps/mobile`) is deprecated but kept until milestone 2 lands; its
  store identity (`app.zaur.mail`, the release keystore) carries over to the native app.
