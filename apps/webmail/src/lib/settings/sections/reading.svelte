<script lang="ts">
  import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
  import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
  import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
  import IOSToggle from '$lib/components/ui/IOSToggle.svelte';
  import {
    settings,
    type ReaderTextSize,
    type ReadingTypeface
  } from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Format & Sizing">
  <SettingsRow title="Time format">
    <SettingsSelect
      label="Time format"
      value={settings.timeFormat}
      options={[
        { value: 'auto', label: 'System' },
        { value: '12h', label: '12-hour' },
        { value: '24h', label: '24-hour' }
      ]}
      onchange={(v) => {
        if (v === 'auto' || v === '12h' || v === '24h') {
          settings.setTimeFormat(v);
        }
      }}
      class="w-auto"
    />
  </SettingsRow>

  <SettingsRow title="Text size">
    <SettingsSelect
      label="Text size"
      value={settings.readerTextSize}
      options={[
        { value: 'small', label: 'Small' },
        { value: 'normal', label: 'Normal' },
        { value: 'large', label: 'Large' }
      ]}
      onchange={(v) => settings.setReaderTextSize(v as ReaderTextSize)}
      class="w-auto"
    />
  </SettingsRow>

  <SettingsRow title="Typeface">
    <SettingsSelect
      label="Typeface"
      value={settings.readingTypeface}
      options={[
        { value: 'sans', label: 'Sans-serif' },
        { value: 'serif', label: 'Serif' }
      ]}
      onchange={(v) => settings.setReadingTypeface(v as ReadingTypeface)}
      class="w-auto"
    />
  </SettingsRow>
</SettingsGroup>

<SettingsGroup title="Inbox & Colors">
  <SettingsRow title="Colorful Important subjects">
    <IOSToggle
      checked={settings.showImportantColors}
      onchange={(checked) => settings.setShowImportantColors(checked)}
    />
  </SettingsRow>

  <SettingsRow title="Remember last folder">
    <IOSToggle
      checked={settings.rememberLastMailbox}
      onchange={(checked) => settings.setRememberLastMailbox(checked)}
    />
  </SettingsRow>
</SettingsGroup>

<SettingsGroup title="Message Rendering">
  <SettingsRow title="Prefer plain text">
    <IOSToggle
      checked={settings.preferPlainText}
      onchange={(checked) => settings.setPreferPlainText(checked)}
    />
  </SettingsRow>

  <SettingsRow title="Block remote images">
    <IOSToggle
      checked={settings.blockExternalContent}
      onchange={(checked) => settings.setBlockExternalContent(checked)}
    />
  </SettingsRow>

  <SettingsRow title="Expand all threads">
    <IOSToggle
      checked={settings.expandAllThreadMessages}
      onchange={(checked) => settings.setExpandAllThreadMessages(checked)}
    />
  </SettingsRow>

  <SettingsRow title="Clean reading view">
    <IOSToggle
      checked={settings.readerCleanView}
      onchange={(checked) => settings.setReaderCleanView(checked)}
    />
  </SettingsRow>

  <SettingsRow title="Show delivery address">
    <IOSToggle
      checked={settings.showDeliveredToInReader}
      onchange={(checked) => settings.setShowDeliveredToInReader(checked)}
    />
  </SettingsRow>
</SettingsGroup>

<SettingsGroup title="System & Badges">
  <SettingsRow title="Confirm before delete">
    <IOSToggle
      checked={settings.confirmBeforeDelete}
      onchange={(checked) => settings.setConfirmBeforeDelete(checked)}
    />
  </SettingsRow>

  <SettingsRow title="Hide action toasts">
    <IOSToggle
      checked={settings.hideActionToasts}
      onchange={(checked) => settings.setHideActionToasts(checked)}
    />
  </SettingsRow>

  <SettingsRow title="Unseen count on app icon">
    <IOSToggle
      checked={settings.showUnreadAppBadge}
      onchange={(checked) => settings.setShowUnreadAppBadge(checked)}
    />
  </SettingsRow>

  <SettingsRow title="Unseen count in tab title">
    <IOSToggle
      checked={settings.showUnreadInTitle}
      onchange={(checked) => settings.setShowUnreadInTitle(checked)}
    />
  </SettingsRow>
</SettingsGroup>

<SettingsGroup title="Shortcuts">
  <SettingsRow title="Enable shortcuts">
    <IOSToggle
      checked={settings.enableKeyboardShortcuts}
      onchange={(checked) => settings.setEnableKeyboardShortcuts(checked)}
    />
  </SettingsRow>

  <div class="z-settings-shortcut-grid">
    <div class="z-settings-shortcut-row">
      <p class="z-settings-shortcut-label">Compose</p>
      <p class="z-settings-shortcut-keys">c</p>
    </div>
    <div class="z-settings-shortcut-row">
      <p class="z-settings-shortcut-label">Focus search</p>
      <p class="z-settings-shortcut-keys">/</p>
    </div>
    <div class="z-settings-shortcut-row">
      <p class="z-settings-shortcut-label">Go to folder</p>
      <p class="z-settings-shortcut-keys">g i · g s · g d · g a · g t · g j</p>
    </div>
    <div class="z-settings-shortcut-row">
      <p class="z-settings-shortcut-label">Next / previous</p>
      <p class="z-settings-shortcut-keys">j · k</p>
    </div>
    <div class="z-settings-shortcut-row">
      <p class="z-settings-shortcut-label">Next unseen message</p>
      <p class="z-settings-shortcut-keys">n</p>
    </div>
    <div class="z-settings-shortcut-row">
      <p class="z-settings-shortcut-label">Reply / reply all / forward</p>
      <p class="z-settings-shortcut-keys">r · a · f</p>
    </div>
    <div class="z-settings-shortcut-row">
      <p class="z-settings-shortcut-label">Not important / Important / delete</p>
      <p class="z-settings-shortcut-keys">d · u · #</p>
    </div>
    <div class="z-settings-shortcut-row">
      <p class="z-settings-shortcut-label">Back / close compose</p>
      <p class="z-settings-shortcut-keys">Esc</p>
    </div>
    <div class="z-settings-shortcut-row">
      <p class="z-settings-shortcut-label">Send</p>
      <p class="z-settings-shortcut-keys">Ctrl+Enter</p>
    </div>
  </div>
</SettingsGroup>
