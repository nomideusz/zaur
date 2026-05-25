<script lang="ts">
	import { Archive, FolderInput, Mail, MailOpen, Trash2, X } from 'lucide-svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { mail } from '$lib/stores/mail.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		mailboxRouteId: string;
		onBulkAction?: () => void;
	}

	let { mailboxRouteId, onBulkAction }: Props = $props();

	let moveOpen = $state(false);

	const currentMailbox = $derived(mail.mailboxByRouteId(mailboxRouteId));
	const moveTargets = $derived(
		mail.mailboxes.filter((mb) => mb.jmapId && mb.id !== currentMailbox?.id)
	);
	const canArchive = $derived(currentMailbox?.role !== 'archive');
	const deleteLabel = $derived(currentMailbox?.role === 'trash' ? 'Delete forever' : 'Delete');
	const selectedIds = $derived([...mail.selectedMessageIds]);
	const hasUnreadSelected = $derived(
		mail.messages.some((message) => selectedIds.includes(message.id) && message.unread)
	);
	const hasReadSelected = $derived(
		mail.messages.some((message) => selectedIds.includes(message.id) && !message.unread)
	);

	async function run(action: () => Promise<void>) {
		if (!auth.client || mail.bulkActionLoading) return;

		try {
			await action();
			onBulkAction?.();
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Bulk action failed';
			toast.show(message, 'error');
		}
	}

	async function archiveSelected() {
		if (!auth.client) return;
		await run(() => mail.bulkArchive(auth.client!));
	}

	async function deleteSelected() {
		if (!auth.client) return;
		const count = mail.selectedCount;
		const permanent = currentMailbox?.role === 'trash';
		if (!settings.confirmDeleteMessage(count, permanent)) return;
		await run(() => mail.bulkDelete(auth.client!, mailboxRouteId));
	}

	async function moveSelected(targetRouteId: string) {
		moveOpen = false;
		if (!auth.client) return;
		await run(() => mail.bulkMoveToMailbox(auth.client!, targetRouteId));
	}

	async function markSelectedRead() {
		if (!auth.client) return;
		await run(() => mail.bulkMarkAsRead(auth.client!));
	}

	async function markSelectedUnread() {
		if (!auth.client) return;
		await run(() => mail.bulkMarkAsUnread(auth.client!));
	}
</script>

<svelte:window onclick={() => (moveOpen = false)} />

<div class="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
	<IconButton label="Cancel selection" class="!p-1.5" onclick={() => mail.exitSelectionMode()}>
		<X class="size-3.5" />
	</IconButton>
	<span class="min-w-0 truncate text-xs text-fg-muted">
		{selectedIds.length} selected
	</span>
	{#if !selectedIds.length && !settings.hideSelectionHints}
		<span class="hidden truncate text-xs text-fg-subtle sm:inline">Ctrl/Shift+click</span>
	{/if}

	{#if selectedIds.length}
		<div class="ml-auto flex shrink-0 items-center gap-0.5">
			{#if hasUnreadSelected}
				<IconButton
					label="Mark read"
					class="!p-1.5"
					onclick={markSelectedRead}
				>
					<MailOpen class="size-3.5" aria-hidden="true" />
				</IconButton>
			{/if}
			{#if hasReadSelected}
				<IconButton
					label="Mark unread"
					class="!p-1.5"
					onclick={markSelectedUnread}
				>
					<Mail class="size-3.5" aria-hidden="true" />
				</IconButton>
			{/if}
			{#if canArchive}
				<IconButton label="Archive" class="!p-1.5" onclick={archiveSelected}>
					<Archive class="size-3.5" aria-hidden="true" />
				</IconButton>
			{/if}

			<div class="relative">
				<IconButton
					label="Move"
					class="!p-1.5"
					onclick={(e) => {
						e.stopPropagation();
						moveOpen = !moveOpen;
					}}
				>
					<FolderInput class="size-3.5" aria-hidden="true" />
				</IconButton>

				{#if moveOpen}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="absolute right-0 z-20 mt-1 max-h-64 w-52 overflow-y-auto rounded-md border border-border bg-surface-raised py-1 shadow-md"
						onpointerdown={(e) => e.stopPropagation()}
					>
						{#if !settings.hideMoveMenuLabels}
							<p
								class={cn(
									'px-3 text-xs font-medium text-fg-subtle',
									settings.compactMoveMenu ? 'py-1' : 'py-1.5'
								)}
							>
								Move to
							</p>
						{/if}
						{#each moveTargets as mailbox (mailbox.id)}
							<button
								type="button"
								class={cn(
									'block w-full truncate px-3 text-left text-sm text-fg hover:bg-surface-sunken',
									settings.compactMoveMenu ? 'py-1.5' : 'py-2'
								)}
								onclick={() => moveSelected(mailbox.id)}
							>
								{mailbox.name}
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<IconButton
				label={deleteLabel}
				class="!p-1.5 text-danger hover:bg-danger/10"
				onclick={deleteSelected}
			>
				<Trash2 class="size-3.5" aria-hidden="true" />
			</IconButton>
		</div>
	{/if}
</div>
