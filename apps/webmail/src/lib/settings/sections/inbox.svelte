<script lang="ts">
	import SettingsDepends from '$lib/components/settings/SettingsDepends.svelte';
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import SettingsSelect from '$lib/components/settings/SettingsSelect.svelte';
	import { settings, type ListDensity, type ListTextSize } from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Density" description="How dense each row feels.">
	<SettingsRow title="List density" description="Comfortable rows with more breathing room, or compact for more on screen">
		<SettingsSelect
			label="List density"
			value={settings.listDensity}
			options={[
				{ value: 'comfortable', label: 'Comfortable' },
				{ value: 'compact', label: 'Compact' }
			]}
			onchange={(v) => settings.setListDensity(v as ListDensity)}
			class="w-auto"
		/>
	</SettingsRow>

	<SettingsRow title="Text size" description="Font size for sender, subject, and preview">
		<SettingsSelect
			label="Text size"
			value={settings.listTextSize}
			options={[
				{ value: 'small', label: 'Small' },
				{ value: 'normal', label: 'Normal' },
				{ value: 'large', label: 'Large' }
			]}
			onchange={(v) => settings.setListTextSize(v as ListTextSize)}
			class="w-auto"
		/>
	</SettingsRow>

	<SettingsRow title="Show message preview" description="Second line under the subject in each row">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.showListPreview}
			onchange={(e) => settings.setShowListPreview(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Row contents" description="Essential list row context.">
	<SettingsRow title="Timestamps" description="Date or time on the right of each row">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.showListTimestamps}
			onchange={(e) => settings.setShowListTimestamps(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsDepends
		enabled={settings.showListTimestamps}
		inactiveReason={settings.showListTimestamps
			? undefined
			: 'Turn on timestamps above to choose their format'}
	>
		<SettingsRow title="Full dates" description="Full date and time instead of compact labels like Mon or May 25">
			<input
				type="checkbox"
				class="z-checkbox"
				checked={settings.showFullDatesInList}
				onchange={(e) => settings.setShowFullDatesInList(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsDepends>

	<SettingsRow title="Highlight unread" description="Bold subject for unread messages">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.highlightUnreadInList}
			onchange={(e) => settings.setHighlightUnreadInList(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Bulk select" description="Checkbox row above the list — Shift+click selects ranges, Ctrl+click toggles.">
	<SettingsRow title="Enable bulk select" description="Master checkbox and menu above the message list">
		<input
			type="checkbox"
			class="z-checkbox"
			checked={settings.showBulkSelect}
			onchange={(e) => settings.setShowBulkSelect(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Defaults">
	<SettingsRow title="Reset inbox settings" description="Restore every option on this page">
		<button
			type="button"
			class="z-btn-ghost text-sm"
			onclick={() => {
				if (confirm('Reset inbox settings to defaults?')) {
					settings.resetInboxSettings();
				}
			}}
		>
			Reset
		</button>
	</SettingsRow>
</SettingsGroup>
