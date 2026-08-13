<script lang="ts">
	import Folder from '$lib/components/icons/Folder.svelte';
	import Plus from '$lib/components/icons/Plus.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ScrollArea from '$lib/components/ui/ScrollArea.svelte';
	import { fileRoleLabel } from '$lib/jmap/file-rights';
	import { auth } from '$lib/stores/auth.svelte';
	import { files } from '$lib/stores/files.svelte';
	import { cn } from '$lib/utils/cn';
	import type { FileNode } from '$lib/types/files';

	let { class: className = '' }: { class?: string } = $props();

	function labelFor(node: FileNode): string {
		return fileRoleLabel(node.role) ?? node.name;
	}

	function openFolder(id: string | null) {
		const client = auth.client;
		if (client) void files.openFolder(client, id);
	}
</script>

<aside
	class={cn(
		'z-mail-pane-surface flex min-h-0 w-(--width-sidebar) shrink-0 flex-col overflow-hidden border-r border-border',
		className
	)}
	style="view-transition-name: files-sidebar;"
	aria-label="Files navigation"
>
	<div class="shrink-0 border-b border-border/80 px-4 py-3">
		<h2 class="z-type-label">Files</h2>
		<p class="mt-1 text-xs text-fg-muted">Stalwart document storage</p>
	</div>

	<ScrollArea class="min-h-0 flex-1">
		<nav class="p-2.5">
			<ul class="flex flex-col gap-0.5">
				<li>
					<button
						type="button"
						class={cn(
							'flex min-h-10 w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors',
							files.currentParentId === null
								? 'z-surface-active font-medium'
								: 'text-fg-muted hover:bg-surface-sunken/60 hover:text-fg'
						)}
						onclick={() => openFolder(null)}
					>
						<Folder class="size-4 shrink-0 opacity-75" aria-hidden="true" />
						<span class="truncate">All files</span>
					</button>
				</li>
				{#each files.ownedFolders as folder (folder.id)}
					<li>
						<button
							type="button"
							class={cn(
								'flex min-h-10 w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors',
								files.currentParentId === folder.id
									? 'z-surface-active font-medium'
									: 'text-fg-muted hover:bg-surface-sunken/60 hover:text-fg'
							)}
							onclick={() => openFolder(folder.id)}
						>
							<Folder class="size-4 shrink-0 opacity-75" aria-hidden="true" />
							<span class="truncate">{labelFor(folder)}</span>
						</button>
					</li>
				{/each}
			</ul>

			{#if files.sharedFolders.length}
				<p class="mt-4 px-3 text-xs font-medium uppercase tracking-wide text-fg-subtle">Shared with me</p>
				<ul class="mt-1 flex flex-col gap-0.5">
					{#each files.sharedFolders as folder (folder.id)}
						<li>
							<button
								type="button"
								class={cn(
									'flex min-h-10 w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors',
									files.currentParentId === folder.id
										? 'z-surface-active font-medium'
										: 'text-fg-muted hover:bg-surface-sunken/60 hover:text-fg'
								)}
								onclick={() => openFolder(folder.id)}
							>
								<Folder class="size-4 shrink-0 opacity-75" aria-hidden="true" />
								<span class="truncate">{labelFor(folder)}</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</nav>
	</ScrollArea>

	<div class="shrink-0 border-t border-border/80 p-2">
		<Button
			variant="ghost"
			class="w-full justify-start px-3 py-2"
			onclick={() => (files.createFolderOpen = true)}
			disabled={!files.canAddHere}
		>
			<Plus class="size-4 shrink-0" aria-hidden="true" />
			New folder
		</Button>
	</div>
</aside>
