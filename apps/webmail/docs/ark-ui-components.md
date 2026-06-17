# Ark UI Components Inventory

Tracking sheet for the gradual migration of the **webmail** app towards
[Ark UI](https://ark-ui.com) (`@ark-ui/svelte`).

- **Framework:** Svelte 5 — `@ark-ui/svelte`
- **Package version:** see [`package.json`](../package.json) (`@ark-ui/svelte`)
- **Source of truth:** the component list is taken from the official Ark UI
  Svelte distribution. Keep it in sync when upgrading the package.

## How to use this document

- `[x]` = the component is already used somewhere in the webmail app.
- `[ ]` = not yet adopted.
- When you start using a new Ark UI component, tick its box and add the
  primary file(s) where it lives under **Used in**.

> Tip: regenerate the "used" list with
> `rg -o '@ark-ui/svelte/[a-z-]+' apps/webmail/src --no-filename | sort -u`

## Summary

**24 / 61** Ark UI components are currently in use (`@ark-ui/svelte` ^5.22.1;
excludes internal `factory` / `anatomy` exports).

---

## Migration roadmap — next candidates

Prioritised shortlist of components worth adopting next, with webmail-specific
use cases. Priorities are a starting suggestion, not a commitment:

- **P1** — high value / fills an obvious current gap; pick these up first.
- **P2** — clear use case, adopt opportunistically when touching the area.
- **P3** — nice-to-have or situational.

Components not listed here have no obvious webmail use case yet (e.g.
`angle-slider`, `marquee`, `signature-pad`, `qr-code`, `rating-group`) — leave
them unticked until a need appears.

### P1 — adopt next

| Component | Potential use case |
| --- | --- |
| ~~`field`~~ ✅ | **Done** — `ui/Field.svelte` wrapper; settings labels/helper text via Ark Field in `settings/SettingsField.svelte` and `settings/SettingsRow.svelte`. Still open: compose recipient error wiring. |
| ~~`fieldset`~~ ✅ | **Done** — Ark `Fieldset` in `settings/SettingsGroup.svelte` and `settings/SettingsFormGroup.svelte` (legend + helper text for grouped rows). Still open: disabled-state groups. |
| ~~`tabs`~~ ✅ | **Done** — calendar Week / Day / Agenda view switcher (`routes/(app)/calendar/+page.svelte`), giving proper `tablist`/`tab`/`tabpanel` semantics and arrow-key navigation. Still open: settings sections, mailbox view switches. |
| ~~`file-upload`~~ ✅ | **Done** — `ui/ComposeFileUpload.svelte` + Ark dropzone/trigger in `mail/ComposePanel.svelte`; reject toasts and clipboard paste. |
| ~~`drawer`~~ ✅ | **Done** — mobile mailbox / app nav sheet (`shell/NavDrawer.svelte`, mounted from `routes/(app)/+layout.svelte`). Still open: mobile compose sheet, slide-in settings panels. |
| ~~`scroll-area`~~ ✅ | **Done** — `ui/ScrollArea.svelte` across mail, settings, reader, contacts, and calendar panes; scrollbars hidden when content fits (`data-overflow-*`). Still open: contact letter rail. |
| ~~`progress`~~ ✅ | **Done** — reusable `ui/Progress.svelte` wrapper, wired into PDF document-download progress and account storage-quota display (`settings/StorageQuota.svelte`, via JMAP `Quota/get`). Compose attachment rows show inline upload status (`ComposePanel.svelte`). Still open: per-file progress bars, background sync indicators. |

### P2 — opportunistic

| Component | Potential use case |
| --- | --- |
| ~~`collapsible`~~ ✅ | **Done** — per-message expand/collapse in multi-message threads (`mail/MessageReaderCore.svelte`). Quoted reply in plain-text compose uses a native `<details>` block (`ComposePanel.svelte`, gated by `collapseQuotedInCompose`). Still open: collapsible settings groups. |
| `pagination` | Paging through long message lists or search results. |
| ~~`clipboard`~~ ✅ | **Done** — reusable `ui/CopyButton.svelte` in `contacts/ContactDetailPanel.svelte` (inline copied feedback). Reader "Copy email address" in the More menu uses toast feedback instead (`mail/MessageThreadActions.svelte` — menu closes on action, so inline indicator would not persist). Still open: shareable message/thread links. |
| `accordion` | Grouped settings panels and help/FAQ sections. |
| `editable` | Inline rename of folders and labels in the sidebar; contact name editing. |
| `avatar` | Sender/contact avatars in the message list and reading pane (with initials fallback). |
| `radio-group` | Mutually-exclusive settings (theme, list density, reading-pane layout). |
| `number-input` | Numeric settings such as auto-refresh interval or messages-per-page. |
| `password-input` | Change-password flow in settings and any password entry in auth. |
| `date-picker` | Schedule-send and snooze date selection (calendar app already lives here). |

### P3 — situational

| Component | Potential use case |
| --- | --- |
| `hover-card` | Contact/sender preview card on hover over a name in the message list. |
| ~~`focus-trap`~~ ✅ | **Done** — `ui/FocusTrap.svelte` + `ui/MobileSheet.svelte` on contact/event mobile sheets and calendar event compose slide-over. Dialog/Drawer already trap focus. |
| `color-picker` | Custom colors for labels and folders. |
| `steps` | Multi-step onboarding / account-setup wizard. |
| `tour` | Guided feature discovery for new users (builds on existing onboarding). |
| `segment-group` | Compact segmented toggle for view switches (e.g. list density, unread filter). A custom Shark UI port already covers mobile rails at `ui/segment-group/*` (`IslandMailTabs.svelte`, `MobileSettingsShellNav.svelte`) without `@ark-ui/svelte/segment-group`. |
| `floating-panel` | Desktop non-modal compose overlay — lab at `/floating-compose-lab` (`lab/FloatingComposeLab.svelte`). Evaluate before replacing `/mail/compose` route on desktop. |
| `carousel` | Image-attachment gallery in the preview dialog. |
| `image-cropper` | Avatar / profile-image cropping in settings. |
| `json-tree-view` | Developer/debug view for raw message source or sync payloads. |

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
| `color-picker` | [ ] | |
| `combobox` | [x] | `src/lib/components/settings/SettingsSearch.svelte` |
| `date-input` | [ ] | |
| `date-picker` | [ ] | |
| `editable` | [ ] | |
| `field` | [x] | `src/lib/components/ui/Field.svelte`; settings rows in `settings/SettingsField.svelte`, `settings/SettingsRow.svelte` |
| `fieldset` | [x] | `settings/SettingsGroup.svelte`, `settings/SettingsFormGroup.svelte` |
| `file-upload` | [x] | `src/lib/components/ui/ComposeFileUpload.svelte`; compose attach + drop in `mail/ComposePanel.svelte` |
| `listbox` | [ ] | |
| `number-input` | [ ] | |
| `password-input` | [ ] | |
| `pin-input` | [ ] | |
| `radio-group` | [ ] | |
| `rating-group` | [ ] | |
| `segment-group` | [ ] | custom Shark UI port at `src/lib/components/ui/segment-group/*` (not `@ark-ui/svelte/segment-group`) |
| `select` | [x] | `src/lib/components/ui/MobilePicker.svelte` |
| `signature-pad` | [ ] | |
| `slider` | [ ] | |
| `switch` | [x] | `src/lib/components/ui/Switch.svelte` |
| `tags-input` | [x] | `src/lib/components/mail/ComposeRecipientInput.svelte` |
| `toggle` | [ ] | |
| `toggle-group` | [x] | `src/lib/components/mail/RichTextEditor.svelte` |

### Navigation

| Component | Used | Used in |
| --- | :---: | --- |
| `menu` | [x] | `src/lib/components/ui/menu/*`, `shell/UserMenu.svelte`, `mail/MoveToMenuItems.svelte`, `mail/MessageListSelectMenu.svelte`, `ui/OverflowMenu.svelte` |
| `navigation-menu` | [ ] | |
| `pagination` | [ ] | |
| `steps` | [ ] | |
| `tabs` | [x] | `routes/(app)/calendar/+page.svelte` (Week / Day / Agenda view switcher) |
| `tour` | [ ] | |

### Overlays

| Component | Used | Used in |
| --- | :---: | --- |
| `dialog` | [x] | `src/lib/components/ui/ConfirmDialog.svelte`, `mail/AttachmentPreview.svelte`, `mail/CreateFolderDialog.svelte`, `shell/WelcomeOnboarding.svelte` |
| `drawer` | [x] | `src/lib/components/shell/NavDrawer.svelte` (mobile mailbox / app nav sheet; `routes/(app)/+layout.svelte`) |
| `floating-panel` | [ ] | lab prototype at `routes/floating-compose-lab/+page.svelte`, `lab/FloatingComposeLab.svelte` |
| `hover-card` | [ ] | |
| `popover` | [x] | `src/lib/components/mail/RichTextEditor.svelte`, `shell/OutboxMenu.svelte` |
| `tooltip` | [x] | `src/lib/components/ui/TooltipWrap.svelte` |

### Feedback

| Component | Used | Used in |
| --- | :---: | --- |
| `progress` | [x] | `src/lib/components/ui/Progress.svelte` (reusable wrapper); wired into `ui/pdf-viewer/Root.svelte` (document download) and `settings/StorageQuota.svelte` (account storage quota) |
| `timer` | [ ] | |
| `toast` | [x] | `src/lib/stores/toast.svelte.ts`, `ui/ToastStack.svelte` |

### Data display

| Component | Used | Used in |
| --- | :---: | --- |
| `accordion` | [ ] | |
| `avatar` | [ ] | |
| `carousel` | [ ] | |
| `collapsible` | [x] | `mail/MessageReaderCore.svelte` (per-message expand/collapse in multi-message threads). Plain-text compose quoted reply: native `<details>` in `mail/ComposePanel.svelte` |
| `image-cropper` | [ ] | |
| `json-tree-view` | [ ] | |
| `marquee` | [ ] | |
| `qr-code` | [ ] | |
| `tree-view` | [x] | `src/lib/components/mail/MailboxSidebar.svelte`, `mail/MailboxTreeNode.svelte`, `routes/folder-tree-lab/+page.svelte` |

### Utilities & primitives

| Component | Used | Used in |
| --- | :---: | --- |
| `client-only` | [ ] | |
| `clipboard` | [x] | `src/lib/components/ui/CopyButton.svelte` (reusable); `contacts/ContactDetailPanel.svelte` (copy email). Reader copy-sender uses `Clipboard` via menu + toast in `mail/MessageThreadActions.svelte` |
| `collection` | [ ] | |
| `download-trigger` | [ ] | |
| `focus-trap` | [x] | `ui/FocusTrap.svelte`, `ui/MobileSheet.svelte`; contact/event mobile sheets, `calendar/EventComposePanel.svelte` |
| `format` | [ ] | |
| `frame` | [ ] | |
| `highlight` | [x] | `src/lib/components/settings/SettingsSearch.svelte`, `shell/GlobalSearchCombobox.svelte` |
| `portal` | [x] | used alongside most overlay components (dialog, drawer, menu, popover, tooltip, select, toast) |
| `presence` | [ ] | |
| `scroll-area` | [x] | `ui/ScrollArea.svelte`; mail list/reader/sidebar, settings, contacts, calendar (sidebar, month grid, agenda nav, event panels) |
| `splitter` | [ ] | |
| `swap` | [ ] | |
