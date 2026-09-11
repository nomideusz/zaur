# Ark UI Components Inventory

Tracking sheet for the gradual migration of the **webmail** app towards
[Ark UI](https://ark-ui.com) (`@ark-ui/svelte`).

- **Framework:** Svelte 5 — `@ark-ui/svelte`
- **Package version:** see [`package.json`](../package.json) (`@ark-ui/svelte`)
- **Source of truth:** the component list is taken from the official Ark UI
  Svelte distribution. Keep it in sync when upgrading the package.

## AI / LLMs.txt

Ark UI publishes machine-readable documentation for LLM tools. See
[Ark UI LLMs.txt](https://ark-ui.com/docs/ai/llms.txt).

| Route | URL | Use when |
| --- | --- | --- |
| Index | https://ark-ui.com/llms.txt | Overview across frameworks |
| **Svelte** | https://ark-ui.com/llms-svelte.txt | **Primary** for this app |
| Full | https://ark-ui.com/llms-full.txt | Comprehensive Svelte docs in one file |

**Cursor:** add `https://ark-ui.com/llms-svelte.txt` under **Settings → Features →
Docs**, then reference it with `@Docs` in chat.

Project rule: `.cursor/rules/ark-ui-llms.mdc` (auto-attached for `apps/webmail/**`).

## How to use this document

- `[x]` = the component is already used somewhere in the webmail app.
- `[ ]` = not yet adopted.
- When you start using a new Ark UI component, tick its box and add the
  primary file(s) where it lives under **Used in**.

> Tip: regenerate the "used" list with
> `rg -o '@ark-ui/svelte/[a-z-]+' apps/webmail/src --no-filename | sort -u`

## Summary

**36 / 61** Ark UI components are currently in use (`@ark-ui/svelte` ^5.22.1;
excludes internal `factory` / `anatomy` exports; includes lab-only
`floating-panel`).

> Cross-checked against source 2026-09: `36` distinct components are imported
> under `src/` (see the tip below). The component list is taken from the
> **installed** package (`node_modules/@ark-ui/svelte/dist/components`, 62 dirs
> minus internal `factory` = 61), so it reflects `^5.22.1`, not the latest Ark
> release.

---

## Migration roadmap

Priorities are a starting suggestion, not a commitment:

- **P1** — high value / fills an obvious current gap.
- **P2** — clear use case, adopt opportunistically.
- **P3** — nice-to-have or situational.

Components not listed here have no obvious webmail use case yet (e.g.
`angle-slider`, `marquee`, `signature-pad`, `rating-group`) — leave them
unticked until a need appears.

### P1 — done

| Component | Notes |
| --- | --- |
| ~~`field`~~ ✅ | `ui/Field.svelte` with `invalid` / `ErrorText`; settings + compose To/Cc/Bcc. |
| ~~`fieldset`~~ ✅ | Settings groups; `disabled` when security is unverified. |
| ~~`tabs`~~ ✅ | Calendar Week / Day / Agenda. Settings audited 2026-09: no tab UI to migrate — its IA is a route-based sidebar (desktop) + index list (mobile), which is correct for deep-linkable sections. |
| ~~`file-upload`~~ ✅ | Compose attach + dropzone. |
| ~~`drawer`~~ ✅ | Mobile nav drawer (`shell/NavDrawer.svelte`); detail panels (`EventPanel`, `EventComposePanel`, `ContactDetailPanel`, `FileDetailPanel`) — `ui/MobileSheet.svelte` deleted. |
| ~~`scroll-area`~~ ✅ | Mail, settings, reader, contacts, calendar panes. |
| ~~`progress`~~ ✅ | PDF download, storage quota, indeterminate compose upload rows. |

### P2 — status

| Component | Status |
| --- | --- |
| ~~`collapsible`~~ ✅ | Thread messages + compose quoted reply (`ComposePanel.svelte`). |
| ~~`clipboard`~~ ✅ | `ui/CopyButton.svelte`; contact email copy. |
| ~~`password-input`~~ ✅ | `ui/PasswordInput.svelte`; `LabelInput` password path; security passwords. |
| ~~`pin-input`~~ ✅ | `ui/PinInput.svelte`; login TOTP + security OTP. |
| ~~`radio-group`~~ ✅ | `ui/RadioGroup.svelte`; Appearance theme. |
| `avatar` | **Removed 2026-08** — the account rail/switcher sheet went away with the mobile island; account identity lives in `shell/UserMenu.svelte`. |
| `pagination` | **Deferred** — mail/search use infinite `loadMore`, not page numbers. |
| ~~`accordion`~~ ✅ | Thread messages in `mail/MessageReaderCore.svelte` (`multiple`, so Expand all works). |
| `editable` | **Deferred** — folder rename already uses `TreeView.NodeRenameInput`; no contact edit UI. |
| `number-input` | **Deferred** — numeric settings are fixed enums via `SettingsSelect`. |
| ~~`date-picker`~~ ✅ | `ui/DateField.svelte` — vacation dates, advanced search custom range, event compose. Schedule-send keeps native `datetime-local`. |

### Replace hand-rolled UI — audited 2026-09

Genuine Ark replacements for currently hand-rolled behaviour, in priority
order. (Pure-presentation components — `Button`, `IconButton`, `Badge`,
`LoadingIndicator`, `Separator`, `MarkdownBody` — have **no** Ark counterpart
and stay as-is. `SwipeableListRow`, `ContactLetterRail`, the `pdf-viewer/`
stack and `ActionBar`'s toolbar/dismiss behaviour are also out of scope: Ark
ships no gesture, scrub-index, PDF or toolbar primitive.)

| # | Target | Replace with | Effort | Status / notes |
| --- | --- | --- | --- | --- |
| 1 | Byte formatters (`stores/quota.svelte.ts`, `attachments/upload.ts`, `mail/MessageAttachments.svelte`, `mail-core` `formatFileSize`) | `format` (`Format.Byte`) | Low | ✅ **Consolidated 2026-09** into one `$lib/utils/format-bytes.ts`. **Deliberately not Ark `Format.Byte`** — it rounds to 3 significant figures (1023 B → "1,020 B") and emits `kB` casing; the app has one locale, so an exact formatter wins. `mail-core`'s copy is untouched for native clients. |
| 2 | `mail/ComposeSendSplit.svelte` | `popover` + `menu`/`radio-group` | Medium | ✅ **Done 2026-09** — hand-rolled panel + window outside-click replaced by Ark `Popover` anchored to the Send\|▾ control. Kept presets as plain buttons (a form inside an ARIA `menu` is invalid); the caret stays a plain button so it can still be Ark-Tooltip-wrapped. |
| 3 | `calendar/CalendarEditorDialog.svelte` | `color-picker` (`SwatchGroup` + `SwatchTrigger`/`Swatch`, `inline`) | Medium | ✅ **Done 2026-09** — native radios + styled swatch replaced by Ark `ColorPicker` swatch grid. |
| 4 | `shell/GlobalSearchCombobox.svelte` | `combobox` | High | Open — currently a plain input + manual roving highlight (already uses `highlight`). Blocked by the inline **Advanced** form in the same dropdown — needs the form moved into a nested popover/dialog first. |
| 5 | `shell/GlobalSearchCombobox.svelte` chevron, `mail/MessageThreadActions.svelte` Eye/EyeOff | `swap` | Low | Open — two clean two-state icon toggles currently done with CSS rotate / `{#if}`. |
| 6 | `ui/action-bar/ActionBarContent.svelte` | `presence` (+ `portal`) | Medium | Open — hand-rolled `lazyMount`/`unmountOnExit` + `fly`/`fade`. Leave `MessageList.svelte`'s swipe-aware `rowExit` alone. |
| 7 | `mail/EmailHtmlFrame.svelte` | `frame` | Medium | Open — Ark `Frame` handles `srcdoc` + ref wiring, but the bespoke height measurement, horizontal-scrollbar compensation and sandbox logic must be kept; security-sensitive, low ROI. |
| 8 | `settings/StorageQuota.svelte` | `format` (`Format.Byte`) | Low | ✅ Covered by #1 — now renders `formatBytes`. |

### Available on upgrade (not in `^5.22.1`)

The current Ark docs/MCP describe a **newer** release than the one pinned. These
components are not installable today; revisit after an Ark upgrade:

| Component | Why |
| --- | --- |
| `hotkeys` | Would replace the manual `window` keydown + `g`/`*` prefix timers in `mail/MailKeyboardShortcuts.svelte` and drive the shortcuts help rows. **Preview** in newer Ark. |
| `toc` | Table-of-contents scroll-spy; no current surface. |
| `environment` / `locale` | Providers exposed as components in newer Ark (already available as top-level exports in `^5.22.1`). |

### P3 — status

| Component | Status |
| --- | --- |
| ~~`focus-trap`~~ ✅ | `ui/FocusTrap.svelte` + `ui/MobileSheet.svelte`. |
| ~~`download-trigger`~~ ✅ | `ui/DownloadButton.svelte`; attachment list + preview. |
| ~~`qr-code`~~ ✅ | TOTP setup in `settings/sections/security.svelte` (replaced `qrcode` npm). |
| `segment-group` | **Removed 2026-08** — the mobile segment rails were replaced by hamburger-drawer navigation; no segment control remains. |
| `floating-panel` | Lab only — `/floating-compose-lab`. Do not promote without a product decision. |
| ~~`hover-card`~~ ✅ | `ui/ContactHoverCard.svelte` — sender preview in the reader (skipped on touch). |
| `carousel` | Files image browser (`files/FileImageBrowser.svelte`). |
| `color-picker` / `steps` / `tour` / `image-cropper` / `json-tree-view` | `color-picker` adopted (calendar colours); the rest have no product surface yet. |

---

## Components

Grouping below is for readability only — it does not reflect official Ark UI
categories. The `factory` primitive is intentionally omitted as it is an
internal building block rather than a user-facing component.

### Forms & inputs

| Component | Used | Used in |
| --- | :---: | --- |
| `angle-slider` | [ ] | |
| `checkbox` | [x] | `src/lib/components/ui/Checkbox.svelte` |
| `color-picker` | [x] | `src/lib/components/calendar/CalendarEditorDialog.svelte` — calendar colour swatches (`SwatchGroup`, `inline`) |
| `combobox` | [x] | `src/lib/components/settings/SettingsSearch.svelte` |
| `date-input` | [ ] | segment style unused — DatePicker covers ISO date fields |
| `date-picker` | [x] | `src/lib/components/ui/DateField.svelte`; vacation in `settings/sections/account.svelte`; advanced search in `shell/GlobalSearchCombobox.svelte`; event compose in `calendar/EventComposePanel.svelte` |
| `editable` | [ ] | folder rename uses `TreeView.NodeRenameInput` instead |
| `field` | [x] | `src/lib/components/ui/Field.svelte`; `settings/SettingsField.svelte`, `settings/SettingsRow.svelte`; compose To/Cc/Bcc in `mail/ComposePanel.svelte` |
| `fieldset` | [x] | `settings/SettingsGroup.svelte`, `settings/SettingsFormGroup.svelte` (`disabled` for unverified security) |
| `file-upload` | [x] | `src/lib/components/ui/ComposeFileUpload.svelte`; `mail/ComposePanel.svelte` |
| `listbox` | [x] | `src/lib/components/mail/ComposeRecipientInput.svelte` — contact suggestions (highlight driven from the tags input; content is `tabindex=-1` so typing keeps focus) |
| `number-input` | [ ] | deferred — enum selects only |
| `password-input` | [x] | `src/lib/components/ui/PasswordInput.svelte`; `ui/LabelInput.svelte` (password); `settings/sections/security.svelte` |
| `pin-input` | [x] | `src/lib/components/ui/PinInput.svelte`; `routes/login/+page.svelte`; `settings/sections/security.svelte` |
| `radio-group` | [x] | `src/lib/components/ui/RadioGroup.svelte`; `settings/sections/appearance.svelte` |
| `rating-group` | [ ] | |
| `segment-group` | [ ] | removed 2026-08 (was a custom Shark UI port; mobile rails replaced by drawer nav) |
| `select` | [x] | `src/lib/components/ui/MobilePicker.svelte` |
| `signature-pad` | [ ] | |
| `slider` | [ ] | |
| `switch` | [x] | `src/lib/components/ui/Switch.svelte` |
| `tags-input` | [x] | `src/lib/components/mail/ComposeRecipientInput.svelte` |
| `toggle` | [ ] | |
| `toggle-group` | [ ] | **Removed** — the RichTextEditor toolbar uses plain buttons on purpose: Ark ToggleGroup's roving focus + tooltip `asChild` merge ate the click and dropped the TipTap selection (see the comment in `mail/RichTextEditor.svelte`). |

### Navigation

| Component | Used | Used in |
| --- | :---: | --- |
| `menu` | [x] | `src/lib/components/ui/menu/*`, `shell/UserMenu.svelte`, `mail/MoveToMenuItems.svelte`, `mail/MessageListSelectMenu.svelte`, `ui/OverflowMenu.svelte` |
| `navigation-menu` | [ ] | |
| `pagination` | [ ] | deferred — infinite scroll |
| `steps` | [ ] | |
| `tabs` | [x] | `routes/(app)/calendar/+page.svelte` (Week / Day / Agenda view switcher). Settings deliberately uses route links, not tabs. |
| `tour` | [ ] | |

### Overlays

| Component | Used | Used in |
| --- | :---: | --- |
| `dialog` | [x] | `src/lib/components/ui/ConfirmDialog.svelte`, `mail/AttachmentPreview.svelte`, `mail/CreateFolderDialog.svelte`, `shell/WelcomeOnboarding.svelte` |
| `drawer` | [x] | `src/lib/components/shell/NavDrawer.svelte` |
| `floating-panel` | [x] | lab: `routes/floating-compose-lab/+page.svelte`, `lab/FloatingComposeLab.svelte` |
| `hover-card` | [x] | `src/lib/components/ui/ContactHoverCard.svelte`; sender name in `mail/MessageReaderCore.svelte` |
| `popover` | [x] | `src/lib/components/mail/RichTextEditor.svelte`, `mail/ComposeSendSplit.svelte`, `shell/OutboxMenu.svelte` |
| `tooltip` | [x] | `src/lib/components/ui/TooltipWrap.svelte` |

### Feedback

| Component | Used | Used in |
| --- | :---: | --- |
| `progress` | [x] | `src/lib/components/ui/Progress.svelte`; PDF viewer, `settings/StorageQuota.svelte`, compose upload rows |
| `timer` | [ ] | not used — the Undo toast's countdown is a decorative CSS fill frozen via the toast root's `[data-paused]`. Ark already pauses on region hover/focus (Toaster group) and `pauseOnPageIdle`, so no timer machine is needed. |
| `toast` | [x] | `src/lib/stores/toast.svelte.ts`, `ui/ToastStack.svelte` |

### Data display

| Component | Used | Used in |
| --- | :---: | --- |
| `accordion` | [x] | `src/lib/components/mail/MessageReaderCore.svelte` (multi-message threads, `multiple`) |
| `avatar` | [ ] | removed 2026-08 with the island account rail |
| `carousel` | [x] | `src/lib/components/files/FileImageBrowser.svelte` |
| `collapsible` | [x] | compose quoted reply in `mail/ComposePanel.svelte` (reader threads now use `accordion`) |
| `image-cropper` | [ ] | |
| `json-tree-view` | [ ] | |
| `marquee` | [ ] | |
| `qr-code` | [x] | `settings/sections/security.svelte` (TOTP setup) |
| `tree-view` | [x] | `src/lib/components/mail/MailboxSidebar.svelte`, `mail/MailboxTreeNode.svelte`, `routes/folder-tree-lab/+page.svelte` |

### Utilities & primitives

| Component | Used | Used in |
| --- | :---: | --- |
| `client-only` | [ ] | |
| `clipboard` | [x] | `src/lib/components/ui/CopyButton.svelte`; `contacts/ContactDetailPanel.svelte`; reader copy via menu + toast |
| `collection` | [ ] | |
| `download-trigger` | [x] | `src/lib/components/ui/DownloadButton.svelte`; `mail/MessageAttachments.svelte`, `mail/AttachmentPreview.svelte` |
| `focus-trap` | [x] | `ui/FocusTrap.svelte`, `ui/MobileSheet.svelte`; contact/event mobile sheets, `calendar/EventComposePanel.svelte` |
| `format` | [ ] | Deliberately unused — Ark `Format.Byte` rounds to three significant figures (1023 B → "1,020 B"); see the byte-formatter row under **Replace hand-rolled UI**. `$lib/utils/format-bytes.ts` is the shared formatter. |
| `frame` | [ ] | |
| `highlight` | [x] | `src/lib/components/settings/SettingsSearch.svelte`, `shell/GlobalSearchCombobox.svelte` |
| `portal` | [x] | used alongside most overlay components (dialog, drawer, menu, popover, tooltip, select, toast) |
| `presence` | [ ] | |
| `scroll-area` | [x] | `ui/ScrollArea.svelte`; mail list/reader/sidebar, settings, contacts, calendar |
| `splitter` | [x] | `ui/PaneSplit.svelte`; mail folder + list, calendar, contacts, settings |
| `swap` | [ ] | |
