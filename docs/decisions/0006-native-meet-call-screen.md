# ADR-0006: A native call screen for Zaur Meet in the Android app

## Status

Accepted — phases 1 and 2 built, not yet released

## Date

2026-11-02

## Context

Zaur Meet runs on LiveKit Cloud and is joined in mail2 at `/meet/{room}`. On phones its calls
were never clear: a rattle two or three times a second, heard by both people, while WhatsApp video
calls on the same phones were clean.

What was measured and tried on the web (all shipped to mail2, 2026-11-01/02):

- **The network is not the cause.** The call report Meet sends to Traceway showed no lost packets,
  2–30 ms of jitter and a direct UDP connection for every device, Iceland to Poland included.
- **The Android phone is.** iPhone ↔ laptop calls were clear; every call with the Android phone
  rattled, both ways, with or without headphones. The Android was the only device whose playback
  stretched 6–8% of what it played (others: under 3%).
- **Web fixes so far:** Opus DTX off, no idle Web Audio context, lighter video on phones (540p plus
  one 180p layer), H.264 where the browser offers a hardware encoder, and a device-side report
  (dropped mic audio, playout stalls, encoder, CPU limit, phone model).

A browser call on Android goes through Chrome's own audio engine and processing on top of
Android's, and, unless the phone exposes H.264 to Chrome, encodes video in software on the CPU
that also carries the audio. WhatsApp uses Android's native call-audio path and the video chip.
Replacing LiveKit would not change this — every web provider runs in the same browser. LiveKit's
native Android SDK does use the native path, and joins the same rooms.

ADR-0004 keeps mobile on the Capacitor shell and names its exit: "a specific measured shortfall …
a platform integration Capacitor cannot reach". Call audio is that shortfall, measured. It does
not call for leaving Capacitor: a native screen behind a Capacitor plugin reaches it.

## Decision

Inside the existing Capacitor app (`apps/mobile`, which loads mail2), Meet calls run on a native
Android screen built on LiveKit's Android SDK. Everything before and after the call stays web:

```text
mail2 lobby (WebView) ── joinCall (session cookie, same as the browser) ──▶ { wsUrl, token }
        │
        └─▶ ZaurMeet.join({ wsUrl, token, micOn, camOn })     Capacitor plugin (Kotlin)
                 │
                 └─▶ CallActivity  ── LiveKit Android SDK ──▶ the same LiveKit room
                 ◀── { elapsed, others, failed? } ── mail2 shows its "You left the call" screen
```

- **The ticket is the web's.** `joinCall` already applies sign-in, guest names, rate limits and room
  checks, and runs in the WebView with the shell's session. The native side never authenticates.
  This keeps ADR-0004's position that the shell authenticates through webmail.
- **Detection is by capability.** mail2 hands the call over only when Capacitor's bridge reports a
  `ZaurMeet` plugin (`apps/mail2/src/lib/meet/native.ts`). Browsers, iPhones and older app builds
  keep the web call unchanged.
- **Web and native are one room.** People on the web and in the app see each other as before.
- **The native screen mirrors the web's phone layout.** Their picture fills the screen, yours rides
  in a corner and swaps on a tap, and the bars float on a shade and fade after four quiet seconds.
  It reuses Meet's glyphs and dark call colours.
- **Media settings match the web's phone settings.** 540p capture with one 180p simulcast layer, DTX
  off, LiveKit's call-audio mode (`MODE_IN_COMMUNICATION`, voice-communication usage, so the phone's
  echo cancellation and noise suppression), and automatic routing: Bluetooth, then wired, then
  speaker, then earpiece. Video stays on LiveKit's default VP8, which the SDK encodes in hardware
  where the phone has an encoder; H.264 is not forced natively because hardware H.264 simulcast
  is uneven across Android vendors.
- **Kotlin and Android Views, not Compose.** It is one screen. Views need no Compose toolchain in a
  Java Capacitor project, and the screen can move into a Compose app later if ADR-0001's direction
  is ever taken up.

## Phases

| Phase | Scope | State |
|---|---|---|
| 1. Core | Plugin bridge; `CallActivity` with one other person full screen, you in the corner, swap, mute, camera, flip, audio route, leave; reconnect and error endings; camera/mic/Bluetooth permissions (which the WebView lobby also needed) | Built 2026-11-02 |
| 2. Phone-call behaviour | `CallService`, a foreground service of type `microphone` (`mediaPlayback` when the mic is refused) behind an ongoing, silent notification with a timer and Leave, so the call survives the screen locking or another app; picture-in-picture (auto on Home from Android 12, on Home or Back before), with Mute and Leave in the window, closing it leaves the call; your camera pauses while nobody can see the screen | Built 2026-11-02 |
| 3. Links | `/meet/…` links open in the app when it is installed: an App Links intent filter and `/.well-known/assetlinks.json` served by mail2 | After 2 |
| 4. Group calls | A native grid for three or more; until then the first person to join is shown and the bar counts the rest | When needed |
| iOS | The same plugin over LiveKit's Swift SDK, once the shell has an iOS project | Later |

## Consequences

- The Android app gains Kotlin, the LiveKit SDK (about 15 MB of WebRTC native libraries per ABI)
  and JitPack as a repository (LiveKit's audio routing library is published only there).
- The app now declares `CAMERA`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS` and `BLUETOOTH_CONNECT`.
  Before this, the WebView lobby could not reach the camera or mic in the app at all.
- **Away from the screen:** the call keeps its mic and connection while the phone is locked or
  another app is open; your camera pauses then (the others see it off) and comes back with the
  screen. The service is not of type `camera` on purpose: nothing films a pocket. On Android 13+
  the ongoing notification needs the notification permission, asked with camera and mic; refused,
  the call still goes on, only without the notification.
- Only people with the app get the native call. Anyone who opens a link in a browser, and every
  iPhone, still gets the web call; the web fixes above remain the baseline.
- The call reports Meet sends to Traceway come from the web call only. A native call does not
  report yet.
- Verifying a change needs an APK installed on a phone and a second person. Gradle builds need
  JDK 21 and the Android SDK (`apps/mobile/android/local.properties`).

## Files

- `apps/mobile/android/app/src/main/java/app/zaur/mail/ZaurMeetPlugin.kt` — the bridge
- `apps/mobile/android/app/src/main/java/app/zaur/mail/CallActivity.kt` — the call screen and its
  picture-in-picture
- `apps/mobile/android/app/src/main/java/app/zaur/mail/CallService.kt` — the call kept alive away
  from the screen, and its notification
- `apps/mobile/android/app/src/main/res/layout/activity_call.xml`, `values/call.xml`,
  `drawable/ic_call_*`, `drawable/bg_call_*` — its layout, strings, colours and glyphs
- `apps/mail2/src/lib/meet/native.ts` and `apps/mail2/src/routes/meet/[room]/+page.svelte` — the
  hand-over on the web side
