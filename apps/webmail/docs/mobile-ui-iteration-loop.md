# Mobile webmail UI — 20-iteration production loop

> **2026-08 update:** the floating island this loop was built around has since been
> removed. Mobile chrome is now: sticky top bar (hamburger + title + search +
> contextual actions), hamburger drawer for all navigation, one `MobileFab.svelte`
> primary-action pill, and the shared inline bulk action bar. The table below is
> historical; the working rules at the bottom are kept current.

**Goal:** Ship a production-ready phone experience for Zaur webmail: no overlapping chrome,
no duplicated copy, minimal forced truncation, correct safe-area / bottom-chrome clearance, and
stable list → reader → compose flows at ≤767px.

**Exit criteria (all must pass):**

1. No element paints under the sticky top bar or over the bottom chrome (FAB / bulk dock).
2. Each piece of copy (subject, compose title, section label) appears once per screen.
3. Subjects in the reader wrap fully; list subjects show up to two lines before ellipsis.
4. Touch targets stay ≥44×44px; drawers/sheets clear the notch and home indicator.
5. Lab + visual QA at 390×844 and 360×740 show no regressions on list, reader, compose,
   search, settings tabs, and calendar tabs.

Each iteration has one job. Do not combine jobs. After each iteration: visual check at
mobile width, then commit if behavior changed.

| # | Goal | Primary surfaces | Status |
|---|------|------------------|--------|
| 1 | Reader never under top bar (in-flow fullscreen) | `primitives.css`, `mail-view.css` | done |
| 2 | Single subject on thread (no top-bar duplicate) | `MobileTopBar.svelte`, reader | done |
| 3 | Single compose title | `MobileTopBar.svelte`, compose header | done |
| 4 | List subjects: 2-line clamp on phone | `MessageList.svelte`, `list.css` | done |
| 5 | Reader meta: wrap names, keep emails usable | `MessageReaderCore.svelte`, `reader.css` | done |
| 6 | Safe-area audit (no double inset) | shell + fullscreen CSS | done |
| 7 | Island clearance on reader/compose tails | scroll-area / shell tokens | done (token) |
| 8 | Top-bar thread chrome balance | `MobileTopBar.svelte` | done |
| 9 | Search-expanded top bar density | top bar search form | done |
| 10 | Nav drawer & account sheet insets | drawer / account sheet | done (sheet inset) |
| 11 | Settings / calendar rail overflow | segment rails | done (scroll + min-width) |
| 12 | Bulk-select list gutter stability | list select CSS | done (list-lab) |
| 13 | Collapsed thread row previews | reader thread list | done (`title` on preview) |
| 14 | Attachment / filename overflow | attachments UI | done (`title` on names) |
| 15 | Skeleton parity with real reader | `MessageReaderSkeleton.svelte` | done |
| 16 | Stale comments & nav helpers | `app-nav.ts`, reader comments | done |
| 17 | Touch targets ≥44px on top bar | `shell.css`, `mobile-rail.ts` | done |
| 18 | Landscape & short-viewport pass | 740×360 e2e | done |
| 19 | Regression tests / lab harness | `/mobile-chrome-lab` + e2e | done |
| 20 | Final visual QA checklist | list, reader, compose labs | done |

## Follow-up (compose / reader chrome)

Done: **Send** (+ schedule) and reader **Reply** actions live in the sticky top bar;
compose keeps a single Attach in the footer. See `MobileTopBar.svelte` +
`ComposeSendSplit.svelte`.

## Working rules

- Prefer CSS tokens (`--z-mobile-topbar-height`, `--z-mobile-chrome-clearance`) over magic numbers.
- Prefer removing duplicate chrome over adding more truncation.
- Keep desktop (`md+`) paths unchanged unless a shared token requires it.
- Use unauthenticated labs (`/list-lab`, `/mobile-chrome-lab`) for layout proof
  when a live session is unavailable.
