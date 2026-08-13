<script lang="ts">
	import Download from '$lib/components/icons/Download.svelte';
	import Trash2 from '$lib/components/icons/Trash2.svelte';
	import Users from '$lib/components/icons/Users.svelte';
	import X from '$lib/components/icons/X.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import DownloadButton from '$lib/components/ui/DownloadButton.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import MobileSheet from '$lib/components/ui/MobileSheet.svelte';
	import ScrollArea from '$lib/components/ui/ScrollArea.svelte';
	import { fileAllowsDelete, fileAllowsShare, formatFileSize } from '$lib/jmap/file-rights';
	import { auth } from '$lib/stores/auth.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import type { FileNode } from '$lib/types/files';
	import { cn } from '$lib/utils/cn';
	import { errorMessage } from '@zaur/mail-core/utils/errors';

	let {
		node,
		onClose,
		onShare,
		onRename,
		onRemove,
		chrome = 'both'
	}: {
		node: FileNode;
		onClose: () => void;
		onShare: () => void;
		onRename: () => void;
		onRemove: () => void;
		chrome?: 'pane' | 'sheet' | 'both';
	} = $props();

	const panelPadding = 'px-4 py-3';
	const kindLabel = $derived(node.nodeType === 'directory' ? 'Folder' : 'File');
	const sizeLabel = $derived(formatFileSize(node.size));
	const modifiedLabel = $derived(formatDate(node.modified ?? node.created));
	const shareCount = $derived(node.shareWith ? Object.keys(node.shareWith).length : 0);

	function formatDate(value: string | null): string {
		if (!value) return '';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '';
		return date.toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	async function loadBlob(): Promise<Blob> {
		const client = auth.client;
		if (!client || !node.blobId) throw new Error('Nothing to download');
		const response = await client.downloadBlob(
			node.blobId,
			node.name,
			node.type ?? 'application/octet-stream'
		);
		if (!response.ok) throw new Error(`Download failed (${response.status})`);
		return response.blob();
	}
</script>

{#snippet details(showClose: boolean)}
	<header class={cn('flex shrink-0 items-start justify-between gap-2 border-b border-border', panelPadding)}>
		<div class="min-w-0">
			<h2 class="truncate text-base font-semibold text-fg">{node.name}</h2>
			<p class="mt-1 truncate text-sm text-fg-muted">{kindLabel}{sizeLabel ? ` · ${sizeLabel}` : ''}</p>
		</div>
		{#if showClose}
			<IconButton label="Close file" onclick={onClose}>
				<X class="size-4" />
			</IconButton>
		{/if}
	</header>

	<ScrollArea pane class="min-h-0 flex-1">
		<div class="flex flex-col gap-4 px-4 py-4 text-sm">
			{#if modifiedLabel}
				<div>
					<p class="text-xs font-medium uppercase tracking-wide text-fg-subtle">Modified</p>
					<p class="mt-2 text-fg">{modifiedLabel}</p>
				</div>
			{/if}
			{#if node.type}
				<div>
					<p class="text-xs font-medium uppercase tracking-wide text-fg-subtle">Type</p>
					<p class="mt-2 text-fg">{node.type}</p>
				</div>
			{/if}
			<div>
				<p class="text-xs font-medium uppercase tracking-wide text-fg-subtle">Sharing</p>
				<p class="mt-2 text-fg">
					{#if shareCount}
						Shared with {shareCount} {shareCount === 1 ? 'person' : 'people'}
					{:else}
						Not shared
					{/if}
				</p>
			</div>
		</div>
	</ScrollArea>

	<footer
		class={cn(
			'flex shrink-0 flex-wrap gap-2 border-t border-border pb-[max(0.75rem,env(safe-area-inset-bottom))]',
			panelPadding
		)}
	>
		{#if node.blobId}
			<DownloadButton
				fileName={node.name}
				mimeType={node.type ?? 'application/octet-stream'}
				data={loadBlob}
				class="z-btn-primary inline-flex items-center gap-2"
				onError={(err) => toast.show(errorMessage(err, 'Download failed'), 'error')}
			>
				{#snippet children({ busy })}
					<Download class="size-4" aria-hidden="true" />
					{busy ? 'Downloading…' : 'Download'}
				{/snippet}
			</DownloadButton>
		{/if}
		{#if fileAllowsShare(node) && auth.client?.hasPrincipals()}
			<Button variant="ghost" onclick={onShare}>
				<Users class="size-4" aria-hidden="true" />
				Share
			</Button>
		{/if}
		{#if node.myRights.mayRename}
			<Button variant="ghost" onclick={onRename}>Rename</Button>
		{/if}
		{#if fileAllowsDelete(node)}
			<Button variant="danger" onclick={onRemove}>
				<Trash2 class="size-4" aria-hidden="true" />
				Delete
			</Button>
		{/if}
	</footer>
{/snippet}

{#if chrome === 'pane' || chrome === 'both'}
	<aside
		class="z-mail-pane-surface hidden min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:flex"
		style="view-transition-name: file-detail;"
		aria-label="File details"
	>
		{@render details(false)}
	</aside>
{/if}

{#if chrome === 'sheet' || chrome === 'both'}
	<MobileSheet ariaLabel="File details">
		{@render details(true)}
	</MobileSheet>
{/if}
