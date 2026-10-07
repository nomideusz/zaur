---
name: zaur.app
description: One maker's whole estate drawn as a live infrastructure canvas, where the wires are the real imports.
colors:
  canvas: "#1d33b5"
  canvas-deep: "#16288f"
  on-canvas: "#f5f7ff"
  on-canvas-soft: "#c3ccff"
  node: "#f6f7fb"
  node-sunk: "#e9ebf4"
  node-ink: "#121633"
  node-muted: "#4b5175"
  app: "#ff6a4d"
  pkg: "#ffd43b"
  skill: "#5fe3a1"
  tpl: "#ff9ecb"
  site: "#8ed0ff"
  wire: "#ffe58a"
  live: "#1fbf6a"
  port-chip: "#fff3c4"
  port-chip-edge: "#e8c94a"
  zero: "#d4f5e2"
  on-zero: "#0d5a32"
typography:
  display:
    fontFamily: "'Funnel Display', 'Funnel Sans', system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 6.2vw, 5.25rem)"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.03em"
  closing:
    fontFamily: "'Funnel Display', 'Funnel Sans', system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 3.6vw, 2.75rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline-lead:
    fontFamily: "'Funnel Display', 'Funnel Sans', system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 2.6vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  title:
    fontFamily: "'Funnel Display', 'Funnel Sans', system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  title-sm:
    fontFamily: "'Funnel Display', 'Funnel Sans', system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  wordmark:
    fontFamily: "'Funnel Display', 'Funnel Sans', system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.02em"
  lede:
    fontFamily: "'Funnel Sans', system-ui, sans-serif"
    fontSize: "clamp(1.0625rem, 1.5vw, 1.25rem)"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "'Funnel Sans', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  node-body:
    fontFamily: "'Funnel Sans', system-ui, sans-serif"
    fontSize: "0.9688rem"
    fontWeight: 400
    lineHeight: 1.5
  ui:
    fontFamily: "'Funnel Sans', system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
  label:
    fontFamily: "'Funnel Sans', system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
  mono:
    fontFamily: "'Martian Mono', ui-monospace, Menlo, monospace"
    fontSize: "0.72rem"
    fontWeight: 600
    fontFeature: "'tnum'"
rounded:
  tag: "5px"
  chip: "6px"
  deploy: "7px"
  cmd: "8px"
  btn: "9px"
  readout: "10px"
  finder: "12px"
  node: "14px"
  pill: "999px"
spacing:
  gutter: "clamp(1rem, 3vw, 2.75rem)"
  node-gap: "1.25rem"
  column-gap: "4rem"
  node-pad: "1rem"
  canvas-max: "94rem"
components:
  node:
    backgroundColor: "{colors.node}"
    textColor: "{colors.node-ink}"
    rounded: "{rounded.node}"
  node-head-app:
    backgroundColor: "{colors.app}"
    textColor: "{colors.node-ink}"
    padding: "0.7rem 1rem 0.65rem"
  node-head-pkg:
    backgroundColor: "{colors.pkg}"
    textColor: "{colors.node-ink}"
    padding: "0.7rem 1rem 0.65rem"
  node-head-skill:
    backgroundColor: "{colors.skill}"
    textColor: "{colors.node-ink}"
    padding: "0.7rem 1rem 0.65rem"
  node-head-tpl:
    backgroundColor: "{colors.tpl}"
    textColor: "{colors.node-ink}"
    padding: "0.7rem 1rem 0.65rem"
  node-head-site:
    backgroundColor: "{colors.site}"
    textColor: "{colors.node-ink}"
    padding: "0.7rem 1rem 0.65rem"
  peek:
    backgroundColor: "{colors.node-sunk}"
    aspectRatio: "16 / 10"
  peek-cta:
    backgroundColor: "{colors.node-ink}"
    textColor: "#ffffff"
    typography: "{typography.label}"
    rounded: "{rounded.deploy}"
    padding: "0.32rem 0.65rem"
  peek-cta-hover:
    backgroundColor: "{colors.canvas}"
  peek-dot:
    backgroundColor: "rgb(255 255 255 / 0.45)"
  peek-dot-on:
    backgroundColor: "{colors.pkg}"
  button:
    backgroundColor: "{colors.node-ink}"
    textColor: "#ffffff"
    typography: "{typography.ui}"
    rounded: "{rounded.btn}"
    padding: "0.5rem 0.95rem"
    height: "2.5rem"
  button-hover:
    backgroundColor: "{colors.canvas}"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.node-ink}"
    rounded: "{rounded.btn}"
    padding: "0.5rem 0.95rem"
  button-quiet-hover:
    backgroundColor: "{colors.node-sunk}"
  button-light:
    backgroundColor: "{colors.node}"
    textColor: "{colors.node-ink}"
    rounded: "{rounded.btn}"
    padding: "0.5rem 0.95rem"
  deploy:
    backgroundColor: "{colors.node-ink}"
    textColor: "#ffffff"
    rounded: "{rounded.deploy}"
    padding: "0.3rem 0.65rem"
  install-cmd:
    backgroundColor: "{colors.node-ink}"
    textColor: "#e3e6ff"
    rounded: "{rounded.cmd}"
    padding: "0.5rem 0.6rem"
  install-cmd-hover:
    backgroundColor: "{colors.canvas-deep}"
  part:
    typography: "{typography.mono}"
    rounded: "{rounded.tag}"
    padding: "0.15rem 0.4rem"
  version:
    backgroundColor: "{colors.node-ink}"
    textColor: "#ffffff"
    rounded: "{rounded.chip}"
    padding: "0.2rem 0.45rem"
  port-chip:
    backgroundColor: "{colors.port-chip}"
    textColor: "{colors.node-ink}"
    rounded: "{rounded.pill}"
    padding: "0.15rem 0.5rem"
  port-chip-hover:
    backgroundColor: "{colors.pkg}"
  fact:
    backgroundColor: "{colors.node-sunk}"
    textColor: "{colors.node-muted}"
    rounded: "{rounded.tag}"
    padding: "0.15rem 0.45rem"
  fact-zero:
    backgroundColor: "{colors.zero}"
    textColor: "{colors.on-zero}"
  readout:
    backgroundColor: "{colors.node-ink}"
    textColor: "{colors.node}"
    rounded: "{rounded.readout}"
    padding: "0.8rem 0.9rem"
  finder:
    backgroundColor: "{colors.node}"
    textColor: "{colors.node-ink}"
    rounded: "{rounded.finder}"
    padding: "0 0.6rem 0 1rem"
    height: "3rem"
  nav-link:
    textColor: "{colors.on-canvas}"
    rounded: "{rounded.pill}"
    padding: "0.4rem 0.7rem"
  count-pill:
    backgroundColor: "{colors.canvas-deep}"
    textColor: "{colors.on-canvas}"
    rounded: "{rounded.pill}"
    padding: "0.2rem 0.7rem"
  logo:
    backgroundColor: "{colors.node}"
    textColor: "{colors.node-ink}"
    typography: "{typography.wordmark}"
    rounded: "{rounded.btn}"
    padding: "0.35rem 0.7rem 0.3rem"
---

# Design System: zaur.app

## Overview

**Creative North Star: "The Deploy Canvas"**

The whole page is one live infrastructure canvas. A drenched cobalt ground with a fine white dot grid runs edge to edge. Every app, package, skill and template is a node on it: a cool off-white panel with rounded corners and a soft shadow, headed by a flat family colour. Pale-yellow bezier wires run port to port, and each wire is a real import from an app's `uses` list. Hover or focus a node and its wires light while everything unreached fades to grey, and yellow packets run along the lit wires. Every app and website node carries a peek strip under its header: the project's real screens, scrubbed with the pointer on a mouse or swiped on touch, so the whole estate can be browsed without opening anything. A click on the strip opens a Look inside dialog, and the frame morphs into the dialog's plate. On wide screens nodes drag by their header and the wires follow. Package versions are read live from npm, and the lead app's search clicks are read live from Search Console.

The canvas is busy on purpose. It is dense with real objects, and the cobalt holds them together. Headings sit directly on the canvas in white Funnel Display. Everything you read or act on lives inside a node. Colour has a job: the header hue says what family a node belongs to, yellow says "wire or current", and green says "live". Nothing is decoration.

This world replaced the earlier "Parts Catalog" (white stock, black ink, one spot green, Archivo, hairline rules). The confirmed anti-references are that catalog and the maker's sibling sites, kurcz.pl and Friendly Festivals. That rules out a white sheet with black ink and one spot colour, condensed grotesk display faces, and the kit of hairline rules with uppercase tracked labels.

**Key Characteristics:**
- Cobalt canvas (`canvas`) with a 22px dot grid owns every viewport. Nothing else is a page background.
- Off-white rounded nodes (14px) with soft, blue-tinted, downward shadows.
- Five family header colours: coral apps, yellow packages, mint skills, pink templates, sky websites.
- Peek strips: real screenshots of szkolyjogi.pl and every website, inside the node under its header, captured from the live page; the dialog says so with the date. The other apps and the packages carry no images, except zaur-world, which runs its live sky in that band.
- Wires are only real imports. They draw in once on first paint, light up on trace, and carry moving packets while lit.
- Funnel Display for headings, Funnel Sans for everything read, and Martian Mono only for typed or versioned tokens.
- Live data (npm versions, Search Console clicks) is shown with its source. A failure shows an em dash, never a typed-in number.

## Colors

The palette is a saturated cobalt ground with off-white panels and four bright, flat family hues, wired together in pale yellow.

### Primary
- **Drench Cobalt** (`canvas`): the page, the sticky top bar, `theme-color`, the hover fill of solid buttons and Deploy links, the finder caret, and the focus colour inside nodes.
- **Deep Cobalt** (`canvas-deep`): recessed things on the canvas, namely the node-count pill, the install-command hover and the scrollbar track.

### Secondary (family headers)
- **Signal Coral** (`app`): app node headers and the Look inside dialog header.
- **Package Yellow** (`pkg`): package node headers. It also means "current": a lit wire while tracing, the focus ring on the canvas and around the finder, text selection, search `<mark>`, the copy-state word, the in-text links on cobalt ("Put the nodes back", the close email) and the port-chip hover.
- **Skill Mint** (`skill`): skill node headers.
- **Template Pink** (`tpl`): template family node headers. A `:target` template row is tinted with a pale pink (#fff0f7).
- **Site Sky** (`site`): website node headers, and the Look inside header when a website is open.

### Tertiary
- **Wire Cream** (`wire`): wires at rest (2px, 70% opacity) and the stroke of the port dots where wires plug into node edges.
- **Live Green** (`live`): the status dot beside live data only, with a 4px 25% halo. When the data is down, the dot turns slate (#6b7199) with no halo.
- **Port Chip** (`port-chip`, edge `port-chip-edge`): the "Imports" chips naming the packages an app is wired to.
- **Zero** (`zero` / `on-zero`): the "0 deps" fact on a package, and nowhere else.

### Neutral
- **On Canvas** (`on-canvas`): headlines, frame labels and nav on cobalt.
- **On Canvas Soft** (`on-canvas-soft`): the lede, frame notes, meta lines, empty nav sections and the copyright line on cobalt (6.1:1).
- **Node** (`node`): node panels, the finder, the logo chip, the light button, the dialog and the fill of port dots.
- **Node Sunk** (`node-sunk`): recessed elements inside nodes: facts, tags, the kbd hint, the quiet-button hover and template row dividers.
- **Node Ink** (`node-ink`): all text in nodes, plus the dark fills (buttons, Deploy, install command, version chip, live readout).
- **Node Muted** (`node-muted`): secondary node text such as key labels, notes, template descriptions and placeholders (7.2:1 on node).

### Named Rules
**The Drenched Canvas Rule.** Cobalt is the only page background, edge to edge, with its dot grid. There are no white sections, no bands and no gradients. Off-white exists only as a node.

**The Family Header Rule.** A node's header colour names its family and nothing else. A new kind of thing gets a new family hue as a flat header, never a tint, gradient or accent stripe.

**The Green Means Live Rule.** Live Green appears only on the status dot next to data fetched live: the Search Console readout and the live sky's tag. A static figure never gets a dot.

## Typography

**Display Font:** Funnel Display (variable 300–800), self-hosted, latin + latin-ext, with Funnel Sans and `system-ui` fallback
**Body Font:** Funnel Sans (variable 300–800), self-hosted, latin + latin-ext
**Label/Mono Font:** Martian Mono (variable 100–800), self-hosted, latin + latin-ext

Display and Sans latin files are preloaded in `app.html`. All faces use `font-display: swap` and are split by `unicode-range`, so Polish names load the latin-ext file.

**Character:** Funnel Display is wide, round and confident at 700 with tight negative tracking. Funnel Sans is its plain working partner. Martian Mono is wide and technical, and it is kept small so it reads as a stamped token, not as text.

### Hierarchy
- **Display** (700, clamp(2.75rem, 6.2vw, 5.25rem), lh 0.98, -0.03em, balanced): the single canvas headline, white on cobalt.
- **Closing** (700, clamp(1.75rem, 3.6vw, 2.75rem), lh 1.1): the contact line at the foot, with a yellow 3px-underlined email.
- **Headline Lead** (700, clamp(1.75rem, 2.6vw, 2.25rem)): the names of lead app nodes.
- **Title** (700, 1.375rem): frame labels on the canvas (Apps, Packages, Railway templates, Websites) and app node names. **Title Sm** (1.125rem) is for package and template-family node names. The dialog title is 1.5rem.
- **Wordmark** (800, 1.25rem, +0.02em): "ZAUR" in an off-white chip.
- **Lede** (400, clamp(1.0625rem, 1.5vw, 1.25rem), lh 1.5, max 46rem): the first-person line under the headline, in on-canvas-soft.
- **Body / Node Body** (400, 1rem / 0.9688rem, lh 1.5, max 46ch): descriptions. The lead node uses 1.0625rem and package nodes 0.9063rem.
- **UI** (600–650, 0.9375rem): nav links, buttons, template names.
- **Label** (500–600, 0.8125rem): hosts, tags, "Imports", template actions. Sentence case, no tracking.
- **Mono** (600, 0.68–0.75rem, tabular): part numbers, versions, port chips, install commands, the `/` kbd hint.

### Named Rules
**The Typed Token Rule.** Martian Mono is only for part numbers (A1, P3, T42), versions, port chips, install commands and the kbd hint. Counts, hosts, facts (deps, licence), key/value lists and live figures are Funnel Sans with tabular figures.

**The No Eyebrow Rule.** No small uppercase or tracked label ever sits above a heading. A frame label is the heading itself, and its count and note sit inline after it (a `.n` count at 0.78em/600, a `frame-note` in Sans 0.875rem).

## Layout

**Frame.** A sticky top bar on cobalt (logo chip, section nav with live counts, finder, contact) above a centred canvas (max `canvas-max`, side padding `gutter`). The bar separates itself with a 1px white 12% line and a soft cobalt shadow, not a fill change.

**Graph (above 1280px).** Three columns (1.1fr / 1.9fr / 1fr, column gap `column-gap`). Lead apps fill the left column and the other apps the right one under a "More apps" label, unless a node's `column` says otherwise: a node with no wires can sit in the middle under the packages (Music), and a lead can go right (Friendly Festivals), both only to keep the three columns level. Packages fill the middle in two inner columns (2.25rem apart, so wires into the right column stay visible), with the skill after them. Packages take the middle so every wire is short and fans in from both sides. Nodes stack with `node-gap`.

**1100–1280px.** Two columns (1.25fr / 1fr). Apps become one column with the skill moved after them, packages become one column, and the "More apps" label goes away.

**860px and below.** The bar stops being sticky, and its nav becomes a full-bleed horizontal scroll row under the logo and finder. The graph becomes one column with a 3rem gap. Wires and ports are hidden, and dragging and the trace hint are off. Template rows put name and actions on one line, with the description clamped to two lines below. Dialog plates stack.

**Templates.** Family nodes flow in CSS columns (`columns: 3 22rem`, 1.25rem gap, `break-inside: avoid`). Templates are grouped by `template-kinds.ts`. Any name that isn't listed falls into the last group, and numbering counts up from the oldest (T1 is oldest). Adding a template needs no layout work.

**Websites.** The section sits between the graph and the templates, because the page is a portfolio and the websites are the maker's own history. It uses the same `frame__top` as templates: the label "Websites" with its count, and beside it the honest paragraph (making websites since 2000, by hand until AI took over, this page being the proof). The paragraph speaks about the maker's history in general and never says which site was made which way. Below, a strict four-column grid (two columns to 1100px, one at 860px, 1.25rem gap) of sky-headed nodes. One site is the **lead** (`lead: true`, Pikastro): its node spans the whole row with its first screen as a large plate on the left (1.6fr) and the name at headline-lead size, host, description at 1.0625rem, spec rows and Open on the right; on phones it stacks like any node. Every other node shows **fragments**: one captured detail per page (`<id>-f1.webp`…, a 16:10 clip around the element that matters, taken at 2× from the live page), so each card reads as a detail of the real site (a logo, a hero line, the chair, the needle, the anatomy drawing) rather than a shrunken page. Frame k of the strip is page k of the dialog, so the scrub, dots and Look inside still work and the dialog shows the whole pages. Then the description, flat spec rows (what is inside: a custom CMS, five mini-apps, thousands of map points) and a quiet Open button. Adding a site needs an entry in `websites` with its spec rows, its frames and a fragment per frame.

**The two project families.** An app is something people use that keeps state: accounts, data, bookings, orders, a live engine (Szkoły Jogi, Fixtar, Mail, Register, Dino, Music, thebest.travel, Friendly Festivals). A website is something people read or look at, however it was built (Pikastro, tutitutu, kurcz.pl and the rest). The relationship to the maker is a separate axis and lives in the `tag` chip inside the node, never in the section: "Client work" (Fixtar among the apps; Pikastro, tutitutu, Wibroakustyka, Intertech and the clinic among the websites), "Experiment" (recycling, Kruk, Radio Bartek), or no tag for the maker's own. No label claims how a particular site was built.

**Rhythm.** Sections are separated by fluid gaps: hello clamp(2.5rem, 6vw, 4.5rem) on top, websites and templates clamp(4rem, 8vw, 6.5rem) each, close clamp(4rem, 9vw, 7rem). Node bodies use 1rem padding with 0.85rem between items. Packages use 0.85–0.9rem, and the lead uses 1.15–1.3rem.

### Named Rules
**The Real Wires Rule.** A wire is drawn only for an entry in an app's `uses` array, and only while both ends are on the canvas (search can remove either end). Never draw a decorative or inferred connection.

## Elevation & Depth

Depth is layered: flat canvas, a dot grid, then nodes lifted on soft, blue-tinted shadows that fall downward. Wires run under the nodes (z 0). Port dots sit above them (z 6), so each wire visibly plugs into an edge.

### Shadow Vocabulary
- **Rest** (`0 14px 28px -12px rgb(6 12 64 / 0.6), 0 2px 5px rgb(6 12 64 / 0.28)`): every node, the finder and the logo chip.
- **Lift** (`0 26px 44px -14px rgb(6 12 64 / 0.7), 0 4px 10px rgb(6 12 64 / 0.3)`): a node being dragged (`held`, z 5) and the Look inside dialog.
- **Bar** (`0 1px 0 rgb(255 255 255 / 0.12), 0 12px 24px -18px rgb(6 12 64 / 0.9)`): the sticky top bar.

### Named Rules
**The Soft Lift Rule.** Shadows are soft, cobalt-tinted and fall downward. A node lifts only while held. There are no hard offset shadows, no glows (the live dot's halo is the one exception), and no hover lift.

## Shapes

Everything is rounded, and the radius steps down with the size of the object. Nodes are 14px. The finder is 12px, the readout 10px, buttons and the logo 9px, the install command and plate images 8px, Deploy 7px, version chips, kbd and focus rings 6px, and part and fact tags 5px. Nav links, count pills, tags and port chips are full pills. A node header takes the node's top radius. Port dots are 5.5px circles with a 3px wire stroke.

**Icons.** There is one 16px stroke set (`Icon.svelte`): 1.5 stroke, square caps, `currentColor`, sized 1em. It is used only inside actions and the finder (out, copy, check, search).

## Components

### Node
The canvas object.
- **Shape:** off-white panel, 14px radius, Rest shadow. A flat family-colour header holds a mono part number (on an ink 12% wash), the display-face name and a Sans host line (ink at 72%). Packages add a dark mono version chip at the right of the header.
- **Peek strip:** between header and body on the szkolyjogi.pl app node and every website node (see Peek Strip below). Other app nodes and packages are text only; zaur-world alone keeps a band, its Live Sky.
- **Body:** description, then any facts, key/value list, imports, and actions.
- **Trace:** hovering or focusing a node sets it active. Its wires go to package yellow at 3px, other wires drop to 14%, port dots drop to 50%, and every unreached node dims. Each lit wire also gets a `flow` twin: a 3px yellow dashed path (`0.03 0.07` of the path length) whose dashes move toward the app at 0.2 path lengths a second, so imports visibly arrive. Flow exists only while tracing and only without reduced motion.
- **Drag:** at 861px and wider, app and package headers show a grab cursor and drag by pointer. Wires re-route live. "Put the nodes back" appears in the meta line once anything has moved.

### Template Family Node
Pink-headed node per kind with a count, flowing in columns. Rows are a three-column grid: mono part number, then name over an ellipsized muted description (full text in `title`, unclamped while searching), then actions (a dark Deploy pill and a muted Source link). Rows are divided by a 1px inset `node-sunk` line.

### Peek Strip
The project's real screens inside its node, so it can be browsed without opening it.
- **Shape:** a 16:10 band directly under the header, `node-sunk` behind the frames, a 1px `node-sunk` line below. The strip shows the project's **fragments** when it has them (one captured detail per page, a 16:10 clip around the element that matters, taken at 2× from the live page and named `<id>-f<n>.webp`), otherwise its whole-page frames (1200×750, cover from the top). Frame k of the strip is page k of the dialog. Only szkolyjogi.pl, in the graph, shows fragments; every website shows whole first screens, Pikastro as the full-width lead and the rest two to a row with the description and Open beside the spec rows.
- **Scrub:** on a mouse, the pointer's x position across the strip picks the frame (`floor(x / width × n)`), and the film slides with a 260ms ease-out. Leaving the strip returns to the first frame. On touch (`hover: none`) the film is a scroll-snap row and swipes.
- **Dots:** bottom-left, one per frame in an ink 72% pill. Rest dots are white 45%; the current dot is package yellow at 1.25× (yellow says current). A single-frame strip has no dots.
- **Look inside:** an ink pill (label type, 7px radius) bottom-right. On a mouse the whole strip is the button (cursor `zoom-in`); on touch only the pill is, so a swipe reaches the film. Hover and focus turn the pill cobalt. The accessible name says how many screens there are.
- **Morph:** the active frame and the dialog's plate share `view-transition-name: plate`. Opening and closing run inside `document.startViewTransition` (440ms ease-out group, 240ms root fade), and fall back to an instant open where unsupported or with reduced motion.

### Live Sky
zaur-world's node runs the real `@nomideusz/zaur-world` sky in its band, live and spanning both package columns (sky left, description right, stacked under 861px), keyed to the visitor's own place and weather. It is the honest version of a screenshot for a package whose whole point is being live, and it replaced a separate Dino app node, since dino.zaur.app is this package's demo.
- **Loading:** the engine is imported only when the node comes within 240px of the viewport, and the render loop pauses whenever the node leaves it. The dot grid and the engine's page-level CSS variables are off (`gridColor: null`, `atmosphereRoot: null`), so the sky never leaks onto the canvas.
- **Live tag:** top-left, an ink 72% pill with the Live Green dot (grey while loading or down) and the visitor's city, temperature and conditions from the engine itself. It reads "Reading your sky…" until the first conditions arrive.
- **Scenes:** six dots bottom-left (Now, dawn, noon, golden hour, dusk, night) in the peek-dot style, each a real button. On a mouse the pointer's x across the band picks the scene through the engine's `preview()`, anchored to the visitor's real sun times; leaving the band returns to now. Bottom-right, where other strips say Look inside, a label names the scene, or "Live".
- **No dialog:** there is nothing to look inside; the Demo link (dino.zaur.app) in the node's links is the way in.

### Account Cluster
Mail, Register and Music share one Zaur account, so they sit inside one labelled boundary in the right graph column: a 1px white 28% line (the bar's own line) with a radius of the node radius plus its padding, and above it the label "One Zaur account" in UI type with "Register creates it; Mail and Music sign in with it." in `on-canvas-soft`. It is structure on the canvas, like a network boundary, not a wire: wires stay real imports only. Nodes inside keep every behaviour, including drag.

### Key/Value List
Flat rows: a 6rem muted term (500) and a 600 value, in Funnel Sans at 0.875rem, with a 0.45rem row gap. No fills, boxes or rules.

### Live Readout
A dark ink well (10px radius) with the Live Green dot, a 1.5rem white tabular figure, the claim, and its source in a small `#aeb4d6` line ("Google Search Console, last 7 days"). While loading it shows `…`, and when down it shows `—`.

### Buttons
- **Solid:** ink fill, white 650 text, 9px radius, 2.5rem min height, trailing out icon. Hover is cobalt and active nudges down 1px (120ms ease-out).
- **Quiet:** transparent with a 1.5px ink inset ring. Hover is `node-sunk`.
- **Light:** off-white on cobalt (Clear the search), with a yellow focus ring.
- **Text link button** (`.link`): yellow, underlined, on cobalt.

### Install Command
The whole command is one ink button. The mono command (0.7rem, wraps anywhere) is on the left, and a yellow "Copy" / "Copied" state with an icon is on the right. Copied lasts 1600ms. Hover is deep cobalt, and `aria-label` names the full command.

### Chips
- **Facts:** sunk 5px tags, Sans 600 0.78rem tabular (deps, licence). "0 deps" uses `zero`.
- **Port chips:** cream pills with a 1px inset gold edge, mono 0.7rem, linking to `#pkg-…`. Hover is package yellow.
- **Tag:** sunk pill, Sans 600 0.8125rem ("Client work").

### Navigation
The bar nav has pill links (600, 0.9375rem) with live `.n` counts, a 12% white hover fill, and on-canvas-soft when a section has zero matches.

### Finder
An off-white 3rem field (12px radius, Rest shadow) with a search icon, a placeholder of real queries, and a mono `/` kbd. `/` anywhere focuses it. `:focus-within` draws a 3px yellow ring. It filters every node, the wires and the counts live, and marks hits in yellow.

### Look Inside Dialog
A native modal `<dialog>` that is one big node: a family header (coral for apps, sky for websites) with the part number, the name, the host and a quiet Close; the plate; a thumbnail row; and the open link. Off-white, 14px radius, Lift shadow, over a cobalt 70% backdrop, max `76rem` wide and scrollable past `100dvh − 2rem`. Esc (`oncancel`) and a backdrop click close through the morph.
- **Plate:** the selected frame is shown whole, fitted inside the row and `min(62dvh, 46rem)` tall, centred, with its description as the figcaption. The dialog never crops a plate; only the strip does. A phone capture, when there is one, sits beside it at `min(13rem, 22vw)` and stacks under it at 860px and below.
- **Thumbs:** 7.5rem tabs for every frame, 60% at rest, 85% on hover, full with a 2px package-yellow ring when selected. Left and right arrows change the frame.
- **Provenance:** the foot says where the pixels come from: "Captured from the live site on 7 October 2026". Beside it, a solid Open (or Sign in to) button and a Source link.

### Focus
3px outline with a 2px offset and 6px radius. It is yellow on cobalt and cobalt inside nodes and the dialog (each sets `--focus`).

### Named Rules
**The Flat Spec Rule.** Key/value lists inside nodes are flat text rows. No fill boxes, cards or rules inside a node to hold them.

**The Grey Fade Rule.** Untraced nodes fade with `opacity: 0.4` plus `filter: grayscale(1)`, never opacity alone. Opacity alone turns the family hues into muddy tints on cobalt.

**The Pink Family Rule.** Templates are pink-headed family nodes on the canvas. Never a white sheet, a table or a list outside a node.

**The Hashed Asset Rule.** Assets in `src/lib` (the plates) are imported so they get hashed URLs. `static-server.mjs` serves every non-HTML file as `immutable`, so an unhashed path never refreshes.

## Do's and Don'ts

### Do:
- **Do** put every new thing on the canvas as a node with a family header, a mono part number (A, P, S, T, with templates numbered from the oldest) and a display-face name.
- **Do** add a wire only by adding the package to the app's `uses` array.
- **Do** show live figures only with their source and window, `…` while loading and `—` on failure, beside the Live Green dot.
- **Do** keep headings on cobalt in Funnel Display 700 with negative tracking, and put counts inline after them in Sans.
- **Do** dim with `opacity: 0.4` plus `grayscale(1)`.
- **Do** import new images from `src/lib` so they get hashed URLs.
- **Do** give every new app or website plates: capture the live page at 1440×900 (scaled to 1200 wide) and 390×844 with scrollbars hidden, save them as `src/lib/plates/<id>-<n>.webp` and `<id>-phone.webp`, and describe each frame in `plates.ts` in the project's own words. Each frame is a deliberately chosen page or state (a studio profile, a product page, the sky at noon), never a scroll offset, and no two frames of one project should look alike. A project without plates renders without a strip; never stand in with a mock or illustration.

### Don't:
- **Don't** use a white sheet with black ink and one spot colour, or any printed-document look (the old Parts Catalog, kurcz.pl, Friendly Festivals).
- **Don't** use condensed grotesk display faces (Archivo, condensed widths) or the system display face.
- **Don't** use the hairline-rule plus uppercase-tracked-label kit, or put eyebrow labels above headings.
- **Don't** set counts, hosts, facts or key/value values in Martian Mono. It is only for part numbers, versions, port chips, install commands and the kbd hint.
- **Don't** put fill boxes inside nodes around key/value lists.
- **Don't** draw a template as a white sheet or a table. It belongs in a pink-headed family node.
- **Don't** draw wires that aren't real imports.
- **Don't** use hard offset shadows, glows outside the live dot, or hover lift.
- **Don't** fabricate figures, counts or testimonials. Show a usage number only when it comes from a live source.
- **Don't** show a screenshot without saying where it came from. The dialog always names the source (a live capture with its date).
- **Don't** make the peek strip the only way to open a project. The Open or Sign in link stays in the node's actions.
