<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import ArrowLeft from '$lib/components/icons/ArrowLeft.svelte';
	import type { Snippet } from 'svelte';
	import MailboxSidebar from '$lib/components/mail/MailboxSidebar.svelte';
	import MobilePicker from '$lib/components/ui/MobilePicker.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';

	interface Props {
		list: Snippet;
		reader: Snippet;
		mailboxName?: string;
		onBack?: () => void;
	}

	let { list, reader, mailboxName = 'Mail', onBack }: Props = $props();

	const mailboxRouteId = $derived($page.params.mailbox ?? null);
	const isThreadOpen = $derived(!!$page.params.threadId);
	const showMobileChrome = $derived(!!mailboxRouteId);
	const folderPickerOptions = $derived(
		mail.mailboxes.map((folder) => ({
			value: folder.id,
			label: `${folder.name}${
				settings.showFolderUnreadCounts && folder.unread > 0 ? ` (${folder.unread})` : ''
			}`
		}))
	);

	function navigateToMailbox(id: string) {
		if (id && id !== mailboxRouteId) {
			void goto(`/mail/${id}`);
		}
	}
</script>

<div class="z-traditional-mail-shell flex min-h-0 flex-1 flex-row overflow-hidden">
	<MailboxSidebar variant="settings" />

	<div class="z-mail-pane z-traditional-mail-pane flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
		{#if showMobileChrome}
			<header class="z-settings-mobile-header z-panel shrink-0 border-b border-border md:hidden">
				<div class="flex items-center gap-2 px-3 py-2">
					{#if isThreadOpen && onBack}
						<button
							type="button"
							class="inline-flex size-10 shrink-0 items-center justify-center rounded-sm text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg"
							aria-label="Back to {mailboxName}"
							onclick={onBack}
						>
							<ArrowLeft class="size-5" aria-hidden="true" />
						</button>
					{/if}
					{#if mailboxRouteId && !isThreadOpen}
						<MobilePicker
							label="Folder"
							value={mailboxRouteId}
							options={folderPickerOptions}
							compact={settings.compactMobileFolderPicker}
							onchange={navigateToMailbox}
						/>
					{:else if isThreadOpen}
						<h2 class="z-type-pane-title min-w-0 flex-1 truncate text-sm">{mailboxName}</h2>
					{/if}
				</div>
			</header>
		{/if}

		{#if mailboxRouteId}
			<div class="z-traditional-mail-split flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">
				{@render list()}
				{#if !mail.hasSelection}
					{@render reader()}
				{/if}
			</div>
		{:else}
			<div class="z-pane-scroll min-h-0 min-w-0 flex-1 overflow-y-auto">
				<div class="z-traditional-mail-content flex min-h-full min-w-0 flex-col">
					{@render list()}
				</div>
			</div>
		{/if}
	</div>
</div>
