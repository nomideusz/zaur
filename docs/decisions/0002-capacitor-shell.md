# ADR-0002: Capacitor shell around the existing webmail

## Status

Accepted (supersedes [ADR-0001](0001-native-mobile-architecture.md))

## Date

2026-07-11

## Context

ADR-0001 designed Kotlin Multiplatform native clients: architecturally sound, but it means
maintaining three presentation codebases against a webmail whose protocol/sync behavior is still
evolving, plus iOS toolchain overhead. Before paying that, we test whether a wrapped web client
already delivers what users actually notice as "native": store presence, push notifications,
share-sheet integration, offline, secure storage.

## Decision

Ship `apps/mobile`: a Capacitor shell that loads the live webmail (`https://mail.zaur.app`) in a
native WebView via `server.url`. No web assets are bundled — webmail is SSR (adapter-node) and its
auth/JMAP proxying stays server-side, unchanged. Native capabilities (push, Keychain/Keystore,
share) are added incrementally as Capacitor plugins, with `Capacitor.isNativePlatform()` guards in
webmail where needed.

ADR-0001's KMP architecture is superseded, not deleted: it remains the documented upgrade path if
WebView feel (list scrolling, background sync) or App Store review (guideline 4.2, remote-URL
thin-client risk) proves inadequate. Nothing in the shell approach blocks that later.

## Consequences

- One product codebase; the shell is config plus generated platform projects.
- Android builds locally (SDK + JDK, no Studio needed); iOS requires a macOS CI runner and Apple
  developer account before it ships.
- Offline cold start shows `www/offline.html` (remote URL unreachable); warm offline relies on the
  PWA service worker. iOS needs `limitsNavigationsToAppBoundDomains` for service workers in
  WKWebView (set in `capacitor.config.ts`).
- Native push still needs the small token-registration service described in
  [`../mobile.md`](../mobile.md#native-push-gap) — that section survives from ADR-0001 unchanged.
- App updates ship with webmail deploys; store releases are only needed when the shell itself
  changes.
