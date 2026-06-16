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

**15 / 63** Ark UI components are currently in use.

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
| `field` | Accessible label / helper-text / error wiring for compose and settings inputs; foundational, pairs with the inputs already in use (`checkbox`, `select`, `switch`). |
| `fieldset` | Group related settings controls (e.g. signature, notifications) with a shared legend and disabled state. |
| `tabs` | Settings sections, and switching between mailbox views (e.g. Focused / Other, message vs. headers). |
| `file-upload` | Drag-and-drop attachment picking in the composer, replacing the raw `<input type="file">`. |
| `drawer` | Mobile mailbox sidebar, mobile compose sheet, and slide-in settings panels on small screens. |
| `scroll-area` | Consistent custom scrollbars for the message list and mailbox sidebar across browsers. |
| ~~`progress`~~ ✅ | **Done** — reusable `ui/Progress.svelte` wrapper, first wired into PDF document-download progress. Still TODO: attachment upload progress and background sync indicators. |

### P2 — opportunistic

| Component | Potential use case |
| --- | --- |
| `collapsible` | "Show trimmed content" / quoted-reply expansion in messages; collapsible settings groups. |
| `pagination` | Paging through long message lists or search results. |
| `clipboard` | Copy sender email address, copy a shareable message/thread link. |
| `accordion` | Grouped settings panels and help/FAQ sections. |
| `editable` | Inline rename of folders and labels in the sidebar; contact name editing. |
| `avatar` | Sender/contact avatars in the message list and reading pane (with initials fallback). |
| `radio-group` | Mutually-exclusive settings (theme, list density, reading-pane layout). |
| `number-input` | Numeric settings such as auto-refresh interval or messages-per-page. |
| `password-input` | Change-password flow in settings and any password entry in auth. |
| `date-picker` | Schedule-send and snooze date selection (calendar app already lives here). |
| `time-picker` | Time half of schedule-send / snooze. |

### P3 — situational

| Component | Potential use case |
| --- | --- |
| `hover-card` | Contact/sender preview card on hover over a name in the message list. |
| `color-picker` | Custom colors for labels and folders. |
| `steps` | Multi-step onboarding / account-setup wizard. |
| `tour` | Guided feature discovery for new users (builds on existing onboarding). |
| `segment-group` | Compact segmented toggle for view switches (e.g. list density, unread filter). |
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
| `progress` | [x] | `src/lib/components/ui/Progress.svelte` (reusable wrapper); wired into `ui/pdf-viewer/Root.svelte` for document download progress |
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
