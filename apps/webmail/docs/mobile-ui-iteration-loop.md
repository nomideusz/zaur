# Mobile webmail UI — 20-iteration production loop

**Goal:** Ship a production-ready phone experience for Zaur webmail: no overlapping chrome,
no duplicated copy, minimal forced truncation, correct safe-area / island clearance, and
stable list → reader → compose flows at ≤767px.

**Exit criteria (all must pass):**

1. No element paints under the sticky top bar or over the floating island.
2. Each piece of copy (subject, compose title, section label) appears once per screen.
3. Subjects in the reader wrap fully; list subjects show up to two lines before ellipsis.
4. Touch targets stay ≥44×44px; drawers/sheets clear the notch and home indicator.
5. Lab + visual QA at 390×844 and 360×740 show no regressions on list, reader, compose,
   search, settings tabs, and calendar tabs.

Each iteration has one job. Do not combine jobs. After each iteration: visual check at
mobile width, then commit if behavior changed.

| # | Goal | Primary surfaces | Done when |
|---|------|------------------|-----------|
| 1 | Offset fullscreen reader below top bar | `primitives.css`, `mail-view.css` | Reader From/meta never sits under top bar |
| 2 | Single subject on thread (no top-bar duplicate) | `MobileTopBar.svelte`, reader | Subject only in reader body; wraps |
| 3 | Single compose title | `MobileTopBar.svelte`, compose header | Top bar is back-only; title/status stays in compose header |
| 4 | List subjects: 2-line clamp on phone | `MessageList.svelte`, `list.css` | Long subjects show ~2 lines, not 1-char ellipsis |
| 5 | Reader meta: wrap names, keep emails usable | `MessageReaderCore.svelte`, `reader.css` | Display names wrap; emails keep `title` / clamp |
| 6 | Safe-area audit (no double inset) | shell + fullscreen CSS | Notch devices: one top inset, content flush under top bar |
| 7 | Island clearance on reader/compose tails | scroll-area / shell tokens | Last line / Send dock never covered by island |
| 8 | Top-bar thread chrome balance | `MobileTopBar.svelte` | Back control alone does not feel lopsided; hit area clear |
| 9 | Search-expanded top bar density | top bar search form | Field + clear + menu never overlap or clip |
| 10 | Nav drawer & account sheet insets | drawer components | Sheet headers/lists clear safe areas |
| 11 | Settings / calendar rail overflow | segment rails | Tabs scroll; active tab stays visible; no wrap clash |
| 12 | Bulk-select list gutter stability | list select CSS | Entering select mode does not jump subject lines |
| 13 | Collapsed thread row previews | reader thread list | Preview truncates once; no dual subject lines |
| 14 | Attachment / filename overflow | attachments UI | Names ellipsize in one line with open affordance |
| 15 | Skeleton parity with real reader | `MessageReaderSkeleton.svelte` | Loading state matches final chrome (no phantom header) |
| 16 | Stale comments & nav helpers | `app-nav.ts`, reader comments | Docs match “top bar on thread/compose” reality |
| 17 | Touch / hover separation | pointer-env consumers | No hover-only critical actions on coarse pointers |
| 18 | Landscape & short-viewport pass | 667×375 / 740×360 | Top bar + island leave a usable reading band |
| 19 | Regression tests / lab harness | lab route or CSS assert | Layout contract covered without live mailbox |
| 20 | Final visual QA checklist | list, reader, compose, settings | Sign-off against exit criteria above |

## Working rules

- Prefer CSS tokens (`--z-mobile-topbar-height`, `--z-island-clearance`) over magic numbers.
- Prefer removing duplicate chrome over adding more truncation.
- Keep desktop (`md+`) paths unchanged unless a shared token requires it.
- Use unauthenticated labs (`/island-lab`, `/list-lab`, `/mobile-chrome-lab`) for layout proof
  when a live session is unavailable.
