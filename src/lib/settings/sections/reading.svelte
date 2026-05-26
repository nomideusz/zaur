<script lang="ts">
	import SettingsDepends from '$lib/components/settings/SettingsDepends.svelte';
	import SettingsGroup from '$lib/components/settings/SettingsGroup.svelte';
	import SettingsRow from '$lib/components/settings/SettingsRow.svelte';
	import { settings, type DefaultReplyMode, type ReaderTextSize } from '$lib/stores/settings.svelte';
</script>

<SettingsGroup title="Reading & replies" description="Text size, privacy, and reply behavior.">
	<SettingsRow
		title="Reading size"
		description="Text size when reading and writing"
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
		description="Block remote images in HTML mail — you can still show them per message"
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
	</SettingsDepends>

	<SettingsRow
		title="Prefer plain text"
		description="Show plain text when available instead of HTML"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.preferPlainText}
			onchange={(e) => settings.setPreferPlainText(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Default reply action"
		description="Primary reply button — r replies, a reply all"
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
		description="Reply box at the bottom of an open message"
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
			description="Single-line reply box with less padding"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactQuickReply}
				onchange={(e) => settings.setCompactQuickReply(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsDepends>

	<SettingsRow
		title="Show contact actions"
		description="Save contact and copy email in the message header"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.showReaderContactActions}
			onchange={(e) => settings.setShowReaderContactActions(e.currentTarget.checked)}
		/>
	</SettingsRow>
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
</SettingsGroup>

<SettingsGroup title="Thread display" description="Headers, timestamps, and collapsed messages." advanced>
	<SettingsRow
		title="Hide To and Cc lines"
		description="Do not show recipient lists under the sender"
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
		description="Show only the sender name in the message header"
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
		title="Compact subject title"
		description="Smaller subject line above the message body"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactReaderHeader}
			onchange={(e) => settings.setCompactReaderHeader(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Hide thread summary"
		description="Hide message count and expand/collapse controls under the subject"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideThreadSummary}
			onchange={(e) => settings.setHideThreadSummary(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Hide reader timestamps"
		description="Do not show received date and time on messages"
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
		description="Sender names only on collapsed messages — no preview snippet"
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

<SettingsGroup title="Toolbar & layout" description="Reading pane chrome and attachments." advanced>
	<SettingsRow
		title="Icon-only thread actions"
		description="Mark read and Reply as icons only in the thread toolbar"
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
			? 'Thread actions are icon-only'
			: 'Thread toolbar spacing'}
	>
		<SettingsRow
			title="Compact thread actions"
			description="Tighter spacing between toolbar buttons"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.compactReaderToolbar}
				onchange={(e) => settings.setCompactReaderToolbar(e.currentTarget.checked)}
			/>
		</SettingsRow>
	</SettingsDepends>

	<SettingsRow
		title="Compact reader body"
		description="Less padding around message content"
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
		description="Remove divider lines in the reading pane"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.hideReaderPaneBorders}
			onchange={(e) => settings.setHideReaderPaneBorders(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Compact attachments"
		description="Smaller attachment chips without file sizes"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactAttachments}
			onchange={(e) => settings.setCompactAttachments(e.currentTarget.checked)}
		/>
	</SettingsRow>

	<SettingsRow
		title="Compact move menu"
		description="Tighter spacing in folder move dropdowns"
	>
		<input
			type="checkbox"
			class="size-4 accent-accent"
			checked={settings.compactMoveMenu}
			onchange={(e) => settings.setCompactMoveMenu(e.currentTarget.checked)}
		/>
	</SettingsRow>
</SettingsGroup>

<SettingsGroup title="Empty reading pane" description="When no message is selected." advanced>
	<SettingsRow
		title="Hide empty reader prompts"
		description="Leave the reading pane blank until a message is selected"
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
			description="Title only — no explanatory paragraph"
		>
			<input
				type="checkbox"
				class="size-4 accent-accent"
				checked={settings.hideEmptyReaderDescription}
				onchange={(e) => settings.setHideEmptyReaderDescription(e.currentTarget.checked)}
			/>
		</SettingsRow>

		<SettingsRow
			title="Compact empty reader"
			description="Less padding when no message is selected"
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

<SettingsGroup title="Defaults">
	<SettingsRow title="Reset reading settings" description="Restore every option on this page">
		<button
			type="button"
			class="z-btn-ghost text-sm"
			onclick={() => {
				if (confirm('Reset reading settings to defaults?')) {
					settings.resetReadingSettings();
				}
			}}
		>
			Reset
		</button>
	</SettingsRow>
</SettingsGroup>
