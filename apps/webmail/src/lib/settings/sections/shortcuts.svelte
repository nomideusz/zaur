<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import Switch from '$lib/components/ui/Switch.svelte';
	import { settings } from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Keyboard shortcuts" visibleOn="desktop">
	<SettingsRow
		kind="toggle"
		title="Enable shortcuts"
		description="Use the single-key shortcuts below to triage the list without the mouse. Press ? for a quick reference."
	>
		<Switch
			checked={settings.enableKeyboardShortcuts}
			onchange={(checked) => settings.setEnableKeyboardShortcuts(checked)}
		/>
	</SettingsRow>

	<div class="z-settings-shortcut-grid">
		<div class="z-settings-shortcut-row">
			<p class="z-settings-shortcut-label">Move list cursor</p>
			<p class="z-settings-shortcut-keys">j · k</p>
		</div>
		<div class="z-settings-shortcut-row">
			<p class="z-settings-shortcut-label">Open cursor message</p>
			<p class="z-settings-shortcut-keys">Enter · o</p>
		</div>
		<div class="z-settings-shortcut-row">
			<p class="z-settings-shortcut-label">Toggle select / range</p>
			<p class="z-settings-shortcut-keys">x · Shift+x · Shift+j · Shift+k</p>
		</div>
		<div class="z-settings-shortcut-row">
			<p class="z-settings-shortcut-label">Select all / none / unseen / seen</p>
			<p class="z-settings-shortcut-keys">* a · * n · * u · * r</p>
		</div>
		<div class="z-settings-shortcut-row">
			<p class="z-settings-shortcut-label">Mark seen / toggle unseen (list)</p>
			<p class="z-settings-shortcut-keys">s · u</p>
		</div>
		<div class="z-settings-shortcut-row">
			<p class="z-settings-shortcut-label">Archive / move menu / trash</p>
			<p class="z-settings-shortcut-keys">e · v · #</p>
		</div>
		<div class="z-settings-shortcut-row">
			<p class="z-settings-shortcut-label">Compose / search / settings</p>
			<p class="z-settings-shortcut-keys">c · / · ,</p>
		</div>
		<div class="z-settings-shortcut-row">
			<p class="z-settings-shortcut-label">Go to folder</p>
			<p class="z-settings-shortcut-keys">g i · g s · g d · g a · g t · g j</p>
		</div>
		<div class="z-settings-shortcut-row">
			<p class="z-settings-shortcut-label">Next unseen (cursor or open)</p>
			<p class="z-settings-shortcut-keys">n</p>
		</div>
		<div class="z-settings-shortcut-row">
			<p class="z-settings-shortcut-label">Reply / reply all / forward</p>
			<p class="z-settings-shortcut-keys">r · a · f</p>
		</div>
		<div class="z-settings-shortcut-row">
			<p class="z-settings-shortcut-label">Highlight / not highlighted (reader)</p>
			<p class="z-settings-shortcut-keys">u · d</p>
		</div>
		<div class="z-settings-shortcut-row">
			<p class="z-settings-shortcut-label">Back / clear selection / help</p>
			<p class="z-settings-shortcut-keys">Esc · ?</p>
		</div>
		<div class="z-settings-shortcut-row">
			<p class="z-settings-shortcut-label">Send</p>
			<p class="z-settings-shortcut-keys">Ctrl+Enter</p>
		</div>
	</div>
</SettingsGroup>
