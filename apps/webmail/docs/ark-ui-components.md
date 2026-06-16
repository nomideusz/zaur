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
> `grep -rho '@ark-ui/svelte/[a-z-]*' apps/webmail/src | sort -u`

## Summary

**14 / 63** Ark UI components are currently in use.

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
| `date-picker` | [ ] | |
| `editable` | [ ] | |
| `field` | [ ] | |
| `fieldset` | [ ] | |
| `file-upload` | [ ] | |
| `listbox` | [ ] | |
| `number-input` | [ ] | |
| `password-input` | [ ] | |
| `pin-input` | [ ] | |
| `radio-group` | [ ] | |
| `rating-group` | [ ] | |
| `segment-group` | [ ] | |
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
| `tabs` | [ ] | |
| `tour` | [ ] | |

### Overlays

| Component | Used | Used in |
| --- | :---: | --- |
| `dialog` | [x] | `src/lib/components/ui/ConfirmDialog.svelte`, `mail/AttachmentPreview.svelte`, `shell/WelcomeOnboarding.svelte` |
| `drawer` | [ ] | |
| `floating-panel` | [ ] | |
| `hover-card` | [ ] | |
| `popover` | [x] | `src/lib/components/mail/RichTextEditor.svelte`, `shell/OutboxMenu.svelte` |
| `tooltip` | [x] | `src/lib/components/ui/TooltipWrap.svelte` |

### Feedback

| Component | Used | Used in |
| --- | :---: | --- |
| `progress` | [ ] | |
| `timer` | [ ] | |
| `toast` | [x] | `src/lib/stores/toast.svelte.ts`, `ui/ToastStack.svelte` |

### Data display

| Component | Used | Used in |
| --- | :---: | --- |
| `accordion` | [ ] | |
| `avatar` | [ ] | |
| `carousel` | [ ] | |
| `collapsible` | [ ] | |
| `image-cropper` | [ ] | |
| `json-tree-view` | [ ] | |
| `marquee` | [ ] | |
| `qr-code` | [ ] | |
| `tree-view` | [x] | `src/lib/components/mail/MailboxSidebar.svelte`, `mail/MailboxTreeNode.svelte`, `routes/folder-tree-lab/+page.svelte` |

### Utilities & primitives

| Component | Used | Used in |
| --- | :---: | --- |
| `client-only` | [ ] | |
| `clipboard` | [ ] | |
| `collection` | [ ] | |
| `download-trigger` | [ ] | |
| `environment` | [ ] | |
| `focus-trap` | [ ] | |
| `format` | [ ] | |
| `frame` | [ ] | |
| `highlight` | [x] | `src/lib/components/settings/SettingsSearch.svelte`, `shell/GlobalSearchCombobox.svelte` |
| `locale` | [ ] | |
| `portal` | [x] | used alongside most overlay components (dialog, menu, popover, tooltip, select, toast) |
| `presence` | [ ] | |
| `scroll-area` | [ ] | |
| `splitter` | [ ] | |
| `swap` | [ ] | |
