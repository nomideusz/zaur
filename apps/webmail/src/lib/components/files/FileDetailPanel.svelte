<script lang="ts">
	import Download from '$lib/components/icons/Download.svelte';
	import Trash2 from '$lib/components/icons/Trash2.svelte';
	import Users from '$lib/components/icons/Users.svelte';
	import X from '$lib/components/icons/X.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import DownloadButton from '$lib/components/ui/DownloadButton.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import LoadingIndicator from '$lib/components/ui/LoadingIndicator.svelte';
	import MarkdownBody from '$lib/components/ui/MarkdownBody.svelte';
	import MobileSheet from '$lib/components/ui/MobileSheet.svelte';
	import ScrollArea from '$lib/components/ui/ScrollArea.svelte';
	import { fileAllowsDelete, fileAllowsShare, formatFileSize } from '$lib/jmap/file-rights';
	import { canPreviewMarkdown, isMarkdownFile, MAX_MARKDOWN_BYTES, stripBom } from '$lib/markdown';
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
	const markdownFile = $derived(node.nodeType === 'file' && isMarkdownFile(node));
	const markdownReadable = $derived(markdownFile && canPreviewMarkdown(node));
	const markdownTooLarge = $derived(
		markdownFile && (node.size ?? 0) > MAX_MARKDOWN_BYTES
	);

	let view = $state<'preview' | 'source'>('preview');
	let source = $state<string | null>(null);
	let loading = $state(false);
	let loadError = $state<string | null>(null);
	let generation = 0;

	$effect(() => {
		void node.blobId;
		view = 'preview';
	});

	$effect(() => {
		const client = auth.client;
		const blobId = node.blobId;
		const name = node.name;
		const type = node.type;
		const shouldLoad =
			node.nodeType === 'file' && canPreviewMarkdown(node) && !!client && !!blobId;

		source = null;
		loadError = null;

		if (!shouldLoad || !client || !blobId) {
			loading = false;
			return;
		}

		const requestId = ++generation;
		loading = true;
		void (async () => {
			try {
				const response = await client.downloadBlob(
					blobId,
					name,
					type ?? 'text/markdown'
				);
				if (requestId !== generation) return;
				if (!response.ok) throw new Error(`Download failed (${response.status})`);
				source = stripBom(await response.text());
			} catch (err) {
				if (requestId !== generation) return;
				loadError = errorMessage(err, 'Failed to load preview');
			} finally {
				if (requestId === generation) loading = false;
			}
		})();

		return () => {
			generation++;
		};
	});

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

{#snippet meta()}
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
{/snippet}

{#snippet details(showClose: boolean)}
	<header class={cn('flex shrink-0 items-start justify-between gap-2 border-b border-border', panelPadding)}>
		<div class="min-w-0">
			<h2 class="truncate text-base font-semibold text-fg">{node.name}</h2>
			<p class="mt-1 truncate text-sm text-fg-muted">
				{markdownFile ? 'Markdown' : kindLabel}{sizeLabel ? ` · ${sizeLabel}` : ''}
				{#if modifiedLabel && markdownReadable}
					<span class="text-fg-subtle"> · {modifiedLabel}</span>
				{/if}
			</p>
		</div>
		<div class="flex shrink-0 items-center gap-1">
			{#if markdownReadable && source !== null}
				<div class="flex rounded-md border border-border/70 p-0.5 text-xs">
					<button
						type="button"
						class={cn(
							'cursor-pointer rounded px-2 py-1 text-fg-muted transition-colors',
							view === 'preview' && 'bg-surface-raised font-medium text-fg'
						)}
						aria-pressed={view === 'preview'}
						onclick={() => (view = 'preview')}
					>
						Preview
					</button>
					<button
						type="button"
						class={cn(
							'cursor-pointer rounded px-2 py-1 text-fg-muted transition-colors',
							view === 'source' && 'bg-surface-raised font-medium text-fg'
						)}
						aria-pressed={view === 'source'}
						onclick={() => (view = 'source')}
					>
						Source
					</button>
				</div>
			{/if}
			{#if showClose}
				<IconButton label="Close file" onclick={onClose}>
					<X class="size-4" />
				</IconButton>
			{/if}
		</div>
	</header>

	<ScrollArea pane class="min-h-0 flex-1">
		{#if markdownReadable}
			{#if loading || (source === null && !loadError)}
				<LoadingIndicator label="Loading markdown…" />
			{:else if loadError}
				<div class="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
					<p class="text-sm text-danger">{loadError}</p>
					<p class="text-xs text-fg-muted">You can still download the file.</p>
				</div>
			{:else if source !== null && view === 'source'}
				<pre
					class="whitespace-pre-wrap break-words px-4 py-4 font-mono text-xs leading-relaxed text-fg"
				>{source}</pre>
			{:else if source !== null}
				<div class="px-4 py-4 md:px-5">
					{#if source.trim()}
						<MarkdownBody source={source} />
					{:else}
						<p class="text-sm text-fg-muted">This file is empty.</p>
					{/if}
				</div>
			{/if}
		{:else}
			<div class="flex flex-col gap-4 px-4 py-4 text-sm">
				{#if markdownTooLarge}
					<p class="text-sm text-fg-muted">
						This markdown file is larger than {formatFileSize(MAX_MARKDOWN_BYTES)} and can't be
						previewed here. Download it to read it locally.
					</p>
				{/if}
				{@render meta()}
			</div>
		{/if}
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
