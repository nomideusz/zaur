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

**32 / 61** Ark UI components are currently in use (`@ark-ui/svelte` ^5.22.1;
excludes internal `factory` / `anatomy` exports; includes lab-only
`floating-panel`).

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
| ~~`tabs`~~ ✅ | Calendar Week / Day / Agenda. Still open: settings sections. |
| ~~`file-upload`~~ ✅ | Compose attach + dropzone. |
| ~~`drawer`~~ ✅ | Mobile nav / account switcher sheets. Still open: MobileSheet → Drawer. |
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
| ~~`avatar`~~ ✅ | `ui/Avatar.svelte`; account rail + account switcher. |
| `pagination` | **Deferred** — mail/search use infinite `loadMore`, not page numbers. |
| `accordion` | **Deferred** — Shortcuts help is a short flat list; settings keep Fieldset IA. |
| `editable` | **Deferred** — folder rename already uses `TreeView.NodeRenameInput`; no contact edit UI. |
| `number-input` | **Deferred** — numeric settings are fixed enums via `SettingsSelect`. |
| ~~`date-picker`~~ ✅ | `ui/DateField.svelte` — vacation dates, advanced search custom range, event compose. Schedule-send keeps native `datetime-local`. |

### P3 — status

| Component | Status |
| --- | --- |
| ~~`focus-trap`~~ ✅ | `ui/FocusTrap.svelte` + `ui/MobileSheet.svelte`. |
| ~~`download-trigger`~~ ✅ | `ui/DownloadButton.svelte`; attachment list + preview. |
| ~~`qr-code`~~ ✅ | TOTP setup in `settings/sections/security.svelte` (replaced `qrcode` npm). |
| `segment-group` | **Intentionally custom** — `ui/segment-group/*` supports navigational `href` / static items; Ark’s is radio-label based. |
| `floating-panel` | Lab only — `/floating-compose-lab`. Do not promote without a product decision. |
| `hover-card` | Still open — sender/contact preview. |
| `carousel` | Still open — attachment preview already has prev/next. |
| `color-picker` / `steps` / `tour` / `image-cropper` / `json-tree-view` | No product surface yet. |

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
| `date-input` | [ ] | segment style unused — DatePicker covers ISO date fields |
| `date-picker` | [x] | `src/lib/components/ui/DateField.svelte`; vacation in `settings/sections/account.svelte`; advanced search in `shell/GlobalSearchCombobox.svelte`; event compose in `calendar/EventComposePanel.svelte` |
| `editable` | [ ] | folder rename uses `TreeView.NodeRenameInput` instead |
| `field` | [x] | `src/lib/components/ui/Field.svelte`; `settings/SettingsField.svelte`, `settings/SettingsRow.svelte`; compose To/Cc/Bcc in `mail/ComposePanel.svelte` |
| `fieldset` | [x] | `settings/SettingsGroup.svelte`, `settings/SettingsFormGroup.svelte` (`disabled` for unverified security) |
| `file-upload` | [x] | `src/lib/components/ui/ComposeFileUpload.svelte`; `mail/ComposePanel.svelte` |
| `listbox` | [ ] | |
| `number-input` | [ ] | deferred — enum selects only |
| `password-input` | [x] | `src/lib/components/ui/PasswordInput.svelte`; `ui/LabelInput.svelte` (password); `settings/sections/security.svelte` |
| `pin-input` | [x] | `src/lib/components/ui/PinInput.svelte`; `routes/login/+page.svelte`; `settings/sections/security.svelte` |
| `radio-group` | [x] | `src/lib/components/ui/RadioGroup.svelte`; `settings/sections/appearance.svelte` |
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
| `pagination` | [ ] | deferred — infinite scroll |
| `steps` | [ ] | |
| `tabs` | [x] | `routes/(app)/calendar/+page.svelte` (Week / Day / Agenda view switcher) |
| `tour` | [ ] | |

### Overlays

| Component | Used | Used in |
| --- | :---: | --- |
| `dialog` | [x] | `src/lib/components/ui/ConfirmDialog.svelte`, `mail/AttachmentPreview.svelte`, `mail/CreateFolderDialog.svelte`, `shell/WelcomeOnboarding.svelte` |
| `drawer` | [x] | `src/lib/components/shell/NavDrawer.svelte`, `shell/AccountSwitcherSheet.svelte` |
| `floating-panel` | [x] | lab: `routes/floating-compose-lab/+page.svelte`, `lab/FloatingComposeLab.svelte` |
| `hover-card` | [ ] | |
| `popover` | [x] | `src/lib/components/mail/RichTextEditor.svelte`, `shell/OutboxMenu.svelte` |
| `tooltip` | [x] | `src/lib/components/ui/TooltipWrap.svelte` |

### Feedback

| Component | Used | Used in |
| --- | :---: | --- |
| `progress` | [x] | `src/lib/components/ui/Progress.svelte`; PDF viewer, `settings/StorageQuota.svelte`, compose upload rows |
| `timer` | [ ] | |
| `toast` | [x] | `src/lib/stores/toast.svelte.ts`, `ui/ToastStack.svelte` |

### Data display

| Component | Used | Used in |
| --- | :---: | --- |
| `accordion` | [ ] | deferred — no strong surface yet |
| `avatar` | [x] | `src/lib/components/ui/Avatar.svelte`; `shell/island/IslandAccountRail.svelte`, `shell/AccountSwitcherSheet.svelte` |
| `carousel` | [ ] | |
| `collapsible` | [x] | `mail/MessageReaderCore.svelte`; compose quoted reply in `mail/ComposePanel.svelte` |
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
| `format` | [ ] | |
| `frame` | [ ] | |
| `highlight` | [x] | `src/lib/components/settings/SettingsSearch.svelte`, `shell/GlobalSearchCombobox.svelte` |
| `portal` | [x] | used alongside most overlay components (dialog, drawer, menu, popover, tooltip, select, toast) |
| `presence` | [ ] | |
| `scroll-area` | [x] | `ui/ScrollArea.svelte`; mail list/reader/sidebar, settings, contacts, calendar |
| `splitter` | [ ] | |
| `swap` | [ ] | |
