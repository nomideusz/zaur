<script lang="ts">
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { settings, type ListDensity, type ReaderTextSize } from '$lib/stores/settings.svelte';
	import { theme, type ThemeMode } from '$lib/stores/theme.svelte';
	import { toast } from '$lib/stores/toast.svelte';

	let importInput = $state<HTMLInputElement | null>(null);

	function importPreferences(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		void file.text().then((text) => {
			const result = settings.importLocalPreferences(text);
			if (result.ok) {
				toast.show('Settings imported', 'success');
			} else {
				toast.show(result.error, 'error');
			}
			input.value = '';
		});
	}

	const simplificationCount = $derived(settings.simplificationCount());
</script>

<svelte:head>
	<title>Display · ZAUR Webmail</title>
</svelte:head>

<SettingsPanel
	title="Display"
	description="Appearance and how messages are shown in the list and reader.{simplificationCount > 0
		? ` ${simplificationCount} simplification${simplificationCount === 1 ? '' : 's'} active.`
		: ''}"
>
	<SettingsGroup title="Appearance">
		<SettingsRow title="Theme" description="Light, dark, or match your system — also in the account menu">
			<select
				class="z-input w-auto"
				value={theme.theme}
				onchange={(e) => theme.set(e.currentTarget.value as ThemeMode)}
			>
				<option value="system">System</option>
				<option value="light">Light</option>
				<option value="dark">Dark</option>
			</select>
		</SettingsRow>

		<SettingsRow
			title="Reduce motion"
			description="Turn off page transitions, loading animations, and other motion effects"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.reduceMotion}
				onchange={(e) => settings.setReduceMotion(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Minimal loading states"
			description="Show simple loading text instead of animated skeleton placeholders"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.minimalLoadingStates}
				onchange={(e) => settings.setMinimalLoadingStates(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide connecting screen"
			description="Blank screen while restoring your session — no “Connecting…” message"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideConnectingScreen}
				onchange={(e) => settings.setHideConnectingScreen(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsGroup>

	<SettingsGroup title="Inbox list">
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
			description="Show only the primary empty-folder message — no icons, hints, or Write a message button"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideListEmptyHints}
				onchange={(e) => settings.setHideListEmptyHints(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsGroup>

	<SettingsGroup title="Reading">
		<SettingsRow
			title="Reading size"
			description="Text size when reading and writing — HTML mail follows the reader theme in dark mode"
		>
			<select
				class="z-input w-auto"
				value={settings.readerTextSize}
				onchange={(e) => settings.setReaderTextSize(e.currentTarget.value as ReaderTextSize)}
			>
				<option value="normal">Normal</option>
				<option value="large">Large</option>
			</select>
		</SettingsRow>

		<SettingsRow
			title="Block external content"
			description="Block remote images in HTML mail — you can still show them once per message"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.blockExternalContent}
				onchange={(e) => settings.setBlockExternalContent(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide blocked-images banner"
			description="Do not show the external images notice in the reader — change blocking in Display settings"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideExternalContentBanner}
				onchange={(e) => settings.setHideExternalContentBanner(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact blocked-images banner"
			description="Smaller external images notice in the reading pane"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactExternalContentBanner}
				onchange={(e) => settings.setCompactExternalContentBanner(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Prefer plain text"
			description="Show the plain-text version when available instead of formatted HTML"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.preferPlainText}
				onchange={(e) => settings.setPreferPlainText(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Show quick reply"
			description="Reply box at the bottom of an open message — use Full reply for the compose panel"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.showQuickReply}
				onchange={(e) => settings.setShowQuickReply(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact quick reply"
			description="Single-line reply box with less padding at the bottom of the reading pane"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactQuickReply}
				onchange={(e) => settings.setCompactQuickReply(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Expand all thread messages"
			description="Show every message in a conversation expanded by default"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.expandAllThreadMessages}
				onchange={(e) => settings.setExpandAllThreadMessages(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Show contact actions"
			description="Save contact and copy email links in the message header"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.showReaderContactActions}
				onchange={(e) => settings.setShowReaderContactActions(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide To and Cc lines"
			description="Do not show recipient lists under the sender in the message header"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideReaderRecipients}
				onchange={(e) => settings.setHideReaderRecipients(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide sender email"
			description="Show only the sender name in the message header — no email address line"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideReaderSenderEmail}
				onchange={(e) => settings.setHideReaderSenderEmail(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Minimal reader toolbar"
			description="Hide star, reply all, and forward buttons — reply and more actions stay available"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.minimalReaderToolbar}
				onchange={(e) => settings.setMinimalReaderToolbar(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact reader header"
			description="Smaller subject line and less padding at the top of the reading pane"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactReaderHeader}
				onchange={(e) => settings.setCompactReaderHeader(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide reader pane borders"
			description="Remove divider lines in the reading pane header, banners, and between thread messages"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideReaderPaneBorders}
				onchange={(e) => settings.setHideReaderPaneBorders(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide move menu labels"
			description="Remove the “Move to” heading above folder names in move menus"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideMoveMenuLabels}
				onchange={(e) => settings.setHideMoveMenuLabels(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact move menu"
			description="Tighter spacing in folder move dropdowns from the reading pane"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactMoveMenu}
				onchange={(e) => settings.setCompactMoveMenu(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact reader body"
			description="Less padding around message content in the reading pane"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactReaderBody}
				onchange={(e) => settings.setCompactReaderBody(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide thread summary"
			description="Do not show message count and expand/collapse controls under the subject"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideThreadSummary}
				onchange={(e) => settings.setHideThreadSummary(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide thread collapse buttons"
			description="Remove expand/collapse chevrons on individual messages in a thread"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideThreadCollapseButtons}
				onchange={(e) => settings.setHideThreadCollapseButtons(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide reader timestamps"
			description="Do not show received date and time on messages in the reading pane"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideReaderTimestamps}
				onchange={(e) => settings.setHideReaderTimestamps(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide collapsed thread previews"
			description="Show only sender names on collapsed messages in a thread — no preview snippet"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideCollapsedThreadPreviews}
				onchange={(e) => settings.setHideCollapsedThreadPreviews(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact attachments"
			description="Smaller attachment chips without the count label or file sizes — in reader and compose"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactAttachments}
				onchange={(e) => settings.setCompactAttachments(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide empty reader prompts"
			description="Leave the reading pane blank until a message is selected — no compose or settings nudges"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideEmptyReaderPrompts}
				onchange={(e) => settings.setHideEmptyReaderPrompts(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact empty reader"
			description="Less padding and smaller text in the reading pane when no message is selected"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactEmptyReader}
				onchange={(e) => settings.setCompactEmptyReader(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsGroup>

	<SettingsGroup title="Compose">
		<SettingsRow
			title="Hide compose hints"
			description="Remove nudges like “Set display name”, “Add a signature”, and keyboard shortcut tips"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideComposeHints}
				onchange={(e) => settings.setHideComposeHints(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Collapse quoted text"
			description="Keep quoted reply content folded when composing"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.collapseQuotedInCompose}
				onchange={(e) => settings.setCollapseQuotedInCompose(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Show Cc/Bcc fields"
			description="Cc and Bcc rows in compose — reply-all still shows Cc when needed"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.showCcBccInCompose}
				onchange={(e) => settings.setShowCcBccInCompose(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide From line in compose"
			description="Remove the sender row at the top of the compose panel"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideComposeFromLine}
				onchange={(e) => settings.setHideComposeFromLine(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide compose field labels"
			description="Remove To, Cc, Bcc, and Subject labels — fields stay usable with placeholders"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideComposeFieldLabels}
				onchange={(e) => settings.setHideComposeFieldLabels(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact compose panel"
			description="Narrower compose drawer on desktop — more room beside the message list"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactComposePanel}
				onchange={(e) => settings.setCompactComposePanel(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Icon-only attach button"
			description="Show only the paperclip icon for attachments in compose — no “Attach” label"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.iconOnlyComposeAttach}
				onchange={(e) => settings.setIconOnlyComposeAttach(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Icon-only discard button"
			description="Show an X icon instead of the Discard label in compose"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.iconOnlyComposeDiscard}
				onchange={(e) => settings.setIconOnlyComposeDiscard(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide compose panel borders"
			description="Remove divider lines between header, fields, and footer in the compose drawer"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideComposePanelBorders}
				onchange={(e) => settings.setHideComposePanelBorders(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact compose attachments"
			description="Tighter spacing and smaller chips for files attached in compose"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactComposeAttachments}
				onchange={(e) => settings.setCompactComposeAttachments(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compose contact suggestions"
			description="Autocomplete contacts while typing recipients"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.showComposeContactSuggestions}
				onchange={(e) => settings.setShowComposeContactSuggestions(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact compose suggestions"
			description="Tighter spacing in recipient autocomplete while composing"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactComposeSuggestions}
				onchange={(e) => settings.setCompactComposeSuggestions(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsGroup>

	<SettingsGroup title="Layout">
		<SettingsRow
			title="Compact layout"
			description="Narrower folder sidebar and message list — more room for reading on desktop"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactLayout}
				onchange={(e) => settings.setCompactLayout(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide folder sidebar header"
			description="Remove the “Folders” label above the mailbox tree"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideFolderSidebarHeader}
				onchange={(e) => settings.setHideFolderSidebarHeader(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide folder icons"
			description="Text-only folder names in the sidebar"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideFolderIcons}
				onchange={(e) => settings.setHideFolderIcons(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact folder sidebar"
			description="Tighter spacing on folder rows and sidebar padding"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactFolderSidebar}
				onchange={(e) => settings.setCompactFolderSidebar(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide list header on desktop"
			description="Remove the folder title bar above messages — mobile folder picker stays"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideListHeader}
				onchange={(e) => settings.setHideListHeader(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact header actions"
			description="Icon-only New and New event buttons in the top bar — saves horizontal space"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactHeaderActions}
				onchange={(e) => settings.setCompactHeaderActions(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact app header"
			description="Shorter top bar with less horizontal padding and spacing"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactAppHeader}
				onchange={(e) => settings.setCompactAppHeader(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide pane borders"
			description="Remove divider lines between the header, folder sidebar, and message list"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hidePaneBorders}
				onchange={(e) => settings.setHidePaneBorders(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide app title"
			description="Remove the ZAUR label from the top bar — the logo link still works for screen readers"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideAppTitle}
				onchange={(e) => settings.setHideAppTitle(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact account menu"
			description="Show only your avatar in the account button — no dropdown chevron"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactUserMenu}
				onchange={(e) => settings.setCompactUserMenu(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact account menu dropdown"
			description="Tighter spacing in the account menu panel — name, settings, theme, and sign out"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactUserMenuDropdown}
				onchange={(e) => settings.setCompactUserMenuDropdown(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsGroup>

	<SettingsGroup title="Navigation">
		<SettingsRow
			title="Skip home screen"
			description="Open inbox directly — hides the Home tab and welcome screen"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.skipHomeScreen}
				onchange={(e) => settings.setSkipHomeScreen(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Remember last mailbox"
			description="Open your last visited folder instead of Inbox when signing in or clicking Mail"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.rememberLastMailbox}
				onchange={(e) => settings.setRememberLastMailbox(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide sidebar shortcuts"
			description="Remove Contacts and Settings links from the mail folder sidebar — they stay in the top bar"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideSidebarShortcuts}
				onchange={(e) => settings.setHideSidebarShortcuts(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact sidebar shortcuts"
			description="Tighter Contacts and Settings links at the bottom of the folder sidebar"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactSidebarShortcuts}
				onchange={(e) => settings.setCompactSidebarShortcuts(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Mail-only navigation"
			description="Hide Calendar and Contacts from the top bar — for a focused mail experience"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.mailOnlyNavigation}
				onchange={(e) => settings.setMailOnlyNavigation(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide header search"
			description="Remove the search bar from the top bar — search remains on mobile via the icon"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideHeaderSearch}
				onchange={(e) => settings.setHideHeaderSearch(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Show folder unread counts"
			description="Unread badges on folders in the sidebar and mobile folder picker"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.showFolderUnreadCounts}
				onchange={(e) => settings.setShowFolderUnreadCounts(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Tool icons only"
			description="Hide Mail, Calendar, and other tool names in the top bar — icons with tooltips only"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.toolIconsOnly}
				onchange={(e) => settings.setToolIconsOnly(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact tool switcher"
			description="Tighter padding on Mail, Calendar, and Home tabs in the top bar"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactToolSwitcher}
				onchange={(e) => settings.setCompactToolSwitcher(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide search dropdown headers"
			description="Remove section labels like “Contacts” in the header search suggestions"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideSearchDropdownHeaders}
				onchange={(e) => settings.setHideSearchDropdownHeaders(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact search dropdown"
			description="Tighter spacing in header search suggestion results"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactSearchDropdown}
				onchange={(e) => settings.setCompactSearchDropdown(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide offline indicator"
			description="Do not show the offline badge in the header when you lose connection"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideOfflineIndicator}
				onchange={(e) => settings.setHideOfflineIndicator(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact offline indicator"
			description="Smaller offline badge in the header"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactOfflineIndicator}
				onchange={(e) => settings.setCompactOfflineIndicator(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide outbox unless failed"
			description="Do not show the outbox icon while messages are sending — only when a send fails"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideOutboxUnlessFailed}
				onchange={(e) => settings.setHideOutboxUnlessFailed(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact outbox menu"
			description="Tighter spacing in the queued-messages dropdown from the header"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactOutboxMenu}
				onchange={(e) => settings.setCompactOutboxMenu(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Search contact suggestions"
			description="Contact matches while typing in the header search bar"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.showSearchContactSuggestions}
				onchange={(e) => settings.setShowSearchContactSuggestions(e.currentTarget.checked)}
			/>
		</SettingsRow>

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

		<SettingsRow
			title="Compact mobile search"
			description="Less padding on the search field bar on mobile"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactMobileSearch}
				onchange={(e) => settings.setCompactMobileSearch(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsGroup>

	<SettingsGroup title="Contacts">
		<SettingsRow
			title="Compact contacts page"
			description="Less padding and a smaller header on the Contacts page"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactContactsPage}
				onchange={(e) => settings.setCompactContactsPage(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact contacts list"
			description="Tighter rows in the contacts list — avatars follow the show avatars setting"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactContactsList}
				onchange={(e) => settings.setCompactContactsList(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide contact message counts"
			description="Do not show how many messages you've exchanged with each contact"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideContactMessageCounts}
				onchange={(e) => settings.setHideContactMessageCounts(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsGroup>

	<SettingsGroup title="Settings page">
		<SettingsRow
			title="Hide settings nav hints"
			description="Remove section descriptions under Display, Mail, and Account — and the local storage note"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideSettingsNavHints}
				onchange={(e) => settings.setHideSettingsNavHints(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact settings rows"
			description="Less padding on each option row and between groups on settings pages"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactSettingsRows}
				onchange={(e) => settings.setCompactSettingsRows(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact settings layout"
			description="Reduce outer padding and column gap on settings pages"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactSettingsLayout}
				onchange={(e) => settings.setCompactSettingsLayout(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact settings panel"
			description="Less padding inside each settings card (Display, Mail, Account)"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactSettingsPanel}
				onchange={(e) => settings.setCompactSettingsPanel(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact settings nav"
			description="Tighter sidebar and mobile tab links on settings pages"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactSettingsNav}
				onchange={(e) => settings.setCompactSettingsNav(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsGroup>

	<SettingsGroup title="Reset">
		<SettingsRow
			title="Apply simple mode"
			description="One step to a minimal mail-only layout — you can still tweak individual options afterward"
		>
			<button
				type="button"
				class="z-btn-ghost text-sm"
				onclick={() => {
					if (confirm('Apply simple mode? This updates many display and navigation settings at once.')) {
						settings.applySimpleMode();
					}
				}}
			>
				Apply
			</button>
		</SettingsRow>

		<SettingsRow
			title="Restore display defaults"
			description="Reset all options on this page to their original values"
		>
			<button
				type="button"
				class="z-btn-ghost text-sm"
				onclick={() => {
					if (confirm('Reset all display and navigation settings to defaults?')) {
						settings.resetDisplaySettings();
					}
				}}
			>
				Reset
			</button>
		</SettingsRow>
	</SettingsGroup>

	<SettingsGroup title="Backup">
		<SettingsRow
			title="Export settings"
			description="Download your display, mail, and theme preferences from this browser"
		>
			<button type="button" class="z-btn-ghost text-sm" onclick={() => settings.downloadLocalPreferences()}>
				Export
			</button>
		</SettingsRow>

		<SettingsRow
			title="Import settings"
			description="Restore preferences from a previously exported JSON file"
		>
			<input bind:this={importInput} type="file" accept="application/json,.json" class="hidden" onchange={importPreferences} />
			<button type="button" class="z-btn-ghost text-sm" onclick={() => importInput?.click()}>
				Import
			</button>
		</SettingsRow>
	</SettingsGroup>
</SettingsPanel>
