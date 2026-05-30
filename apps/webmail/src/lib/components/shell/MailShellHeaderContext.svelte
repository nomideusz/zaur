<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import ArrowLeft from '$lib/components/icons/ArrowLeft.svelte';
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import type { MailHeaderContext } from '$lib/stores/shell-header.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		ctx: MailHeaderContext;
	}

	let { ctx }: Props = $props();

	const threadId = $derived($page.params.threadId);
	const thread = $derived(mail.selectedThread);
	const threadSubject = $derived(thread.at(-1)?.subject ?? '(no subject)');
	const mobileReadingThread = $derived(
		!!threadId && !mail.hasSelection && thread.length > 0 && !mail.selectedLoading
	);
	const displayMailboxName = $derived(
		ctx.mailboxName.startsWith('Search:') ? ctx.mailboxName.slice(8) : ctx.mailboxName
	);
	const showFolderTitle = $derived(!mail.hasSelection && !settings.hideListHeader);
	const mobileListSelecting = $derived(
		!!ctx.mailboxRouteId && !threadId && mail.hasSelection
	);
	const selectedCount = $derived(mail.selectedMessageIds.size);
	const mobileFolderLabel = $derived.by(() => {
		if (!ctx.mailboxRouteId) return displayMailboxName;
		const folder = mail.mailboxByRouteId(ctx.mailboxRouteId);
		if (!folder) return displayMailboxName;
		const unread =
			settings.showFolderUnreadCounts && folder.unread > 0 ? ` (${folder.unread})` : '';
		return `${folder.name}${unread}`;
	});
	const showMobileFolderPicker = $derived(
		!!ctx.mailboxRouteId && !threadId && !mail.hasSelection && !mobileListSelecting
	);
</script>

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



	{#if showMobileFolderPicker}
		<label class="relative flex min-h-11 min-w-0 flex-1 md:hidden">
			<span class="sr-only">Folder, {mobileFolderLabel}</span>
			<select
				class="absolute inset-0 z-[1] h-full w-full cursor-pointer opacity-0"
				value={ctx.mailboxRouteId}
				onchange={(e) => goto(`/mail/${e.currentTarget.value}`)}
			>
				{#each mail.mailboxes as folder (folder.id)}
					<option value={folder.id}>
						{folder.name}{settings.showFolderUnreadCounts && folder.unread > 0
							? ` (${folder.unread})`
							: ''}
					</option>
				{/each}
			</select>
			<span
				class={cn(
					'z-mobile-folder-picker',
					settings.compactMobileFolderPicker && 'z-mobile-folder-picker--compact'
				)}
				aria-hidden="true"
			>
				<span class="min-w-0 flex-1 truncate">{mobileFolderLabel}</span>
				<ChevronDown class="size-5 shrink-0 text-fg-subtle" aria-hidden="true" />
			</span>
		</label>
	{/if}

	{#if mobileReadingThread}
		<h2 class="z-type-pane-title min-w-0 flex-1 truncate text-sm md:hidden">{threadSubject}</h2>
	{/if}
</div>
