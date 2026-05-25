<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { settings, type ListDensity, type ReaderTextSize } from '$lib/stores/settings.svelte';
	import { theme, type ThemeMode } from '$lib/stores/theme.svelte';
</script>

<SettingsGroup title="Your inbox" description="How messages appear in the list.">
		<SettingsRow
			title="List density"
			description="Row spacing — turn off previews below for a tighter list"
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
			title="Show sender email in list"
			description="Use the email address instead of the sender name in each row"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.showSenderEmailInList}
				disabled={settings.subjectOnlyList}
				onchange={(e) => settings.setShowSenderEmailInList(e.currentTarget.checked)}
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
			title="Show bulk select"
			description="Select button and multi-message actions in the list toolbar"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.showBulkSelect}
				onchange={(e) => settings.setShowBulkSelect(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide selection hints"
			description="Remove the “Click messages to select” hint in bulk selection mode"
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
			title="Compact bulk toolbar"
			description="Less height on the selection toolbar above the message list"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactBulkToolbar}
				onchange={(e) => settings.setCompactBulkToolbar(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Expand list until opened"
			description="Use the full width for the message list on desktop until you pick a message"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.expandListUntilOpen}
				onchange={(e) => settings.setExpandListUntilOpen(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact list rows"
			description="Tighter vertical padding on each message row in the inbox list"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactListRows}
				onchange={(e) => settings.setCompactListRows(e.currentTarget.checked)}
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

		<SettingsRow
			title="Auto-load more messages"
			description="Load older messages automatically when you scroll to the bottom of the list"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.autoLoadMore}
				onchange={(e) => settings.setAutoLoadMore(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact load more"
			description="Tighter spacing for the load-more area at the bottom of the message list"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactLoadMore}
				onchange={(e) => settings.setCompactLoadMore(e.currentTarget.checked)}
			/>
		</SettingsRow>

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
