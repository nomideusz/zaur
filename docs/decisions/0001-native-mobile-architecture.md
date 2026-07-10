# ADR-0001: Native mobile clients with a shared Kotlin core

## Status

Accepted

## Date

2026-07-10

## Context

ZAUR Mail currently ships as a SvelteKit web application with an installable PWA. It already
supports responsive mobile layouts, offline mail data, an outbox, and Web Push, but it remains a
browser application: authentication is mediated by a server-side session, data is stored in
IndexedDB, and device integration is limited by web platform APIs.

The mobile product needs first-class iOS and Android experiences, including platform navigation,
accessibility, secure credential storage, background work, notifications, sharing, attachments,
and release through the App Store and Google Play. The existing webmail must remain supported; a
native client is a sibling product, not a rewrite or replacement of the web client.

Mail protocol and synchronization behavior is substantial and should not be implemented twice.
Presentation and operating-system integration, however, should follow each platform's conventions.

## Decision

Build both native clients around a Kotlin Multiplatform shared core:

- iOS presentation uses SwiftUI.
- Android presentation uses Jetpack Compose.
- Kotlin `commonMain` owns JMAP and OAuth networking, protocol/domain models, repositories,
  incremental synchronization, the outbox, and SQLite persistence.
- Platform code owns navigation, UI state adapters, lifecycle, accessibility, background
  scheduling, APNs/FCM integration, sharing, file access, and secure token storage.
- Native clients communicate directly with Stalwart OAuth/JMAP and the public Register API. They
  do not use webmail's SvelteKit session, cookie, or `/api/jmap` proxy.
- The SvelteKit webmail continues independently as the web/PWA client.

The initial project layout will be:

```text
apps/mobile/
  shared/       Kotlin Multiplatform protocol, data, sync, and repository core
  androidApp/   Jetpack Compose application
  iosApp/       SwiftUI application
```

The shared core will start with data and repository APIs rather than shared view models. Android
uses lifecycle-aware Android view models; iOS uses native observable state adapters. This keeps
presentation architecture native and limits Kotlin/Swift interop to stable data-layer boundaries.

## Integration boundaries

- Discover OAuth from `https://mail.zaur.app/.well-known/oauth-authorization-server` and use
  Authorization Code with PKCE. Native apps require dedicated registered client IDs and redirects.
- Discover JMAP from `https://mail.zaur.app/.well-known/jmap` and use the returned API, upload,
  download, and event-source URLs.
- Call `https://register.zaur.app` directly for registration and password recovery.
- Store refresh tokens in Keychain on iOS and Keystore-backed storage on Android.
- Use a local SQLite database as the offline source of truth. JMAP change state and pending writes
  are synchronized through repositories.
- Treat the TypeScript JMAP client, mapping code, sync engine, and outbox as behavioral references
  and contract fixtures. TypeScript code is not linked into the native applications.
- Build native push delivery separately. The existing VAPID/Web Push implementation is web-only
  and cannot deliver APNs or native FCM notifications.

## Alternatives considered

### Compose Multiplatform shared UI

This maximizes code sharing and may shorten initial delivery, but it makes iOS presentation,
navigation, lifecycle, accessibility, and interaction conventions depend on a cross-platform UI
layer. Rejected because platform-native experience is a primary product requirement.

### React Native or Flutter

Both provide productive shared presentation layers, but the project would still need substantial
native work for mail background processing, secure storage, notifications, and platform
integrations. They also introduce a second web-like UI abstraction when the chosen goal is native
SwiftUI and Compose. Rejected.

### Two fully independent native applications

This offers maximum platform autonomy but duplicates JMAP, OAuth, offline synchronization, outbox,
and conflict-handling logic. Protocol drift and inconsistent behavior would be expensive to
prevent. Rejected in favor of sharing only the stable core.

### Continue with the PWA only

The PWA remains valuable and supported, but it cannot provide the complete background execution,
notification, secure-storage, and system-integration experience expected from native mail clients.
Rejected as the sole mobile strategy.

## Consequences

- The team maintains three presentation clients: web, iOS, and Android.
- Native UI work is intentionally duplicated where platform behavior differs.
- Shared-core API design and Kotlin/Swift interop become important compatibility surfaces.
- iOS builds require Xcode/macOS even though shared logic is Kotlin.
- Dedicated Stalwart OAuth clients, native redirect handling, APNs credentials, and FCM
  configuration are required before production release.
- Web and native clients should share protocol fixtures and expected behaviors, not UI code or
  browser storage.
- The decision is incremental: the foundation spike must prove Swift interop, token refresh,
  JMAP discovery, and inbox synchronization before the complete client is built.

## Delivery sequence

1. Prove OAuth/PKCE, token refresh, JMAP discovery, inbox fetch, and Swift/Kotlin interop.
2. Build the shared offline-first repository core, incremental sync, outbox, and contract tests.
3. Ship native inbox, reader, and compose flows in SwiftUI and Jetpack Compose.
4. Add multi-account support, background sync, APNs/FCM delivery, observability, signing, and
   TestFlight/Play testing.

Detailed boundaries and milestones live in [`../mobile.md`](../mobile.md).

## References

- [Kotlin Multiplatform: build iOS and Android apps](https://kotlinlang.org/docs/multiplatform/build-ios-android-app.html)
- [Kotlin Multiplatform recommended project structure](https://kotlinlang.org/docs/multiplatform/multiplatform-project-recommended-structure.html)
- [Android offline-first data layer](https://developer.android.com/topic/architecture/data-layer/offline-first)
- [Stalwart HTTP and JMAP endpoints](https://stalw.art/docs/http/)
