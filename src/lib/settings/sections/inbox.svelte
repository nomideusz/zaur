<script lang="ts">
	import SettingsDepends from '$lib/components/settings/SettingsDepends.svelte';
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { settings, type ListDensity, type ListTextSize } from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Message list" description="What each row shows and how dense it feels.">
	<SettingsRow
		title="List text size"
		description="Font size for sender, subject, and preview"
	>
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

	<SettingsRow
		title="List density"
		description="Row height — turn off previews for a tighter list"
	>
		<select
			class="z-input w-auto"
			value={settings.listDensity}
			onchange={(e) => settings.setListDensity(e.currentTarget.value as ListDensity)}
		>
			<option value="comfortable">Comfortable</option>
			<option value="compact">Compact</option>
		</select>
	</SettingsRow>

	<SettingsRow title="Show message preview" description="Second line under the subject">
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.showListPreview}
			onchange={(e) => settings.setShowListPreview(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Show sender avatars"
		description="Photos from Gravatar, Libravatar, or initials"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.showAvatars}
			onchange={(e) => settings.setShowAvatars(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsDepends
		enabled={settings.showAvatars}
		inactiveReason={settings.showAvatars
			? 'List avatar size'
			: 'Turn on sender avatars above to change their size'}
	>
		<SettingsRow title="Compact list avatars" description="Smaller avatars in each row">
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactListAvatars}
				onchange={(e) => settings.setCompactListAvatars(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsDepends>

	<SettingsRow title="Show stars in list" description="Star icon beside starred messages">
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.showStarsInList}
			onchange={(e) => settings.setShowStarsInList(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Show attachment icons" description="Paperclip beside messages with files">
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.showAttachmentIcons}
			onchange={(e) => settings.setShowAttachmentIcons(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Show full dates in list"
		description="Full date and time instead of compact labels like Mon or May 25"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.showFullDatesInList}
			onchange={(e) => settings.setShowFullDatesInList(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Subject-only list"
		description="Subject on each row only — hides the sender line"
	>
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
			: 'Sender line in the list'}
	>
		<SettingsRow
			title="Show sender email in list"
			description="Email address instead of display name"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.showSenderEmailInList}
				onchange={(e) => settings.setShowSenderEmailInList(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsDepends>

	<SettingsRow title="Show timestamps in list" description="Date or time on the right of each row">
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.showListTimestamps}
			onchange={(e) => settings.setShowListTimestamps(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Highlight unread messages" description="Bold subject and unread dots in the list">
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.highlightUnreadInList}
			onchange={(e) => settings.setHighlightUnreadInList(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup
	title="Bulk selection"
	description="Checkbox row above the list — Shift+click ranges, Ctrl+click to toggle."
>
	<SettingsRow
		title="Enable bulk select"
		description="Master checkbox and menu above the message list"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.showBulkSelect}
			onchange={(e) => settings.setShowBulkSelect(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsDepends
		enabled={settings.showBulkSelect}
		inactiveReason={settings.showBulkSelect
			? 'Bulk selection options'
			: 'Turn on bulk select above to adjust the selection bar'}
	>
		<SettingsRow
			title="Hide selection hints"
			description="Remove the Shift+click and Ctrl+click hints next to the checkbox"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideSelectionHints}
				onchange={(e) => settings.setHideSelectionHints(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow title="Compact selection bar" description="Shorter bulk selection row">
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactListHeader}
				onchange={(e) => settings.setCompactListHeader(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsDepends>
</SettingsGroup>

<SettingsGroup title="List appearance" description="Dividers and header chrome." advanced>
	<SettingsRow title="Hide list row dividers" description="Remove horizontal lines between messages">
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideListRowDividers}
			onchange={(e) => settings.setHideListRowDividers(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Hide folder title in app header"
		description="Hide the folder name in the top bar on desktop"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideListHeader}
			onchange={(e) => settings.setHideListHeader(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Compact mobile folder picker"
		description="Smaller folder dropdown in the top bar on phones"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactMobileFolderPicker}
			onchange={(e) => settings.setCompactMobileFolderPicker(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Empty folders" description="When a folder or search has no messages." advanced>
	<SettingsRow
		title="Hide empty list hints"
		description="Primary empty message only — no icons or secondary text"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideListEmptyHints}
			onchange={(e) => settings.setHideListEmptyHints(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Hide empty list actions"
		description="Remove action buttons when a folder has no messages"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideListEmptyActions}
			onchange={(e) => settings.setHideListEmptyActions(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow title="Compact empty list state" description="Less padding when a folder is empty">
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactListEmptyState}
			onchange={(e) => settings.setCompactListEmptyState(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Defaults">
	<SettingsRow title="Reset inbox list settings" description="Restore every option on this page">
		<button
			type="button"
			class="z-btn-ghost text-sm"
			onclick={() => {
				if (confirm('Reset inbox list settings to defaults?')) {
					settings.resetInboxSettings();
				}
			}}
		>
			Reset
		</button>
	</SettingsRow>
</SettingsGroup>
