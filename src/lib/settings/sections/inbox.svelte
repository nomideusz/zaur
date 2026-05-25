<script lang="ts">
	import SettingsDepends from '$lib/components/settings/SettingsDepends.svelte';
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { settings, type ListDensity, type ListTextSize } from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Message list" description="Row size, preview, and what each message shows.">
	<SettingsRow
		title="List text size"
		description="Font size for sender, subject, and preview in the message list"
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
		description="Row height preset — turn off previews for a tighter list; compact list rows adds extra padding trim"
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

	<SettingsRow title="Show message preview" description="Second line under the subject in the inbox list">
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.showListPreview}
			onchange={(e) => settings.setShowListPreview(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Compact list rows"
		description="Extra vertical padding trim on each row — stacks with list density above"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactListRows}
			onchange={(e) => settings.setCompactListRows(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Show sender avatars"
		description="Color initials beside each message — turn off for a simpler, text-only list"
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
		<SettingsRow
			title="Compact list avatars"
			description="Smaller sender avatars in the message list"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactListAvatars}
				onchange={(e) => settings.setCompactListAvatars(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsDepends>

	<SettingsRow
		title="Show stars in list"
		description="Star icon beside starred messages in the inbox list"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.showStarsInList}
			onchange={(e) => settings.setShowStarsInList(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Show attachment icons"
		description="Paperclip beside messages that include files"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.showAttachmentIcons}
			onchange={(e) => settings.setShowAttachmentIcons(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Show full dates in list"
		description="Use full date and time instead of compact labels like Mon or May 25"
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
		description="Show only the subject on each row — hides the sender line for a tighter inbox"
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
			description="Use the email address instead of the sender name in each row"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.showSenderEmailInList}
				onchange={(e) => settings.setShowSenderEmailInList(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsDepends>

	<SettingsRow
		title="Show timestamps in list"
		description="Date or time on the right side of each message row"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.showListTimestamps}
			onchange={(e) => settings.setShowListTimestamps(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Unread & dividers" description="How unread messages and selected rows look.">
	<SettingsRow
		title="Highlight unread messages"
		description="Bold text and unread dots in the message list"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.highlightUnreadInList}
			onchange={(e) => settings.setHighlightUnreadInList(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Hide list row dividers"
		description="Remove horizontal lines between messages in the inbox list"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideListRowDividers}
			onchange={(e) => settings.setHideListRowDividers(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Hide active message indicator"
		description="Remove the colored left border on the selected message in the list"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideListActiveIndicator}
			onchange={(e) => settings.setHideListActiveIndicator(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="List toolbar" description="Folder title bar, counts, and mobile folder picker.">
	<SettingsRow
		title="Show message counts"
		description="Unread and total counts in the list header"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.showMessageCounts}
			onchange={(e) => settings.setShowMessageCounts(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Hide list header on desktop"
		description="Hide the folder title and count — the bulk-select checkbox stays visible when enabled"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideListHeader}
			onchange={(e) => settings.setHideListHeader(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsDepends
		enabled={!settings.hideListHeader}
		inactiveReason={settings.hideListHeader
			? 'List header is hidden on desktop'
			: 'List header on desktop'}
	>
		<SettingsRow
			title="Compact list header"
			description="Shorter folder title bar above the message list"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactListHeader}
				onchange={(e) => settings.setCompactListHeader(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsDepends>

	<SettingsRow
		title="Compact mobile folder picker"
		description="Smaller folder dropdown above the message list on mobile"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactMobileFolderPicker}
			onchange={(e) => settings.setCompactMobileFolderPicker(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Bulk selection" description="Multi-select messages for archive, move, and delete.">
	<SettingsRow
		title="Show bulk select"
		description="Checkbox or Ctrl/Shift+click to select messages; the open message is selected when you start"
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
			: 'Turn on bulk select above to adjust selection mode'}
	>
		<SettingsRow
			title="Hide selection hints"
			description="Remove the “Ctrl or Shift+click to add messages” hint in bulk selection mode"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideSelectionHints}
				onchange={(e) => settings.setHideSelectionHints(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Icon-only bulk actions"
			description="Show icons without labels on archive, move, and delete in selection mode"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.iconOnlyBulkActions}
				onchange={(e) => settings.setIconOnlyBulkActions(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact bulk toolbar"
			description="Less height on the selection bar that replaces the folder name while messages are selected"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactBulkToolbar}
				onchange={(e) => settings.setCompactBulkToolbar(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsDepends>
</SettingsGroup>

<SettingsGroup title="Search results" description="How search appears in the message list." advanced>
	<SettingsRow
		title="Hide search list prefix"
		description="Show the query alone in search results — no “Search:” label"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideSearchListPrefix}
			onchange={(e) => settings.setHideSearchListPrefix(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Empty & error states" description="When a folder is empty or the list fails to load." advanced>
	<SettingsRow
		title="Hide empty list hints"
		description="Show only the primary empty-folder message — no icons or secondary hint text"
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
		description="Remove Write a message and other action buttons when a folder or search is empty"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideListEmptyActions}
			onchange={(e) => settings.setHideListEmptyActions(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Compact empty list state"
		description="Less padding and smaller icons when a folder or search has no messages"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactListEmptyState}
			onchange={(e) => settings.setCompactListEmptyState(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Compact list error state"
		description="Less padding when the message list fails to load"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactListErrorState}
			onchange={(e) => settings.setCompactListErrorState(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Hide list error retry"
		description="Remove the Try again button when the message list fails to load"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideListErrorRetry}
			onchange={(e) => settings.setHideListErrorRetry(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Defaults">
	<SettingsRow
		title="Reset inbox settings"
		description="Restore every option on this page to its original value"
	>
		<button
			type="button"
			class="z-btn-ghost text-sm"
			onclick={() => {
				if (confirm('Reset all inbox list settings to defaults?')) {
					settings.resetInboxSettings();
				}
			}}
		>
			Reset
		</button>
	</SettingsRow>
</SettingsGroup>
