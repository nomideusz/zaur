<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import Switch from '$lib/components/ui/Switch.svelte';
	import { settings } from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Keyboard shortcuts" visibleOn="desktop">
	<SettingsRow kind="toggle" title="Enable shortcuts">
		<Switch
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
