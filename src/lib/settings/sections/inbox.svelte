<script lang="ts">
	import SettingsDepends from '$lib/components/settings/SettingsDepends.svelte';
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { settings, type ListDensity, type ListTextSize } from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Density" description="How dense each row feels.">
	<SettingsRow title="List density" description="Comfortable rows with more breathing room, or compact for more on screen">
		<select
			class="z-input w-auto"
			value={settings.listDensity}
			onchange={(e) => settings.setListDensity(e.currentTarget.value as ListDensity)}
		>
			<option value="comfortable">Comfortable</option>
			<option value="compact">Compact</option>
		</select>
	</SettingsRow>

	<SettingsRow title="Text size" description="Font size for sender, subject, and preview">
		<select
			class="z-input w-auto"
			value={settings.listTextSize}
			onchange={(e) => settings.setListTextSize(e.currentTarget.value as ListTextSize)}
		>
			<option value="small">Small</option>
			<option value="normal">Normal</option>
			<option value="large">Large</option>
		</select>
	</SettingsRow>

	<SettingsRow title="Show message preview" description="Second line under the subject in each row">
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.showListPreview}
			onchange={(e) => settings.setShowListPreview(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Row contents" description="What appears in each list row.">
	<SettingsRow title="Sender avatars" description="Photo or initials beside each message">
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.showAvatars}
			onchange={(e) => settings.setShowAvatars(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Stars" description="Star icon beside starred messages">
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.showStarsInList}
			onchange={(e) => settings.setShowStarsInList(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Attachment icons" description="Paperclip beside messages with files">
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.showAttachmentIcons}
			onchange={(e) => settings.setShowAttachmentIcons(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Timestamps" description="Date or time on the right of each row">
		<input
			type="checkbox"
			class="size-4 accent-accent"
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
				class="size-4 accent-accent"
				checked={settings.showFullDatesInList}
				onchange={(e) => settings.setShowFullDatesInList(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsDepends>

	<SettingsRow title="Highlight unread" description="Bold subject and unread dots in the list">
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.highlightUnreadInList}
			onchange={(e) => settings.setHighlightUnreadInList(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Subject only" description="Hide the sender line, show only the subject">
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.subjectOnlyList}
			onchange={(e) => settings.setSubjectOnlyList(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsDepends
		enabled={!settings.subjectOnlyList}
		inactiveReason={settings.subjectOnlyList
			? 'Sender line is hidden in subject-only mode'
			: undefined}
	>
		<SettingsRow title="Show sender email" description="Email address instead of display name">
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.showSenderEmailInList}
				onchange={(e) => settings.setShowSenderEmailInList(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsDepends>
</SettingsGroup>

<SettingsGroup title="Bulk select" description="Checkbox row above the list — Shift+click selects ranges, Ctrl+click toggles.">
	<SettingsRow title="Enable bulk select" description="Master checkbox and menu above the message list">
		<input
			type="checkbox"
			class="size-4 accent-accent"
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
