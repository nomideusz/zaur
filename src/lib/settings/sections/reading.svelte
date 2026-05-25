<script lang="ts">
	import SettingsDepends from '$lib/components/settings/SettingsDepends.svelte';
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { settings, type DefaultReplyMode, type ReaderTextSize } from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Message content" description="Text size and how HTML mail is handled.">
	<SettingsRow
		title="Reading size"
		description="Text size when reading and writing — HTML mail follows the reader theme in dark mode"
	>
		<select
			class="z-input w-auto"
			value={settings.readerTextSize}
			onchange={(e) => settings.setReaderTextSize(e.currentTarget.value as ReaderTextSize)}
		>
			<option value="small">Small</option>
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

	<SettingsDepends
		enabled={settings.blockExternalContent}
		inactiveReason={settings.blockExternalContent
			? 'Blocked images notice'
			: 'Only applies when external images are blocked'}
	>
		<SettingsRow
			title="Hide blocked-images banner"
			description="Do not show the external images notice in the reader"
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
	</SettingsDepends>

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
</SettingsGroup>

<SettingsGroup title="Reading pane layout" description="Padding and dividers in the reading pane.">
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
</SettingsGroup>

<SettingsGroup title="Attachments" description="How files appear in the reading pane and compose.">
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
</SettingsGroup>

<SettingsGroup title="Reply" description="Default reply action and the quick reply box.">
	<SettingsRow
		title="Default reply action"
		description="Primary reply button in the reading pane — r always replies, a always reply all"
	>
		<select
			class="z-input w-auto"
			value={settings.defaultReplyMode}
			onchange={(e) =>
				settings.setDefaultReplyMode(e.currentTarget.value as DefaultReplyMode)}
		>
			<option value="reply">Reply</option>
			<option value="reply-all">Reply all</option>
		</select>
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

	<SettingsDepends
		enabled={settings.showQuickReply}
		inactiveReason={settings.showQuickReply
			? 'Quick reply appearance'
			: 'Turn on quick reply above to adjust its layout'}
	>
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
	</SettingsDepends>
</SettingsGroup>

<SettingsGroup title="Message header" description="Sender, recipients, and avatars at the top of a message.">
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

	<SettingsDepends
		enabled={settings.showAvatars}
		inactiveReason={settings.showAvatars
			? 'Reader avatar size'
			: 'Turn on sender avatars in the inbox list to size reader avatars'}
	>
		<SettingsRow
			title="Compact reader avatars"
			description="Smaller sender avatars in the reading pane"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactReaderAvatars}
				onchange={(e) => settings.setCompactReaderAvatars(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsDepends>

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
</SettingsGroup>

<SettingsGroup title="Toolbar buttons" description="Action buttons in the reading pane header.">
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

	<SettingsDepends
		enabled={!settings.minimalReaderToolbar}
		inactiveReason={settings.minimalReaderToolbar
			? 'Toolbar is already minimal — fewer buttons to space'
			: 'Reader toolbar spacing'}
	>
		<SettingsRow
			title="Compact reader toolbar"
			description="Tighter spacing between action buttons in the reading pane header"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactReaderToolbar}
				onchange={(e) => settings.setCompactReaderToolbar(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact reader more menu"
			description="Tighter spacing in the mobile more-actions menu in the reading pane"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactReaderMoreMenu}
				onchange={(e) => settings.setCompactReaderMoreMenu(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsDepends>
</SettingsGroup>

<SettingsGroup title="Move to folder" description="Folder picker when moving messages from the list or reading pane.">
	<SettingsRow
		title="Hide move menu labels"
		description="Remove the “Move to” heading in folder move dropdowns — in the list toolbar and reading pane"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideMoveMenuLabels}
			onchange={(e) => settings.setHideMoveMenuLabels(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsDepends
		enabled={!settings.hideMoveMenuLabels}
		inactiveReason={settings.hideMoveMenuLabels
			? 'Move menu labels are hidden'
			: 'Move menu layout'}
	>
		<SettingsRow
			title="Compact move menu"
			description="Tighter spacing in folder move dropdowns from the list toolbar and reading pane"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactMoveMenu}
				onchange={(e) => settings.setCompactMoveMenu(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsDepends>
</SettingsGroup>

<SettingsGroup title="Threads" description="How conversations expand and collapse.">
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
		title="Compact collapsed threads"
		description="Tighter spacing on collapsed messages in a conversation"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactCollapsedThreads}
			onchange={(e) => settings.setCompactCollapsedThreads(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Empty reading pane" description="When no message is selected." advanced>
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

	<SettingsDepends
		enabled={!settings.hideEmptyReaderPrompts}
		inactiveReason={settings.hideEmptyReaderPrompts
			? 'Empty reading pane shows no prompts'
			: 'Empty reading pane appearance'}
	>
		<SettingsRow
			title="Hide empty reader description"
			description="Keep the empty reading pane title but remove the explanatory paragraph below it"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideEmptyReaderDescription}
				onchange={(e) => settings.setHideEmptyReaderDescription(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide empty reader actions"
			description="Remove Compose and settings buttons when no message is selected"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideEmptyReaderActions}
				onchange={(e) => settings.setHideEmptyReaderActions(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Hide empty reader icon"
			description="Remove the mail icon above the empty reading pane title"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideEmptyReaderIcon}
				onchange={(e) => settings.setHideEmptyReaderIcon(e.currentTarget.checked)}
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
	</SettingsDepends>
</SettingsGroup>

<SettingsGroup title="Error & offline screens" description="When a message fails to load or you are offline." advanced>
	<SettingsRow
		title="Compact reader status"
		description="Less padding on offline, not-found, and load-error screens in the reading pane"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactReaderStatus}
			onchange={(e) => settings.setCompactReaderStatus(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Compact reader inline error"
		description="Smaller load-error banner above the message body when a thread fails to open"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactReaderInlineError}
			onchange={(e) => settings.setCompactReaderInlineError(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Hide reader status back button"
		description="Remove the Back to list button on offline, not-found, and load-error screens"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideReaderStatusBackButton}
			onchange={(e) => settings.setHideReaderStatusBackButton(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Hide reader status message"
		description="Show only the status heading on offline, not-found, and load-error screens — no detail text"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideReaderStatusMessage}
			onchange={(e) => settings.setHideReaderStatusMessage(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Defaults">
	<SettingsRow
		title="Reset reading settings"
		description="Restore reply, header, threads, attachments, and layout options on this page to their original value"
	>
		<button
			type="button"
			class="z-btn-ghost text-sm"
			onclick={() => {
				if (confirm('Reset all reading settings to defaults?')) {
					settings.resetReadingSettings();
				}
			}}
		>
			Reset
		</button>
	</SettingsRow>
</SettingsGroup>
