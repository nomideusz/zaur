---
name: Zaur suite
description: The shared design system of Zaur Mail, Register and Zaur Music, shipped as @zaur/ui.
colors:
  ground: "#eef1f5"
  canvas: "#f6f7f9"
  surface: "#ffffff"
  sunken: "#f1f5f9"
  hover: "#f8fafc"
  ink: "#0b1220"
  body: "#1e293b"
  strong: "#334155"
  muted: "#475569"
  soft: "#64748b"
  faint: "#94a3b8"
  hairline: "#e2e8f0"
  line: "#cbd5e1"
  accent: "#2563eb"
  accent-edge: "#1d4ed8"
  accent-soft: "#dbeafe"
  accent-ink: "#1e40af"
  danger: "#b91c1c"
  correspondence-fill: "#dbeafe"
  correspondence-stroke: "#3b82f6"
  correspondence-ink: "#1e40af"
  confirmed-fill: "#dcfce7"
  confirmed-stroke: "#16a34a"
  confirmed-ink: "#14532d"
  needs-fill: "#fde68a"
  needs-stroke: "#d97706"
  needs-ink: "#78350f"
  flagged-fill: "#fbcfe8"
  flagged-stroke: "#db2777"
  flagged-ink: "#831843"
  digest-fill: "#ddd6fe"
  digest-stroke: "#7c3aed"
  digest-ink: "#4c1d95"
  discard-fill: "#fee2e2"
  discard-stroke: "#ef4444"
  discard-line: "#fca5a5"
  discard-ink: "#b91c1c"
typography:
  headline:
    fontFamily: "Seravek, 'Gill Sans Nova', Ubuntu, Calibri, 'DejaVu Sans', source-sans-pro, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Seravek, 'Gill Sans Nova', Ubuntu, Calibri, 'DejaVu Sans', source-sans-pro, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Seravek, 'Gill Sans Nova', Ubuntu, Calibri, 'DejaVu Sans', source-sans-pro, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.5
  caption:
    fontFamily: "Seravek, 'Gill Sans Nova', Ubuntu, Calibri, 'DejaVu Sans', source-sans-pro, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "'Ioskeley Mono', ui-monospace, Menlo, Consolas, monospace"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.03em"
  meta:
    fontFamily: "'Ioskeley Mono', ui-monospace, Menlo, Consolas, monospace"
    fontSize: "10.5px"
    fontWeight: 400
rounded:
  chip: "5px"
  control: "8px"
  row: "10px"
  pop: "12px"
  panel: "14px"
  pill: "999px"
components:
  button-tactile:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.body}"
    rounded: "{rounded.control}"
    padding: "0 11px"
    height: "30px"
  button-tactile-hover:
    backgroundColor: "{colors.hover}"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "0 11px"
    height: "30px"
  button-primary-hover:
    backgroundColor: "{colors.accent-edge}"
  button-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.danger}"
    rounded: "{rounded.control}"
  button-destroy:
    backgroundColor: "{colors.discard-fill}"
    textColor: "{colors.discard-ink}"
    rounded: "{rounded.control}"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "34px"
  segment-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.correspondence-ink}"
    rounded: "6px"
    height: "26px"
  chip:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.chip}"
    padding: "1px 6px"
    typography: "{typography.label}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.row}"
  menu:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.pop}"
    padding: "6px"
---

# Design System: Zaur suite

The source of truth is `packages/ui/src/tokens.css` (tokens, both themes, fonts) and `packages/ui/src/base.css` (primitives).
- Mail and Music import `@zaur/ui/tokens.css` and `@zaur/ui/base.css` after `tailwindcss`.
- Register imports them by path and commits the built `public/app.css`.
- Every value below is read through a `--z-*` custom property, never hard-coded.

## Overview

**Creative North Star: "The Quiet Switchboard"**

Colour in this system routes meaning; it never decorates. Six channel hues say what kind of thing something is: a place your mail arrives, a thing confirmed, something that needs you, a flag, a digest, something gone. Everything else stays in a cool slate neutral ramp, so a hue on screen is always a signal.

The chrome is quiet: white surfaces on a pale ground, hairline separators, sentence-case captions. The controls feel like hardware: white keys with a one-pixel shadow, a half-pixel press, and keycaps with a heavier bottom edge. Density is high and calm, because people use it all day, at a desk on the keyboard and one-handed on a phone.

The same switchboard runs every app in the suite. A new service joins it rather than bringing its own look.

**Key Characteristics:**
- Six fixed channel hues, each a pastel fill, a matching stroke, a solid and a dark ink.
- Identity (who) lives only on avatar tiles, from a separate, quieter tone ramp.
- Tactile white controls; one filled blue control per surface.
- Four structural shadow levels, and no more.
- Light and dark from the same tokens: dark mode is a token swap, never a second design.

## Colors

The palette is a slate neutral ramp, with one blue accent for selection and six pastel channels for meaning.

### Primary
- **Switchboard Blue** (accent): filled controls (Send, Sign in, New message), checkboxes, the keyboard cursor's ring and every focus outline. The correspondence channel and selection are the same blue, everywhere. In dark mode it stays at the deeper value, so white text on it holds 5.2:1.
- **Blue Edge** (accent-edge): the border and hover of a filled blue control.
- **Selection Wash** (accent-soft): an active segment, a selected row's header.

### Secondary
The six channels. Each has a fill (a pastel surface), a stroke (its border and rail), a solid (filled marks) and an ink (text on the fill):
- **Correspondence** (blue): Inbox, Archive and custom folders, where mail arrives or is kept.
- **Confirmed** (green): Drafts, Sent and Scheduled, mail you write.
- **Needs you** (amber): the Important label.
- **Flagged** (pink): the Flagged label.
- **Digest** (violet): content categories (Receipts, Newsletters, Notifications).
- **Discard** (red): Junk and Trash, and every destructive control.

### Neutral
- **Ground** (ground): behind the app column.
- **Canvas** (canvas): pane grounds, settings bodies, card footers.
- **Surface** (surface): cards, panels, menus, controls.
- **Sunken** (sunken): inset wells, segmented frames, pressed controls.
- **Ink → Faint** (ink, body, strong, muted, soft, faint):
  - Ink is headings and unread mail.
  - Body is reading copy.
  - Strong and muted are labels.
  - Soft is the lightest text allowed.
  - Faint is rules and glyphs only.
- **Hairline / Line** (hairline, line): row separators, and the borders of controls and panels.

### Named Rules
**The Channel Not Identity Rule.** A hue says what kind of thing this is, never who sent it. People get avatar tiles from the identity ramp, and teal is reserved for the brand.

**The One Hue Per Meaning Rule.** No hue is both a label and a place. Folders are green, red or blue; labels are amber, pink or violet.

**The Soft Floor Rule.** `soft` is the lightest ink any text may use, and `faint` is never text. Text on a channel wash is tinted from that channel's ink, never grey, and holds 4.5:1.

## Typography

**Body Font:** the platform's humanist sans (Seravek, Gill Sans Nova, Ubuntu, Calibri, DejaVu Sans)
**Label/Mono Font:** Ioskeley Mono (self-hosted, Latin subset, code ligatures dropped), falling back to the system mono. Mail content itself (plain-text bodies, code in a message) keeps the system mono.

**Character:** a warm humanist sans does the talking. A narrow mono carries what is measured: times, sizes, counts, keycaps and channel names.

### Hierarchy
- **Headline** (700, 22px, 1.15, -0.025em): the one heading on a signed-out screen (Register's "Create your address").
- **Title** (600, 15px, 1.35): a dialog's question, a card's title.
- **Body** (500, 13px): UI text, menu items, controls. Reading text sits on the body ink at a measure of `--z-measure` (33em, about 70 characters), the same measure for reading and writing.
- **Caption** (400, 12.5px, 1.4, soft): group headings such as Mailboxes or Today, in sentence case and never uppercase.
- **Label** (mono 600, 11px, 0.03em, uppercase): channel chips only.
- **Meta** (mono, 10.5–12px, tabular numerals): times, sizes, addresses, keycaps.

### Named Rules
**The Measured Mono Rule.** Mono marks things that are counted or typed: times, sizes, keys, channel names. It is never a costume for "technical".

## Layout

- **Mail's shell** is one CSS grid (`.z-shell`):
  - On a phone it is a single pane.
  - On a tablet it is list plus reader, with the sidebar as an overlay drawer.
  - On a desktop the sidebar becomes a column.
  - Fixed columns: sidebar 240px, phone drawer 280px, list 480px (resizable 380–760).
  - Shell chrome is a 52px top bar and a 36px status line.
- **On phones,** chrome is essentials only. The bottom tab row holds the sections, the drawer holds mailboxes and labels, and touch targets are 44px.
- **Spacing** is tight inside a group and generous between groups. Rows are packed and cards carry 16px padding.
- **Z-order** comes from a named scale (`--z-menu` 40 through `--z-panel` 70), never ad-hoc numbers.

## Elevation & Depth

Shadows are structural: they say what floats over what. There are four levels, and nothing glows.

### Shadow Vocabulary
- **Tactile** (`0 1px 2px rgba(15,23,42,0.06)`): buttons, chips, fields and cards at rest.
- **Raised** (`0 1px 2px rgba(15,23,42,0.05), 0 0 0 1px rgba(15,23,42,0.02)`): unread rows.
- **Menu** (`0 12px 32px rgba(11,18,32,0.14)`): menus, popovers, toasts, dock chips.
- **Panel** (`0 24px 56px rgba(11,18,32,0.22)`): compose panels and dialogs, over a scrim.

In dark mode the same four levels deepen to black at 0.3–0.6 alpha.

### Named Rules
**The Four Levels Rule.** Tactile, raised, menu, panel. A fifth shadow means something is in the wrong layer.

## Shapes

Corners grow with the size of the thing:
- 5px for chips, counts and checkboxes.
- 8px for controls, fields and menu rows.
- 10px for cards and message rows.
- 12px for menus, popovers and dialogs.
- 14px for the app column.

Borders are 1px hairlines or lines. A key's bottom edge is 2px, as on keycaps, checked checkboxes and the destroy button. Rails are 3px rounded bars inside a row, never a coloured border on the edge of a card.

## Components

### Buttons
Tactile and exact: a white key you can feel.
- **Shape:** gently rounded (8px). 30px tall by default; settings use 32–34px and phones 44px.
- **Tactile:** surface, line border, tactile shadow, 13px/500 body ink. On hover it takes the hover surface; when pressed it drops half a pixel onto sunken.
- **Primary:** filled Switchboard Blue with a blue-edge border, white 600 text. There is one per surface.
- **Danger:** red ink on the tactile key, with the discard wash on hover. Used for Discard and for Sign out in a menu.
- **Destroy:** the discard fill and ink with a 2px discard-stroke bottom edge, in 600. It is the commit in a confirmation, and only there.
- **Icon button:** 26px, borderless, 6px radius, muted glyph that turns to ink on a sunken hover. Grouped in a bordered `z-group`.
- **Segmented control:** 26px members in a `z-group` frame. The active member takes the selection wash and correspondence ink.

### Chips
- **Style:** the channel's name in mono caps (11px) with the stroke as border, on white so it sits on the fill it labels. The filled variant takes the channel fill and is used on a white surface.
- **Counts:** 19px mono, on white with the channel's stroke.

### Cards / Containers
- **Corner Style:** 10px.
- **Background:** surface with a hairline frame and the tactile shadow.
- **Parts:** a 44px head, a body with 16px padding under a hairline, and a foot band on canvas for the closing action.

### Inputs / Fields
- **Style:** 34px, 8px radius, line border, inset shadow, soft placeholder.
- **Focus:** an accent border with a 3px soft blue ring.
- **Error:** the discard stroke, wash and ink. **Disabled:** hover surface with faint text.

### Navigation
- **Folders and labels** are railed rows. The open one takes its channel's wash and stroke, and its 3px rail lights up. A square swatch marks a folder (a place, `aria-current`) and a dot marks a label (a switch, `aria-pressed`).
- **Checkboxes** are only for picking messages.

### Confirmation dialog
A native modal `<dialog>` (role alertdialog), 400px wide, 12px radius, panel shadow over the scrim.
- It shows a question as its title and the consequence in muted body text.
- A canvas foot holds Cancel and an action named by its verb.
- A destructive question starts on Cancel and commits with Destroy. A neutral one starts on Primary.
- It rises 6px into place over 180ms.
- Code calls it with `ask()` from `confirm.svelte.ts`.

### Keycap
Mono 10px on hover-grey, 19px tall, with a 2px bottom border. The inverse variant sits on a filled blue button.

## Do's and Don'ts

### Do:
- **Do** read every colour, shadow and radius through `--z-*` tokens from `@zaur/ui`, so dark mode stays a token swap.
- **Do** give a hue only to a channel meaning, using `channelStyle()`-style vars (`--z-fill`, `--z-stroke`, `--z-rail`, `--z-ink-on`).
- **Do** keep one filled blue control per surface.
- **Do** name actions by their verb: "Delete forever", "Empty Junk", "Stop sharing".
- **Do** keep text at 4.5:1 or better in both themes, including text on washes, and respect reduced motion.
- **Do** theme the browser's own surfaces (scrollbars, caret, selection, focus ring) from the tokens.

### Don't:
- **Don't** use a channel hue for identity or decoration, or give one hue both a label and a place.
- **Don't** set text in `faint`, or use grey text on a coloured wash.
- **Don't** add a fifth shadow, a glow, or a coloured border thicker than 1px on a card or alert edge. Rails sit inside rows.
- **Don't** use a checkbox glyph for navigation.
- **Don't** use uppercase captions or eyebrows. Mono caps belong to channel chips only.
- **Don't** let an app fork the tokens. A change belongs in `packages/ui` for every app at once.
