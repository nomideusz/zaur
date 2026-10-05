---
name: zaur.app
description: Everything one maker builds and runs, listed as stocked parts in an industrial supply catalog.
colors:
  stock: "#ffffff"
  ink: "#141414"
  muted: "#55534c"
  rule: "#d8d4c8"
  tint: "#f4f3ee"
  green: "#2e6b30"
  green-deep: "#23552a"
  on-green: "#ffffff"
  on-green-soft: "#d3e6cd"
  mark: "#d9ead2"
typography:
  wordmark:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 900
    lineHeight: 0.85
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 125"
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(3.25rem, 6.5vw, 4.75rem)"
    fontWeight: 800
    lineHeight: 0.88
    letterSpacing: "-0.015em"
    fontVariation: "'wdth' 68"
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 5vw, 3.75rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "0.005em"
    fontVariation: "'wdth' 68"
  closing:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 3.6vw, 2.75rem)"
    fontWeight: 800
    lineHeight: 1
    fontVariation: "'wdth' 72"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 0.95
    fontVariation: "'wdth' 75"
  group:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    letterSpacing: "0.01em"
    fontVariation: "'wdth' 75"
  lede:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.125rem, 1.6vw, 1.3125rem)"
    fontWeight: 400
    lineHeight: 1.45
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'tnum'"
  table:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    fontFeature: "'tnum'"
  name:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 700
    fontVariation: "'wdth' 90"
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    letterSpacing: "0.06em"
    fontVariation: "'wdth' 85"
  command:
    fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace"
    fontSize: "0.875em"
rounded:
  none: "0px"
spacing:
  rail: "15.5rem"
  gutter: "clamp(1rem, 3.2vw, 3rem)"
  gap: "clamp(3.5rem, 7vw, 6rem)"
  sheet-max: "84rem"
components:
  rail:
    backgroundColor: "{colors.green}"
    textColor: "{colors.on-green}"
    width: "{spacing.rail}"
    padding: "1.75rem 1.5rem 1.5rem"
  rail-index-link:
    textColor: "{colors.on-green}"
    padding: "0.7rem 1.5rem"
  rail-index-link-hover:
    backgroundColor: "{colors.green-deep}"
  part-tab:
    backgroundColor: "{colors.green}"
    textColor: "{colors.on-green}"
    rounded: "{rounded.none}"
    padding: "0.1rem 0.45rem"
  order:
    backgroundColor: "{colors.green}"
    textColor: "{colors.on-green}"
    rounded: "{rounded.none}"
    padding: "0.6rem 0.95rem"
  order-hover:
    backgroundColor: "{colors.green-deep}"
  order-quiet:
    backgroundColor: "{colors.stock}"
    textColor: "{colors.green}"
    rounded: "{rounded.none}"
    padding: "0.6rem 0.95rem"
  order-quiet-hover:
    backgroundColor: "{colors.mark}"
  order-compact:
    padding: "0.4rem 0.75rem"
  install-cmd:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.45rem 0.65rem"
  finder-field:
    backgroundColor: "{colors.stock}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 0.75rem 0 1rem"
    height: "3.5rem"
  search-mark:
    backgroundColor: "{colors.mark}"
---

# Design System: zaur.app

## Overview

**Creative North Star: "The Parts Catalog"**

The site is an industrial supply catalog for software. Every app, package, skill and Railway template is a stocked part: it carries a part number on a green tab, a name, a spec table, and an order action (Open, Copy install, Deploy, Source). A green index rail runs down the left edge like the thumb index of a printed catalog, with live counts per section. The sheet to its right is white stock printed in black ink and divided by warm grey 1px rules. The apps get fine engineering line drawings with dimension lines and callouts. Templates get no drawing: they are a dense, grouped parts table.

The page reads as a reference document. It is dense and tabular and made of rules rather than boxes. Hierarchy comes from Archivo's width axis: heads are condensed, heavy and set in capitals, body text runs at normal width, and the wordmark is extended. Colour is limited to one deep catalog green, used only for indexing and ordering. There are no shadows, no gradients, no radii and no photography. All imagery is inline SVG line work.

Searching is the primary action. One field filters every section at once, highlights matches with a pale green mark, updates the rail counts live, and keeps every part number visible.

**Key Characteristics:**
- White stock (#ffffff), black ink (#141414), one catalog green (#2e6b30), warm grey rules (#d8d4c8).
- One family, Archivo variable (wght 100–900, wdth 62–125), separated by width rather than by a second typeface.
- Tabular figures everywhere (`font-variant-numeric: tabular-nums` on body).
- Square corners, 1px rules, 3px ink rules under section heads, no elevation.
- Every item is numbered: A (apps), P (packages), S (skills), T (templates). Template numbers count up from the oldest, so a new template never renumbers the others.
- Monospace appears only in install commands and key hints.

## Colors

The palette is a printed catalog: paper, ink, a grey rule, and a single spot colour.

### Primary
- **Catalog Green** (`green`): fills the index rail, the part-number tabs and the solid order buttons. It also colours action text: Deploy links, the copy-state word, the referral link, the closing email link, a zero-dependency count, the finder's focus outline, text selection, the scrollbar thumb, the caret, the favicon and `theme-color`.
- **Green Deep** (`green-deep`): the hover state of solid order buttons and rail index links. It is never used at rest.

### Neutral
- **Stock** (`stock`): the page background, the quiet order button and the finder field. Drawings also use it to knock out a dimension line behind a label.
- **Ink** (`ink`): all body text, drawing strokes, the 2px finder border, 1px rules at the top of spec lists and under table heads, 3px rules under section heads and above the close, and the default focus outline.
- **Muted Ink** (`muted`): secondary copy, such as section descriptions, hosts, table descriptions, the finder count, placeholders and the copyright line.
- **Warm Rule** (`rule`): 1px row dividers, the hairline grid between part cards (a 1px gap over a `rule` background), the install-command border and the kbd border.
- **Tint** (`tint`): the install-command well, and the scrollbar track. Nothing else.
- **On Green** (`on-green`) / **On Green Soft** (`on-green-soft`): text on the rail and tabs. Soft is for the rail's secondary text: the subtitle, counts, empty sections and the foot label. Rail dividers are `on-green` mixed at 35% into transparent.
- **Search Mark** (`mark`): pale green highlight on search hits, on a `:target` template row, and on hover of a quiet order button.

### Named Rules
**The Spot Colour Rule.** Green is the only hue. It marks indexing (rail, tabs) and ordering (actions). It never decorates content or fills a section background other than the rail. Do not add a second accent.

**The Mark Means Found Rule.** The pale green mark appears only where something was found or pointed at: a search hit, a `:target` row, or the hover of a quiet order button. Inside a green tab the mark inverts to on-green on green text.

## Typography

**Display Font:** Archivo variable, self-hosted (`/fonts/archivo-latin.woff2`, preloaded, `font-display: swap`), with `system-ui, sans-serif` fallback
**Body Font:** Archivo at normal width
**Label/Mono Font:** `ui-monospace, 'SF Mono', Menlo, Consolas, monospace` for commands only

**Character:** This is a single-family system. Archivo's width axis does the work a second typeface would usually do: condensed heavy caps for heads, a normal-width grotesque for reading, and an extended black wordmark.

### Hierarchy
- **Wordmark** (900, wdth 125%, 2.75rem → 2.25rem under 860px, lh 0.85): "ZAUR" on the rail. It is the only extended setting.
- **Display** (800, wdth 68%, clamp(3.25rem, 6.5vw, 4.75rem), lh 0.88, max 11ch, balanced): the single catalog headline.
- **Headline** (800, wdth 68%, clamp(2.5rem, 5vw, 3.75rem), lh 0.9, uppercase): section heads (APPS, PACKAGES, TEMPLATES).
- **Closing** (800, wdth 72%, clamp(1.75rem, 3.6vw, 2.75rem), lh 1, max 24ch): the contact line at the foot.
- **Title** (800, wdth 75%, 2.25rem, lh 0.95): app part names.
- **Group** (800, wdth 75%, 1.25rem, uppercase, 0.01em): template group rows, followed by a muted weight-500 count.
- **Name** (700, wdth 90%, 1.0625rem in tables): package, skill and template names. The rail index links use the same weight and width at 1.125rem.
- **Lede** (400, clamp(1.125rem, 1.6vw, 1.3125rem), lh 1.45, max 46ch): the first-person line beside the headline.
- **Body** (400, 1rem, lh 1.5, tabular figures): part descriptions (max 40ch), section descriptions (max 58ch), table descriptions (max 68ch).
- **Table** (0.9375rem): the base for every table. Links, hosts, spec lists and compact actions step down to 0.875rem.
- **Label** (700, wdth 85%, 0.75rem, uppercase): table heads (0.06em), spec terms (0.04em), and responsive data-labels. Related: the part tab (0.8125rem, 0.04em, sentence case on its ID). The finder label and rail subtitle (0.8125rem, 0.08em; the subtitle is 600) and the rail foot label (600, 0.75rem, 0.08em).
- **Drawing label** (600, wdth 80%, 12px in SVG units, 0.08em, uppercase): callouts and dimension text inside drawings.

### Named Rules
**The Width Axis Rule.** Make a new level by changing width and weight inside Archivo. Never add a second display family, a serif, or the system display face.

**The Monospace Means Command Rule.** Use monospace only for something you type: install commands in `<code>` and the `/` key hint in `<kbd>`. Package names stay in Archivo.

## Layout

**Frame.** On desktop the page is a two-column grid: a sticky full-height index rail (`rail`, 15.5rem) beside the sheet (`minmax(0, 1fr)`, max 84rem, horizontal padding `gutter`). The rail stacks the wordmark, subtitle, index and foot. The index starts 3rem below the subtitle and bleeds to the rail edges. The foot (contact) is pinned to the bottom with `margin-top: auto`.

**Intro.** A two-column grid (1.05fr / 1fr, gap clamp(2rem, 4vw, 4rem), bottom-aligned): the headline on the left, the lede on the right. The finder spans both columns below them. Sections follow, each separated by `gap` (clamp(3.5rem, 7vw, 6rem)). The first section (Apps) is pulled up to clamp(1rem, 2vh, 1.5rem) so that the first parts appear in the first viewport.

**Section head.** A 1fr / 1.4fr grid, bottom-aligned: the uppercase head on the left, a muted description (and any referral note) in the right column, closed by a 3px ink rule. Short sections (Skills) use a 1px rule instead.

**Parts grid.** `repeat(auto-fit, minmax(min(100%, 31rem), 1fr))` with a 1px gap over a `rule` background, so the hairlines between cards come from the grid itself. Each part is a 1fr / 1fr grid: drawing, then body. Odd parts have padding on the right and even parts on the left, so the content lines up with the sheet edges.

**Rhythm.** Measures in rem: 0.2–0.6rem inside cells, 0.85rem table cell padding, 1.25rem section-head bottom padding, 1.5rem part padding, 2.5rem close padding. Line lengths are capped in ch on every reading block.

**At 1100px and below:** parts lose their side padding. The packages table drops its header and each row becomes a grid (3.5rem / auto ×3 / 1fr). Version, Deps and Licence become inline cells that each print their own uppercase `data-label`, and the install command wraps to a full-width line.

**At 860px and below:** the frame becomes a single column. The rail turns static and runs across the top with `gutter` padding. Its index becomes a horizontal scroll strip (gap 1.25rem, no dividers, no hover fill, scrollbar hidden), and the rail foot is hidden; the closing footer carries contact instead. The intro and section heads stack. Each part stacks with its drawing capped at 22rem. The templates table turns into blocks: each row is a grid of 3.25rem tab / name / actions, then the description clamped to two lines at 0.875rem, then the stack (hidden when empty). Group rows become block headings. The Skills table becomes a 3rem / 1fr grid. The packages grid uses a 3rem first column, and the install command is capped at 100% width with an ellipsis on the command text.

**The Absorbs Growth Rule.** Templates go into named groups from a lookup list. A name that isn't listed falls into the last group, and numbering counts from the oldest. A new template therefore needs no layout, grouping or renumbering work.

## Elevation & Depth

The system is fully flat. There is no `box-shadow` and no gradient anywhere. Depth comes from printing techniques only: 1px warm rules between rows, 1px ink rules at the top of spec lists and under table heads, 3px ink rules that open each section and the close, the solid green rail, and the tint well behind install commands. A sticky rail is the only layered element.

### Named Rules
**The Printed Sheet Rule.** If an element needs separating, give it a rule. If it needs emphasis, make the rule heavier (1px → 2px → 3px ink) or use the green. Never lift it.

## Shapes

Every corner is square (`rounded.none`). That includes buttons, tabs, the finder field, the install well, the kbd and focus outlines. Borders are 1px for wells and quiet buttons, 2px ink for the finder, and 3px ink for section-opening rules. The only curves are in the drawings: envelope, tag, sun arc, record and tonearm, all drawn as strokes.

**Icons.** There is one 16px stroke family (`Icon.svelte`): 1.5 stroke, square caps, `currentColor`, sized 1em. The set is out ↗, down, copy, check and search. Icons only sit inside actions or the finder.

**Drawings.** The drawings (`Drawing.svelte`, viewBox 280×200) are ink-only line work. Object lines are 1.6, dimension and leader lines 0.75, and hidden lines 1 with a 4 3 dash. Round caps and joins. Arrowheads and callout dots are filled ink. Labels on a dimension line knock out the line behind them with a 6px `stock` paint-order stroke. The drawings are `aria-hidden` because every fact a callout states also appears in the spec list.

## Components

### Index Rail
A green thumb-index down the page edge.
- **Structure:** wordmark, then an uppercase subtitle ("Software catalog"), then the section index, then the foot ("Questions and work", email, GitHub).
- **Index link:** label on the left and live count on the right (weight 500, on-green-soft), 0.7rem 1.5rem padding, separated by 35% on-green rules. Hover fills with green-deep. A section with zero matches during a search turns on-green-soft.
- **Focus:** inside the rail the outline switches to on-green.

### Part Tab
A small green label carrying the part number (A1, P3, T42).
- **Style:** green fill, on-green text, 0.1rem 0.45rem padding, weight 700, wdth 85%, 0.8125rem, square.
- **Search:** a hit inside the tab inverts to an on-green mark with green text.
- Every listed item has a tab, in all sections and at all widths.

### Part Card + Spec List
App parts only.
- **Structure:** the drawing (centred vertically), then the body: tab, title, host (muted, 0.875rem), description (max 40ch), spec `dl`, and order button pinned to the bottom (`margin-top: auto`).
- **Spec list:** full width, opened by a 1px ink rule. Each row is a 6.5rem term column plus the value, 0.45rem vertical padding, with a 1px warm rule below. Terms are uppercase labels at 0.75rem.
- There is no background, border, radius or shadow. Card edges come from the 1px grid gap.

### Order Button
The catalog's "order" action.
- **Solid:** green fill and border, on-green text, 0.6rem 0.95rem padding, weight 700, wdth 90%, 0.9375rem, with a trailing out icon. Hover fills with green-deep (120ms ease-out).
- **Quiet:** stock fill, 1px green border, green text. Hover fills with mark. Used for Source on skills and Clear the search.
- **Compact (in table action cells):** 0.4rem 0.75rem, 0.875rem.

### Packages Table
- **Columns:** Part, Package (name + muted description + npm/Demo/Source links), Version, Deps, Licence, Install.
- **Head:** uppercase label row, closed by a 1px ink rule. Body rows use 1px warm rules.
- **Numbers:** right-aligned, with tabular figures. A dependency count of zero is set in green weight 700.
- **Live data:** version, dependencies and licence are fetched live from the npm registry, showing `…` while loading.

### Install Command (copy button)
- **Style:** the whole command is one button. Tint well, 1px rule border, 0.45rem 0.65rem padding, the command in monospace, then a state slot (min 4.5rem, green, weight 700) reading "Copy" with the copy icon. Hover darkens the border to ink.
- **Copied state:** the slot changes to the check icon and "Copied" for 1600ms. The button's `aria-label` names the full command.

### Templates Table (grouped)
- **Layout:** fixed table layout with columns at 4rem (no.), flexible (name + description), 12rem (stack), 9.5rem (actions). Rows are compact (0.55rem block padding, baseline-aligned).
- **Group row:** an uppercase Group-type heading with a muted count, 2rem space above and a 1px ink rule below.
- **Row:** bold name, then the muted description on the same line, ellipsized (the full text is in `title`). The stack is joined with " · " at 0.8125rem, weight 600, wdth 85%. Actions: "Deploy ↗" in green weight 700, then Source.
- **`:target`:** a row reached by its part-number anchor (`#T42`) gets a mark background.

### Finder (search with mark highlight)
- **Field:** labelled "Find a part" (uppercase label). The field has a 2px ink border, stock fill, 3.5rem height and 1.25rem input text, with the search icon on the left and a `/` kbd hint on the right (1px rule border, muted). Pressing `/` anywhere outside an input focuses the field.
- **Focus:** `:focus-within` adds a 3px green outline at offset 0. The input's own outline is removed because the field carries it.
- **Count:** a muted line below, `aria-live="polite"`: "96 parts in stock", or "N of 96 parts match" while searching.
- **Highlight:** every matched substring in IDs, names, descriptions, specs, stacks and site names is wrapped in `<mark>`. While searching, template descriptions unclamp and wrap so that a match near the end stays visible.

### Websites Line
Client and own sites are reduced to a single paragraph. It opens with a 1px ink rule after a `gap`, starts with a bold "Websites" in ink, then lists muted copy (max 90ch) with comma-separated links that never wrap internally.

### Close Footer
A 3px ink rule, 2.5rem 3rem padding, the Closing line ("Need a part that isn't listed, or want to work together?") with the email on its own line in green, then a muted 0.875rem line with copyright, source and register links.

### Links
Links inherit their colour. They have a 1px underline at 45% currentColor, offset 0.2em. On hover the underline becomes full currentColor at 2px (120ms ease-out).

### States
- **Empty search:** when nothing matches, all sections hide. A row appears with "Nothing in the catalog matches "…"." (1.25rem, weight 600) and a quiet order button, "Clear the search", which empties the field and refocuses it.
- **Registry down:** if any npm fetch fails, the packages description adds a bold ink line, "The npm registry didn't answer, so some figures are missing.", and the missing figures show as an em dash. There is no colour alarm and no banner.
- **Copied:** see Install Command.
- **Focus:** a 2px ink outline at offset 2px everywhere. It is on-green on the rail and a 3px green outline on the finder.
- **`:target`:** see Templates Table. Scrolling is smooth only under `prefers-reduced-motion: no-preference`, with a 1.5rem scroll padding.

## Do's and Don'ts

### Do:
- **Do** give every new item a part number on a green tab. Use the existing prefixes (A, P, S, T) and number templates from the oldest.
- **Do** separate with rules: 1px `rule` between rows, 1px ink to open a spec or table head, 3px ink to open a section.
- **Do** set new heads in Archivo 800 at wdth 68–75% and uppercase; set names at 700 / wdth 90%.
- **Do** keep figures tabular and right-align numeric columns.
- **Do** draw new app illustrations as ink line drawings: 1.6 object lines, 0.75 dimension and leader lines with arrowheads, dashed hidden lines, and uppercase callouts restating spec facts.
- **Do** phrase every action as an order verb with the out icon: Open, Deploy, Source, Copy.
- **Do** report failures in plain ink text beside the affected data, and fall back to an em dash.

### Don't:
- **Don't** build portfolio project cards: no thumbnails, screenshots, rounded tiles, hover lift or "View project" grids.
- **Don't** build a SaaS hero: no gradient band, no paired CTA buttons, no icon feature row, no logo strip, no stats band, and no testimonials or invented counts.
- **Don't** add shadows, gradients, border-radius, blur or glass. The sheet is flat printed stock.
- **Don't** introduce a second accent hue or use green as a section background outside the rail.
- **Don't** put a small uppercase kicker or eyebrow above a section head. The head itself is the label, with its description beside it.
- **Don't** use emoji, glyph or icon-font icons. Use the 16px, 1.5-stroke square-cap set only, and only inside actions or the finder.
- **Don't** use monospace for anything that isn't typed: commands and key hints only.
- **Don't** colour or fill the drawings beyond ink dots and arrowheads, and don't use them as decoration where no spec backs the callouts.
