---
name: Stats
description: Every site the owner runs, one white line each on matte black, read like a catalogue.
colors:
  ground: "#0a0a0a"
  raised: "#151514"
  ink: "#f4f4f0"
  soft: "#a6a6a0"
  rule: "#2c2c2a"
  rule-strong: "#6a6a64"
  quiet-line: "#6e6e69"
  warn: "#e8b400"
  src-direct: "#f4f4f0"
  src-search: "#2d6be4"
  src-social: "#e4322b"
  src-ai: "#f0b400"
  src-rest: "#21a366"
  ground-light: "#f4f4f0"
  raised-light: "#ffffff"
  ink-light: "#0a0a0a"
  soft-light: "#6a6a64"
  rule-light: "#d4d4ce"
  rule-strong-light: "#85857f"
  quiet-line-light: "#85857f"
  warn-light: "#8a6500"
  src-direct-light: "#0a0a0a"
  src-search-light: "#1f56c9"
  src-social-light: "#b81f1a"
  src-ai-light: "#c49a00"
  src-rest-light: "#12804c"
typography:
  wordmark:
    fontFamily: "'Archivo Variable', Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "0.14em"
    fontVariation: "'wdth' 125"
  display:
    fontFamily: "'Archivo Variable', Arial, sans-serif"
    fontSize: "34px"
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: "-0.015em"
  title:
    fontFamily: "'Archivo Variable', Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.35
  section:
    fontFamily: "'Archivo Variable', Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "'Archivo Variable', Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.35
  caption:
    fontFamily: "'Archivo Variable', Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.35
  figure-lead:
    fontFamily: "'JetBrains Mono Variable', ui-monospace, Consolas, monospace"
    fontSize: "34px"
    fontWeight: 400
    lineHeight: 1
  figure-live:
    fontFamily: "'JetBrains Mono Variable', ui-monospace, Consolas, monospace"
    fontSize: "28px"
    fontWeight: 400
    lineHeight: 1.1
  figure-credit:
    fontFamily: "'JetBrains Mono Variable', ui-monospace, Consolas, monospace"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.35
  figure-row:
    fontFamily: "'JetBrains Mono Variable', ui-monospace, Consolas, monospace"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.35
  figure-list:
    fontFamily: "'JetBrains Mono Variable', ui-monospace, Consolas, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.35
  figure-small:
    fontFamily: "'JetBrains Mono Variable', ui-monospace, Consolas, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.35
rounded:
  none: "0px"
spacing:
  page-x: "28px"
  page-x-phone: "16px"
  step-4: "4px"
  step-6: "6px"
  step-8: "8px"
  step-12: "12px"
  step-14: "14px"
  step-16: "16px"
  step-18: "18px"
  step-24: "24px"
  step-28: "28px"
  step-40: "40px"
components:
  seg-link:
    textColor: "{colors.soft}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0 11px"
    height: "30px"
  seg-link-hover:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
  seg-link-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
  field:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0 10px"
    height: "32px"
  button:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0 10px"
    height: "32px"
  button-hover:
    backgroundColor: "{colors.raised}"
  reading-tip:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.none}"
    padding: "4px 8px"
  source-strip:
    rounded: "{rounded.none}"
    width: "96px"
    height: "10px"
  source-chip:
    rounded: "{rounded.none}"
    size: "10px"
  legend-chip:
    rounded: "{rounded.none}"
    width: "12px"
    height: "10px"
---

# Design System: Stats

## Overview

**Creative North Star: "The Catalogue Pulse"**

Stats reads like a record catalogue printed on a matte black sleeve. Every site is an entry with a fixed number, a name and one white line, and the lines stack into a single pulse that shows which site moved before a figure is read. A site's report takes the same line and stacks its days or weeks, so the shape of a day reads straight off the page.

This system belongs to Stats alone. It replaces the suite's design system for this one app: Stats doesn't use `@zaur/ui`, and the repo root's `DESIGN.md` doesn't bind it. Fonts are self-hosted from `@fontsource-variable/archivo` (the width axis) and `@fontsource-variable/jetbrains-mono`, so the dashboard makes no font request to anyone else.

The page is dense and quiet. Body type is 13px, a page runs the full width of the window, and structure comes from hairline rules rather than panels. Dark and light follow the system, and light is the same sleeve printed the other way round. Each site's row carries one small coded strip, and that strip and the legend that decodes it are the only colour on the overview.

**Key Characteristics:**
- Matte ground, one-colour hairline plots, and square corners throughout.
- Colour used as a code for where visits came from, never as decoration.
- Archivo for words, JetBrains Mono for figures, and wide tracked caps for the wordmark alone.
- Catalogue numbers that stay with a site and open it from the keyboard.
- Every plot's caption or axis says how to read its height.
- One authored motion, on the Live minute line.

## Colors

Near-black, off-white and two steps of grey carry the whole page, with five coded hues kept to the small blocks that report a visit's source.

Each token has a dark value and a light value, set on `:root` and swapped by `prefers-color-scheme`. The frontmatter's plain keys are dark and its `-light` keys are light; the build uses one name for both (`--ink`, `--src-ai`).

### Primary
- **Sleeve Ink** (#f4f4f0 dark, #0a0a0a light): the plot lines, names, figures and the fill of an active control. It is also the colour of the focus ring and of a selection.

### Secondary
The source code, in its fixed order.
- **Direct** (#f4f4f0 dark, #0a0a0a light): the same value as the ink. Direct arrivals print as the sleeve's own colour.
- **Search Blue** (#2d6be4 dark, #1f56c9 light): arrivals from search.
- **Social Red** (#e4322b dark, #b81f1a light): arrivals from social networks.
- **AI Amber** (#f0b400 dark, #c49a00 light): arrivals from an AI chat.
- **Other Green** (#21a366 dark, #12804c light): tagged links, mail, the owner's other sites and every other site.

### Tertiary
- **Lost Line Amber** (#e8b400 dark, #8a6500 light): the status words and square on Live when the connection is lost, and nothing else.

### Neutral
- **Matte Ground** (#0a0a0a dark, #f4f4f0 light): the page, the reading tip, and the fill under every plotted line.
- **Raised Black** (#151514 dark, #ffffff light): a hover wash on a control or a visit row. It is never a resting surface.
- **Soft Ink** (#a6a6a0 dark, #6a6a64 light): labels, column heads, captions, catalogue numbers and the inactive side of a control. 8.09:1 on the ground in dark, 6.81:1 in light.
- **Hairline** (#2c2c2a dark, #d4d4ce light): the rule between rows and the track of a list's measure.
- **Strong Hairline** (#6a6a64 dark, #85857f light): control borders, the rule under a section head, and the rule above totals.
- **Quiet Line** (#6e6e69 dark, #85857f light): a line with no visits, a dotted tail, lines dimmed by hovering a neighbour, and a list's measure. It never carries text.

### Recorded Exceptions
These were accepted on purpose, and the reasons are part of the system.
- **Amber in dark.** AI Amber sits above the chart validator's lightness band, as white already does. Every other check passes.
- **Amber in light.** AI Amber measures 2.39:1 against the ground, a validator warning below 3:1. Darker ambers fail the validator's colour-blind and normal-vision checks, which matter more, so it stays. The relief the warning requires comes from the legend, each block's name, and the labelled Came from list.

### Named Rules
**The Coded Colour Rule.** Source colour appears only as the source code: a site's strip, the legend that decodes it, the chip beside a name in the labelled Came from list, and the chip marking a tagged visit in the log. The only other colour on the page is Lost Line Amber, for a lost connection.

**The Fixed Order Rule.** Blocks always run direct, search, social, AI chat, tagged and other. A group with no arrivals drops out and the rest keep their order, so position says as much as hue.

**The Plain Words Rule.** Text never wears a source colour. A source is named in ink or soft ink, with its chip beside it.

**The Printed Backwards Rule.** Light changes tokens and nothing else. No layout, size or component differs between the two themes.

## Typography

**Display Font:** Archivo Variable (with Arial, sans-serif)
**Body Font:** Archivo Variable (with Arial, sans-serif)
**Label/Mono Font:** JetBrains Mono Variable (with ui-monospace, Consolas, monospace)

**Character:** Archivo is a plain grotesque that keeps out of the way at 13px and turns into a catalogue stamp when stretched to full width. JetBrains Mono makes every figure look counted rather than written, with its digits in fixed columns.

### Hierarchy
- **Wordmark** (700, 15px, 0.14em tracking, uppercase, width 125%): "Stats" in the top bar, and nothing else.
- **Display** (500, 34px, 1.05, -0.015em; 26px on a phone): the site's name on its report and Live pages.
- **Figure Lead** (mono 400, 34px, 1; 26px on a phone): the catalogue number beside that name, in soft ink, and the Pages opened figure.
- **Figure Live** (mono 400, 28px, 1.1): the four totals at the top of Live.
- **Title** (500, 15px; 14px up to 1040px): a site's name in the overview.
- **Figure Credit** (mono 400, 15px): the other figures in a report's credits.
- **Figure Row** (mono 400, 14px): the overview's columns. The count for the period and the totals step up to 500, and a Now figure above zero to 600.
- **Section** (600, 13px): the heads over lists and plots.
- **Body** (400, 13px, 1.35): everything else, including control labels. An active control steps up to 500.
- **Caption** (400, 12px): column heads, plot captions, legends, the footer and reading tips.
- **Figure List** (mono 400, 12px): a list's counts, the time column of the visit log.
- **Figure Small** (mono 400, 11px): catalogue numbers in the overview, the counts inside controls, the hours axis, and a list's shares.

The site select and Sign out move to 16px on a phone.

### Named Rules
**The Counted In Mono Rule.** A figure that stands alone, in a cell, a credit, a control, a clock or a catalogue number, is JetBrains Mono. A number inside a sentence stays in the sentence's Archivo, as in a caption or the change under Pages opened.

**The One Wide Word Rule.** Width 125%, wide tracking and capitals belong to the wordmark. Nothing else on the page is stretched, tracked wide or put in capitals for effect.

## Layout

The page has no container. Header, main and footer run the full window, inset by the page margin (28px, 16px at 720px and under), with rules running the same width. Spacing is set by hand to fit each row rather than drawn from a modular scale; the steps in the frontmatter are the ones that recur.

**Overview.** A table: site column 272px, plot column taking what is left, four figure columns of 90px. Rows are 65px, and each line rises 112px, so it stands up behind the row above and the lines interlock. The first row is 112px, to give its line that room, and the last is 75px, to keep its line clear of the rule under it. Rows are ranked by count, and totals and the legend close the table above a strong hairline.

**Report.** Number, name and period; the Summary and Visits tabs, which swap everything below them; then the stack of days at left and credits in a 300px column at right, 32px apart. Lists follow in three columns with 28px and 40px gaps. The visit log stays behind its tab.

**Live.** Number, name and connection status; four totals between rules; the two lines with a 340px Pages column at right, 40px apart; the latest visits underneath.

**Up to 1040px.** The header wraps, with its segments on their own line. The overview's site column narrows to 200px and figures to 64px. Report and Live go to one column, and lists to two.

**Up to 720px.** Controls grow to 40px and fill the width. Each overview row becomes a short block: number, name, strip and period count on one line, the line across the screen at 58px, the other figures under it with their labels. Report lists go to one column. Live's totals go to two columns, its lines to 120px and 80px. The visit log becomes a short stack per visit, without network, device or section details, and the keyboard hint in the footer goes.

## Elevation & Depth

There are no shadows, gradients, blurs or translucent panels. The only depth is occlusion: each line carries a fill of the ground colour beneath it, which hides whatever line runs behind. The reading tip sits above the plot as a flat ground box with a one-pixel ink border.

### Named Rules
**The Occlusion Rule.** One line goes behind another because the ground under the front line covers it. Apart from the reading tip, nothing else on the page is layered.

## Shapes

Every corner is square (0px), including controls, chips, the status mark and the strip's blocks. Lines are single strokes with round joins and straight segments between readings, never smoothed. Structure comes from one-pixel rules, in two strengths. Coded marks are small flat rectangles: blocks and chips 10px tall, a legend's chip 12 by 10px, Live's status mark a 9px square.

The favicon draws three stacked lines in the sleeve's dark colours, whichever theme the system is using.

## Components

### Segmented Control
Square, hairlined and inverted when on. It carries Others, Mine and All with their counts, the periods with Live, and the report's tabs.
- **Shape:** a one-pixel strong hairline around links 30px high (40px on a phone, sharing the width equally), square corners.
- **Default:** soft ink on nothing.
- **Hover:** ink on the raised wash.
- **Active:** ink fill with ground text at 500, marked with `aria-current="page"`.
- **Focus:** the outline sits inside the link, 4px in, in the link's current colour.
- **Counts:** Figure Small at 85% opacity, beside the word.

### Field and Button
Plain, with the same frame as the segments, and at desk widths the same height once a segment's border is counted.
- **Shape:** one-pixel strong hairline, square corners, 32px high (40px on a phone), 10px side padding.
- **Colour:** ink on a transparent ground. The button takes the raised wash on hover.
- **Use:** the site select, and Sign out. Options are native, with the ground and ink set on them.

### Links and Focus
- **Link:** underlined at one pixel, 3px under the text, thickening to two pixels on hover. Inside tables and lists a link has no underline until it is hovered.
- **Focus:** a two-pixel ink outline, 2px out, on everything but the segments.
- **Selection:** ink behind ground text.

### Top Bar
The wordmark, the site select, the two segmented controls pushed right, and Sign out, over a hairline. The select lists every site with its catalogue number.

### Catalogue Number
A site's number is its place in `SITES`, two digits with a leading zero. It doesn't change as the ranking does, so the overview's numbers run out of order. Pressing a site's digit opens it from any page, keeping the period, the view of whose visits and Live; digits 1 to 9 open the first nine and 0 opens the tenth. A site past the tenth has no key. The key does nothing while focus is in a field, and a line in the footer explains it on wider screens.

### Ridge Line
The signature, drawn for each site, each day and each Live plot.
- **Stroke:** 1.15px in ink, staying that weight however the plot stretches. A line with no visits is drawn in the quiet line colour.
- **Fill:** the ground, down to the baseline, which is what stacks the lines.
- **Overview hover or focus:** the row's line goes to 2.4px and every other line drops to the quiet line colour, over 150ms, or at once under reduced motion. A pointer or a tap also shows the reading in a tip.
- **Live pointer or tap:** shows the reading in a tip, and the line keeps its weight.
- **Reading still counting:** a thin dotted tail (1px, 2 on 3 off, quiet line colour) from the last whole reading, to the current one and down to the baseline. It isn't part of the solid line, so a new hour never reads as a fall. Each plot's caption explains it.

**The Stated Scale Rule.** Between sites, a line's height is the square root of its count on one shared peak, so quiet sites keep their shape. A single site's own lines, in the report stack and on Live, are linear. The overview's and the stack's captions say so and give the tallest reading. Each Live line has its own peak, printed under it as "at most" so many a minute or an hour.

### Pulse Stack
A site's days, one ridge line each through 24 hours, oldest at the back, with dates at left and a mono hours axis under them. Lines rise 92px and sit 40px apart for up to a week, 28px up to a fortnight and 13px beyond that; at 90 days each line is a week. All lines share one peak. Under a pointer or a tap, the nearest line goes to 2.4px without dimming the others. A table for screen readers carries the same totals.

### Source Strip and Legend
Blocks of the source code, 96px wide and 10px tall with 2px gaps, each as wide as its share and never narrower than 2px. Each block names itself on hover with its group and share, and a screen reader gets the same words. A site with no arrivals from outside shows an empty hairline frame. Moves within the site aren't arrivals, and in the Came from list they take a hollow chip. The overview's foot carries the legend.

### Credits
A report's figures as a film's credits: label at left, figure at right, rows split by hairlines. Pages opened leads at Figure Lead over a strong hairline, with its change beneath the label, and the source strip closes the list.

### Ranked List
A section head over a strong hairline, then rows of words, a count and a share. Under each row runs a one-pixel measure, quiet line on hairline, scaled to the longest row, which also serves as the row's rule. Long words end in an ellipsis.

### Visit Log
A table with soft heads over a strong hairline and hairlines between visits, with the raised wash on hover at desk widths. Mine is marked in words under the time. Secondary details are 12px soft ink, separated by mid-dots.

### Reading Tip
The reading under a pointer or a tap, in Caption with the count in mono at 500. It is a ground box with a one-pixel ink border, and it stays out of the way of the pointer by flipping left past halfway. On a phone it runs the width of the screen under the plot and hides no line.

### Live Status
A 9px square and a line of words: "Live, up to date", "Connecting", or, in Lost Line Amber, "Disconnected, reconnecting". It is announced as a status. While connecting, the two lines are shown at half opacity.

### Live Beat
The one authored motion. When a new visit reaches the top of the log, a stretch of ink at 2.6px travels the minute line once, over 1400ms on `cubic-bezier(0.16, 1, 0.3, 1)`, and fades at the end. A minute turning changes the totals but doesn't fire it. It is hidden under reduced motion.

## Do's and Don'ts

### Do:
- **Do** take every colour from the tokens on `:root`, so light stays the same sleeve printed the other way round.
- **Do** keep the five source groups in their fixed order, with the words of the legend close by or the labelled Came from list beside them.
- **Do** print a plot's tallest reading in its caption or axis, and say there how its height is scaled.
- **Do** use the square root only between sites on one shared peak, and linear heights for a single site's own lines.
- **Do** draw a reading still counting as the dotted tail, not as part of the solid line.
- **Do** add a new site at the end of `SITES`, so existing numbers stay where they are.
- **Do** separate things with one-pixel rules, in the two strengths.
- **Do** set a figure that stands alone in JetBrains Mono.
- **Do** keep text at 4.5:1 or better in both themes.

### Don't:
- **Don't** import `@zaur/ui` or the suite's tokens here, or load a font from another host.
- **Don't** give text a source colour, or use a source colour to decorate anything.
- **Don't** use `--warn` for anything but a lost connection.
- **Don't** round a corner, add a shadow or a gradient, or fill under a line with anything but the ground.
- **Don't** use the raised wash as a resting surface or build a card from it.
- **Don't** add a second authored motion. Quick state feedback on a line is fine; anything that travels or plays is not.
- **Don't** number sites by rank.
- **Don't** set anything but the wordmark in wide tracked capitals.
