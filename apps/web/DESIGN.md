---
name: zaur.app
description: One maker's estate as a Swiss programme poster; the product names are the poster, and pointing at one lights the packages it is built from.
colors:
  orange: "#e75926"
  orange-lit: "#d54819"
  orange-rule: "#1e0a05"
  lilac: "#b8aff3"
  ground: "#e8e4de"
  ink: "#0b0a09"
  bar-rule: "#3a3836"
  paper: "#f8f6f1"
  chip: "#f7f7f7"
  live: "#1f9d55"
  quiet: "#4a4842"
typography:
  display:
    fontFamily: "'Inter Tight', system-ui, sans-serif"
    fontSize: "4.87vw"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.03em"
  band:
    fontFamily: "'Inter Tight', system-ui, sans-serif"
    fontSize: "max(2.5rem, 5.4vw)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "'Inter Tight', system-ui, sans-serif"
    fontSize: "max(1.75rem, 3.07vw)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
  case-title:
    fontFamily: "'Inter Tight', system-ui, sans-serif"
    fontSize: "max(2rem, 3.6vw)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.035em"
  wordmark:
    fontFamily: "'Inter Tight', system-ui, sans-serif"
    fontSize: "2.24vw"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.01em"
  title:
    fontFamily: "'Inter Tight', system-ui, sans-serif"
    fontSize: "max(1.5rem, 2.4vw)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.035em"
  body:
    fontFamily: "'Inter Tight', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.45
  label:
    fontFamily: "'Inter Tight', system-ui, sans-serif"
    fontSize: "max(13px, 0.95vw)"
    fontWeight: 500
    fontFeature: "'tnum'"
  caption:
    fontFamily: "'Inter Tight', system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.45
rounded:
  none: "0px"
  chip: "3px"
spacing:
  rule: "2px"
  rule-heavy: "4px"
  gutter: "1.39vw"
  gutter-mobile: "1rem"
components:
  bar:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.body}"
    height: "3.66vw"
  programme-row:
    backgroundColor: "{colors.orange}"
    textColor: "{colors.ink}"
    typography: "{typography.display}"
    padding: "0 1.64vw 0.35vw 1.39vw"
  programme-row-lit:
    backgroundColor: "{colors.orange-lit}"
    textColor: "{colors.paper}"
  kit-row:
    backgroundColor: "{colors.lilac}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
  kit-row-lit:
    backgroundColor: "{colors.chip}"
    textColor: "{colors.ink}"
  chip:
    backgroundColor: "{colors.lilac}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.chip}"
    height: "2.2vw"
  chip-lit:
    backgroundColor: "{colors.chip}"
    textColor: "{colors.ink}"
  section-band:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.band}"
    padding: "1.6vw 1.29vw 1.1vw 1.39vw"
  live-window:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.none}"
  tag:
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.chip}"
    padding: "0.05rem 0.45rem"
  fold-summary:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    typography: "{typography.headline}"
    height: "3.7vw"
    padding: "0 1.29vw 0 1.39vw"
  closing-row:
    backgroundColor: "{colors.orange}"
    textColor: "{colors.ink}"
    padding: "2.4vw 1.39vw 0"
  closing-row-lit:
    backgroundColor: "{colors.orange-lit}"
    textColor: "{colors.paper}"
---

# Design System: zaur.app

## Overview

**Creative North Star: "The Product Programme"**

The page is a single Swiss concert poster in the International Typographic Style, pushed hard. The programme of the evening is the maker's products: a flat signal-orange field carries their names in giant black neo-grotesk, each with what it is set flush right like a venue. Beside it, a flat lilac column introduces the maker and lists the open-source packages the products are built from, as a smaller ruled programme of names and versions. Below the poster the page runs as a sequence of sections, each opened by a black band carrying its name at poster scale: the products as case studies with the real sites running inside them, the client sites and side projects as a two-column grid of live windows, the packages as a ruled table, folded catalogs, and how the work is done. It closes on one more orange row: the address.

The first viewport scales as one object: every measure in it is in vw (or the poster unit, below), derived from a 2512px-wide comp, so the poster keeps its proportions at any width above 900px. Below 900px the sheet stops scaling and becomes a stack. The interaction is the poster answering back: pointing at a product lights the packages it is built from, pointing at a package lights the products that use it, and the swap is instant.

Everything shown is real. Windows run the live site for the flagships and the calendar's demo (a capture underneath until it loads); every smaller project shows a capture. Version numbers are read from npm, not typed. The search-traffic readout comes from Google Search Console and disappears when the source is unavailable: a weekly chart only where a site gets 20+ clicks a day, 28-day totals elsewhere, nothing under 1,000 impressions. The system refuses the SaaS hero and the wired node graph, and keeps the portfolio's case studies honest by filling them with running sites instead of mock-ups.

**Key Characteristics:**
- Three flat fields (orange programme, lilac column and media, warm-grey ground) plus ink bands, separated by ink rules; no fourth field colour.
- One family, Inter Tight, self-hosted at 500 / 700 / 800.
- Type is the image: product names at poster scale, descenders crossing the rules below them; section names at the same scale on ink.
- No shadows, gradients or rounding, except the 3px corner on chips, tags and small controls, and the round live dot.
- Instant hover swaps; the only authored motion is the fold's short height reveal (and a live window's status dot blinking while its site loads).
- Live data or nothing: versions, traffic and windows come from live sources.

## Colors

A signal-orange and lilac poster on warm grey, held together by near-black ink.

### Primary
- **Signal Orange** (orange): the programme field and the closing row. Also the hover colour of bar links, the count after a section name, the current month in a growth chart, and the radio's play button.
- **Burnt Orange** (orange-lit): the lit programme row and the hovered closing row, always paired with Paper text.
- **Ember Rule** (orange-rule): the 2px rules between rows on orange; near-black with an orange cast so it reads as ink on orange without going dead grey.

### Secondary
- **Programme Lilac** (lilac): the intro column beside the programme and the media column of every case study, where windows sit on it.

### Neutral
- **Ink** (ink): text, frames, rules, the top bar, section bands, focus outline, selection background. Also the `theme-color`.
- **Warm Ground** (ground): page background, case bodies, site rows and folds. Fold summary hover is ground with 6% ink.
- **Paper** (paper): text on ink, the lit row name, the inset rule under a lit row, window toolbars and backing.
- **Chip White** (chip): fill of a lit or hovered chip or kit row, and of a package row reached by its anchor.
- **Bar Rule** (bar-rule): the dividers between tabs inside the black bar.
- **Quiet** (quiet): secondary text on the ground (spec labels, "Used in" lines, chart months) and the not-yet-live status dot.
- **Live Green** (live): the status dot beside a product whose live readout has loaded. A signal, never a fill.

### Named Rules
**The Three Fields Rule.** Orange is the programme, lilac is what sits beside or under it (the intro, the windows), warm grey is the reading ground. Ink bands open sections. A new surface takes one of these; it does not invent a fourth field colour.

**The Ink Divides Rule.** Fields meet at an ink rule (2px, or 4px between the poster's major fields and to close a section), never at a soft edge or tonal step. Hairlines inside a spec list are ink at 25%.

## Typography

**Display Font:** Inter Tight (with system-ui, sans-serif)
**Body Font:** Inter Tight
**Label Font:** Inter Tight with tabular numerals

**Character:** One tight neo-grotesk does everything, from poster-scale product names to window toolbars. Hierarchy is carried by size and weight alone.

### Hierarchy
- **Display** (700, 4.87 poster units, line-height 1, -0.03em): product names in the programme. Nudged down 0.1em so descenders cross the row rule below. 8.4vw on mobile.
- **Band** (800, max(2.5rem, 5.4vw), -0.04em): section names on their ink band, nudged down 0.1em, the count after a middle dot in Signal Orange.
- **Case title** (800, max(2rem, 3.6vw), -0.035em): the host or name heading a case study.
- **Headline** (800, max(1.75rem, 3.07vw), line-height 1, -0.03em): fold summaries ("Railway templates · 119").
- **Title** (800, max(1.5rem, 2.2vw), -0.035em; 1.375rem on mobile): site row names; package names in the table run 700 at max(1.25rem, 1.8vw).
- **Wordmark** (800, 2.24vw, -0.01em): the name in the bar, above 900px only.
- **Body** (500, 1rem / 1.45): descriptions, capped at 52–66ch; a case's lead line runs at max(1rem, 1.1vw), section ledes at max(1.125rem, 1.45vw).
- **Label** (500, max(13px, 0.95 poster units), tabular numerals): chips, kit rows (1.25 units), versions, tabs (1.2vw), programme "kind" (1.53vw).
- **Caption** (500, 0.8125–0.875rem): the small text below the poster: tags, meta lines, spec lists, window toolbars, figure captions, chart values, install lines. 0.8125rem for tags and chart figures, 0.9375rem for spec lists and the footer, 0.875rem for the rest.

### Named Rules
**The Type Is The Image Rule.** The poster's picture is its type. Product names stay at display scale in the programme and section names at band scale; never shrink them to make room for decoration.

**The Tabular Versions Rule.** Every version number uses tabular numerals and sits flush right in its row or chip.

**The Caption Floor Rule.** Small text never goes below 0.8125rem (13px on the poster); anything smaller is cut, not shrunk.

## Layout

Desktop opens on one vw-scaled sheet built from a 2512px comp. A sticky black bar (3.66vw tall) runs across the top: the name in the first 28vw, five tabs in page order (How I work, Products, Clients, Packages, Templates) in fixed tracks, the address at the right. The poster below is a two-column grid: the programme at 63.42vw, the intro column filling the rest. The programme's rows share the screen under the bar (between 5vw and 11.25vw each), and the poster unit `--u` (1vw, defined page-wide) shrinks with them on short screens so the names and the intro still fit. The intro stacks name, role, pitch and links (GitHub, LinkedIn; no CV, no availability banner), then the package kit fills the rest of the column as a ruled list.

Below the poster every section is full width. A case study is a two-track grid (media 1.35fr on lilac, body 1fr on ground) with a 1.39vw gutter. How I work comes straight after the poster, five ruled cells. Smaller work runs as ruled rows: capture (18vw), name and description, facts. Side projects sit in a fold with the catalogs. Tables (packages, catalogs) are multi-track grids with flush-right actions. On desktop a case body rides sticky beside a taller window. Section gutters are 1.39vw; content inside uses rem.

At 900px and below the sheet becomes a stack: the bar is one row of five equal tabs (the name and address live in the intro), the intro moves above the programme, the kit becomes one link to Packages, site rows float a 7.5rem capture with the text running round it, the programme goes full width with 13vw rows, every grid collapses to one `minmax(0, 1fr)` track, and side gutters become 1rem. Anchors land under the bar (3.25rem scroll padding; 4rem above 900px). A skip link leads to the content.

## Elevation & Depth

Flat. There is no shadow, blur or gradient anywhere. Depth comes from field colour and ink rules: a 4px rule closes the poster, divides programme from intro and closes each section; 2px rules do everything else. The lit programme row draws a 2px Paper rule along its bottom edge using an inset box-shadow; that is a rule drawn on the row, not elevation.

### Named Rules
**The Flat Sheet Rule.** Nothing lifts off the poster. State is shown by colour swaps (orange-lit, chip white, dimming to 0.35), never by shadow or movement.

## Shapes

Square everything: fields, bands, windows, cards, kit rows and the fold toggle are sharp-cornered, outlined in 2px ink where they need an edge. Two exceptions are part of the world: small outlined things (chips, tags, the install line, the window's Desktop/Mobile switch and Done button) have a 3px corner, and the live status dot is a circle. The fold toggle is a square 2px ink box with a drawn SVG plus that becomes a minus when open.

## Components

### Navigation (top bar)
- **Style:** sticky black bar, Paper text, tabs separated by 2px Bar Rule dividers. Tabs name the sections they jump to; a fold reached by its tab opens.
- **States:** links turn Signal Orange on hover; focus ring turns orange and sits inside the link (-3px offset).
- **Mobile:** name and address on the first row, five equal tabs below with a 2px top rule.

### Programme Row (signature)
- **Style:** full-width orange row, product name at display scale left, what it is flush right, 2px Ember Rule between rows.
- **Lit (hover or focus, or a pointed package is used by it):** background Burnt Orange, name in Paper, 2px Paper rule along the bottom. Instant swap, no transition; the swap is also the focus indicator.
- **Behaviour:** pointing at a row lights every package it uses and dims the rest to 0.35. A product with no packages lights and dims nothing.

### Package Kit
- **Desktop:** a ruled list filling the rest of the intro column: one row per package, name left, version right, 2px ink rule between rows, label type at 1.25 units, rows sharing the space equally.
- **Mobile:** the same links as wrapping outlined chips.
- **Lit:** fill turns Chip White; pointing at a package lights the products that use it.

### Chips
- **Style:** 2px ink outline, 3px corner, transparent, package name and version separated by 1em; sized in poster units (2.2 high, 0.55 padding), 2.25rem high on mobile.
- **Use:** under a case study or site row, naming the packages it is built from, each linking to npm.
- **Lit / hover:** fill turns Chip White.

### Section Band
- **Style:** an open section starts on a full-width Ink band: name in Paper at band scale, nudged down 0.1em; the count after a middle dot in Signal Orange. Folds keep the Warm Ground summary, so ink means open and ground means folded.

### Case Study
- **Style:** media on lilac (a live window, stacked demo windows with captions, a parts list, or a growth chart), body on ground: case title with an outlined tag, a meta line, the lead, "What I built" as a square-bulleted list, a spec list with Quiet labels and 25% ink hairlines, chips, then bold action links.

### Live Window
- **Style:** 2px ink frame, a Paper toolbar (host, Desktop / Mobile switch, Open ↗), then a 16:10 screen (4:5 under 600px). Desktop renders the site at 1280 wide scaled to fit; Mobile at a real 390 wide, centred on lilac. A capture shows until the site loads; meanwhile a Quiet status dot before the host blinks (two steps, no easing; still under reduced motion) and a corner label reads "Loading the live site…". Loaded, the dot turns Live Green. The site is framed only when the window comes within half a screen of view, so windows never race each other.
- **Use:** the cover button hands the site the pointer ("Click" or, without hover, "Tap" to use it here); while it is in use an ink Done button gives the page its scroll back, and a mouse leaving does too. An inactive site is inert, out of the tab order. Focus moves to Done on hand-off and back to the cover after. The width switch is labelled with the site's name. Never sticky.
- **Touch:** toolbar controls are at least 2.25rem high.

### Site Row
- **Style:** a 2px-framed capture (or the radio), then title with an outlined tag, an optional search line, a short description and chips, then the spec list in its own column. One ruled row each.

### Package Table
- **Style:** one 2px-ruled row per package: name, version, description with its install line (an outlined `npm i …` that selects in one click), "Used in" in Quiet, Demo and Source flush right. A row reached by its anchor fills Chip White.

### Fold (catalog disclosure)
- **Style:** native `<details>` on Warm Ground, headline-size summary with count, square plus/minus toggle at the right, 2px ink rule below; when open, a 2px rule also closes the summary.
- **Hover:** ground with 6% ink.
- **Motion:** height reveal of 220ms cubic-bezier(0.2, 0, 0, 1) via `::details-content` where supported; instant elsewhere and under reduced motion. A URL hash naming a fold opens it.

### Catalog Row
- **Style:** 2px ink top rule, name in 800 at 1.125rem, description up to 62ch, actions flush right. A template row names its actions: "Deploy on Railway" and "Source".

### Closing Row
- **Style:** the page ends on one more Signal Orange row: the address at max(2.5rem, 8.4vw), 700, Ember Rule below, Burnt Orange with Paper text on hover; the small footer links sit under it on the same orange.

## Do's and Don'ts

### Do:
- **Do** keep every first-viewport measure in vw or poster units above 900px so the poster scales as one sheet; switch to rem and a stack at 900px and below.
- **Do** separate fields with ink rules: 4px between the poster's major fields and to close a section, 2px everywhere else.
- **Do** show the real thing: live site windows with a capture underneath, npm versions read live, the Search Console readout hidden when unavailable.
- **Do** light related items through the hover and focus link, with instant colour swaps and dimming to 0.35.
- **Do** open every section on an ink band and add long catalogs inside a fold.
- **Do** name an action by what it does ("Deploy on Railway", "Open kino.net.pl", "On npm").
- **Do** use `minmax(0, 1fr)` for any track that holds windows or long words, so phones never pan sideways.

### Don't:
- **Don't** add shadows, gradients or blur; the only inset box-shadow allowed draws the lit row's Paper rule.
- **Don't** round corners beyond 3px, and only on small outlined things (the live dot's circle is the one other exception).
- **Don't** connect packages and products with drawn lines; the link is shown by lighting.
- **Don't** put numbers before product names, or type a usage figure that does not come from a live source.
- **Don't** introduce a second typeface or a fourth field colour.
- **Don't** set text below the caption floor (0.8125rem, 13px on the poster).
