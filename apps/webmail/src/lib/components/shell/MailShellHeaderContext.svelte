<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import ArrowLeft from '$lib/components/icons/ArrowLeft.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import MobilePicker from '$lib/components/ui/MobilePicker.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import type { MailHeaderContext } from '$lib/stores/shell-header.svelte';
	import { settings } from '$lib/stores/settings.svelte';

	interface Props {
		ctx: MailHeaderContext | null;
	}

	let { ctx }: Props = $props();

	const threadId = $derived($page.params.threadId);
	const thread = $derived(mail.selectedThread);
	const threadSubject = $derived(thread.at(-1)?.subject ?? '(no subject)');
	const mailboxRouteId = $derived(ctx?.mailboxRouteId);
	const mobileReadingThread = $derived(
		!!threadId && !mail.hasSelection && thread.length > 0 && !mail.selectedLoading
	);
	const displayMailboxName = $derived.by(() => {
		const name = ctx?.mailboxName ?? '';
		return name.startsWith('Search:') ? name.slice(8) : name;
	});
	const showFolderTitle = $derived(!mail.hasSelection && !settings.hideListHeader);
	const mobileListSelecting = $derived(
		!!mailboxRouteId && !threadId && mail.hasSelection
	);
	const selectedCount = $derived(mail.selectedMessageIds.size);
	const showMobileFolderPicker = $derived(
		!!mailboxRouteId && !threadId && !mail.hasSelection && !mobileListSelecting
	);
	const folderPickerOptions = $derived(
		mail.mailboxes.map((folder) => ({
			value: folder.id,
			label: `${folder.name}${settings.showFolderUnreadCounts && folder.unread > 0 ? ` (${folder.unread})` : ''}`
		}))
	);
</script>

{#if ctx}
	<div class="flex min-w-0 flex-1 items-center gap-2">
		{#if mobileListSelecting}
			<button
				type="button"
				class="shrink-0 text-sm font-medium text-accent md:hidden"
				onclick={() => mail.clearSelection()}
			>
				Cancel
			</button>
			<h2 class="z-type-pane-title min-w-0 flex-1 truncate text-sm md:hidden">
				{selectedCount} selected
			</h2>
		{:else if ctx.onBack && threadId && !mail.hasSelection}
			<IconButton label="Back to list" class="md:hidden" onclick={ctx.onBack}>
				<ArrowLeft class="size-5" />
			</IconButton>
		{/if}

		{#if showFolderTitle}
			<h2 class="z-type-pane-title hidden min-w-0 truncate md:block">{displayMailboxName}</h2>
		{/if}

		{#if showMobileFolderPicker && mailboxRouteId}
			<MobilePicker
				class="md:hidden"
				label="Folder"
				value={mailboxRouteId}
				options={folderPickerOptions}
				compact={settings.compactMobileFolderPicker}
				onchange={(id) => goto(`/mail/${id}`)}
			/>
		{/if}

		{#if mobileReadingThread}
			<h2 class="z-type-pane-title min-w-0 flex-1 truncate text-sm md:hidden">{threadSubject}</h2>
		{/if}
	</div>
{/if}
