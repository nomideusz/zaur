# ADR-0004: Consolidate mobile on the Capacitor shell, retire the React Native client

## Status

Accepted (supersedes [ADR-0003](0003-react-native-client.md); reinstates
[ADR-0002](0002-capacitor-shell.md) as the product direction)

## Date

2026-08-04

## Context

ADR-0003 chose React Native + Expo three weeks ago and deprecated the Capacitor shell. What
that decision under-weighted was the cost of a second UI stack for a solo developer on an
otherwise all-Svelte codebase.

React Native has no CSS. None of webmail's presentation layer transfers: the `--z-*` token
system, the circadian theming, the capsule chrome (island, action dock, top bar, filter
chips), swipe rows with spring physics, pull-to-refresh, and the visual-viewport keyboard
handling would each have to be rebuilt by hand in `StyleSheet` and then kept in sync
forever. Every design pass would have to be done twice, in two vocabularies. That tax is
permanent and it is paid on every change, whereas the native-feel benefit is paid once.

The premise of ADR-0003 — "the WebView shell is not a native experience" — is still true,
but a mail client is lists, text, and forms, which is not the workload where WebViews
disappoint. Recent mobile work (fixed top bar, capsule island, keyboard-offset handling,
safe-area insets) closed most of the perceptible gap in the web client itself, and it
closed it for every surface at once.

Push is a concrete asymmetry rather than a matter of taste: the Capacitor shell rides
webmail sessions, so the existing FCM pipeline already works. ADR-0003's milestone 3
required extending `/api/push/subscribe` to accept and introspect Stalwart Bearer tokens
just to reach parity the shell already has.

There is no credible Svelte-native alternative — NativeScript-Svelte and similar have
bus-factor and maturity problems worse than the dependency risks we reject elsewhere — so
the real choice is Capacitor-plus-the-PWA or React Native, with nothing in between.

`apps/native` was 9 files and ~1,136 lines, in no CI workflow, with nothing depending on
it. The cost of reversing is near zero today and grows from here.

## Decision

Retire `apps/native`. The Capacitor shell (`apps/mobile`) is the shipping mobile client
again, and mobile investment goes into the Svelte PWA it loads, where it also benefits
desktop and mobile web.

**`packages/mail-core` stays.** It is the durable win from ADR-0003 and is independent of
the UI framework question: pure TypeScript JMAP client, mappers, address parsing, and date
helpers, with no Svelte, DOM, or React coupling. Webmail consumes it today. Keeping it
framework-free means a future native client — in any language — starts from protocol code
that already works.

## Consequences

- `apps/native` and its 16 React/Expo dependencies are removed. The code remains in git
  history (last commit before removal: `0bd4b21`) if the decision is revisited.
- ADR-0002's deprecation is lifted; `apps/mobile` keeps its store identity
  (`app.zaur.mail`, the release keystore).
- Direct-to-Stalwart auth (OAuth PKCE via `/api/auth`, no webmail server dependency) is
  **not** implemented and no longer planned. The shell authenticates through webmail as it
  did before ADR-0003.
- What we accept giving up: true native scroll/gesture feel, and describing the app as
  natively rendered. Keychain/Keystore storage, share sheet, background work, and store
  distribution are all reachable from Capacitor plugins.
- The `// Moved to @zaur/mail-core (shared with apps/native)` shim comments in webmail are
  now inaccurate about the consumer, but the extraction they describe stands on its own.
- If the WebView ceiling is hit later, revisit — but the trigger should be a specific
  measured shortfall (scroll jank, a platform integration Capacitor cannot reach), not a
  general preference.
