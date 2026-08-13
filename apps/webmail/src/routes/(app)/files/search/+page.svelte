<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import FileText from '$lib/components/icons/FileText.svelte';
	import Folder from '$lib/components/icons/Folder.svelte';
	import ScrollArea from '$lib/components/ui/ScrollArea.svelte';
	import { formatFileSize } from '$lib/jmap/file-rights';
	import { auth } from '$lib/stores/auth.svelte';
	import { files } from '$lib/stores/files.svelte';

	const query = $derived(page.url.searchParams.get('q')?.trim() ?? '');

	$effect(() => {
		const client = auth.client;
		if (!client || auth.isRestoring) return;
		void files.search(client, query);
	});

	function openNode(id: string) {
		const node = files.searchResults.find((item) => item.id === id);
		const client = auth.client;
		if (!client || !node) return;
		if (node.nodeType === 'directory') {
			void files.openFolder(client, node.id);
		} else {
			void files.openFolder(client, node.parentId).then(() => files.select(node.id));
		}
		void goto('/files');
	}
</script>

<svelte:head>
	<title>{query ? `${query} · Search` : 'Search'} · Files · ZAUR</title>
</svelte:head>

<div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
	<ScrollArea pane class="min-h-0 flex-1">
		{#if query && files.searchResults.length}
			<ul class="divide-y divide-border">
				{#each files.searchResults as node (node.id)}
					<li>
						<button
							type="button"
							class="z-list-row flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-sunken/60 active:bg-surface-sunken/80"
							onclick={() => openNode(node.id)}
						>
							{#if node.nodeType === 'directory'}
								<Folder class="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
							{:else}
								<FileText class="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
							{/if}
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-semibold tracking-tight text-fg">{node.name}</p>
								<p class="truncate text-xs text-fg-muted">
									{node.nodeType === 'directory' ? 'Folder' : formatFileSize(node.size) || 'File'}
								</p>
							</div>
						</button>
					</li>
				{/each}
			</ul>
		{:else}
			<div class="flex flex-col items-center gap-3 px-4 py-12 text-center">
				<div class="rounded-full bg-accent/10 p-3 text-accent">
					<FileText class="size-6" aria-hidden="true" />
				</div>
				<div>
					<p class="text-sm font-semibold text-fg">
						{query ? 'No files match your search' : 'Search your files'}
					</p>
					<p class="mx-auto mt-1 max-w-xs text-xs text-fg-muted">
						{query ? 'Try a different name.' : 'Find files and folders by name.'}
					</p>
				</div>
			</div>
		{/if}
	</ScrollArea>
</div>
